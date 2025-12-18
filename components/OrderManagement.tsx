// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, ReturRecord, ScanResiLog } from '../types';
import { 
  Clock, CheckCircle, Package, ClipboardList, RotateCcw, Edit3, 
  ShoppingBag, Tag, Search, X, Store, Save, Loader, FileText, 
  AlertCircle, ChevronLeft, ChevronRight, ScanBarcode, CheckSquare, 
  FileSpreadsheet, Upload, Send, Square, ChevronDown, Check, Loader2, Edit2, XCircle
} from 'lucide-react';
import { formatRupiah, compressImage } from '../utils';
import { analyzeResiImage } from '../services/geminiService';
import * as XLSX from 'xlsx';
import { 
  updateInventory, 
  updateOrderData, 
  saveOrder, 
  addReturTransaction, 
  updateReturKeterangan, 
  fetchReturRecords, 
  getItemByPartNumber,
  addScanResiLog, 
  fetchScanResiLogs, 
  importScanResiFromExcel, 
  processShipmentToOrders, 
  fetchInventory, 
  updateScanResiLogField
} from '../services/supabaseService';

// --- KONSTANTA SCAN RESI ---
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];
const MARKETPLACES = ['Shopee', 'Tiktok', 'Tokopedia', 'Lazada', 'Offline'];

