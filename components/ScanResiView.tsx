// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Loader2, Save, X, Search } from 'lucide-react';
import { compressImage } from '../utils';
import { ResiAnalysisResult, analyzeResiImage } from '../services/geminiService';
import { addBarangKeluar, fetchInventory } from '../services/supabaseService';

// Daftar Toko Tetap
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, isProcessing }) => {
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]);

  useEffect(() => {
    if (!result) {
      setTimeout(() => { barcodeInputRef.current?.focus(); }, 100);
    }
  }, [result]);

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedCode = barcodeInput.trim();
      if (!scannedCode) return;
      processScannedCode(scannedCode);
      setBarcodeInput('');
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    try {
      const compressed = await compressImage(await readFileAsBase64(file));
      const analysis = await analyzeResiImage(compressed);
      if (analysis && (analysis.resi || analysis.items)) {
        setResult(analysis);
      } else {
        alert("Barcode tidak terbaca.");
      }
    } catch (error) {
      console.error("Error cam", error);
    } finally {
      setAnalyzing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  const processScannedCode = (code: string) => {
    setResult({
      resi: code,
      date: new Date().toLocaleDateString('id-ID'),
      ecommerce: selectedStore,
      customerName: '',
      items: []
    });
  };

  const handleSaveScan = async () => {
    if (!result) return;
    onSave(result);

    // Logic pengurangan stok otomatis
    if (result.items && result.items.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const inventory = await fetchInventory();
      for (const item of result.items) {
        const matchedItem = inventory.find(inv => inv.name.toLowerCase().includes(item.name?.toLowerCase() || ''));
        await addBarangKeluar({
          tanggal: today,
          kodeToko: selectedStore.substring(0, 3).toUpperCase(),
          tempo: 'MJM',
          ecommerce: selectedStore,
          customer: result.customerName || 'GUEST',
          partNumber: matchedItem?.partNumber || '-',
          name: item.name,
          brand: matchedItem?.brand || '-',
          application: matchedItem?.application || '-',
          rak: matchedItem?.shelf || '-',
          stockAwal: matchedItem?.quantity || 0,
          qtyKeluar: item.qty,
          hargaSatuan: matchedItem?.price || 0,
          hargaTotal: (matchedItem?.price || 0) * (item.qty || 0),
          resi: result.resi
        });
      }
    }
    setResult(null);
    barcodeInputRef.current?.focus();
  };

  return (
    <div className="w-full space-y-4">
      {/* TOOLBAR SCANNER MINIMALIS */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-3 items-center">
        
        {/* Dropdown Toko - Compact */}
        <div className="w-full md:w-32 flex-shrink-0">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm font-bold rounded-md focus:ring-purple-500 focus:border-purple-500 block p-2.5"
          >
            {STORE_LIST.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>

        {/* Input Barcode - Flexible Width */}
        <div className="relative flex-grow w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <ScanBarcode className="w-5 h-5 text-gray-400" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeInput}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-purple-500 focus:border-purple-500 block w-full pl-10 p-2.5"
            placeholder="Scan Resi..."
            autoComplete="off"
          />
        </div>

        {/* Tombol Kamera - Icon Only on Mobile if needed, but text is clearer */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={analyzing}
          className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2.5 md:w-auto w-full flex justify-center items-center gap-2 flex-shrink-0"
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanBarcode className="w-4 h-4" />}
          <span className="hidden md:inline">Kamera</span>
        </button>
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />
      </div>

      {/* HASIL SCAN (NOTIFICATION STYLE) */}
      {/* Tampil sebagai panel kecil di bawah toolbar, tidak menutupi area tabel nanti */}
      {result && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-grow">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-purple-600">#{result.resi}</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">{result.ecommerce}</span>
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Customer: {result.customerName || 'GUEST'} | Items: {result.items?.length || 0}
            </p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button
              onClick={() => { setResult(null); barcodeInputRef.current?.focus(); }}
              className="flex-1 md:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={handleSaveScan}
              disabled={isProcessing}
              className="flex-1 md:flex-none px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* AREA UNTUK TABEL MASA DEPAN */}
      {/* <div className="mt-4">
           Tabel akan diletakkan di sini nanti...
      </div> */}
    </div>
  );
};