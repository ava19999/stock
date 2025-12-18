// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Loader2, ChevronDown, Check, Upload, FileSpreadsheet, Calendar, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils';
import { ResiAnalysisResult, analyzeResiImage } from '../services/geminiService';
import { addScanResiLog, fetchScanResiLogs } from '../services/supabaseService'; 
import { ScanResiLog } from '../types';

// Daftar Toko Internal
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];

// Daftar Marketplace
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

  // State Data Tabel
  const [scanLogs, setScanLogs] = useState<ScanResiLog[]>([]);

  // Refs
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data tabel saat pertama kali buka
  useEffect(() => {
    loadScanLogs();
    // Auto focus ke input
    setTimeout(() => { barcodeInputRef.current?.focus(); }, 100);
  }, []);

  const loadScanLogs = async () => {
    const logs = await fetchScanResiLogs();
    setScanLogs(logs);
  };

  // --- HANDLER SAAT SCAN (ENTER) ---
  const handleBarcodeInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;

      setIsSavingLog(true);
      
      // Simpan ke Tabel scan_resi
      const success = await addScanResiLog(scannedCode, selectedMarketplace, selectedStore);
      
      if (success) {
          await loadScanLogs(); // Refresh tabel data terbaru
          setBarcodeInput(''); // Kosongkan input agar siap scan lagi
      } else {
          alert("Gagal menyimpan data ke database. Cek koneksi.");
      }
      
      setIsSavingLog(false);
    }
  };

  // --- HANDLER KAMERA ---
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
        alert("Resi tidak terbaca oleh AI.");
      }
    } catch (error) {
      console.error("Error cam", error);
    } finally {
      setAnalyzing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Handler Upload Excel (Placeholder)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Fitur Upload Excel untuk melengkapi data ${selectedMarketplace} akan diproses.`);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper warna marketplace
  const getMarketplaceColor = (mp: string) => {
    switch(mp) {
        case 'Shopee': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        case 'Tokopedia': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
        case 'Tiktok': return 'bg-black text-white border-gray-800 hover:bg-gray-800';
        case 'Lazada': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full space-y-4 h-full flex flex-col">
      {/* --- AREA SCANNER --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 sticky top-0 z-20">
        <div className="flex flex-col md:flex-row gap-3">
            
            {/* GROUP 1: Selectors */}
            <div className="flex gap-2">
                <div className="relative flex shadow-sm rounded-lg flex-1 md:flex-none">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold border rounded-l-lg transition-colors flex-1 md:w-32 justify-center ${getMarketplaceColor(selectedMarketplace)}`}
                        title="Upload Excel Match"
                    >
                        <FileSpreadsheet size={16} />
                        {selectedMarketplace}
                    </button>
                    <button 
                        onClick={() => setShowMarketplacePopup(!showMarketplacePopup)}
                        className="px-2 bg-white border-y border-r border-gray-200 rounded-r-lg hover:bg-gray-50 flex items-center justify-center"
                    >
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>

                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

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
                placeholder={`Scan Resi ${selectedMarketplace} di sini...`}
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

      {/* --- TABEL DATA SCAN RESI --- */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600"/> Data Scan Resi
            </h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{scanLogs.length}</span>
        </div>
        
        {/* Container Tabel dengan Scroll Horizontal jika layar kecil */}
        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Tanggal</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Resi</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Toko</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Via</th>
                        
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Pelanggan</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Part.No</th>
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
                            <td colSpan={11} className="p-8 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <ScanBarcode size={32} className="opacity-20"/>
                                    <p>Belum ada resi yang di-scan hari ini</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        scanLogs.map((log, idx) => {
                            // Formatting tanggal menjadi Date Only (DD/MM/YYYY)
                            const dateObj = new Date(log.tanggal);
                            const displayDate = dateObj.toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            });
                            
                            const isComplete = log.part_number && log.nama_barang;

                            return (
                                <tr key={log.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                    {/* 1. Tanggal */}
                                    <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">{displayDate}</td>
                                    
                                    {/* 2. Resi */}
                                    <td className="px-4 py-3 font-bold text-gray-900 font-mono select-all">{log.resi}</td>
                                    
                                    {/* 3. Toko */}
                                    <td className="px-4 py-3 text-gray-600 font-semibold">{log.toko || '-'}</td>
                                    
                                    {/* 4. Via (Marketplace) */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            log.ecommerce === 'Shopee' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            log.ecommerce === 'Tokopedia' ? 'bg-green-50 text-green-700 border-green-100' :
                                            log.ecommerce === 'Tiktok' ? 'bg-gray-800 text-white border-gray-700' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>{log.ecommerce}</span>
                                    </td>
                                    
                                    {/* 5. Pelanggan (Customer) */}
                                    <td className="px-4 py-3 text-gray-500">{log.customer || '-'}</td>
                                    
                                    {/* 6. Part.No */}
                                    <td className="px-4 py-3 text-gray-500 font-mono">{log.part_number || '-'}</td>
                                    
                                    {/* 7. Barang */}
                                    <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={log.nama_barang || ''}>{log.nama_barang || '-'}</td>
                                    
                                    {/* 8. Qty */}
                                    <td className="px-4 py-3 text-gray-500 text-center">{log.quantity || '-'}</td>
                                    
                                    {/* 9. Satuan (Harga Satuan) */}
                                    <td className="px-4 py-3 text-gray-500 text-right">
                                        {log.harga_satuan ? `Rp${log.harga_satuan.toLocaleString('id-ID')}` : '-'}
                                    </td>

                                    {/* 10. Total (Harga Total) */}
                                    <td className="px-4 py-3 text-gray-500 text-right font-semibold">
                                        {log.harga_total ? `Rp${log.harga_total.toLocaleString('id-ID')}` : '-'}
                                    </td>

                                    {/* 11. Status */}
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {isComplete ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                                <Check size={10}/> Lengkap
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                <AlertCircle size={10}/> Pending Upload
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