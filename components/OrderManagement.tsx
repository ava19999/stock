// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, ReturRecord, ScanResiLog, InventoryItem } from '../types';
import { 
  Clock, CheckCircle, Package, ClipboardList, RotateCcw, Edit3, 
  ShoppingBag, Tag, Search, X, Store, Save, Loader, FileText, 
  AlertCircle, ChevronLeft, ChevronRight, ScanBarcode, CheckSquare, 
  FileSpreadsheet, Upload, Send, Square, ChevronDown, Check, Loader2, Edit2, XCircle, Camera,
  Plus, Trash2, List, RefreshCw
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
  updateScanResiLogField,
  duplicateScanResiLog, 
  deleteScanResiLog     
} from '../services/supabaseService';

// --- KONSTANTA SCAN RESI ---
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];
const MARKETPLACES = ['Shopee', 'Tiktok', 'Tokopedia', 'Lazada', 'Offline'];

// --- HELPER TIMEZONE ---

// 1. Untuk Tanggal Retur (SEKARANG) - Tetap gunakan WIB manual agar akurat saat diklik
const getWIBISOString = () => {
    const now = new Date();
    // Tambah 7 jam manual untuk waktu 'sekarang' agar sesuai WIB
    const wibOffset = 7 * 60 * 60 * 1000; 
    const wibDate = new Date(now.getTime() + wibOffset);
    return wibDate.toISOString().replace('Z', '');
};

// 2. Untuk Tanggal Pesanan (DARI DATABASE) - Gunakan Local ISO String
// Fungsi ini hanya mengubah format tampilan timestamp menjadi string ISO LOKAL
// Tanpa menambah/mengurangi jam secara manual, sehingga "22" tetap "22".
const getLocalISOString = (timestamp: number) => {
    const d = new Date(timestamp);
    // Trik untuk mendapatkan string ISO sesuai waktu lokal (bukan UTC)
    // getTimezoneOffset() mengembalikan selisih menit (negatif untuk WIB)
    const offsetMs = d.getTimezoneOffset() * 60000; 
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, -1);
};

// --- KOMPONEN TOAST LOCAL ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${type === 'success' ? 'bg-gray-800 border-gray-600 shadow-green-900/20' : 'bg-red-900/90 border-red-700'}`}>
      {type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2 text-red-300" />}
      {message}
    </div>
  );
};

