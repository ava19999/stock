// FILE: src/components/orders/OrderScanView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InventoryItem, ScanResiLog } from '../../types';
import { 
  fetchInventory, fetchScanResiLogs, addScanResiLog, updateScanResiLogField, 
  importScanResiFromExcel, processShipmentToOrders, duplicateScanResiLog, deleteScanResiLog 
} from '../../services/supabaseService';
import { compressImage, formatRupiah } from '../../utils';
import { analyzeResiImage } from '../../services/geminiService';
import * as XLSX from 'xlsx';
import { 
  ScanBarcode, Loader2, Upload, Camera, Send, ChevronDown, Check, 
  CheckSquare, Square, Plus, Trash2, Search, XCircle 
} from 'lucide-react';

const STORE_LIST = ['MJM', 'LARIS', 'BJW'];
const MARKETPLACES = ['Shopee', 'Tiktok', 'Tokopedia', 'Lazada', 'Offline'];

interface OrderScanViewProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onRefreshParent: () => void;
  searchTerm: string;
}

export const OrderScanView: React.FC<OrderScanViewProps> = ({ onShowToast, onRefreshParent, searchTerm }) => {
  // --- STATE ---
  const [scanLogs, setScanLogs] = useState<ScanResiLog[]>([]);
  const [selectedResis, setSelectedResis] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('Shopee');
  const [showMarketplacePopup, setShowMarketplacePopup] = useState(false);
  const [inventoryCache, setInventoryCache] = useState<InventoryItem[]>([]);
  
  // Loading States
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Inline Edit & Autocomplete
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [popupPos, setPopupPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    loadScanLogs();
    if (inventoryCache.length === 0) fetchInventory().then(setInventoryCache);
    setTimeout(() => { barcodeInputRef.current?.focus(); }, 100);
  }, []);

  useEffect(() => {
      const autoChecked = scanLogs.filter(log => log.status === 'Siap Kirim').map(log => log.resi);
      setSelectedResis(autoChecked);
  }, [scanLogs]);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const loadScanLogs = async () => { setScanLogs(await fetchScanResiLogs()); };

  // --- HANDLERS UTAMA ---
  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;
      setIsSavingLog(true);
      if (await addScanResiLog(scannedCode, selectedMarketplace, selectedStore)) {
          await loadScanLogs(); 
          setBarcodeInput('');
      } else { onShowToast("Gagal menyimpan data.", 'error'); }
      setIsSavingLog(false);
    }
  };

  const handleProcessKirim = async () => {
    if (selectedResis.length === 0) return;
    const logsToProcess = scanLogs.filter(log => selectedResis.includes(log.resi));
    const invalidItem = logsToProcess.find(log => !log.part_number || log.part_number.trim() === '' || log.part_number === '-');
    if (invalidItem) { onShowToast(`Gagal: Resi ${invalidItem.resi} belum ada Part Number!`, 'error'); return; }

    setIsProcessingShipment(true);
    const result = await processShipmentToOrders(logsToProcess);
    if (result.success) {
        onShowToast("Berhasil diproses! Stok terupdate.", 'success');
        await loadScanLogs();
        setSelectedResis([]);
        onRefreshParent();
    } else { onShowToast(result.message || "Terjadi kesalahan.", 'error'); }
    setIsProcessingShipment(false);
  };

  const handleUpdateField = async (id: number, field: string, value: any) => {
    try {
      setScanLogs(prev => prev.map(log => log.id === id ? { ...log, [field]: value } : log));
      if (field === 'quantity') {
        const log = scanLogs.find(l => l.id === id);
        if (log) {
          const newQuantity = parseFloat(value) || 0;
          const newHargaTotal = log.harga_satuan * newQuantity;
          setScanLogs(prev => prev.map(log => log.id === id ? { ...log, harga_total: newHargaTotal } : log));
          await updateScanResiLogField(id, 'quantity', newQuantity);
          await updateScanResiLogField(id, 'harga_total', newHargaTotal);
          onShowToast(`Qty diperbarui & total dihitung ulang`, 'success');
          return;
        }
      }
      await updateScanResiLogField(id, field, value);
      onShowToast(`${field} diperbarui`, 'success');
    } catch (error) { onShowToast(`Gagal update ${field}`, 'error'); loadScanLogs(); }
  };

  const handleDuplicate = async (id: number) => {
    setIsDuplicating(id);
    if (await duplicateScanResiLog(id)) {
        onShowToast("Item diduplikasi & harga dibagi.", 'success');
        await loadScanLogs();
    } else { onShowToast("Gagal menduplikasi.", 'error'); }
    setIsDuplicating(null);
  };

  const handleDeleteLog = async (id: number) => {
    if (window.confirm("Yakin ingin menghapus item ini?")) {
        if (await deleteScanResiLog(id)) {
            onShowToast("Item dihapus.", 'success');
            await loadScanLogs();
        } else { onShowToast("Gagal menghapus.", 'error'); }
    }
  };

  // --- AUTOCOMPLETE LOGIC ---
  const updateAutocompleteState = (id: number, value: string, element?: HTMLElement) => {
    setActiveSearchId(id);
    if (element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const requiredSpace = 220; 
        let newPos: { top?: number; bottom?: number; left: number; width: number } = { left: rect.left, width: Math.max(rect.width, 250) };
        if (spaceBelow < requiredSpace && rect.top > requiredSpace) newPos.bottom = viewportHeight - rect.top; 
        else newPos.top = rect.bottom; 
        setPopupPos(newPos);
    }
    if (value && value.length >= 2) {
        const lowerVal = value.toLowerCase();
        const matches = inventoryCache.filter(item => item.partNumber && item.partNumber.toLowerCase().includes(lowerVal)).slice(0, 10);
        setSuggestions(matches);
    } else setSuggestions([]);
  };

  const handlePartNumberInput = (id: number, value: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setScanLogs(prev => prev.map(log => log.id === id ? { ...log, part_number: value } : log));
    updateAutocompleteState(id, value, e.target);
  };

  const handleSuggestionClick = async (id: number, item: InventoryItem) => {
    setScanLogs(prev => prev.map(log => log.id === id ? { ...log, part_number: item.partNumber } : log));
    await updateScanResiLogField(id, 'part_number', item.partNumber);
    setActiveSearchId(null); setSuggestions([]);
  };

  // --- FILE & CAMERA HANDLERS ---
  const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAnalyzing(true);
    try {
      const compressed = await compressImage(await readFileAsBase64(file));
      const analysis = await analyzeResiImage(compressed);
      if (analysis && analysis.resi) {
         if(await addScanResiLog(analysis.resi, selectedMarketplace, selectedStore)) {
             await loadScanLogs(); onShowToast(`Resi ${analysis.resi} tersimpan.`);
         }
      } else { onShowToast("Resi tidak terbaca.", 'error'); }
    } catch (error) { console.error(error); } 
    finally { setAnalyzing(false); if (cameraInputRef.current) cameraInputRef.current.value = ''; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
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
                    } return null;
                };
                const resiRaw = getVal(['No. Resi', 'No. Pesanan', 'Resi', 'Order ID']);
                let partNoRaw = getVal(['No. Referensi', 'Part Number', 'Part No', 'Kode Barang']);
                const produkRaw = getVal(['Nama Produk', 'Nama Barang', 'Product Name']);
                
                // (Logic parsing excel dipersingkat tapi fungsi sama)
                const produkNameClean = String(produkRaw || '').trim();
                const produkLower = produkNameClean.toLowerCase();
                if ((!partNoRaw || partNoRaw === '-' || partNoRaw === '') && produkNameClean) {
                    const foundByExactName = inventoryMap.get(produkLower);
                    if (foundByExactName) partNoRaw = foundByExactName;
                    else {
                        const foundInText = allPartNumbers.find(pn => produkLower.includes(pn.toLowerCase()));
                        if (foundInText) partNoRaw = foundInText;
                        else {
                            const match = produkNameClean.match(/\b[A-Z0-9]{5,}-[A-Z0-9]{4,}\b/i);
                            if (match) partNoRaw = match[0].toUpperCase();
                        }
                    }
                }

                if (resiRaw) {
                    const qty = parseFloat(String(getVal(['Jumlah', 'Qty'])).replace(/[^0-9,.-]/g, '').replace(',', '.') || '0');
                    const hrg = parseFloat(String(getVal(['Harga', 'Price'])).replace(/[^0-9,.-]/g, '').replace(',', '.') || '0');
                    return {
                        resi: String(resiRaw).trim(), toko: selectedStore, ecommerce: selectedMarketplace,
                        customer: getVal(['Username', 'Pembeli']) ? String(getVal(['Username', 'Pembeli'])).trim() : '-',
                        part_number: (partNoRaw && partNoRaw !== '-') ? String(partNoRaw).trim() : null,
                        nama_barang: produkRaw ? String(produkRaw).trim() : '-',
                        quantity: qty, harga_satuan: hrg, harga_total: qty * hrg, status: 'Pending'
                    };
                } return null;
            }).filter(item => item !== null);

            if (updates.length > 0) {
                const result = await importScanResiFromExcel(updates);
                if (result.success) {
                    onShowToast(`Berhasil import ${updates.length - result.skippedCount} data`, 'success');
                    await loadScanLogs();
                } else onShowToast("Gagal update DB", 'error');
            } else onShowToast("Tidak ada data valid", 'error');
        } catch (error) { onShowToast("Gagal baca Excel", 'error'); } 
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  // --- RENDER HELPERS ---
  const toggleSelect = (resi: string) => setSelectedResis(prev => prev.includes(resi) ? prev.filter(r => r !== resi) : [...prev, resi]);
  const getMarketplaceColor = (mp: string) => { switch(mp) { case 'Shopee': return 'bg-orange-900/30 text-orange-300 border-orange-800'; case 'Tokopedia': return 'bg-green-900/30 text-green-300 border-green-800'; case 'Tiktok': return 'bg-gray-700 text-white border-gray-600'; default: return 'bg-gray-700 text-gray-300 border-gray-600'; }};

  const filteredScanLogs = useMemo(() => {
      if (!scanLogs) return [];
      return scanLogs.filter(log => !searchTerm || log.resi.toLowerCase().includes(searchTerm.toLowerCase()) || (log.customer && log.customer.toLowerCase().includes(searchTerm.toLowerCase())) || (log.nama_barang && log.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [scanLogs, searchTerm]);

  const scanTotalItems = filteredScanLogs.length;
  const scanStartIndex = (currentPage - 1) * itemsPerPage;
  const scanCurrentItems = filteredScanLogs.slice(scanStartIndex, scanStartIndex + itemsPerPage);
  const readyToSendCount = selectedResis.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
        {/* HEADER CONTROL */}
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

        {/* TABLE VIEW */}
        <div className="flex-1 overflow-auto p-2">
           {scanCurrentItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2"><ScanBarcode size={40} className="opacity-20"/><p className="text-sm">Belum ada resi yang di-scan</p></div>
           ) : (
             <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-visible min-w-[1000px] hidden md:block">
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
                            const isSold = log.status === 'Terjual';
                            const isReady = log.status === 'Siap Kirim';
                            const isSelected = selectedResis.includes(log.resi);
                            return (
                                <tr key={log.id || idx} className={`transition-colors ${isSold ? 'bg-gray-900/50 opacity-60' : (isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-700/50')}`}>
                                    <td className="px-4 py-3 text-center">
                                        {!isSold ? (<button onClick={() => toggleSelect(log.resi)} disabled={!isReady} className="focus:outline-none">{isSelected ? <CheckSquare size={16} className="text-blue-500"/> : <Square size={16} className={isReady ? "text-gray-500 hover:text-blue-400" : "text-gray-600 cursor-not-allowed"}/>}</button>) : <Check size={16} className="text-green-500 mx-auto"/>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{new Date(log.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="px-4 py-3 font-bold text-gray-200 font-mono select-all">{log.resi}</td>
                                    <td className="px-4 py-3 text-gray-400 font-semibold">{log.toko || '-'}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-700 text-gray-300 border-gray-600">{log.ecommerce}</span></td>
                                    
                                    {/* Inline Edit Cells (Condensed for brevity) */}
                                    <td className="px-4 py-3">{editingCell?.id === log.id && editingCell?.field === 'customer' ? (
                                        <input className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs" value={log.customer||''} onChange={(e)=>setScanLogs(prev=>prev.map(l=>l.id===log.id?{...l,customer:e.target.value}:l))} onBlur={(e)=>{handleUpdateField(log.id!,'customer',e.target.value);setEditingCell(null)}} onKeyDown={(e)=>{if(e.key==='Enter'){handleUpdateField(log.id!,'customer',(e.target as HTMLInputElement).value);setEditingCell(null)}}} autoFocus />
                                    ) : <div className="cursor-text text-gray-300 font-medium hover:text-blue-300" onClick={()=>!isSold && setEditingCell({id:log.id!,field:'customer'})}>{log.customer||'-'}</div>}</td>
                                    
                                    <td className="px-4 py-3 relative"><div className="flex items-center gap-1 relative">{!isSold ? (<input className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full font-mono text-gray-300" placeholder="Part No" value={log.part_number||''} onChange={(e)=>handlePartNumberInput(log.id!,e.target.value,e)} onFocus={(e)=>updateAutocompleteState(log.id!,e.target.value,e.target)} onBlur={(e)=>setTimeout(async()=>{if(activeSearchId===log.id)setActiveSearchId(null);await updateScanResiLogField(log.id!,'part_number',e.target.value)},200)}/>) : <span className="font-mono text-gray-400">{log.part_number}</span>}{!!log.part_number && <Search size={10} className="text-blue-400 flex-shrink-0"/>}</div></td>

                                    <td className="px-4 py-3 text-gray-400 whitespace-normal">{editingCell?.id === log.id && editingCell?.field === 'nama_barang' ? (
                                        <input className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs" value={log.nama_barang||''} onChange={(e)=>setScanLogs(prev=>prev.map(l=>l.id===log.id?{...l,nama_barang:e.target.value}:l))} onBlur={(e)=>{handleUpdateField(log.id!,'nama_barang',e.target.value);setEditingCell(null)}} onKeyDown={(e)=>{if(e.key==='Enter'){handleUpdateField(log.id!,'nama_barang',(e.target as HTMLInputElement).value);setEditingCell(null)}}} autoFocus />
                                    ) : <div className="cursor-text hover:text-blue-300" onClick={()=>!isSold && setEditingCell({id:log.id!,field:'nama_barang'})}>{log.nama_barang||'-'}</div>}</td>

                                    <td className="px-4 py-3 text-center">{editingCell?.id === log.id && editingCell?.field === 'quantity' ? (
                                        <input type="number" className="w-full bg-gray-700 border-b border-blue-500 text-gray-100 p-1 text-xs text-center" value={log.quantity||0} onChange={(e)=>setScanLogs(prev=>prev.map(l=>l.id===log.id?{...l,quantity:parseFloat(e.target.value)||0}:l))} onBlur={(e)=>{handleUpdateField(log.id!,'quantity',parseFloat(e.target.value)||0);setEditingCell(null)}} onKeyDown={(e)=>{if(e.key==='Enter'){handleUpdateField(log.id!,'quantity',parseFloat((e.target as HTMLInputElement).value)||0);setEditingCell(null)}}} autoFocus />
                                    ) : <div className="cursor-text text-gray-400 hover:text-blue-300" onClick={()=>!isSold && setEditingCell({id:log.id!,field:'quantity'})}>{log.quantity||'-'}</div>}</td>

                                    <td className="px-4 py-3 text-gray-200 font-bold text-right">{log.harga_total ? formatRupiah(log.harga_total) : '-'}</td>
                                    
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {isSold ? <span className="text-gray-400 font-bold bg-gray-700 px-2 py-0.5 rounded-full text-[10px]">Terjual</span> : 
                                         isReady ? <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded-full border border-green-800 text-[10px] flex items-center justify-center gap-1"><Check size={10}/> Siap</span> :
                                         <span className="text-red-400 font-bold bg-red-900/30 px-2 py-0.5 rounded-full border border-red-800 text-[10px] flex items-center justify-center gap-1"><XCircle size={10}/> Data Kurang</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">{!isSold && <button onClick={()=>handleDuplicate(log.id!)} className="p-1 hover:bg-gray-600 rounded text-blue-400">{isDuplicating===log.id?<Loader2 size={16} className="animate-spin"/>:<Plus size={16}/>}</button>}</td>
                                    <td className="px-4 py-3 text-center">{!isSold && <button onClick={()=>handleDeleteLog(log.id!)} className="p-1 hover:bg-red-900/50 rounded text-red-400"><Trash2 size={16}/></button>}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
             </div>
           )}
        </div>

        {/* AUTOCOMPLETE POPUP */}
        {activeSearchId !== null && suggestions.length > 0 && popupPos && (
          <div className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto ring-1 ring-black/50" style={{ top: popupPos.top !== undefined ? `${popupPos.top}px` : 'auto', bottom: popupPos.bottom !== undefined ? `${popupPos.bottom}px` : 'auto', left: `${popupPos.left}px`, width: `${popupPos.width}px` }}>
              {suggestions.map((item, idx) => (
                  <div key={idx} onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(activeSearchId, item); }} className="px-3 py-2 text-xs hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 group transition-colors">
                      <div className="font-bold text-orange-400 font-mono text-sm group-hover:text-orange-300">{item.partNumber}</div>
                      <div className="text-gray-500 truncate group-hover:text-gray-300 text-[10px]">{item.name}</div>
                  </div>
              ))}
          </div>
        )}
    </div>
  );
};