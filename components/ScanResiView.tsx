// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Upload, Loader2, Save, FileSpreadsheet } from 'lucide-react';
import { parseCSV, compressImage, parseNumber } from '../utils'; // Import parseNumber
import { ResiAnalysisResult, analyzeResiImage } from '../services/geminiService'; 
import { addBarangKeluar, fetchInventory } from '../services/supabaseService';
import * as XLSX from 'xlsx';

const STORE_LIST = ['Shopee MJM', 'Shopee Laris', 'Shopee BJW', 'Tiktok Shop MJM', 'Tiktok Shop Laris', 'Reseller / Manual'];

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, onSaveBulk, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'barcode' | 'import'>('import'); 
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  const [parsedOrders, setParsedOrders] = useState<any[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]); 

  useEffect(() => { if (activeTab === 'barcode' && !result) { setTimeout(() => { barcodeInputRef.current?.focus(); }, 100); } }, [activeTab, result]);

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); const scannedCode = barcodeInput.trim(); if (!scannedCode) return; processScannedCode(scannedCode); setBarcodeInput(''); } };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if (!file) return; setAnalyzing(true);
      try { const compressed = await compressImage(await readFileAsBase64(file)); const analysis = await analyzeResiImage(compressed); if (analysis && (analysis.resi || analysis.items)) { setResult(analysis); } else { alert("Barcode/Resi tidak terdeteksi jelas."); } } catch (error) { console.error("Gagal proses kamera", error); } finally { setAnalyzing(false); if (cameraInputRef.current) cameraInputRef.current.value = ''; }
  };

  const readFileAsBase64 = (file: File): Promise<string> => { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); }); };

  const processScannedCode = (code: string) => {
    const foundInExcel = parsedOrders.find(o => o.resi.toLowerCase().includes(code.toLowerCase()));
    if (foundInExcel) { setResult({ resi: foundInExcel.resi, date: foundInExcel.date, customerName: foundInExcel.customerName, ecommerce: selectedStore, items: foundInExcel.items }); } 
    else { setResult({ resi: code, date: new Date().toLocaleDateString('id-ID'), ecommerce: selectedStore, customerName: '', items: [] }); }
  };

  const handleSaveScan = async () => {
    if (!result) return;
    onSave(result);
    if (result.items && result.items.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const inventory = await fetchInventory(); 
        for (const item of result.items) {
            const matchedItem = inventory.find(inv => inv.name.toLowerCase().includes(item.name.toLowerCase()));
            await addBarangKeluar({
                tanggal: today, kodeToko: selectedStore.substring(0, 3).toUpperCase(), tempo: 'MJM',
                ecommerce: selectedStore, customer: result.customerName || 'GUEST',
                partNumber: matchedItem?.partNumber || '-', name: item.name, brand: matchedItem?.brand || '-',
                application: matchedItem?.application || '-', rak: matchedItem?.shelf || '-',
                stockAwal: matchedItem?.quantity || 0, qtyKeluar: item.qty,
                hargaSatuan: matchedItem?.price || 0, hargaTotal: (matchedItem?.price || 0) * item.qty, resi: result.resi
            });
        }
    }
    setResult(null); barcodeInputRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls'); reader.onload = (event) => { const data = event.target?.result; let rawData: any[] = []; if (isExcel) { const workbook = XLSX.read(data, { type: 'binary' }); const sheetName = workbook.SheetNames[0]; const sheet = workbook.Sheets[sheetName]; rawData = XLSX.utils.sheet_to_json(sheet); } else { rawData = parseCSV(data as string); } processData(rawData); }; if (isExcel) reader.readAsBinaryString(file); else reader.readAsText(file); };
  
  const processData = (rawData: any[]) => { 
      const grouped: Record<string, any> = {}; 
      rawData.forEach((row: any) => { 
          const orderId = row['No. Pesanan']; 
          if (!orderId) return; 
          if (!grouped[orderId]) { grouped[orderId] = { date: row['Waktu Pesanan Dibuat'] || '', resi: row['No. Resi'] || orderId, ecommerce: 'Shopee', customerName: row['Username (Pembeli)'] || 'Guest', items: [] }; } 
          
          // GUNAKAN parseNumber UNTUK MEMBERSIHKAN ANGKA DARI CSV
          grouped[orderId].items.push({ 
              name: row['Nama Produk'], 
              qty: parseNumber(row['Jumlah']), 
              price: parseNumber(row['Harga Setelah Diskon']) 
          }); 
      }); 
      setParsedOrders(Object.values(grouped)); 
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pb-20">
      <div className="flex justify-center mb-6"><div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex"><button onClick={() => setActiveTab('import')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'import' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><FileSpreadsheet size={18} /> Shopee / Excel</button><button onClick={() => setActiveTab('barcode')} className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'barcode' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><ScanBarcode size={18} /> Scan / Barcode</button></div></div>
      {activeTab === 'import' && (<div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"><h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><FileSpreadsheet className="text-green-600" /> Upload Laporan Shopee</h2>{!parsedOrders.length ? (<div onClick={() => fileUploadRef.current?.click()} className="border-3 border-dashed border-green-200 bg-green-50/50 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50"><div className="bg-white p-4 rounded-full shadow-sm mb-3"><Upload size={32} className="text-green-600" /></div><p className="font-bold text-green-800 text-lg">Klik Upload File Excel</p></div>) : (<div><p className="mb-4 text-green-700 font-bold">Data Loaded: {parsedOrders.length} Pesanan</p><button onClick={() => { setParsedOrders([]); }} className="text-red-500 underline text-sm">Reset</button></div>)}<input type="file" ref={fileUploadRef} accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} /></div>)}
      {activeTab === 'barcode' && (<><div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center"><div className="mb-6 flex justify-center"><div className="w-full max-w-md"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pilih Toko</label><select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none text-center">{STORE_LIST.map(store => (<option key={store} value={store}>{store}</option>))}</select></div></div><div className="max-w-md mx-auto relative mb-6"><input ref={barcodeInputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeInput} placeholder="Scan Resi Disini..." className="w-full pl-4 pr-4 py-4 text-lg font-mono font-bold border-2 border-purple-200 rounded-2xl focus:border-purple-600 outline-none text-center" autoComplete="off" /></div><button onClick={() => cameraInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Buka Kamera HP</button><input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} /></div>{result && (<div className="bg-white rounded-2xl shadow-lg border border-purple-100 mt-6 p-6"><h3 className="font-bold text-lg mb-2">Hasil Scan: {result.resi}</h3><p className="text-sm text-gray-500 mb-4">Customer: {result.customerName || 'GUEST'}</p><div className="flex justify-end gap-3"><button onClick={() => {setResult(null); barcodeInputRef.current?.focus();}} className="px-6 py-2 bg-gray-100 rounded-lg font-bold">Batal</button><button onClick={handleSaveScan} disabled={isProcessing} className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold">Simpan</button></div></div>)}</>)}
    </div>
  );
};