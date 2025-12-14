// FILE: src/components/ItemForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { addBarangMasuk, addBarangKeluar } from '../services/supabaseService';
import { analyzeInventoryImage } from '../services/geminiService';
import { compressImage } from '../utils';
import { Camera, Upload, X, Save, Loader2, Box, ChevronDown } from 'lucide-react';

interface ItemFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onCancel: () => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '', name: '', brand: '', application: '', 
    price: 0, kingFanoPrice: 0, costPrice: 0,
    quantity: 0, initialStock: 0, qtyIn: 0, qtyOut: 0,
    shelf: '', imageUrl: '', ecommerce: '',
  });

  const [transactionInfo, setTransactionInfo] = useState({
    ecommerce: '', tempo: 'MJM', customer: 'MANUAL GUDANG', store: 'OFFLINE', kodeToko: 'GDG'
  });

  const [activePriceType, setActivePriceType] = useState<'retail' | 'kingFano'>('retail');
  const [showPriceMenu, setShowPriceMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        partNumber: initialData.partNumber, name: initialData.name,
        brand: initialData.brand || '', application: initialData.application || '',
        price: initialData.price, kingFanoPrice: initialData.kingFanoPrice || 0,
        costPrice: initialData.costPrice || 0, quantity: initialData.quantity, 
        initialStock: initialData.quantity, qtyIn: 0, qtyOut: 0,
        shelf: initialData.shelf, imageUrl: initialData.imageUrl, ecommerce: initialData.ecommerce || ''
      });
    }
  }, [initialData]);

  useEffect(() => {
    const awal = Number(formData.initialStock) || 0;
    const masuk = Number(formData.qtyIn) || 0;
    const keluar = Number(formData.qtyOut) || 0;
    setFormData(prev => ({ ...prev, quantity: awal + masuk - keluar }));
  }, [formData.initialStock, formData.qtyIn, formData.qtyOut]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'shelf') processedValue = value.toUpperCase().replace(/-/g, ' ');
    else if (name === 'brand') processedValue = value.toUpperCase();
    else if (['price', 'kingFanoPrice', 'costPrice', 'initialStock', 'qtyIn', 'qtyOut'].includes(name)) processedValue = parseFloat(value) || 0;
    
    if (['ecommerce', 'customer', 'store', 'tempo', 'kodeToko'].includes(name)) {
        setTransactionInfo(prev => ({ ...prev, [name]: value }));
    } else {
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressedBase64 = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
        if (process.env.API_KEY) {
          setIsAnalyzing(true);
          const analysis = await analyzeInventoryImage(compressedBase64);
          if (analysis.suggestedName) {
             setFormData(prev => ({ ...prev, name: analysis.suggestedName || prev.name, shelf: analysis.suggestedShelfCategory || prev.shelf }));
          }
          setIsAnalyzing(false);
        }
      } catch (error) { console.error("Error", error); }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    const today = new Date().toISOString().split('T')[0]; // Format Tanggal String
    
    if (formData.qtyIn > 0) {
        await addBarangMasuk({
            tanggal: today, tempo: transactionInfo.tempo, ecommerce: transactionInfo.ecommerce || 'TANPA NAMA',
            partNumber: formData.partNumber, name: formData.name, brand: formData.brand, application: formData.application,
            rak: formData.shelf, stockAwal: formData.initialStock, qtyMasuk: formData.qtyIn,
            hargaSatuan: formData.costPrice, hargaTotal: formData.qtyIn * formData.costPrice
        });
    }
    if (formData.qtyOut > 0) {
        await addBarangKeluar({
            tanggal: today, kodeToko: transactionInfo.kodeToko, tempo: transactionInfo.tempo,
            ecommerce: transactionInfo.store, customer: transactionInfo.customer,
            partNumber: formData.partNumber, name: formData.name, brand: formData.brand, application: formData.application,
            rak: formData.shelf, stockAwal: formData.initialStock, qtyKeluar: formData.qtyOut,
            hargaSatuan: formData.price, hargaTotal: formData.qtyOut * formData.price, resi: '-'
        });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto overflow-hidden animate-in zoom-in-95 duration-200" onClick={() => setShowPriceMenu(false)}>
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit / Update Stok' : 'Tambah Barang Baru'}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 space-y-3">
             <label className="block text-sm font-medium text-gray-700 mb-1">Foto Barang</label>
             <div className="relative aspect-square w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden group" onClick={() => fileInputRef.current?.click()}>
                {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center p-4"><Upload className="mx-auto text-gray-400 mb-2" size={32} /><p className="text-xs text-gray-500">Klik Upload</p></div>}
                {isAnalyzing && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
          <div className="w-full lg:w-2/3 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">No. Part</label><input type="text" name="partNumber" required value={formData.partNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: 15400-RAF-T01" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Rak</label><input type="text" name="shelf" required value={formData.shelf} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="Contoh: RAK A01" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label><input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nama sparepart..." /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Brand</label><input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" placeholder="HONDA..." /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Aplikasi</label><input type="text" name="application" value={formData.application} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" placeholder="JAZZ, CRV..." /></div>
            </div>
            {/* PRICING & STOCK SECTION */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="grid grid-cols-2 gap-6">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Harga Modal</label><input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full pl-4 py-2 border rounded-lg" placeholder="0" /></div>
                    <div>
                        <div className="flex justify-between mb-1"><label className="block text-xs font-bold uppercase text-blue-600">Harga Jual</label><button type="button" onClick={() => setShowPriceMenu(!showPriceMenu)} className="text-[10px] bg-white border px-2 py-0.5 rounded">Ganti Tipe</button></div>
                        {showPriceMenu && <div className="absolute bg-white border shadow-lg rounded p-1"><button type="button" onClick={() => {setActivePriceType('retail'); setShowPriceMenu(false)}} className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100">Retail</button><button type="button" onClick={() => {setActivePriceType('kingFano'); setShowPriceMenu(false)}} className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100">King Fano</button></div>}
                        <input type="number" value={activePriceType === 'retail' ? formData.price : (formData.kingFanoPrice || 0)} onChange={(e) => setFormData(prev => ({ ...prev, [activePriceType === 'retail' ? 'price' : 'kingFanoPrice']: parseFloat(e.target.value) || 0 }))} className="w-full pl-4 py-2 border rounded-lg font-bold" />
                    </div>
                </div>
            </div>
            {/* STOCK MANAGEMENT */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Box size={16}/> Update Stok</label>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div><label className="block text-[10px] font-bold text-gray-500">Awal</label><input type="number" name="initialStock" value={formData.initialStock} onChange={handleChange} className="w-full border rounded text-center text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-green-600">Masuk</label><input type="number" name="qtyIn" value={formData.qtyIn} onChange={handleChange} className="w-full border border-green-300 rounded text-center font-bold text-green-700 text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-red-600">Keluar</label><input type="number" name="qtyOut" value={formData.qtyOut} onChange={handleChange} className="w-full border border-red-300 rounded text-center font-bold text-red-700 text-sm" /></div>
                    <div><label className="block text-[10px] font-bold text-blue-800">Akhir</label><input type="number" readOnly value={formData.quantity} className="w-full bg-blue-100 border rounded text-center font-bold text-blue-900 text-sm" /></div>
                </div>
                {(formData.qtyIn > 0 || formData.qtyOut > 0) && (<div className="mb-3"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tempo</label><input type="text" name="tempo" value={transactionInfo.tempo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="MJM / CASH / UTANG" /></div>)}
                {formData.qtyIn > 0 && (<div className="bg-green-50 p-2 rounded border border-green-100"><label className="block text-xs font-bold text-green-800">E-Commerce / Supplier</label><input type="text" name="ecommerce" value={transactionInfo.ecommerce} onChange={handleChange} className="w-full border rounded text-sm" required /></div>)}
                {formData.qtyOut > 0 && (<div className="bg-red-50 p-2 rounded border border-red-100 grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-red-800">Toko</label><select name="store" value={transactionInfo.store} onChange={handleChange} className="w-full border rounded text-sm"><option value="OFFLINE">OFFLINE</option><option value="TIKTOK">TIKTOK</option><option value="SHOPEE">SHOPEE</option></select></div><div><label className="block text-xs font-bold text-red-800">Customer</label><input type="text" name="customer" value={transactionInfo.customer} onChange={handleChange} className="w-full border rounded text-sm" /></div></div>)}
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t gap-3"><button type="button" onClick={onCancel} className="px-6 py-2 border rounded-lg">Batal</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={18} className="mr-2 inline"/> Simpan</button></div>
      </form>
    </div>
  );
};