// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef } from 'react';
import { ScanBarcode, Upload, Loader2, Save, ShoppingBag, ClipboardList, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { compressImage, formatRupiah, parseCSV } from '../utils'; // Pastikan parseCSV ada di utils
import { analyzeResiImage, ResiAnalysisResult } from '../services/geminiService';

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, onSaveBulk, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'csv'>('camera');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  
  // CSV State
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const rawData = parseCSV(text); // Menggunakan fungsi utils.ts
          
          const grouped: Record<string, any> = {};
          
          rawData.forEach((row: any) => {
              // Mapping Kolom CSV Shopee
              const orderId = row['No. Pesanan'];
              if (!orderId) return;

              if (!grouped[orderId]) {
                  grouped[orderId] = {
                      date: row['Waktu Pesanan Dibuat'] || '',
                      resi: row['No. Resi'] || orderId,
                      ecommerce: 'Shopee',
                      customerName: row['Username (Pembeli)'] || 'Guest',
                      items: []
                  };
              }
              
              // AMBIL SKU INDUK
              grouped[orderId].items.push({
                  sku: row['SKU Induk'], // <--- KUNCI UTAMA
                  name: row['Nama Produk'], // Referensi saja
                  qty: parseInt(row['Jumlah']) || 0,
                  // Harga dari CSV diabaikan di logic App.tsx, akan pakai harga DB
                  price: parseFloat(row['Harga Setelah Diskon'] || '0') 
              });
          });
          setParsedOrders(Object.values(grouped));
      };
      reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 pb-20">
      
      <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
              <button onClick={() => setActiveTab('camera')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'camera' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><ScanBarcode size={18} /> Scan Foto</button>
              <button onClick={() => setActiveTab('csv')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'csv' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><FileSpreadsheet size={18} /> Upload CSV</button>
          </div>
      </div>

      {/* --- TAB CAMERA --- */}
      {activeTab === 'camera' && (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2"><ScanBarcode className="text-purple-600" /> Scan Resi</h2>
            <div onClick={() => !analyzing && !isProcessing && fileInputRef.current?.click()} className={`mt-4 border-3 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${analyzing ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-500 hover:bg-gray-50'}`}>
            {image ? <img src={image} className="w-full h-full object-contain absolute inset-0 opacity-40" /> : <div className="text-center"><Upload size={32} className="mx-auto mb-2 text-purple-600"/><p>Upload Foto Resi</p></div>}
            {(analyzing || isProcessing) && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center"><Loader2 size={32} className="animate-spin text-purple-600"/><p className="text-sm font-bold text-purple-700 animate-pulse">{analyzing ? 'Menganalisis...' : 'Memproses...'}</p></div>}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        {result && (
            <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden mt-6 animate-in slide-in-from-bottom-4">
                <div className="bg-purple-600 px-4 py-3 flex justify-between items-center text-white"><h3 className="font-bold flex items-center gap-2"><CheckCircle size={18}/> Hasil Scan</h3><span className="text-xs bg-white/20 px-2 py-1 rounded font-mono">{result.resi}</span></div>
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div><p className="text-xs text-gray-400 font-bold uppercase">Tanggal</p><p className="font-semibold">{result.date || '-'}</p></div>
                        <div><p className="text-xs text-gray-400 font-bold uppercase">Pelanggan</p><p className="font-semibold">{result.customerName || '-'}</p></div>
                    </div>
                    <table className="w-full text-left text-sm mb-4"><thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase"><tr><th className="p-2">SKU Induk</th><th className="p-2">Item</th><th className="p-2 text-right">Qty</th></tr></thead>
                        <tbody className="divide-y">{result.items?.map((it, i) => (<tr key={i}><td className="p-2 font-mono text-blue-600 font-bold">{it.sku || '?'}</td><td className="p-2">{it.name}</td><td className="p-2 text-right font-bold">{it.qty}</td></tr>))}</tbody>
                    </table>
                    <div className="flex justify-end gap-2"><button onClick={() => {setImage(null); setResult(null);}} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Batal</button><button onClick={() => onSave(result)} disabled={isProcessing} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-black">Simpan Pesanan</button></div>
                </div>
            </div>
        )}
        </>
      )}

      {/* --- TAB CSV --- */}
      {activeTab === 'csv' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><FileSpreadsheet className="text-green-600" /> Import CSV Shopee</h2>
              {!parsedOrders.length ? (
                  <div onClick={() => csvInputRef.current?.click()} className="border-2 border-dashed border-green-300 bg-green-50 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors">
                      <Upload size={40} className="text-green-600 mb-2" /><p className="font-bold text-green-800">Upload File CSV Shopee</p>
                  </div>
              ) : (
                  <div>
                      <div className="flex justify-between items-center mb-4 bg-green-50 p-4 rounded-xl border border-green-100">
                          <div><p className="text-sm text-gray-500">Total Pesanan:</p><p className="text-2xl font-bold text-green-700">{parsedOrders.length}</p></div>
                          <button onClick={() => { if(onSaveBulk) onSaveBulk(parsedOrders); }} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center gap-2">{isProcessing ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Proses Semua</button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl custom-scrollbar">
                          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase sticky top-0"><tr><th className="p-3">Resi</th><th className="p-3">Pelanggan</th><th className="p-3">SKU Induk</th><th className="p-3 text-center">Qty</th></tr></thead>
                              <tbody className="divide-y">{parsedOrders.map((o, i) => (<tr key={i} className="hover:bg-gray-50"><td className="p-3 font-mono text-xs">{o.resi}</td><td className="p-3">{o.customerName}</td><td className="p-3">{o.items.map((it:any, idx:number)=><div key={idx} className="text-xs mb-1"><span className="font-mono font-bold text-green-600 bg-green-100 px-1 rounded mr-1">{it.sku}</span>{it.name.substring(0,20)}...</div>)}</td><td className="p-3 text-center font-bold">{o.items.reduce((a:any,b:any)=>a+b.qty,0)}</td></tr>))}</tbody>
                          </table>
                      </div>
                  </div>
              )}
              <input type="file" ref={csvInputRef} accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </div>
      )}
    </div>
  );
};