interface OrderManagementProps {
  orders: Order[];
  isLoading?: boolean;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onProcessReturn: (orderId: string, returnedItems: { itemId: string, qty: number }[]) => void;
  onRefresh?: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [], isLoading = false, onUpdateStatus, onProcessReturn, onRefresh }) => {
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
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

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
  const [isDuplicating, setIsDuplicating] = useState<number | null>(null);

  // --- STATE AUTOCOMPLETE (FIXED & AUTO-FLIP) ---
  const [inventoryCache, setInventoryCache] = useState<InventoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null); 
  const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  // --- STATE INLINE EDIT ---
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECT ---
  useEffect(() => { fetchReturRecords().then(setReturDbRecords); }, [activeTab, orders]);

  useEffect(() => {
      if (activeTab === 'scan') {
          loadScanLogs();
          if (inventoryCache.length === 0) {
              fetchInventory().then(data => setInventoryCache(data));
          }
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

  // --- FUNGSI UPDATE FIELD DENGAN AUTO-SAVE ---
  const handleUpdateField = async (id: number, field: string, value: any) => {
    try {
      // Update lokal state
      setScanLogs(prev => prev.map(log => 
        log.id === id ? { ...log, [field]: value } : log
      ));
      
      // Jika field adalah quantity, hitung ulang harga_total
      if (field === 'quantity') {
        const log = scanLogs.find(l => l.id === id);
        if (log) {
          const newQuantity = parseFloat(value) || 0;
          const newHargaTotal = log.harga_satuan * newQuantity;
          
          // Update harga_total di state
          setScanLogs(prev => prev.map(log => 
            log.id === id ? { ...log, harga_total: newHargaTotal } : log
          ));
          
          // Simpan ke database
          await updateScanResiLogField(id, 'quantity', newQuantity);
          await updateScanResiLogField(id, 'harga_total', newHargaTotal);
          showToast(`Qty diperbarui & total dihitung ulang`, 'success');
          return;
        }
      }
      
      // Untuk field lainnya, langsung simpan
      await updateScanResiLogField(id, field, value);
      showToast(`${field} diperbarui`, 'success');
      
    } catch (error) {
      console.error(`Gagal update field ${field}:`, error);
      showToast(`Gagal update ${field}`, 'error');
      // Reload data untuk sync ulang
      loadScanLogs();
    }
  };

  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;
      setIsSavingLog(true);
      if (await addScanResiLog(scannedCode, selectedMarketplace, selectedStore)) {
          await loadScanLogs(); 
          setBarcodeInput('');
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

  // --- LOGIKA AUTOCOMPLETE (AUTO-FLIP) ---
  
  const updateAutocompleteState = (id: number, value: string, element?: HTMLElement) => {
      setActiveSearchId(id);

      if (element) {
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const requiredSpace = 220; 

          let newPos: { top?: number; bottom?: number; left: number; width: number } = {
              left: rect.left,
              width: Math.max(rect.width, 250) 
          };

          if (spaceBelow < requiredSpace && rect.top > requiredSpace) {
              newPos.bottom = viewportHeight - rect.top; 
          } else {
              newPos.top = rect.bottom; 
          }
          
          setPopupPos(newPos);
      }

      if (value && value.length >= 2) {
          const lowerVal = value.toLowerCase();
          const matches = inventoryCache
              .filter(item => item.partNumber && item.partNumber.toLowerCase().includes(lowerVal))
              .slice(0, 10);
          setSuggestions(matches);
      } else {
          setSuggestions([]);
      }
  };

  const handlePartNumberInput = (id: number, value: string, e: React.ChangeEvent<HTMLInputElement>) => {
      setScanLogs(prev => prev.map(log => log.id === id ? { ...log, part_number: value } : log));
      updateAutocompleteState(id, value, e.target);
  };

  const handleInputFocus = (id: number, e: React.FocusEvent<HTMLInputElement>) => {
      updateAutocompleteState(id, e.target.value, e.target);
  };

  const handleSuggestionClick = async (id: number, item: InventoryItem) => {
      setScanLogs(prev => prev.map(log => log.id === id ? { ...log, part_number: item.partNumber } : log));
      await updateScanResiLogField(id, 'part_number', item.partNumber);
      setActiveSearchId(null);
      setSuggestions([]);
  };

  const handleBlurInput = async (id: number, currentValue: string) => {
      setTimeout(async () => {
          if (activeSearchId === id) {
              setActiveSearchId(null);
          }
          await updateScanResiLogField(id, 'part_number', currentValue);
      }, 200);
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

                const resiRaw = getVal(['No. Resi', 'No. Pesanan', 'Resi', 'Order ID']);
                const usernameRaw = getVal(['Username (Pembeli)', 'Username Pembeli', 'Username', 'Pembeli', 'Nama Penerima']);
                let partNoRaw = getVal(['No. Referensi', 'Part Number', 'Part No', 'Kode Barang']);
                const produkRaw = getVal(['Nama Produk', 'Nama Barang', 'Product Name']);
                const qtyRaw = getVal(['Jumlah', 'Qty', 'Quantity']);
                const hargaRaw = getVal(['Harga Awal', 'Harga Satuan', 'Price', 'Harga', 'Harga Variasi']);

                const produkNameClean = String(produkRaw || '').trim();
                const produkLower = produkNameClean.toLowerCase();

                if ((!partNoRaw || partNoRaw === '-' || partNoRaw === '') && produkNameClean) {
                    const foundByExactName = inventoryMap.get(produkLower);
                    if (foundByExactName) partNoRaw = foundByExactName;
                    else {
                        const foundInText = allPartNumbers.find(pn => produkLower.includes(pn.toLowerCase()));
                        if (foundInText) partNoRaw = foundInText;
                        else {
                            const regexPartNo = /\b[A-Z0-9]{5,}-[A-Z0-9]{4,}\b/i;
                            const match = produkNameClean.match(regexPartNo);
                            if (match) partNoRaw = match[0].toUpperCase();
                        }
                    }
                }

                if (resiRaw) {
                    const finalResi = String(resiRaw).trim();
                    const finalCustomer = usernameRaw ? String(usernameRaw).trim() : '-';
                    const finalPartNo = (partNoRaw && partNoRaw !== '-') ? String(partNoRaw).trim() : null; 
                    const finalBarang = produkRaw ? String(produkRaw).trim() : '-';
                    const finalQty = parseIndonesianNumber(qtyRaw);
                    const finalHargaSatuan = parseIndonesianNumber(hargaRaw);
                    const finalHargaTotal = finalQty * finalHargaSatuan;

                    const statusFinal = 'Pending';

                    return {
                        resi: finalResi,
                        toko: selectedStore,          
                        ecommerce: selectedMarketplace, 
                        customer: finalCustomer,
                        part_number: finalPartNo, 
                        nama_barang: finalBarang,
                        quantity: finalQty,
                        harga_satuan: finalHargaSatuan,
                        harga_total: finalHargaTotal,
                        status: statusFinal
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

      const logsToProcess = scanLogs.filter(log => selectedResis.includes(log.resi));

      const invalidItem = logsToProcess.find(log => !log.part_number || log.part_number.trim() === '' || log.part_number === '-');
      if (invalidItem) {
          showToast(`Gagal: Resi ${invalidItem.resi} belum ada Part Number!`, 'error');
          return;
      }

      setIsProcessingShipment(true);
      
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

  const handleDuplicate = async (id: number) => {
      setIsDuplicating(id);
      if (await duplicateScanResiLog(id)) {
          showToast("Item diduplikasi & harga dibagi.", 'success');
          await loadScanLogs();
      } else {
          showToast("Gagal menduplikasi.", 'error');
      }
      setIsDuplicating(null);
  };

  const handleDeleteLog = async (id: number) => {
      if (window.confirm("Yakin ingin menghapus item ini?")) {
          if (await deleteScanResiLog(id)) {
              showToast("Item dihapus.", 'success');
              await loadScanLogs();
          } else {
              showToast("Gagal menghapus.", 'error');
          }
      }
  };

  const toggleSelect = (resi: string) => {
      setSelectedResis(prev => prev.includes(resi) ? prev.filter(r => r !== resi) : [...prev, resi]);
  };

  const getMarketplaceColor = (mp: string) => {
    switch(mp) {
        case 'Shopee': return 'bg-orange-900/30 text-orange-300 border-orange-800';
        case 'Tokopedia': return 'bg-green-900/30 text-green-300 border-green-800';
        case 'Tiktok': return 'bg-gray-700 text-white border-gray-600';
        default: return 'bg-gray-700 text-gray-300 border-gray-600';
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
      setIsProcessingReturn(true); // Ubah loading lokal

      try {
        const { resiText, shopName, ecommerce, cleanName } = getOrderDetails(selectedOrderForReturn);
        const combinedResiShop = `${resiText} / ${shopName}`;
        
        // --- PERBAIKAN LOGIKA TANGGAL (V4 - LOCAL ISO) ---
        // Jika timestamp pesanan ada, gunakan getLocalISOString agar hasilnya sesuai "apa yang terlihat"
        // di komputer user (tidak dikonversi ke UTC yang membuatnya mundur sehari).
        const orderTimestamp = selectedOrderForReturn.timestamp 
            ? getLocalISOString(selectedOrderForReturn.timestamp) 
            : getWIBISOString();
        
        // Tanggal retur saat ini (WIB Manual)
        const currentReturDate = getWIBISOString();

        const remainingItems = selectedOrderForReturn.items.map(item => {
            const returItem = itemsToReturnData.find(r => r.id === item.id);
            const qtyReturned = returItem ? returItem.cartQuantity : 0;
            return { ...item, cartQuantity: (item.cartQuantity || 0) - qtyReturned };
        }).filter(item => (item.cartQuantity || 0) > 0);

        const statusLabel = remainingItems.length === 0 ? 'Full Retur' : 'Retur Sebagian';

        for (const item of itemsToReturnData) {
            const hargaSatuan = item.customPrice ?? item.price ?? 0;
            const realItem = await getItemByPartNumber(item.partNumber);
            if (realItem) {
                await updateInventory({ ...realItem, quantity: realItem.quantity }, {
                    type: 'in', qty: item.cartQuantity, ecommerce, resiTempo: combinedResiShop, customer: cleanName, price: hargaSatuan, isReturn: true 
                });
            }
            const returData: ReturRecord = {
                tanggal_pemesanan: orderTimestamp, 
                resi: resiText, 
                toko: shopName, 
                ecommerce, 
                customer: cleanName,
                part_number: item.partNumber, 
                nama_barang: item.name, 
                quantity: item.cartQuantity,
                harga_satuan: hargaSatuan, 
                harga_total: hargaSatuan * item.cartQuantity, 
                tanggal_retur: currentReturDate, 
                status: statusLabel, 
                keterangan: 'Retur Barang'
            };
            await addReturTransaction(returData);
        }

        if (remainingItems.length === 0) {
            await updateOrderData(selectedOrderForReturn.id, selectedOrderForReturn.items, selectedOrderForReturn.totalAmount, 'cancelled');
        } else {
            const returnTotal = itemsToReturnData.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            await saveOrder({ 
                id: `${selectedOrderForReturn.id}-RET-${Date.now()}`, 
                customerName: `${selectedOrderForReturn.customerName} (RETUR)`, 
                items: itemsToReturnData, 
                totalAmount: returnTotal, 
                status: 'cancelled', 
                timestamp: Date.now() 
            });
            
            const remainingTotal = remainingItems.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            await updateOrderData(selectedOrderForReturn.id, remainingItems, remainingTotal, 'processing');
        }

        setIsReturnModalOpen(false); setSelectedOrderForReturn(null); setActiveTab('history');
        if (onRefresh) onRefresh();
      } catch (error) { console.error("Error processing return:", error); } 
      finally { setIsProcessingReturn(false); }
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

  const filteredScanLogs = useMemo(() => {
      if (!scanLogs) return [];
      return scanLogs.filter(log => 
          !searchTerm || 
          log.resi.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (log.customer && log.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (log.nama_barang && log.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [scanLogs, searchTerm]);

  const scanTotalItems = filteredScanLogs.length;
  const scanTotalPages = Math.ceil(scanTotalItems / itemsPerPage);
  const scanStartIndex = (currentPage - 1) * itemsPerPage;
  const scanCurrentItems = filteredScanLogs.slice(scanStartIndex, scanStartIndex + itemsPerPage);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) { case 'pending': return 'bg-amber-900/30 text-amber-400 border-amber-900/50'; case 'processing': return 'bg-blue-900/30 text-blue-400 border-blue-900/50'; case 'completed': return 'bg-green-900/30 text-green-400 border-green-900/50'; case 'cancelled': return 'bg-red-900/30 text-red-400 border-red-900/50'; default: return 'bg-gray-700 text-gray-300'; }
  };
  const getStatusLabel = (status: OrderStatus) => {
      if (status === 'cancelled') return 'RETUR / BATAL'; if (status === 'completed') return 'SELESAI'; if (status === 'processing') return 'TERJUAL'; if (status === 'pending') return 'BARU'; return status;
  };
  const formatDate = (ts: number | string) => { try { const d = new Date(ts || Date.now()); return { date: d.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}), time: d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) }; } catch (e) { return {date:'-', time:'-'}; } };
  const readyToSendCount = selectedResis.length;

  return (
    <div className="bg-gray-800 rounded-2xl shadow-sm border border-gray-700 min-h-[80vh] flex flex-col overflow-hidden relative text-gray-100">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* MODALS */}
      {isNoteModalOpen && editingNoteData && ( <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-gray-700"><div className="bg-purple-900/30 px-4 py-3 border-b border-purple-800 flex justify-between items-center"><h3 className="text-base font-bold text-purple-300 flex items-center gap-2"><FileText size={18}/> Edit Keterangan</h3><button onClick={() => setIsNoteModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-200"/></button></div><div className="p-4"><textarea className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-900/50 outline-none text-sm min-h-[100px] text-gray-100 placeholder-gray-500" placeholder="Masukkan alasan atau catatan..." value={noteText} onChange={(e) => setNoteText(e.target.value)} /></div><div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-2"><button onClick={() => setIsNoteModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-gray-700 rounded-lg">Batal</button><button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow flex items-center gap-2">{isSavingNote ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Simpan</button></div></div></div> )}
      {isReturnModalOpen && selectedOrderForReturn && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"><div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90%] border border-gray-700"><div className="bg-orange-900/30 px-4 py-3 border-b border-orange-800 flex justify-between items-center"><h3 className="text-base font-bold text-orange-300 flex items-center gap-2"><RotateCcw size={18}/> Retur Barang</h3><button onClick={() => setIsReturnModalOpen(false)}><X size={18} className="text-orange-400 hover:text-orange-200"/></button></div><div className="p-4 overflow-y-auto text-sm"><div className="space-y-2">{selectedOrderForReturn.items.map((item) => (<div key={item.id} className="flex items-center justify-between p-2 border border-gray-700 rounded-lg hover:border-orange-700/50"><div className="flex-1"><div className="font-bold text-gray-200 text-xs">{item.name}</div><div className="text-[10px] text-gray-500 font-mono">{item.partNumber}</div></div><div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700"><button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))} className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded shadow-sm hover:bg-red-900/50 text-gray-300 font-bold">-</button><div className="w-6 text-center font-bold text-sm text-gray-200">{returnQuantities[item.id] || 0}</div><button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.min(item.cartQuantity || 0, (prev[item.id] || 0) + 1)}))} className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded shadow-sm hover:bg-green-900/50 text-gray-300 font-bold">+</button></div></div>))}</div></div><div className="p-3 border-t border-gray-700 bg-gray-900/50 flex justify-end gap-2"><button onClick={() => setIsReturnModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-gray-700 rounded-lg">Batal</button><button onClick={handleProcessReturn} disabled={isProcessingReturn} className="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-lg shadow flex items-center gap-2">{isProcessingReturn ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Proses</button></div></div></div> )}

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
          <div><h2 className="text-lg font-bold text-gray-100 flex items-center gap-2"><ClipboardList className="text-purple-400" size={20} /> Manajemen Pesanan</h2></div>
          
          {/* INDIKATOR LOADING/REFRESH */}
          <div className="flex items-center gap-3">
              {isLoading && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 text-blue-400 rounded-full border border-blue-900/50 animate-pulse">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs font-medium">Sinkronisasi Data...</span>
                  </div>
              )}
          </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-700 bg-gray-900/50">
          {[{ id: 'pending', label: 'Baru', icon: Clock, count: safeOrders.filter(o=>o?.status==='pending').length, color: 'text-amber-400' }, { id: 'scan', label: 'Scan Resi', icon: ScanBarcode, count: 0, color: 'text-gray-300' }, { id: 'processing', label: 'Terjual', icon: Package, count: 0, color: 'text-blue-400' }, { id: 'history', label: 'Retur', icon: CheckCircle, count: returDbRecords.length, color: 'text-red-400' }].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-gray-800 relative ${activeTab === tab.id ? `border-purple-500 text-purple-400 bg-gray-800` : 'border-transparent text-gray-500 hover:text-gray-300'}`}><tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} /><span>{tab.label}</span>{tab.id === 'pending' && tab.count > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{tab.count}</span>}</button>
          ))}
      </div>

      {/* SEARCH BAR */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
          <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder={activeTab === 'scan' ? "Cari Resi / Pelanggan..." : "Cari Pesanan..."} className="w-full pl-9 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:ring-1 focus:ring-purple-900 focus:border-purple-500 outline-none transition-all text-white placeholder-gray-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"><X size={12} /></button>)}
          </div>
      </div>

      {/* CONTENT */}
      {activeTab === 'scan' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            {/* HEADER SCAN RESI */}
            <div className="bg-gray-800 p-3 shadow-sm border-b border-gray-700 z-20">
                <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                        <select value={selectedStore} onChange={(e) => { setSelectedStore(e.target.value); barcodeInputRef.current?.focus(); }} className="bg-gray-700 border border-gray-600 text-gray-200 text-xs font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none">
                            {STORE_LIST.map(store => <option key={store} value={store}>{store}</option>)}
                        </select>
                        <div className="relative flex">
                            <button onClick={() => setShowMarketplacePopup(!showMarketplacePopup)} className={`flex items-center justify-between w-full gap-2 px-2 py-2 text-xs font-bold border rounded-lg transition-colors ${getMarketplaceColor(selectedMarketplace)}`}>
                                <span className="truncate">{selectedMarketplace}</span>
                                <ChevronDown className="w-3 h-3 text-gray-300 flex-shrink-0" />
                            </button>
                            {showMarketplacePopup && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-gray-800 rounded-xl shadow-xl border border-gray-700 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
                                    {MARKETPLACES.map((mp) => (
                                        <button key={mp} onClick={() => { setSelectedMarketplace(mp); setShowMarketplacePopup(false); barcodeInputRef.current?.focus(); }} className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-700 border-b border-gray-700 last:border-0 ${selectedMarketplace === mp ? 'text-blue-400 font-bold bg-blue-900/20' : 'text-gray-300'}`}>
                                            {mp}
                                            {selectedMarketplace === mp && <Check className="w-3 h-3"/>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                {isSavingLog ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> : <ScanBarcode className="w-4 h-4 text-gray-400" />}
                            </div>
                            <input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeInput} className="bg-gray-700 border border-gray-600 text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block w-full pl-9 p-2 font-mono font-medium shadow-sm placeholder-gray-500" placeholder="Scan Barcode..." autoComplete="off" disabled={isSavingLog} />
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex-shrink-0 bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 rounded-lg p-2 flex items-center justify-center">
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        </button>
                        <button onClick={() => cameraInputRef.current?.click()} disabled={analyzing} className="flex-shrink-0 bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 rounded-lg p-2 flex items-center justify-center">
                            {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                        </button>
                        <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                        <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
                    </div>

                    {readyToSendCount > 0 && (
                        <button onClick={handleProcessKirim} disabled={isProcessingShipment} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                            {isProcessingShipment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                            Proses Kirim ({readyToSendCount} Resi)
                        </button>
                    )}
                </div>
            </div>

            {/* TABEL SCAN RESI */}
            <div className="flex-1 overflow-auto p-2">
                {scanCurrentItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
                        <ScanBarcode size={40} className="opacity-20"/>
                        <p className="text-sm">Belum ada resi yang di-scan</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE VIEW */}
                        <div className="md:hidden space-y-3 pb-20">
                            {scanCurrentItems.map((log) => {
                                const isReady = log.status === 'Siap Kirim';
                                const isSold = log.status === 'Terjual';
                                const isSelected = selectedResis.includes(log.resi);
                                const isComplete = !!log.part_number && !!log.nama_barang && !!log.quantity;

                                return (
                                    <div key={log.id} className={`bg-gray-800 p-3 rounded-xl border shadow-sm transition-all ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-gray-700'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {!isSold && (
                                                    <button onClick={() => toggleSelect(log.resi)} disabled={!isReady} className="p-1 -ml-1">
                                                        {isSelected ? <CheckSquare size={20} className="text-blue-500"/> : <Square size={20} className={isReady ? "text-gray-500" : "text-gray-600"}/>}
                                                    </button>
                                                )}
                                                <div>
                                                    <div className="font-mono font-bold text-gray-200 text-sm">{log.resi}</div>
                                                    <div className="text-[10px] text-gray-500">{new Date(log.tanggal).toLocaleString('id-ID')}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {!isSold && (
                                                    <>
                                                    <button onClick={() => handleDuplicate(log.id!)} className="p-1 bg-gray-700 rounded hover:bg-gray-600 text-blue-400">
                                                        {isDuplicating === log.id ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                                                    </button>
                                                    <button onClick={() => handleDeleteLog(log.id!)} className="p-1 bg-gray-700 rounded hover:bg-red-900/50 text-red-400">
                                                        <Trash2 size={14}/>
                                                    </button>
                                                    </>
                                                )}
                                                {isSold ? (
                                                    <span className="bg-gray-700 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full">Terjual</span>
                                                ) : isReady ? (
                                                    <span className="bg-green-900/30 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Check size={10}/> Siap</span>
                                                ) : isComplete ? (
                                                    <span className="bg-red-900/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircle size={10}/> Belum Scan</span>
                                                ) : (
                                                    <span className="bg-red-900/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircle size={10}/> Belum Upload</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                            <div className="bg-gray-700/50 p-1.5 rounded border border-gray-700">
                                                <span className="block text-[9px] text-gray-500 uppercase">Toko</span>
                                                <span className="font-bold text-gray-300 truncate block">{log.toko || '-'}</span>
                                            </div>
                                            <div className="bg-gray-700/50 p-1.5 rounded border border-gray-700">
                                                <span className="block text-[9px] text-gray-500 uppercase">Via</span>
                                                <span className="font-bold text-gray-300 truncate block">{log.ecommerce || '-'}</span>
                                            </div>
                                        </div>

                                        {/* INLINE EDIT MOBILE */}
                                        <div className="space-y-1 mb-2">
                                            {/* Pelanggan */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">Pelanggan</span>
                                                {editingCell?.id === log.id && editingCell?.field === 'customer' ? (
                                                    <input
                                                        className="flex-1 bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs"
                                                        value={log.customer || ''}
                                                        onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                            l.id === log.id ? { ...l, customer: e.target.value } : l
                                                        ))}
                                                        onBlur={(e) => {
                                                            handleUpdateField(log.id!, 'customer', e.target.value);
                                                            setEditingCell(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateField(log.id!, 'customer', (e.target as HTMLInputElement).value);
                                                                setEditingCell(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingCell(null);
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span 
                                                        className="text-xs font-medium text-gray-300 flex-1 cursor-text hover:text-blue-300"
                                                        onClick={() => !isSold && setEditingCell({id: log.id!, field: 'customer'})}
                                                    >
                                                        {log.customer || '-'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Produk */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">Produk</span>
                                                {editingCell?.id === log.id && editingCell?.field === 'nama_barang' ? (
                                                    <input
                                                        className="flex-1 bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs"
                                                        value={log.nama_barang || ''}
                                                        onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                            l.id === log.id ? { ...l, nama_barang: e.target.value } : l
                                                        ))}
                                                        onBlur={(e) => {
                                                            handleUpdateField(log.id!, 'nama_barang', e.target.value);
                                                            setEditingCell(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateField(log.id!, 'nama_barang', (e.target as HTMLInputElement).value);
                                                                setEditingCell(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingCell(null);
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span 
                                                        className="text-xs font-medium text-gray-300 flex-1 cursor-text hover:text-blue-300"
                                                        onClick={() => !isSold && setEditingCell({id: log.id!, field: 'nama_barang'})}
                                                    >
                                                        {log.nama_barang || '-'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Part Number */}
                                            <div className="flex items-center gap-2 relative">
                                                <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">Part No</span>
                                                <div className="flex-1 relative">
                                                    {!isSold ? (
                                                        <input className="w-full bg-gray-700 border-b border-gray-600 focus:border-blue-500 text-xs py-0.5 px-1 font-mono outline-none text-gray-200" 
                                                            placeholder="Isi Part Number" 
                                                            value={log.part_number || ''} 
                                                            onChange={(e) => handlePartNumberInput(log.id!, e.target.value, e)}
                                                            onFocus={(e) => handleInputFocus(log.id!, e)}
                                                            onBlur={(e) => handleBlurInput(log.id!, e.target.value)}
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-mono text-gray-400">{log.part_number || '-'}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Qty */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-12 flex-shrink-0">Info</span>
                                                {editingCell?.id === log.id && editingCell?.field === 'quantity' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            className="w-16 bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs text-center"
                                                            value={log.quantity || 0}
                                                            onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                                l.id === log.id ? { ...l, quantity: parseFloat(e.target.value) || 0 } : l
                                                            ))}
                                                            onBlur={(e) => {
                                                                handleUpdateField(log.id!, 'quantity', parseFloat(e.target.value) || 0);
                                                                setEditingCell(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateField(log.id!, 'quantity', parseFloat((e.target as HTMLInputElement).value) || 0);
                                                                    setEditingCell(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCell(null);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                        <span className="text-xs text-gray-400">@{formatRupiah(log.harga_satuan)}</span>
                                                    </div>
                                                ) : (
                                                    <span 
                                                        className="text-xs text-gray-400 cursor-text hover:text-blue-300"
                                                        onClick={() => !isSold && setEditingCell({id: log.id!, field: 'quantity'})}
                                                    >
                                                        {log.quantity}x @{formatRupiah(log.harga_satuan)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP VIEW */}
                        <div className="hidden md:block bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-visible min-w-[1000px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-800 sticky top-0 z-10 shadow-sm text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-700 w-10 text-center"><CheckSquare size={16} className="text-gray-600 mx-auto"/></th>
                                        <th className="px-4 py-3 border-b border-gray-700">Tanggal</th>
                                        <th className="px-4 py-3 border-b border-gray-700">Resi</th>
                                        <th className="px-4 py-3 border-b border-gray-700">Toko</th>
                                        <th className="px-4 py-3 border-b border-gray-700">Via</th>
                                        <th className="px-4 py-3 border-b border-gray-700">Pelanggan</th>
                                        <th className="px-4 py-3 border-b border-gray-700 min-w-[150px]">Part.No (Edit)</th>
                                        <th className="px-4 py-3 border-b border-gray-700">Barang</th>
                                        <th className="px-4 py-3 border-b border-gray-700 text-center">Qty</th>
                                        <th className="px-4 py-3 border-b border-gray-700 text-right">Total</th>
                                        <th className="px-4 py-3 border-b border-gray-700 text-center">Status</th>
                                        <th className="px-4 py-3 border-b border-gray-700 text-center w-10">+</th>
                                        <th className="px-4 py-3 border-b border-gray-700 text-center w-10">Hapus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700 text-xs">
                                    {scanCurrentItems.map((log, idx) => {
                                        const dateObj = new Date(log.tanggal);
                                        const displayDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                        const isReady = log.status === 'Siap Kirim';
                                        const isSold = log.status === 'Terjual';
                                        const isSelected = selectedResis.includes(log.resi);
                                        const isComplete = !!log.part_number && !!log.nama_barang && !!log.quantity;

                                        return (
                                            <tr key={log.id || idx} className={`transition-colors ${isSold ? 'bg-gray-900/50 opacity-60' : (isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-700/50')}`}>
                                                <td className="px-4 py-3 text-center">
                                                    {!isSold && (
                                                        <button onClick={() => toggleSelect(log.resi)} disabled={!isReady} className="focus:outline-none">
                                                            {isSelected ? <CheckSquare size={16} className="text-blue-500"/> : <Square size={16} className={isReady ? "text-gray-500 hover:text-blue-400" : "text-gray-600 cursor-not-allowed"}/>}
                                                        </button>
                                                    )}
                                                    {isSold && <Check size={16} className="text-green-500 mx-auto"/>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{displayDate}</td>
                                                <td className="px-4 py-3 font-bold text-gray-200 font-mono select-all">{log.resi}</td>
                                                <td className="px-4 py-3 text-gray-400 font-semibold">{log.toko || '-'}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-700 text-gray-300 border-gray-600">{log.ecommerce}</span></td>
                                                
                                                {/* Kolom Pelanggan - Desktop */}
                                                <td className="px-4 py-3">
                                                    {editingCell?.id === log.id && editingCell?.field === 'customer' ? (
                                                        <input
                                                            className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs"
                                                            value={log.customer || ''}
                                                            onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                                l.id === log.id ? { ...l, customer: e.target.value } : l
                                                            ))}
                                                            onBlur={(e) => {
                                                                handleUpdateField(log.id!, 'customer', e.target.value);
                                                                setEditingCell(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateField(log.id!, 'customer', (e.target as HTMLInputElement).value);
                                                                    setEditingCell(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCell(null);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="cursor-text text-gray-300 font-medium hover:text-blue-300 transition-colors"
                                                            onClick={() => !isSold && setEditingCell({id: log.id!, field: 'customer'})}
                                                        >
                                                            {log.customer || '-'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Kolom Part Number - Desktop */}
                                                <td className="px-4 py-3 relative">
                                                    <div className="flex items-center gap-1 relative">
                                                        {!isSold ? (
                                                            <input 
                                                                className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full font-mono text-gray-300 placeholder-red-900/50" 
                                                                placeholder="Part Number" 
                                                                value={log.part_number || ''} 
                                                                onChange={(e) => handlePartNumberInput(log.id!, e.target.value, e)} 
                                                                onFocus={(e) => handleInputFocus(log.id!, e)}
                                                                onBlur={(e) => handleBlurInput(log.id!, e.target.value)}
                                                            />
                                                        ) : (<span className="font-mono text-gray-400 break-all">{log.part_number}</span>)}
                                                        {!!log.part_number && <Search size={10} className="text-blue-400 flex-shrink-0" title="Terdeteksi Otomatis"/>}
                                                    </div>
                                                </td>

                                                {/* Kolom Barang - Desktop */}
                                                <td className="px-4 py-3 text-gray-400 whitespace-normal">
                                                    {editingCell?.id === log.id && editingCell?.field === 'nama_barang' ? (
                                                        <input
                                                            className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs"
                                                            value={log.nama_barang || ''}
                                                            onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                                l.id === log.id ? { ...l, nama_barang: e.target.value } : l
                                                            ))}
                                                            onBlur={(e) => {
                                                                handleUpdateField(log.id!, 'nama_barang', e.target.value);
                                                                setEditingCell(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateField(log.id!, 'nama_barang', (e.target as HTMLInputElement).value);
                                                                    setEditingCell(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCell(null);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="cursor-text hover:text-blue-300 transition-colors"
                                                            onClick={() => !isSold && setEditingCell({id: log.id!, field: 'nama_barang'})}
                                                            title={log.nama_barang || ''}
                                                        >
                                                            {log.nama_barang || '-'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Kolom Qty - Desktop */}
                                                <td className="px-4 py-3 text-center">
                                                    {editingCell?.id === log.id && editingCell?.field === 'quantity' ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs text-center"
                                                            value={log.quantity || 0}
                                                            onChange={(e) => setScanLogs(prev => prev.map(l => 
                                                                l.id === log.id ? { ...l, quantity: parseFloat(e.target.value) || 0 } : l
                                                            ))}
                                                            onBlur={(e) => {
                                                                handleUpdateField(log.id!, 'quantity', parseFloat(e.target.value) || 0);
                                                                setEditingCell(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateField(log.id!, 'quantity', parseFloat((e.target as HTMLInputElement).value) || 0);
                                                                    setEditingCell(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingCell(null);
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="cursor-text text-gray-400 hover:text-blue-300 transition-colors"
                                                            onClick={() => !isSold && setEditingCell({id: log.id!, field: 'quantity'})}
                                                        >
                                                            {log.quantity || '-'}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Kolom Total - Desktop (auto update berdasarkan qty) */}
                                                <td className="px-4 py-3 text-gray-200 font-bold text-right">
                                                    {log.harga_total ? `Rp${log.harga_total.toLocaleString('id-ID')}` : '-'}
                                                </td>

                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {isSold ? (
                                                        <span className="inline-flex items-center gap-1 text-gray-400 font-bold bg-gray-700 px-2 py-0.5 rounded-full text-[10px]">Terjual</span>
                                                    ) : isReady ? (
                                                        <span className="inline-flex items-center gap-1 text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800 text-[10px]"><Check size={10}/> Siap Kirim</span>
                                                    ) : isComplete ? (
                                                        <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-900/30 px-2 py-0.5 rounded-full border border-red-800 text-[10px]"><XCircle size={10}/> Belum Scan</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-900/30 px-2 py-0.5 rounded-full border border-red-800 text-[10px]"><XCircle size={10}/> Belum Upload</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {!isSold && (
                                                        <button onClick={() => handleDuplicate(log.id!)} className="p-1 hover:bg-gray-600 rounded text-blue-400 transition-colors" title="Duplikat Item">
                                                            {isDuplicating === log.id ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {!isSold && (
                                                        <button onClick={() => handleDeleteLog(log.id!)} className="p-1 hover:bg-red-900/50 rounded text-red-400 transition-colors" title="Hapus Item">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* PAGINATION */}
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500 sticky bottom-0 z-30">
                <div>Menampilkan {scanStartIndex + 1}-{Math.min(scanStartIndex + itemsPerPage, scanTotalItems)} dari {scanTotalItems} data</div>
                <div className="flex items-center gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16}/></button><span className="font-bold text-gray-200">Halaman {currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16}/></button></div></div>
        </div>
      ) : (
        <>
            <div className="flex-1 overflow-x-auto p-2 bg-gray-900"><div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden min-w-[1000px]"><table className="w-full text-left border-collapse"><thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700"><tr><th className="px-3 py-2 w-28">Tanggal</th><th className="px-3 py-2 w-32">Resi / Toko</th><th className="px-3 py-2 w-24">Via</th> <th className="px-3 py-2 w-32">Pelanggan</th><th className="px-3 py-2 w-28">Part No.</th><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right w-16">Qty</th><th className="px-3 py-2 text-right w-24">Satuan</th><th className="px-3 py-2 text-right w-24">Total</th>{activeTab === 'history' ? (<><th className="px-3 py-2 w-24 bg-red-900/20 text-red-400 border-l border-red-800">Tgl Retur</th><th className="px-3 py-2 text-center w-24 bg-red-900/20 text-red-400">Status</th></>) : (<th className="px-3 py-2 text-center w-24">Status</th>)}<th className="px-3 py-2 text-center w-32">{activeTab === 'history' ? 'Ket' : 'Aksi'}</th></tr></thead><tbody className="divide-y divide-gray-700 text-xs">{currentItems.length === 0 ? (<tr><td colSpan={13} className="p-8 text-center text-gray-500"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>Belum ada data</p></td></tr>) : (activeTab==='history' ? (currentItems as ReturRecord[]).map(retur => { const dtOrder = formatDate(retur.tanggal_pemesanan||''); const dtRetur = formatDate(retur.tanggal_retur); return (<tr key={`retur-${retur.id}`} className="hover:bg-red-900/10 transition-colors"><td className="px-3 py-2 align-top border-r border-gray-700"><div className="font-bold text-gray-200">{dtOrder.date}</div></td><td className="px-3 py-2 align-top font-mono text-[10px] text-gray-400"><div className="flex flex-col gap-1"><span className="font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-800 w-fit">{retur.resi || '-'}</span>{retur.toko && <span className="uppercase text-gray-400 bg-gray-700 px-1 py-0.5 rounded w-fit">{retur.toko}</span>}</div></td><td className="px-3 py-2 align-top">{retur.ecommerce ? <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 text-[9px] font-bold rounded border border-orange-800">{retur.ecommerce}</span> : '-'}</td><td className="px-3 py-2 align-top font-medium text-gray-200 truncate max-w-[120px]" title={retur.customer}>{retur.customer||'Guest'}</td><td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{retur.part_number||'-'}</td><td className="px-3 py-2 align-top text-gray-300 font-medium truncate max-w-[200px]" title={retur.nama_barang}>{retur.nama_barang}</td><td className="px-3 py-2 align-top text-right font-bold text-red-400">-{retur.quantity}</td><td className="px-3 py-2 align-top text-right font-mono text-[10px] text-gray-500">{formatRupiah(retur.harga_satuan)}</td><td className="px-3 py-2 align-top text-right font-mono text-[10px] font-bold text-gray-300">{formatRupiah(retur.harga_total)}</td><td className="px-3 py-2 align-top border-l border-red-800 bg-red-900/10"><div className="font-bold text-red-400 text-[10px]">{dtRetur.date}</div></td><td className="px-3 py-2 align-top text-center bg-red-900/10"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${retur.status==='Full Retur'?'bg-red-900/30 text-red-400 border-red-800':'bg-orange-900/30 text-orange-400 border-orange-800'}`}>{retur.status||'Retur'}</span></td><td className="px-3 py-2 align-top"><div className="flex items-start justify-between gap-1 group/edit"><div className="text-[10px] text-gray-500 italic truncate max-w-[100px]">{retur.keterangan||'-'}</div><button onClick={()=>openNoteModal(retur)} className="text-blue-400 hover:bg-blue-900/50 p-1 rounded opacity-0 group-hover/edit:opacity-100"><Edit3 size={12}/></button></div></td></tr>); }) : (currentItems as Order[]).map(order => { if(!order) return null; const {cleanName, resiText, ecommerce, shopName} = getOrderDetails(order); const isResi = !resiText.startsWith('#'); const dt = formatDate(order.timestamp); const items = Array.isArray(order.items) ? order.items : []; if(items.length===0) return null; return items.map((item, index) => { const dealPrice = item.customPrice ?? item.price ?? 0; const dealTotal = dealPrice * (item.cartQuantity || 0); const hasCustomPrice = item.customPrice !== undefined && item.customPrice !== item.price; return (<tr key={`${order.id}-${index}`} className="hover:bg-blue-900/10 transition-colors group">{index===0 && (<><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className="font-bold text-gray-200">{dt.date}</div><div className="text-[9px] text-gray-500 font-mono">{dt.time}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 font-mono text-[10px] bg-gray-800 group-hover:bg-blue-900/10"><div className="flex flex-col gap-1"><span className={`px-1.5 py-0.5 rounded w-fit font-bold border ${isResi ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'text-gray-500 bg-gray-700 border-gray-600'}`}>{resiText}</span>{shopName!=='-' && <div className="flex items-center gap-1 text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded w-fit border border-gray-600"><Store size={8}/><span className="uppercase truncate max-w-[80px]">{shopName}</span></div>}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 bg-gray-800 group-hover:bg-blue-900/10">{ecommerce!=='-'?<div className="px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-800 w-fit text-[9px] font-bold">{ecommerce}</div>:<span className="text-gray-600">-</span>}</td><td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 font-medium text-gray-200 bg-gray-800 group-hover:bg-blue-900/10 truncate max-w-[120px]" title={cleanName}>{cleanName}</td></>)}<td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{item.partNumber||'-'}</td><td className="px-3 py-2 align-top text-gray-300 font-medium truncate max-w-[180px]" title={item.name}>{item.name}</td><td className="px-3 py-2 align-top text-right font-bold text-gray-300">{item.cartQuantity||0}</td><td className="px-3 py-2 align-top text-right text-gray-500 font-mono text-[10px]"><div className={hasCustomPrice?"text-orange-400 font-bold":""}>{formatRupiah(dealPrice)}</div></td><td className="px-3 py-2 align-top text-right font-bold text-gray-200 font-mono text-[10px]">{formatRupiah(dealTotal)}</td>{index===0 && (<><td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase mb-1 shadow-sm ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div><div className="text-[10px] font-extrabold text-purple-400">{formatRupiah(order.totalAmount||0)}</div></td><td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className="flex flex-col gap-1 items-center">{order.status==='pending' && (<><button onClick={()=>onUpdateStatus(order.id, 'processing')} className="w-full py-1 bg-purple-700 text-white text-[9px] font-bold rounded hover:bg-purple-600 shadow-sm flex items-center justify-center gap-1">Proses</button><button onClick={()=>onUpdateStatus(order.id, 'cancelled')} className="w-full py-1 bg-gray-700 border border-gray-600 text-gray-400 text-[9px] font-bold rounded hover:bg-red-900/30 hover:text-red-400">Tolak</button></>)}{order.status==='processing' && (<button onClick={()=>openReturnModal(order)} className="w-full py-1 bg-orange-900/30 border border-orange-800 text-orange-400 text-[9px] font-bold rounded hover:bg-orange-800 flex items-center justify-center gap-1">Retur</button>)}</div></td></>)}</tr>); }); }))}</tbody></table></div></div>
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500"><div>Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} data</div><div className="flex items-center gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16}/></button><span className="font-bold text-gray-200">Halaman {currentPage}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16}/></button></div></div>
        </>
      )}

      {/* --- GLOBAL AUTOCOMPLETE POPUP (FIXED & FLIPPABLE) --- */}
      {activeSearchId !== null && suggestions.length > 0 && popupPos && (
          <div 
              className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto ring-1 ring-black/50"
              style={{ 
                  top: popupPos.top !== undefined ? `${popupPos.top}px` : 'auto', 
                  bottom: popupPos.bottom !== undefined ? `${popupPos.bottom}px` : 'auto',
                  left: `${popupPos.left}px`, 
                  width: `${popupPos.width}px` 
              }}
          >
              {suggestions.map((item, idx) => (
                  <div 
                    key={idx} 
                    onMouseDown={(e) => { 
                        e.preventDefault(); 
                        handleSuggestionClick(activeSearchId, item); 
                    }} 
                    className="px-3 py-2 text-xs hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 group transition-colors"
                  >
                      <div className="font-bold text-orange-400 font-mono text-sm group-hover:text-orange-300">
                          {item.partNumber}
                      </div>
                      <div className="text-gray-500 truncate group-hover:text-gray-300 text-[10px]">
                          {item.name}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};