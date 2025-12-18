// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Loader2, ChevronDown, Check, Upload, FileSpreadsheet, Calendar, AlertCircle, Send, Square, CheckSquare, Search, Edit2 } from 'lucide-react';
import { compressImage } from '../utils';
import { ResiAnalysisResult, analyzeResiImage } from '../services/geminiService';
import { addScanResiLog, fetchScanResiLogs, updateScanResiFromExcel, processShipmentToOrders, fetchInventory, updateScanResiLogField } from '../services/supabaseService'; 
import { ScanResiLog } from '../types';
import * as XLSX from 'xlsx';

// Daftar Toko Internal
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];
const MARKETPLACES = ['Shopee', 'Tiktok', 'Tokopedia', 'Lazada', 'Offline'];

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, isProcessing }) => {
  // State Input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('Shopee');
  
  // State UI
  const [showMarketplacePopup, setShowMarketplacePopup] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingShipment, setIsProcessingShipment] = useState(false);

  // State Data
  const [scanLogs, setScanLogs] = useState<ScanResiLog[]>([]);
  const [selectedResis, setSelectedResis] = useState<string[]>([]);

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadScanLogs();
    setTimeout(() => { barcodeInputRef.current?.focus(); }, 100);
  }, []);

  // Auto-Check jika status "Siap Kirim"
  useEffect(() => {
    const autoChecked = scanLogs
        .filter(log => log.status === 'Siap Kirim')
        .map(log => log.resi);
    setSelectedResis(autoChecked);
  }, [scanLogs]);

  const loadScanLogs = async () => {
    const logs = await fetchScanResiLogs();
    setScanLogs(logs);
  };

  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;

      setIsSavingLog(true);
      const success = await addScanResiLog(scannedCode, selectedMarketplace, selectedStore);
      if (success) {
          await loadScanLogs();
          setBarcodeInput('');
      } else {
          alert("Gagal menyimpan data.");
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
         const success = await addScanResiLog(analysis.resi, selectedMarketplace, selectedStore);
         if(success) {
             await loadScanLogs();
             alert(`Resi ${analysis.resi} tersimpan.`);
         }
      } else {
        alert("Resi tidak terbaca.");
      }
    } catch (error) { console.error(error); } 
    finally {
      setAnalyzing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // --- HELPER: UPDATE FIELD MANUAL (HANYA PART NUMBER) ---
  const handlePartNumberChange = async (id: number, value: string) => {
      // 1. Update State Lokal (Agar UI responsif)
      setScanLogs(prev => prev.map(log => {
          if (log.id === id) {
              const updated = { ...log, part_number: value };
              // Cek status baru: Jika semua lengkap -> Siap Kirim
              const isComplete = updated.part_number && updated.nama_barang && updated.quantity;
              updated.status = isComplete ? 'Siap Kirim' : 'Pending';
              return updated;
          }
          return log;
      }));

      // 2. Simpan ke Database (Background)
      if (id) {
        await updateScanResiLogField(id, 'part_number', value);
      }
  };

  // --- HELPER: PARSING ANGKA INDONESIA ---
  const parseIndonesianNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      let strVal = String(val);
      strVal = strVal.replace(/[RpIDR\s]/gi, '');
      strVal = strVal.split('.').join(''); // Hapus pemisah ribuan
      strVal = strVal.replace(',', '.');   // Koma jadi desimal
      const result = parseFloat(strVal);
      return isNaN(result) ? 0 : result;
  };

  // --- LOGIKA PARSING EXCEL ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Fetch Inventory untuk pencarian Part Number otomatis
    let inventoryMap = new Map<string, string>(); 
    let allPartNumbers: string[] = [];

    try {
        const inventoryData = await fetchInventory();
        inventoryData.forEach(item => {
            if(item.name) inventoryMap.set(item.name.toLowerCase().trim(), item.partNumber);
            if(item.partNumber) allPartNumbers.push(item.partNumber);
        });
        // Sort part number dari terpanjang untuk akurasi pencarian
        allPartNumbers.sort((a, b) => b.length - a.length);
    } catch (err) {
        console.error("Gagal ambil inventory:", err);
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            
            // Baca raw: false agar "105.000" dibaca string "105.000", bukan angka 105
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

                // A. Mapping Kolom
                const resi = getVal(['No. Resi', 'No. Pesanan', 'Resi', 'Order ID']);
                const username = getVal(['Username (Pembeli)', 'Username Pembeli', 'Username', 'Pembeli', 'Nama Penerima']);
                let partNo = getVal(['No. Referensi', 'Part Number', 'Part No', 'Kode Barang']);
                const produk = getVal(['Nama Produk', 'Nama Barang', 'Product Name']);
                const qty = getVal(['Jumlah', 'Qty', 'Quantity']);
                const harga = getVal(['Harga Awal', 'Harga Satuan', 'Price', 'Harga', 'Harga Variasi']);

                // B. Pencarian Part Number Cerdas
                const produkNameClean = String(produk || '').trim();
                const produkLower = produkNameClean.toLowerCase();

                // Jika Part No kosong, cari di database berdasarkan Nama Produk
                if ((!partNo || partNo === '-' || partNo === '') && produkNameClean) {
                    // 1. Cek Nama Produk Sama Persis
                    const foundByExactName = inventoryMap.get(produkLower);
                    if (foundByExactName) {
                        partNo = foundByExactName;
                    } else {
                        // 2. Cek apakah Nama Produk MENGANDUNG Part Number
                        const foundInText = allPartNumbers.find(pn => produkLower.includes(pn.toLowerCase()));
                        if (foundInText) {
                            partNo = foundInText;
                        }
                    }
                }

                const qtyNum = parseIndonesianNumber(qty);
                const hargaNum = parseIndonesianNumber(harga);

                if (resi) {
                    return {
                        resi: String(resi).trim(),
                        customer: username || '-', 
                        part_number: partNo || null,
                        nama_barang: produk || '-',
                        quantity: qtyNum,
                        harga_satuan: hargaNum,
                        harga_total: qtyNum * hargaNum 
                    };
                }
                return null;
            }).filter(item => item !== null);

            if (updates.length > 0) {
                const success = await updateScanResiFromExcel(updates);
                if (success) {
                    alert(`Berhasil memproses ${updates.length} data. Part Number otomatis terisi jika ditemukan.`);
                    await loadScanLogs();
                } else {
                    alert("Gagal mengupdate database.");
                }
            } else {
                alert("Tidak ditemukan kolom Resi di file Excel.");
            }

        } catch (error) {
            console.error("Parse Error:", error);
            alert("Gagal membaca file Excel.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessKirim = async () => {
      if (selectedResis.length === 0) return;
      const confirmMsg = `Proses ${selectedResis.length} resi menjadi Terjual?`;
      if (!window.confirm(confirmMsg)) return;

      setIsProcessingShipment(true);
      const logsToProcess = scanLogs.filter(log => selectedResis.includes(log.resi));
      const success = await processShipmentToOrders(logsToProcess);
      
      if (success) {
          alert("Berhasil diproses kirim!");
          await loadScanLogs();
          setSelectedResis([]);
      } else {
          alert("Terjadi kesalahan saat memproses.");
      }
      setIsProcessingShipment(false);
  };

  const toggleSelect = (resi: string) => {
      setSelectedResis(prev => 
        prev.includes(resi) ? prev.filter(r => r !== resi) : [...prev, resi]
      );
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getMarketplaceColor = (mp: string) => {
    switch(mp) {
        case 'Shopee': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        case 'Tokopedia': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
        case 'Tiktok': return 'bg-black text-white border-gray-800 hover:bg-gray-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const readyToSendCount = selectedResis.length;

  return (
    <div className="w-full space-y-4 h-full flex flex-col">
      {/* --- AREA SCANNER --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 sticky top-0 z-20">
        <div className="flex flex-col md:flex-row gap-3">
            {/* GROUP 1: Selectors & Upload */}
            <div className="flex gap-2">
                <div className="relative flex shadow-sm rounded-lg flex-1 md:flex-none">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold border rounded-l-lg transition-colors flex-1 md:w-32 justify-center ${getMarketplaceColor(selectedMarketplace)}`}
                        title="Upload Excel (Format: .xlsx, .xls, .csv)"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16} />}
                        {isUploading ? 'Loading...' : selectedMarketplace}
                    </button>
                    <button 
                        onClick={() => setShowMarketplacePopup(!showMarketplacePopup)}
                        className="px-2 bg-white border-y border-r border-gray-200 rounded-r-lg hover:bg-gray-50 flex items-center justify-center"
                    >
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>

                    {showMarketplacePopup && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 overflow-hidden">
                            {MARKETPLACES.map((mp) => (
                                <button
                                    key={mp}
                                    onClick={() => { setSelectedMarketplace(mp); setShowMarketplacePopup(false); barcodeInputRef.current?.focus(); }}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 last:border-0 ${selectedMarketplace === mp ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                                >
                                    {mp}
                                    {selectedMarketplace === mp && <Check className="w-3 h-3"/>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />

                <select
                    value={selectedStore}
                    onChange={(e) => { setSelectedStore(e.target.value); barcodeInputRef.current?.focus(); }}
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                >
                    {STORE_LIST.map(store => <option key={store} value={store}>{store}</option>)}
                </select>
            </div>

            {/* GROUP 2: Input Barcode */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {isSavingLog ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : <ScanBarcode className="w-5 h-5 text-gray-400" />}
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeInput}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block w-full pl-10 p-2.5 font-mono font-medium shadow-sm"
                placeholder={`Scan Resi ${selectedMarketplace}...`}
                autoComplete="off"
                disabled={isSavingLog}
              />
            </div>

            {/* GROUP 3: Kamera */}
            <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={analyzing}
                className="text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-bold rounded-lg text-sm px-4 py-2.5 flex items-center justify-center gap-2"
            >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanBarcode className="w-4 h-4" />}
                <span className="hidden md:inline">Kamera</span>
            </button>
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
        </div>
      </div>

      {/* --- AREA TOMBOL PROSES & TABEL --- */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Header Tabel */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600"/> Data Scan Resi
                </h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{scanLogs.length} Item</span>
            </div>

            {readyToSendCount > 0 && (
                <button
                    onClick={handleProcessKirim}
                    disabled={isProcessingShipment}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all animate-in fade-in slide-in-from-right-5"
                >
                    {isProcessingShipment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
                    Proses Kirim ({readyToSendCount})
                </button>
            )}
        </div>
        
        {/* Container Tabel */}
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 border-b border-gray-100 w-10 text-center">
                            <CheckSquare size={16} className="text-gray-300 mx-auto"/>
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Tanggal</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Resi</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Toko</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Via</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Pelanggan</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Part.No (Edit)</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Barang</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Qty</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Satuan</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-right">Total</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                    {scanLogs.length === 0 ? (
                        <tr>
                            <td colSpan={12} className="p-8 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <ScanBarcode size={32} className="opacity-20"/>
                                    <p>Belum ada resi yang di-scan hari ini</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        scanLogs.map((log, idx) => {
                            const dateObj = new Date(log.tanggal);
                            const displayDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            
                            const isReady = log.status === 'Siap Kirim';
                            const isSold = log.status === 'Terjual';
                            const isSelected = selectedResis.includes(log.resi);
                            
                            const hasPartNumber = !!log.part_number;

                            return (
                                <tr key={log.id || idx} className={`transition-colors ${isSold ? 'bg-gray-50 opacity-60' : (isSelected ? 'bg-blue-50' : 'hover:bg-gray-50')}`}>
                                    <td className="px-4 py-3 text-center">
                                        {!isSold && (
                                            <button onClick={() => toggleSelect(log.resi)} disabled={!isReady} className="focus:outline-none">
                                                {isSelected ? (
                                                    <CheckSquare size={16} className="text-blue-600"/>
                                                ) : (
                                                    <Square size={16} className={isReady ? "text-gray-400 hover:text-blue-500" : "text-gray-200 cursor-not-allowed"}/>
                                                )}
                                            </button>
                                        )}
                                        {isSold && <Check size={16} className="text-green-500 mx-auto"/>}
                                    </td>

                                    <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{displayDate}</td>
                                    <td className="px-4 py-3 font-bold text-gray-900 font-mono select-all">{log.resi}</td>
                                    <td className="px-4 py-3 text-gray-600 font-semibold">{log.toko || '-'}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-100 text-gray-600 border-gray-200">{log.ecommerce}</span></td>
                                    
                                    {/* Pelanggan (Text Only) */}
                                    <td className="px-4 py-3 text-gray-800 font-medium">{log.customer || '-'}</td>
                                    
                                    {/* --- INPUT EDITABLE: PART NUMBER --- */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {!isSold ? (
                                                <input 
                                                    className="bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-full font-mono text-gray-700 placeholder-red-200"
                                                    placeholder="Part Number"
                                                    value={log.part_number || ''}
                                                    onChange={(e) => handlePartNumberChange(log.id!, e.target.value)}
                                                />
                                            ) : (
                                                <span className="font-mono text-gray-700">{log.part_number}</span>
                                            )}
                                            {hasPartNumber && <Search size={10} className="text-blue-300 flex-shrink-0" title="Terdeteksi Otomatis"/>}
                                        </div>
                                    </td>
                                    
                                    <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={log.nama_barang || ''}>{log.nama_barang || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-center">{log.quantity || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-right">{log.harga_satuan ? `Rp${log.harga_satuan.toLocaleString('id-ID')}` : '-'}</td>
                                    <td className="px-4 py-3 text-gray-800 font-bold text-right">{log.harga_total ? `Rp${log.harga_total.toLocaleString('id-ID')}` : '-'}</td>
                                    
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {isSold ? (
                                            <span className="inline-flex items-center gap-1 text-gray-500 font-bold bg-gray-200 px-2 py-0.5 rounded-full text-[10px]">
                                                Terjual
                                            </span>
                                        ) : isReady ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 text-[10px]">
                                                <Check size={10}/> Siap Kirim
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-[10px]">
                                                <Edit2 size={10}/> Data Kosong
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};