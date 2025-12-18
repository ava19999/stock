// FILE: src/components/ScanResiView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ScanBarcode, Loader2, Save, ChevronDown, Check, Upload } from 'lucide-react';
import { compressImage } from '../utils';
import { ResiAnalysisResult, analyzeResiImage } from '../services/geminiService';
import { addBarangKeluar, fetchInventory } from '../services/supabaseService';

// Daftar Toko Internal
const STORE_LIST = ['MJM', 'LARIS', 'BJW'];

// Daftar Marketplace
const MARKETPLACES = ['Shopee', 'Tiktok', 'Tokopedia'];

interface ScanResiProps {
  onSave: (data: ResiAnalysisResult) => void;
  onSaveBulk?: (orders: any[]) => void;
  isProcessing: boolean;
}

export const ScanResiView: React.FC<ScanResiProps> = ({ onSave, isProcessing }) => {
  const [result, setResult] = useState<ResiAnalysisResult | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedStore, setSelectedStore] = useState(STORE_LIST[0]);
  
  // State untuk Marketplace
  const [selectedMarketplace, setSelectedMarketplace] = useState('Shopee');
  const [showMarketplacePopup, setShowMarketplacePopup] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref untuk upload file excel
  const [analyzing, setAnalyzing] = useState(false);

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
        setResult({
            ...analysis,
            ecommerce: selectedMarketplace
        });
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

  // Handler Upload Excel (Dipicu saat klik nama Marketplace)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Mengupload data ${selectedMarketplace} dari file: ${file.name}`);
      // Logika parsing Excel bisa dimasukkan di sini
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

  const processScannedCode = (code: string) => {
    setResult({
      resi: code,
      date: new Date().toLocaleDateString('id-ID'),
      ecommerce: selectedMarketplace,
      customerName: '',
      items: []
    });
  };

  const handleSaveScan = async () => {
    if (!result) return;
    onSave(result);

    if (result.items && result.items.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const inventory = await fetchInventory();
      for (const item of result.items) {
        const matchedItem = inventory.find(inv => inv.name.toLowerCase().includes(item.name?.toLowerCase() || ''));
        await addBarangKeluar({
          tanggal: today,
          kodeToko: selectedStore.substring(0, 3).toUpperCase(),
          tempo: 'MJM',
          ecommerce: selectedMarketplace,
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

  // Helper untuk warna badge marketplace
  const getMarketplaceColor = (mp: string) => {
    switch(mp) {
        case 'Shopee': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
        case 'Tokopedia': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200';
        case 'Tiktok': return 'bg-black text-white border-gray-800 hover:bg-gray-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* TOOLBAR SCANNER MINIMALIS */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-3 items-center">
        
        {/* GROUP 1: Selectors & Upload Trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto">
            
            {/* Marketplace Split Button */}
            <div className="relative flex shadow-sm rounded-md">
                {/* Tombol KIRI: Klik untuk Upload Excel */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold border rounded-l-md transition-colors ${getMarketplaceColor(selectedMarketplace)}`}
                    title={`Upload Excel ${selectedMarketplace}`}
                >
                    <Upload size={14} />
                    {selectedMarketplace}
                </button>
                
                {/* Tombol KANAN: Klik untuk Ganti Marketplace */}
                <button 
                    onClick={() => setShowMarketplacePopup(!showMarketplacePopup)}
                    className="px-2 bg-white border-y border-r border-gray-300 rounded-r-md hover:bg-gray-50 flex items-center justify-center"
                    title="Ganti Marketplace"
                >
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {/* Input File Tersembunyi */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* Popup Marketplace */}
                {showMarketplacePopup && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95">
                        <div className="py-1">
                            {MARKETPLACES.map((mp) => (
                                <button
                                    key={mp}
                                    onClick={() => { setSelectedMarketplace(mp); setShowMarketplacePopup(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${selectedMarketplace === mp ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700'}`}
                                >
                                    {mp}
                                    {selectedMarketplace === mp && <Check className="w-3 h-3"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Store Selector (MJM/LARIS) */}
            <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-700 text-sm font-semibold rounded-md focus:ring-purple-500 focus:border-purple-500 block p-2.5"
            >
                {STORE_LIST.map(store => (
                <option key={store} value={store}>{store}</option>
                ))}
            </select>
        </div>

        {/* GROUP 2: Input Barcode (Scan Manual) */}
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
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-purple-500 focus:border-purple-500 block w-full pl-10 p-2.5 font-mono"
            placeholder={`Scan Resi ${selectedMarketplace}...`}
            autoComplete="off"
          />
        </div>

        {/* GROUP 3: Tombol Kamera */}
        <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={analyzing}
            className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-md text-sm px-4 py-2.5 w-full md:w-auto flex items-center justify-center gap-2"
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

      {/* HASIL SCAN */}
      {result && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md shadow-sm animate-in fade-in slide-in-from-top-2 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-grow">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-purple-600">#{result.resi}</span>
              <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 font-medium">{result.ecommerce}</span>
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
    </div>
  );
};