// --- KOMPONEN TOAST LOCAL ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${type === 'success' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-700'}`}>
      {type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2" />}
      {message}
    </div>
  );
};

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onProcessReturn: (orderId: string, returnedItems: { itemId: string, qty: number }[]) => void;
  onRefresh?: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [], onUpdateStatus, onProcessReturn, onRefresh }) => {
  // --- STATE UTAMA (TABS) ---
  const [activeTab, setActiveTab] = useState<'pending' | 'scan' | 'processing' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- STATE TOAST ---
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg, type});

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; 

  const [returDbRecords, setReturDbRecords] = useState<ReturRecord[]>([]);

  // --- STATE MODAL ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState<{ id: string, resi: string, currentText: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // --- STATE SCAN RESI ---
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('Shopee');
  const [showMarketplacePopup, setShowMarketplacePopup] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);
  const [scanLogs, setScanLogs] = useState<ScanResiLog[]>([]);
  const [selectedResis, setSelectedResis] = useState<string[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECT ---
  useEffect(() => { fetchReturRecords().then(setReturDbRecords); }, [activeTab, orders]);

  useEffect(() => {
      if (activeTab === 'scan') {
          loadScanLogs();
          setTimeout(() => { barcodeInputRef.current?.focus(); }, 100);
      }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'scan') {
        const autoChecked = scanLogs.filter(log => log.status === 'Siap Kirim').map(log => log.resi);
        setSelectedResis(autoChecked);
    }
  }, [scanLogs, activeTab]);

  useEffect(() => { setSearchTerm(''); setCurrentPage(1); }, [activeTab]);

  // --- LOGIKA SCAN RESI ---
  const loadScanLogs = async () => { setScanLogs(await fetchScanResiLogs()); };

  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;
      setIsSavingLog(true);
      if (await addScanResiLog(scannedCode, selectedMarketplace, selectedStore)) {
          await loadScanLogs(); 
          setBarcodeInput('');
          // Opsional: showToast('Scan Berhasil'); // Tidak perlu toast jika sukses agar cepat
      } else { 
          showToast("Gagal menyimpan data.", 'error'); 
      }
      setIsSavingLog(false);
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    try {
      const compressed = await compressImage(await readFileAsBase64(file));
      const analysis = await analyzeResiImage(compressed);
      if (analysis && analysis.resi) {
         if(await addScanResiLog(analysis.resi, selectedMarketplace, selectedStore)) {
             await loadScanLogs(); 
             showToast(`Resi ${analysis.resi} tersimpan.`);
         }
      } else { 
          showToast("Resi tidak terbaca.", 'error'); 
      }
    } catch (error) { console.error(error); } 
    finally { setAnalyzing(false); if (cameraInputRef.current) cameraInputRef.current.value = ''; }
  };

  const handlePartNumberChange = async (id: number, value: string) => {
      setScanLogs(prev => prev.map(log => {
          if (log.id === id) {
              const updated = { ...log, part_number: value };
              updated.status = (updated.part_number && updated.nama_barang && updated.quantity) ? 'Siap Kirim' : 'Pending';
              return updated;
          }
          return log;
      }));
      if (id) await updateScanResiLogField(id, 'part_number', value);
  };

  const parseIndonesianNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      let strVal = String(val);
      strVal = strVal.replace(/[RpIDR\s]/gi, '');
      strVal = strVal.split('.').join('');
      strVal = strVal.replace(',', '.');
      return parseFloat(strVal) || 0;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    let inventoryMap = new Map<string, string>(); 
    let allPartNumbers: string[] = [];

    try {
        const inventoryData = await fetchInventory();
        inventoryData.forEach(item => {
            if(item.name) inventoryMap.set(item.name.toLowerCase().trim(), item.partNumber);
            if(item.partNumber) allPartNumbers.push(item.partNumber);
        });
        allPartNumbers.sort((a, b) => b.length - a.length);
    } catch (err) { console.error("Gagal ambil inventory:", err); }

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws, { raw: false });

            const updates = data.map((row: any) => {
                const getVal = (keys: string[]) => {
                    for (let k of keys) {
                        if (row[k] !== undefined) return row[k];
                        const lowerKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                        if (lowerKey) return row[lowerKey];
                    }
                    return null;
                };

                const resi = getVal(['No. Resi', 'No. Pesanan', 'Resi', 'Order ID']);
                const username = getVal(['Username (Pembeli)', 'Username Pembeli', 'Username', 'Pembeli', 'Nama Penerima']);
                let partNo = getVal(['No. Referensi', 'Part Number', 'Part No', 'Kode Barang']);
                const produk = getVal(['Nama Produk', 'Nama Barang', 'Product Name']);
                const qty = getVal(['Jumlah', 'Qty', 'Quantity']);
                const harga = getVal(['Harga Awal', 'Harga Satuan', 'Price', 'Harga', 'Harga Variasi']);

                const produkNameClean = String(produk || '').trim();
                const produkLower = produkNameClean.toLowerCase();

                if ((!partNo || partNo === '-' || partNo === '') && produkNameClean) {
                    const foundByExactName = inventoryMap.get(produkLower);
                    if (foundByExactName) partNo = foundByExactName;
                    else {
                        const foundInText = allPartNumbers.find(pn => produkLower.includes(pn.toLowerCase()));
                        if (foundInText) partNo = foundInText;
                        else {
                            const regexPartNo = /\b[A-Z0-9]{5,}-[A-Z0-9]{4,}\b/i;
                            const match = produkNameClean.match(regexPartNo);
                            if (match) partNo = match[0].toUpperCase();
                        }
                    }
                }

                if (resi) {
                    return {
                        resi: String(resi).trim(),
                        toko: selectedStore,
                        ecommerce: selectedMarketplace,
                        customer: username || '-', 
                        part_number: partNo || null,
                        nama_barang: produk || '-',
                        quantity: parseIndonesianNumber(qty),
                        harga_satuan: parseIndonesianNumber(harga),
                        harga_total: parseIndonesianNumber(qty) * parseIndonesianNumber(harga) 
                    };
                }
                return null;
            }).filter(item => item !== null);

            if (updates.length > 0) {
                const result = await importScanResiFromExcel(updates);
                if (result.success) {
                    const msg = result.skippedCount > 0 
                        ? `Berhasil: ${updates.length - result.skippedCount} data. (${result.skippedCount} skip)` 
                        : `Berhasil: ${updates.length} data.`;
                    showToast(msg, 'success');
                    await loadScanLogs();
                } else {
                    showToast("Gagal mengupdate database.", 'error');
                }
            } else {
                showToast("Tidak ditemukan data valid.", 'error');
            }

        } catch (error) {
            console.error("Parse Error:", error);
            showToast("Gagal membaca file Excel.", 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessKirim = async () => {
      if (selectedResis.length === 0) return;
      
      // CONFIRMATION DIHAPUS (Langsung Proses)
      // if (!window.confirm(`Proses ${selectedResis.length} resi menjadi Terjual?`)) return;

      setIsProcessingShipment(true);
      const logsToProcess = scanLogs.filter(log => selectedResis.includes(log.resi));
      const result = await processShipmentToOrders(logsToProcess);
      
      if (result.success) {
          showToast("Berhasil diproses! Stok terupdate.", 'success');
          await loadScanLogs();
          setSelectedResis([]);
          if (onRefresh) onRefresh();
      } else {
          showToast(result.message || "Terjadi kesalahan.", 'error');
      }
      setIsProcessingShipment(false);
  };

  const toggleSelect = (resi: string) => {
      setSelectedResis(prev => prev.includes(resi) ? prev.filter(r => r !== resi) : [...prev, resi]);
  };

  const getMarketplaceColor = (mp: string) => {
    switch(mp) {
        case 'Shopee': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        case 'Tokopedia': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
        case 'Tiktok': return 'bg-black text-white border-gray-800 hover:bg-gray-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- LOGIKA ORDER MANAGEMENT & RETUR ---
  const openNoteModal = (retur: ReturRecord) => {
      setEditingNoteData({ id: retur.id ? retur.id.toString() : '', resi: retur.resi || '', currentText: retur.keterangan || '' });
      setNoteText(retur.keterangan || ''); setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
      if (!editingNoteData) return; setIsSavingNote(true);
      try {
          if (await updateReturKeterangan(editingNoteData.resi, noteText)) {
              setReturDbRecords(prev => prev.map(item => (item.id && item.id.toString() === editingNoteData.id) || item.resi === editingNoteData.resi ? { ...item, keterangan: noteText } : item));
              setIsNoteModalOpen(false);
          } else { showToast("Gagal menyimpan keterangan.", 'error'); }
      } catch (error) { console.error("Error saving note:", error); } finally { setIsSavingNote(false); }
  };

  const openReturnModal = (order: Order) => {
      setSelectedOrderForReturn(order);
      const initialQty: Record<string, number> = {};
      order.items.forEach(item => { initialQty[item.id] = 0; });
      setReturnQuantities(initialQty); setIsReturnModalOpen(true);
  };

  const getOrderDetails = (order: Order) => {
      let cleanName = order.customerName || 'Tanpa Nama';
      let resiText = `#${order.id.slice(0, 8)}`;
      let ecommerce = '-'; let shopName = '-';
      try {
          const resiMatch = cleanName.match(/\(Resi: (.*?)\)/); if (resiMatch && resiMatch[1]) { resiText = resiMatch[1]; cleanName = cleanName.replace(/\s*\(Resi:.*?\)/, ''); }
          const shopMatch = cleanName.match(/\(Toko: (.*?)\)/); if (shopMatch && shopMatch[1]) { shopName = shopMatch[1]; cleanName = cleanName.replace(/\s*\(Toko:.*?\)/, ''); }
          const viaMatch = cleanName.match(/\(Via: (.*?)\)/); if (viaMatch && viaMatch[1]) { ecommerce = viaMatch[1]; cleanName = cleanName.replace(/\s*\(Via:.*?\)/, ''); }
          cleanName = cleanName.replace(/\(RETUR\)/i, ''); 
      } catch (e) { console.error("Error parsing name", e); }
      return { cleanName: cleanName.trim(), resiText, ecommerce, shopName };
  };

  const handleProcessReturn = async () => {
      if (!selectedOrderForReturn) return;
      const itemsToReturnData = selectedOrderForReturn.items.map(item => {
            const qtyRetur = returnQuantities[item.id] || 0;
            return qtyRetur > 0 ? { ...item, cartQuantity: qtyRetur } : null;
        }).filter(Boolean) as any[];

      if (itemsToReturnData.length === 0) return;
      setIsLoading(true);

      try {
        const { resiText, shopName, ecommerce, cleanName } = getOrderDetails(selectedOrderForReturn);
        const combinedResiShop = `${resiText} / ${shopName}`;
        const orderDate = selectedOrderForReturn.items[0]?.timestamp ? new Date(selectedOrderForReturn.timestamp).toISOString() : new Date().toISOString();

        for (const item of itemsToReturnData) {
            const hargaSatuan = item.customPrice ?? item.price ?? 0;
            const realItem = await getItemByPartNumber(item.partNumber);
            if (realItem) {
                await updateInventory({ ...realItem, quantity: realItem.quantity }, {
                    type: 'in', qty: item.cartQuantity, ecommerce, resiTempo: combinedResiShop, customer: cleanName, price: hargaSatuan, isReturn: true 
                });
            }
            const returData: ReturRecord = {
                tanggal_pemesanan: orderDate, resi: resiText, toko: shopName, ecommerce, customer: cleanName,
                part_number: item.partNumber, nama_barang: item.name, quantity: item.cartQuantity,
                harga_satuan: hargaSatuan, harga_total: hargaSatuan * item.cartQuantity, tanggal_retur: new Date().toISOString(),
                status: 'Retur Sebagian', keterangan: 'Retur Barang'
            };
            await addReturTransaction(returData);
        }

        const remainingItems = selectedOrderForReturn.items.map(item => {
            const returItem = itemsToReturnData.find(r => r.id === item.id);
            return returItem ? { ...item, cartQuantity: (item.cartQuantity || 0) - returItem.cartQuantity } : item;
        }).filter(item => (item.cartQuantity || 0) > 0);

        if (remainingItems.length === 0) {
            await updateOrderData(selectedOrderForReturn.id, selectedOrderForReturn.items, selectedOrderForReturn.totalAmount, 'cancelled');
        } else {
            const returnTotal = itemsToReturnData.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            await saveOrder({ id: `${selectedOrderForReturn.id}-RET`, customerName: `${selectedOrderForReturn.customerName} (RETUR)`, items: itemsToReturnData, totalAmount: returnTotal, status: 'cancelled', timestamp: Date.now() });
            const remainingTotal = remainingItems.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            await updateOrderData(selectedOrderForReturn.id, remainingItems, remainingTotal, 'processing');
        }
        setIsReturnModalOpen(false); setSelectedOrderForReturn(null); setActiveTab('history');
        if (onRefresh) onRefresh();
      } catch (error) { console.error("Error processing return:", error); } 
      finally { setIsLoading(false); }
  };

  // --- RENDER ---
  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredData = useMemo(() => {
    if (activeTab === 'history') {
        return returDbRecords.filter(r => !searchTerm || (r.resi+r.customer+r.nama_barang).toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => new Date(b.tanggal_retur).getTime() - new Date(a.tanggal_retur).getTime());
    } else if (activeTab === 'pending' || activeTab === 'processing') {
        return safeOrders.filter(o => o?.status === activeTab).filter(o => !searchTerm || (o.id+o.customerName).toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
    return [];
  }, [safeOrders, returDbRecords, activeTab, searchTerm]);

  const scanTotalItems = scanLogs.length;
  const scanTotalPages = Math.ceil(scanTotalItems / itemsPerPage);
  const scanStartIndex = (currentPage - 1) * itemsPerPage;
  const scanCurrentItems = scanLogs.slice(scanStartIndex, scanStartIndex + itemsPerPage);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) { case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'; case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200'; case 'completed': return 'bg-green-100 text-green-700 border-green-200'; case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'; default: return 'bg-gray-100 text-gray-700'; }
  };
  const getStatusLabel = (status: OrderStatus) => {
      if (status === 'cancelled') return 'RETUR / BATAL'; if (status === 'completed') return 'SELESAI'; if (status === 'processing') return 'TERJUAL'; if (status === 'pending') return 'BARU'; return status;
  };
  const formatDate = (ts: number | string) => { try { const d = new Date(ts || Date.now()); return { date: d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}), time: d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) }; } catch (e) { return {date:'-', time:'-'}; } };
  const readyToSendCount = selectedResis.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[80vh] flex flex-col overflow-hidden relative">
      {/* TOAST LOCAL */}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* MODALS */}
      {isNoteModalOpen && editingNoteData && ( <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"><div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex justify-between items-center"><h3 className="text-base font-bold text-purple-800 flex items-center gap-2"><FileText size={18}/> Edit Keterangan</h3><button onClick={() => setIsNoteModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600"/></button></div><div className="p-4"><textarea className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none text-sm min-h-[100px]" placeholder="Masukkan alasan atau catatan..." value={noteText} onChange={(e) => setNoteText(e.target.value)} /></div><div className="p-3 border-t bg-gray-50 flex justify-end gap-2"><button onClick={() => setIsNoteModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button><button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow flex items-center gap-2">{isSavingNote ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Simpan</button></div></div></div> )}
      {isReturnModalOpen && selectedOrderForReturn && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90%]"><div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex justify-between items-center"><h3 className="text-base font-bold text-orange-800 flex items-center gap-2"><RotateCcw size={18}/> Retur Barang</h3><button onClick={() => setIsReturnModalOpen(false)}><X size={18} className="text-orange-400 hover:text-orange-600"/></button></div><div className="p-4 overflow-y-auto text-sm"><div className="space-y-2">{selectedOrderForReturn.items.map((item) => (<div key={item.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:border-orange-200"><div className="flex-1"><div className="font-bold text-gray-800 text-xs">{item.name}</div><div className="text-[10px] text-gray-500 font-mono">{item.partNumber}</div></div><div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200"><button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-red-50 text-gray-600 font-bold">-</button><div className="w-6 text-center font-bold text-sm text-gray-800">{returnQuantities[item.id] || 0}</div><button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.min(item.cartQuantity || 0, (prev[item.id] || 0) + 1)}))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-green-50 text-gray-600 font-bold">+</button></div></div>))}</div></div><div className="p-3 border-t bg-gray-50 flex justify-end gap-2"><button onClick={() => setIsReturnModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button><button onClick={handleProcessReturn} disabled={isLoading} className="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-lg shadow flex items-center gap-2">{isLoading ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Proses</button></div></div></div> )}

      {/* HEADER UTAMA */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex justify-between items-center"><div><h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="text-purple-600" size={20} /> Manajemen Pesanan</h2></div></div>

      {/* TABS */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[{ id: 'pending', label: 'Baru', icon: Clock, count: safeOrders.filter(o=>o?.status==='pending').length, color: 'text-amber-600' }, { id: 'scan', label: 'Scan Resi', icon: ScanBarcode, count: 0, color: 'text-gray-800' }, { id: 'processing', label: 'Terjual', icon: Package, count: 0, color: 'text-blue-600' }, { id: 'history', label: 'Retur', icon: CheckCircle, count: returDbRecords.length, color: 'text-red-600' }].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-white relative ${activeTab === tab.id ? `border-purple-600 text-purple-700 bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}><tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} /><span>{tab.label}</span>{tab.id === 'pending' && tab.count > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{tab.count}</span>}</button>
          ))}
      </div>

      {/* MAIN CONTENT */}
      {activeTab === 'scan' ? (
        <>
            <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex flex-col gap-4 z-20">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex gap-2">
                        <div className="relative flex shadow-sm rounded-lg flex-1 md:flex-none">
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold border rounded-l-lg transition-colors flex-1 md:w-32 justify-center ${getMarketplaceColor(selectedMarketplace)}`}>{isUploading ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16} />}{isUploading ? 'Loading...' : selectedMarketplace}</button>
                            <button onClick={() => setShowMarketplacePopup(!showMarketplacePopup)} className="px-2 bg-white border-y border-r border-gray-200 rounded-r-lg hover:bg-gray-50 flex items-center justify-center"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
                            {showMarketplacePopup && (<div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 overflow-hidden">{MARKETPLACES.map((mp) => (<button key={mp} onClick={() => { setSelectedMarketplace(mp); setShowMarketplacePopup(false); barcodeInputRef.current?.focus(); }} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 last:border-0 ${selectedMarketplace === mp ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}>{mp}{selectedMarketplace === mp && <Check className="w-3 h-3"/>}</button>))}</div>)}
                        </div>
                        <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                        <select value={selectedStore} onChange={(e) => { setSelectedStore(e.target.value); barcodeInputRef.current?.focus(); }} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5">{STORE_LIST.map(store => <option key={store} value={store}>{store}</option>)}</select>
                    </div>
                    <div className="relative flex-grow"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">{isSavingLog ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <ScanBarcode className="w-5 h-5 text-gray-400" />}</div><input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeInput} className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block w-full pl-10 p-2.5 font-mono font-medium shadow-sm" placeholder={`Scan Resi ${selectedMarketplace}...`} autoComplete="off" disabled={isSavingLog} /></div>
                    <div className="flex gap-2"><button onClick={() => cameraInputRef.current?.click()} disabled={analyzing} className="text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-sm px-4 py-2.5 flex items-center justify-center gap-2">{analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanBarcode className="w-4 h-4" />}<span className="hidden md:inline">Kamera</span></button><input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />{readyToSendCount > 0 && (<button onClick={handleProcessKirim} disabled={isProcessingShipment} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all animate-in fade-in slide-in-from-right-5">{isProcessingShipment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}Proses ({readyToSendCount})</button>)}</div>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-2"><div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-w-[1000px]"><table className="w-full text-left border-collapse"><thead className="bg-white sticky top-0 z-10 shadow-sm text-[10px] font-bold text-gray-500 uppercase tracking-wider"><tr><th className="px-4 py-3 border-b border-gray-100 w-10 text-center"><CheckSquare size={16} className="text-gray-300 mx-auto"/></th><th className="px-4 py-3 border-b border-gray-100">Tanggal</th><th className="px-4 py-3 border-b border-gray-100">Resi</th><th className="px-4 py-3 border-b border-gray-100">Toko</th><th className="px-4 py-3 border-b border-gray-100">Via</th><th className="px-4 py-3 border-b border-gray-100">Pelanggan</th><th className="px-4 py-3 border-b border-gray-100">Part.No (Edit)</th><th className="px-4 py-3 border-b border-gray-100">Barang</th><th className="px-4 py-3 border-b border-gray-100 text-center">Qty</th><th className="px-4 py-3 border-b border-gray-100 text-right">Total</th><th className="px-4 py-3 border-b border-gray-100 text-center">Status</th></tr></thead><tbody className="divide-y divide-gray-50 text-xs">{scanCurrentItems.length === 0 ? (<tr><td colSpan={11} className="p-8 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><ScanBarcode size={32} className="opacity-20"/><p>Belum ada resi yang di-scan hari ini</p></div></td></tr>) : (scanCurrentItems.map((log, idx) => { const dateObj = new Date(log.tanggal); const displayDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); const isReady = log.status === 'Siap Kirim'; const isSold = log.status === 'Terjual'; const isSelected = selectedResis.includes(log.resi); const isComplete = !!log.part_number && !!log.nama_barang && !!log.quantity; return ( <tr key={log.id || idx} className={`transition-colors ${isSold ? 'bg-gray-50 opacity-60' : (isSelected ? 'bg-blue-50' : 'hover:bg-gray-50')}`}><td className="px-4 py-3 text-center">{!isSold && (<button onClick={() => toggleSelect(log.resi)} disabled={!isReady} className="focus:outline-none">{isSelected ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className={isReady ? "text-gray-400 hover:text-blue-500" : "text-gray-200 cursor-not-allowed"}/>}</button>)}{isSold && <Check size={16} className="text-green-500 mx-auto"/>}</td><td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{displayDate}</td><td className="px-4 py-3 font-bold text-gray-900 font-mono select-all">{log.resi}</td><td className="px-4 py-3 text-gray-600 font-semibold">{log.toko || '-'}</td><td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-100 text-gray-600 border-gray-200">{log.ecommerce}</span></td><td className="px-4 py-3 text-gray-800 font-medium">{log.customer || '-'}</td><td className="px-4 py-3"><div className="flex items-center gap-1">{!isSold ? (<input className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full font-mono text-gray-700 placeholder-red-200" placeholder="Part Number" value={log.part_number || ''} onChange={(e) => handlePartNumberChange(log.id!, e.target.value)} />) : (<span className="font-mono text-gray-700">{log.part_number}</span>)}{!!log.part_number && <Search size={10} className="text-blue-300 flex-shrink-0" title="Terdeteksi Otomatis"/>}</div></td><td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={log.nama_barang || ''}>{log.nama_barang || '-'}</td><td className="px-4 py-3 text-gray-500 text-center">{log.quantity || '-'}</td><td className="px-4 py-3 text-gray-800 font-bold text-right">{log.harga_total ? `Rp${log.harga_total.toLocaleString('id-ID')}` : '-'}</td><td className="px-4 py-3 text-center whitespace-nowrap">{isSold ? (<span className="inline-flex items-center gap-1 text-gray-500 font-bold bg-gray-200 px-2 py-0.5 rounded-full text-[10px]">Terjual</span>) : isReady ? (<span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-[10px]"><Check size={10}/> Siap Kirim</span>) : isComplete ? (<span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 text-[10px]"><XCircle size={10}/> Belum Scan</span>) : (<span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 text-[10px]"><XCircle size={10}/> Belum Upload</span>)}</td></tr>); }))}</tbody></table></div></div>
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500"><div>Menampilkan {scanStartIndex + 1}-{Math.min(scanStartIndex + itemsPerPage, scanTotalItems)} dari {scanTotalItems} data</div><div className="flex items-center gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16}/></button><span className="font-bold text-gray-900">Halaman {currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(scanTotalPages, p + 1))} disabled={currentPage >= scanTotalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16}/></button></div></div>
        </>
      ) : (
        <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Cari Resi / Nama..." className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-purple-200 focus:border-purple-400 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>{searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>)}</div></div>
            <div className="flex-1 overflow-x-auto p-2 bg-gray-50"><div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-w-[1000px]"><table className="w-full text-left border-collapse"><thead className="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200"><tr><th className="px-3 py-2 w-28">Tanggal</th><th className="px-3 py-2 w-32">Resi / Toko</th><th className="px-3 py-2 w-24">Via</th> <th className="px-3 py-2 w-32">Pelanggan</th><th className="px-3 py-2 w-28">Part No.</th><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right w-16">Qty</th><th className="px-3 py-2 text-right w-24">Satuan</th><th className="px-3 py-2 text-right w-24">Total</th>{activeTab === 'history' ? (<><th className="px-3 py-2 w-24 bg-red-50/50 text-red-600 border-l border-red-100">Tgl Retur</th><th className="px-3 py-2 text-center w-24 bg-red-50/50 text-red-600">Status</th></>) : (<th className="px-3 py-2 text-center w-24">Status</th>)}<th className="px-3 py-2 text-center w-32">{activeTab === 'history' ? 'Ket' : 'Aksi'}</th></tr></thead><tbody className="divide-y divide-gray-100 text-xs">{currentItems.length === 0 ? (<tr><td colSpan={13} className="p-8 text-center text-gray-400"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>Belum ada data</p></td></tr>) : (activeTab==='history' ? (currentItems as ReturRecord[]).map(retur => { const dtOrder = formatDate(retur.tanggal_pemesanan||''); const dtRetur = formatDate(retur.tanggal_retur); return (<tr key={`retur-${retur.id}`} className="hover:bg-red-50/20 transition-colors"><td className="px-3 py-2 align-top border-r border-gray-100"><div className="font-bold text-gray-900">{dtOrder.date}</div></td><td className="px-3 py-2 align-top font-mono text-[10px] text-gray-600"><div className="flex flex-col gap-1"><span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit">{retur.resi || '-'}</span>{retur.toko && <span className="uppercase text-gray-500 bg-gray-100 px-1 py-0.5 rounded w-fit">{retur.toko}</span>}</div></td><td className="px-3 py-2 align-top">{retur.ecommerce ? <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[9px] font-bold rounded border border-orange-100">{retur.ecommerce}</span> : '-'}</td><td className="px-3 py-2 align-top font-medium text-gray-900 truncate max-w-[120px]" title={retur.customer}>{retur.customer||'Guest'}</td><td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{retur.part_number||'-'}</td><td className="px-3 py-2 align-top text-gray-700 font-medium truncate max-w-[200px]" title={retur.nama_barang}>{retur.nama_barang}</td><td className="px-3 py-2 align-top text-right font-bold text-red-600">-{retur.quantity}</td><td className="px-3 py-2 align-top text-right font-mono text-[10px] text-gray-500">{formatRupiah(retur.harga_satuan)}</td><td className="px-3 py-2 align-top text-right font-mono text-[10px] font-bold text-gray-800">{formatRupiah(retur.harga_total)}</td><td className="px-3 py-2 align-top border-l border-red-100 bg-red-50/10"><div className="font-bold text-red-700 text-[10px]">{dtRetur.date}</div></td><td className="px-3 py-2 align-top text-center bg-red-50/10"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${retur.status==='Full Retur'?'bg-red-100 text-red-700 border-red-200':'bg-orange-100 text-orange-700 border-orange-200'}`}>{retur.status||'Retur'}</span></td><td className="px-3 py-2 align-top"><div className="flex items-start justify-between gap-1 group/edit"><div className="text-[10px] text-gray-600 italic truncate max-w-[100px]">{retur.keterangan||'-'}</div><button onClick={()=>openNoteModal(retur)} className="text-blue-500 hover:bg-blue-50 p-1 rounded opacity-0 group-hover/edit:opacity-100"><Edit3 size={12}/></button></div></td></tr>); }) : (currentItems as Order[]).map(order => { if(!order) return null; const {cleanName, resiText, ecommerce, shopName} = getOrderDetails(order); const isResi = !resiText.startsWith('#'); const dt = formatDate(order.timestamp); const items = Array.isArray(order.items) ? order.items : []; if(items.length===0) return null; return items.map((item, index) => { const dealPrice = item.customPrice ?? item.price ?? 0; const dealTotal = dealPrice * (item.cartQuantity || 0); const hasCustomPrice = item.customPrice !== undefined && item.customPrice !== item.price; return (<tr key={`${order.id}-${index}`} className="hover:bg-blue-50/10 transition-colors group">{index===0 && (<><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/10"><div className="font-bold text-gray-900">{dt.date}</div><div className="text-[9px] text-gray-400 font-mono">{dt.time}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 font-mono text-[10px] bg-white group-hover:bg-blue-50/10"><div className="flex flex-col gap-1"><span className={`px-1.5 py-0.5 rounded w-fit font-bold border ${isResi ? 'bg-blue-50 text-blue-700 border-blue-100' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>{resiText}</span>{shopName!=='-' && <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded w-fit border border-gray-200"><Store size={8}/><span className="uppercase truncate max-w-[80px]">{shopName}</span></div>}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/10">{ecommerce!=='-'?<div className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 w-fit text-[9px] font-bold">{ecommerce}</div>:<span className="text-gray-300">-</span>}</td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 font-medium text-gray-900 bg-white group-hover:bg-blue-50/10 truncate max-w-[120px]" title={cleanName}>{cleanName}</td></>)}<td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{item.partNumber||'-'}</td><td className="px-3 py-2 align-top text-gray-700 font-medium truncate max-w-[180px]" title={item.name}>{item.name}</td><td className="px-3 py-2 align-top text-right font-bold text-gray-800">{item.cartQuantity||0}</td><td className="px-3 py-2 align-top text-right text-gray-500 font-mono text-[10px]"><div className={hasCustomPrice?"text-orange-600 font-bold":""}>{formatRupiah(dealPrice)}</div></td><td className="px-3 py-2 align-top text-right font-bold text-gray-900 font-mono text-[10px]">{formatRupiah(dealTotal)}</td>{index===0 && (<><td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/10"><div className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase mb-1 shadow-sm ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div><div className="text-[10px] font-extrabold text-purple-700">{formatRupiah(order.totalAmount||0)}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/10"><div className="flex flex-col gap-1 items-center">{order.status==='pending' && (<><button onClick={()=>onUpdateStatus(order.id, 'processing')} className="w-full py-1 bg-purple-600 text-white text-[9px] font-bold rounded hover:bg-purple-700 shadow-sm flex items-center justify-center gap-1">Proses</button><button onClick={()=>onUpdateStatus(order.id, 'cancelled')} className="w-full py-1 bg-white border border-gray-300 text-gray-600 text-[9px] font-bold rounded hover:bg-red-50 hover:text-red-600">Tolak</button></>)}{order.status==='processing' && (<button onClick={()=>openReturnModal(order)} className="w-full py-1 bg-orange-50 border border-orange-200 text-orange-600 text-[9px] font-bold rounded hover:bg-orange-100 flex items-center justify-center gap-1">Retur</button>)}</div></td></>)}</tr>); }); }))}</tbody></table></div></div>
            <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500"><div>Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} data</div><div className="flex items-center gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16}/></button><span className="font-bold text-gray-900">Halaman {currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16}/></button></div></div>
        </>
      )}
    </div>
  );
};