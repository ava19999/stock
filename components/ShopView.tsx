import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Upload, Loader2, Save, ShoppingBag, ClipboardList, CheckCircle, AlertTriangle, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';
import { compressImage, formatRupiah, parseCSV } from '../utils'; 
import { analyzeResiImage, ResiAnalysisResult } from '../services/geminiService';
import * as XLSX from 'xlsx'; // Import library Excel

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, onSaveBulk, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'import'>('import'); 
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  
  // State Import Data
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  // State untuk melacak indeks item yang dipilih (Set of numbers) [BARU]
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // --- LOGIC SELEKSI CHECKBOX [BARU] ---
  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedOrders.length) {
      // Jika semua sudah dipilih, kosongkan (Deselect All)
      setSelectedIndices(new Set());
    } else {
      // Jika belum semua, pilih semua (Select All)
      const allIndices = new Set(parsedOrders.map((_, i) => i));
      setSelectedIndices(allIndices);
    }
  };

  const toggleSelectRow = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleProcessSelected = () => {
    if (!onSaveBulk) return;
    // Filter hanya order yang index-nya ada di selectedIndices
    const selectedOrders = parsedOrders.filter((_, index) => selectedIndices.has(index));
    onSaveBulk(selectedOrders);
  };
  // -------------------------------------

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
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              rawData = XLSX.utils.sheet_to_json(sheet);
          } else {
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

  const processData = (rawData: any[]) => {
      const grouped: Record<string, any> = {};
      
      rawData.forEach((row: any) => {
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
          
          grouped[orderId].items.push({
              sku: row['SKU Induk'], 
              name: row['Nama Produk'], 
              qty: parseInt(row['Jumlah']) || 0,
              price: parseFloat(row['Harga Setelah Diskon'] || '0') 
          });
      });
      const resultList = Object.values(grouped);
      setParsedOrders(resultList);
      // Reset selection setiap kali upload baru
      setSelectedIndices(new Set()); 
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20">
      
      {/* TABS NAVIGASI (Updated Labels) */}
      <div className="flex justify-center mb-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
              <button onClick={() => setActiveTab('import')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'import' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><FileSpreadsheet size={18} /> Shopee</button>
              <button onClick={() => setActiveTab('camera')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'camera' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><ScanBarcode size={18} /> Scan Barcode</button>
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
                      {/* Ringkasan Data & Tombol Aksi */}
                      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-green-50 p-4 rounded-xl border border-green-100 gap-4">
                          <div className="flex items-center gap-3">
                              <div className="bg-green-200 p-2 rounded-lg"><CheckCircle className="text-green-700" size={24}/></div>
                              <div>
                                <p className="text-sm text-gray-600 font-medium">Data Ditemukan:</p>
                                <p className="text-lg font-bold text-gray-900">
                                    <span className="text-green-700">{selectedIndices.size}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    {parsedOrders.length} Dipilih
                                </p>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                              {/* Tombol Batal membersihkan semua data */}
                              <button 
                                onClick={() => { setParsedOrders([]); setSelectedIndices(new Set()); }} 
                                className="px-5 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl flex-1 md:flex-none border border-gray-200 bg-white"
                              >
                                Batal / Reset
                              </button>
                              
                              {/* Tombol Proses hanya aktif jika ada yang dipilih */}
                              <button 
                                onClick={handleProcessSelected} 
                                disabled={isProcessing || selectedIndices.size === 0} 
                                className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex-1 md:flex-none"
                              >
                                {isProcessing ? <Loader2 className="animate-spin"/> : <Save size={20}/>} 
                                {selectedIndices.size > 0 ? `Proses (${selectedIndices.size}) Pesanan` : 'Pilih Pesanan Dulu'}
                              </button>
                          </div>
                      </div>

                      {/* Tabel Preview dengan Checkbox */}
                      <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-xl custom-scrollbar shadow-inner">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-4 w-12 text-center">
                                          {/* Checkbox Select All */}
                                          <input 
                                            type="checkbox" 
                                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                            checked={parsedOrders.length > 0 && selectedIndices.size === parsedOrders.length}
                                            onChange={toggleSelectAll}
                                          />
                                      </th>
                                      <th className="p-4 w-40">No. Resi</th>
                                      <th className="p-4 w-48">Pelanggan</th>
                                      <th className="p-4">Detail SKU Induk (Item)</th>
                                      <th className="p-4 text-center w-24">Total Qty</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                  {parsedOrders.map((o, i) => {
                                      const isSelected = selectedIndices.has(i);
                                      return (
                                        <tr 
                                            key={i} 
                                            className={`transition-colors group cursor-pointer ${isSelected ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}
                                            onClick={() => toggleSelectRow(i)}
                                        >
                                            <td className="p-4 align-top text-center" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(i)}
                                                />
                                            </td>
                                            <td className={`p-4 align-top font-mono text-xs font-bold ${isSelected ? 'text-green-800' : 'text-gray-700'}`}>{o.resi}</td>
                                            <td className="p-4 align-top font-medium text-gray-900">{o.customerName}</td>
                                            <td className="p-4 align-top">
                                                <div className="flex flex-col gap-2">
                                                {o.items.map((it:any, idx:number) => (
                                                    <div key={idx} className={`flex items-center text-xs p-2 rounded border ${isSelected ? 'bg-white border-green-200' : 'bg-gray-50 border-gray-100'}`}>
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
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              <input type="file" ref={fileUploadRef} accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
          </div>
      )}

      {/* === TAB 2: SCAN FOTO (Barcode Mode) === */}
      {activeTab === 'camera' && (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-right-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2"><ScanBarcode className="text-purple-600" /> Scan Barcode</h2>
            <div onClick={() => !analyzing && !isProcessing && fileInputRef.current?.click()} className={`mt-4 border-3 border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group ${analyzing ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-500 hover:bg-gray-50'}`}>
            {image ? <img src={image} className="w-full h-full object-contain absolute inset-0 opacity-40" /> : <div className="text-center"><Upload size={40} className="mx-auto mb-2 text-purple-400 group-hover:text-purple-600 transition-colors"/><p className="font-medium text-gray-600">Klik Untuk Scan</p><p className="text-xs text-gray-400 mt-1">Arahkan kamera ke Barcode/Resi</p></div>}
            {(analyzing || isProcessing) && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center"><Loader2 size={40} className="animate-spin text-purple-600 mb-2"/><p className="text-sm font-bold text-purple-700 animate-pulse">{analyzing ? 'Menganalisis...' : 'Memproses...'}</p></div>}
            </div>
            {/* Capture Environment untuk langsung buka kamera */}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
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