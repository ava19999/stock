// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef } from 'react';
import { ScanBarcode, Upload, Loader2, Save, ShoppingBag, ClipboardList, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { compressImage, formatRupiah, parseCSV } from '../utils'; 
import { analyzeResiImage, ResiAnalysisResult } from '../services/geminiService';
import * as XLSX from 'xlsx'; // Import library Excel

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, onSaveBulk, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'import'>('import'); // Default ke Import
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  
  // State Import Data
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // --- 1. HANDLER SCAN FOTO ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true); setResult(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImage(reader.result as string);
        setImage(compressed);
        const data = await analyzeResiImage(compressed);
        setResult(data);
      } catch (error) { alert("Gagal scan resi"); } 
      finally { setAnalyzing(false); }
    };
    reader.readAsDataURL(file);
  };

  // --- 2. HANDLER IMPORT FILE (CSV & XLSX) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

      reader.onload = (event) => {
          const data = event.target?.result;
          let rawData: any[] = [];

          if (isExcel) {
              // LOGIKA BACA EXCEL (XLSX)
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              // Konversi ke JSON Array
              rawData = XLSX.utils.sheet_to_json(sheet);
          } else {
              // LOGIKA BACA CSV (Pake Utils)
              rawData = parseCSV(data as string);
          }
          
          processData(rawData);
      };

      if (isExcel) {
          reader.readAsBinaryString(file);
      } else {
          reader.readAsText(file);
      }
  };

  // Fungsi memproses data mentah menjadi format Order Aplikasi
  const processData = (rawData: any[]) => {
      const grouped: Record<string, any> = {};
      
      rawData.forEach((row: any) => {
          // Mapping Kolom (Sesuaikan dengan Header Shopee)
          const orderId = row['No. Pesanan'];
          if (!orderId) return;

          if (!grouped[orderId]) {
              grouped[orderId] = {
                  date: row['Waktu Pesanan Dibuat'] || '',
                  resi: row['No. Resi'] || orderId,
                  ecommerce: 'Shopee', // Default Shopee (bisa dideteksi dari kolom jika perlu)
                  customerName: row['Username (Pembeli)'] || 'Guest',
                  items: []
              };
          }
          
          // AMBIL SKU INDUK (Kunci Utama)
          grouped[orderId].items.push({
              sku: row['SKU Induk'], // <--- PASTIKAN KOLOM INI ADA DI EXCEL/CSV
              name: row['Nama Produk'], 
              qty: parseInt(row['Jumlah']) || 0,
              // Harga dari file hanya referensi, nanti App.tsx ambil dari DB
              price: parseFloat(row['Harga Setelah Diskon'] || '0') 
          });
      });
      setParsedOrders(Object.values(grouped));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20">
      
      {/* TABS NAVIGASI */}
      <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
              <button onClick={() => setActiveTab('import')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'import' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><FileSpreadsheet size={18} /> Import Shopee (Excel/CSV)</button>
              <button onClick={() => setActiveTab('camera')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'camera' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><ScanBarcode size={18} /> Scan Foto Resi</button>
          </div>
      </div>

      {/* === TAB 1: IMPORT FILE (XLSX / CSV) === */}
      {activeTab === 'import' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="text-green-600" /> Upload Laporan Shopee
              </h2>
              
              {!parsedOrders.length ? (
                  <div 
                    onClick={() => fileUploadRef.current?.click()} 
                    className="border-3 border-dashed border-green-200 bg-green-50/50 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 hover:border-green-400 transition-all group"
                  >
                      <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Upload size={32} className="text-green-600" />
                      </div>
                      <p className="font-bold text-green-800 text-lg">Klik Upload File Excel / CSV</p>
                      <p className="text-xs text-gray-500 mt-1">Mendukung format: .xlsx, .xls, .csv</p>
                  </div>
              ) : (
                  <div>
                      {/* Ringkasan Data */}
                      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-green-50 p-4 rounded-xl border border-green-100 gap-4">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-200 p-2 rounded-lg"><CheckCircle className="text-green-700" size={24}/></div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">Total Pesanan Ditemukan:</p>
                                <p className="text-3xl font-bold text-gray-900">{parsedOrders.length}</p>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                              <button onClick={() => { setParsedOrders([]); }} className="px-5 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl flex-1 md:flex-none">Batal</button>
                              <button 
                                onClick={() => { if(onSaveBulk) onSaveBulk(parsedOrders); }} 
                                disabled={isProcessing} 
                                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none flex-1 md:flex-none"
                              >
                                {isProcessing ? <Loader2 className="animate-spin"/> : <Save size={20}/>} 
                                Proses Semua ke Pesanan
                              </button>
                          </div>
                      </div>

                      {/* Tabel Preview */}
                      <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-xl custom-scrollbar shadow-inner">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-4 w-40">No. Resi</th>
                                      <th className="p-4 w-48">Pelanggan</th>
                                      <th className="p-4">Detail SKU Induk (Item)</th>
                                      <th className="p-4 text-center w-24">Total Qty</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {parsedOrders.map((o, i) => (
                                      <tr key={i} className="hover:bg-green-50/30 transition-colors group">
                                          <td className="p-4 align-top font-mono text-xs font-bold text-gray-700">{o.resi}</td>
                                          <td className="p-4 align-top font-medium text-gray-900">{o.customerName}</td>
                                          <td className="p-4 align-top">
                                              <div className="flex flex-col gap-2">
                                              {o.items.map((it:any, idx:number) => (
                                                  <div key={idx} className="flex items-center text-xs bg-gray-50 p-2 rounded border border-gray-100 group-hover:bg-white group-hover:border-green-200">
                                                      <span className={`font-mono font-bold px-2 py-0.5 rounded mr-2 border ${it.sku ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                          {it.sku || 'NO-SKU'}
                                                      </span>
                                                      <span className="flex-1 truncate text-gray-600" title={it.name}>{it.name}</span>
                                                      <span className="font-bold text-gray-900 ml-2">x{it.qty}</span>
                                                  </div>
                                              ))}
                                              </div>
                                          </td>
                                          <td className="p-4 align-top text-center">
                                              <span className="bg-gray-200 text-gray-700 font-bold px-2.5 py-1 rounded-full text-xs">
                                                  {o.items.reduce((a:any,b:any)=>a+b.qty,0)}
                                              </span>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {/* Input menerima .csv, .xlsx, .xls */}
              <input type="file" ref={fileUploadRef} accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          </div>
      )}

      {/* === TAB 2: SCAN FOTO === */}
      {activeTab === 'camera' && (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2"><ScanBarcode className="text-purple-600" /> Scan Foto Resi</h2>
            <div onClick={() => !analyzing && !isProcessing && fileInputRef.current?.click()} className={`mt-4 border-3 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${analyzing ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-500 hover:bg-gray-50'}`}>
            {image ? <img src={image} className="w-full h-full object-contain absolute inset-0 opacity-40" /> : <div className="text-center"><Upload size={40} className="mx-auto mb-2 text-purple-400 group-hover:text-purple-600 transition-colors"/><p className="font-medium text-gray-600">Klik Upload Foto Resi</p><p className="text-xs text-gray-400 mt-1">Pastikan Barcode/SKU terlihat</p></div>}
            {(analyzing || isProcessing) && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center"><Loader2 size={40} className="animate-spin text-purple-600 mb-2"/><p className="text-sm font-bold text-purple-700 animate-pulse">{analyzing ? 'Menganalisis...' : 'Memproses...'}</p></div>}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {result && (
            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mt-6 animate-in slide-in-from-bottom-4">
                <div className="bg-purple-600 px-6 py-4 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2 text-lg"><CheckCircle size={20}/> Hasil Scan</h3><span className="text-xs bg-white/20 px-3 py-1 rounded-full font-mono font-medium">{result.resi}</span></div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Tanggal</p><p className="font-bold text-gray-800">{result.date || '-'}</p></div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">E-Commerce</p><p className="font-bold text-purple-600">{result.ecommerce || '-'}</p></div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Pelanggan</p><p className="font-bold text-gray-800">{result.customerName || '-'}</p></div>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-500 font-bold text-xs uppercase"><tr><th className="p-3">SKU Induk</th><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Total</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{result.items?.map((it, i) => (<tr key={i} className="hover:bg-purple-50 transition-colors"><td className="p-3 font-mono text-blue-600 font-bold">{it.sku || '?'}</td><td className="p-3">{it.name}</td><td className="p-3 text-right font-bold">{it.qty}</td><td className="p-3 text-right font-medium">{formatRupiah(it.total||0)}</td></tr>))}</tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => {setImage(null); setResult(null);}} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Batal</button>
                        <button onClick={() => onSave(result)} disabled={isProcessing} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"><Save size={18}/> Simpan Pesanan</button>
                    </div>
                </div>
            </div>
        )}
        </>
      )}
    </div>
  );
};