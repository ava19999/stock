// FILE: src/components/ItemForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { analyzeInventoryImage } from '../services/geminiService'; 
import { compressImage } from '../utils';
import { Camera, Upload, X, Save, Loader2, Box, ChevronDown, Check, Crown, Tag } from 'lucide-react'; 
// (Barcode dihapus dari import icon karena SKU hilang)

interface ItemFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onCancel: () => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '',
    // sku: '',  <-- HAPUS
    name: '',
    brand: '',       // Brand menggantikan posisi strategis SKU
    application: '', // Application menggantikan Description
    
    price: 0,
    kingFanoPrice: 0, 
    costPrice: 0,
    quantity: 0,
    initialStock: 0,
    qtyIn: 0,
    qtyOut: 0,
    shelf: '',
    imageUrl: '',
    ecommerce: '',
  });

  const [activePriceType, setActivePriceType] = useState<'retail' | 'kingFano'>('retail');
  const [showPriceMenu, setShowPriceMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        partNumber: initialData.partNumber,
        // sku: initialData.sku <-- HAPUS
        name: initialData.name,
        
        brand: initialData.brand || '',
        application: initialData.application || '',
        
        price: initialData.price,
        kingFanoPrice: initialData.kingFanoPrice || 0,
        costPrice: initialData.costPrice || 0,
        quantity: initialData.quantity, 
        initialStock: initialData.initialStock || 0,
        qtyIn: initialData.qtyIn || 0,
        qtyOut: initialData.qtyOut || 0,
        shelf: initialData.shelf,
        imageUrl: initialData.imageUrl,
        ecommerce: initialData.ecommerce || ''
      });
    }
  }, [initialData]);

  useEffect(() => {
    const awal = Number(formData.initialStock) || 0;
    const masuk = Number(formData.qtyIn) || 0;
    const keluar = Number(formData.qtyOut) || 0;
    const akhir = awal + masuk - keluar;
    if (akhir !== formData.quantity) {
        setFormData(prev => ({ ...prev, quantity: akhir }));
    }
  }, [formData.initialStock, formData.qtyIn, formData.qtyOut]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;
    if (name === 'shelf') {
        processedValue = value.toUpperCase().replace(/-/g, ' ');
    } else if (name === 'brand') {
        processedValue = value.toUpperCase();
    } else if (['price', 'kingFanoPrice', 'costPrice', 'initialStock', 'qtyIn', 'qtyOut'].includes(name)) {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value) || 0;
      if (activePriceType === 'retail') {
          setFormData(prev => ({ ...prev, price: val }));
      } else {
          setFormData(prev => ({ ...prev, kingFanoPrice: val }));
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;
      try {
        const compressedBase64 = await compressImage(originalBase64);
        setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
        if (process.env.API_KEY) {
          setIsAnalyzing(true);
          try {
            const analysis = await analyzeInventoryImage(compressedBase64);
            if (analysis.suggestedName) {
               setFormData(prev => ({
                 ...prev,
                 name: analysis.suggestedName || prev.name,
                 // Jika ada logic AI baru, bisa diupdate disini
                 shelf: analysis.suggestedShelfCategory ? analysis.suggestedShelfCategory.toUpperCase().replace(/-/g, ' ') : prev.shelf
               }));
            }
          } catch (error) { console.error("AI Analysis failed", error); } finally { setIsAnalyzing(false); }
        }
      } catch (error) { console.error("Gagal memproses gambar", error); }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto overflow-hidden animate-in zoom-in-95 duration-200" onClick={() => setShowPriceMenu(false)}>
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">{initialData ? 'Edit Barang' : 'Tambah Barang Baru'}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 space-y-3">
             <label className="block text-sm font-medium text-gray-700 mb-1">Foto Barang</label>
             <div 
               className="relative aspect-square w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
               onClick={() => fileInputRef.current?.click()}
             >
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white" size={32} /></div>
                  </>
                ) : (
                  <div className="text-center p-4"><Upload className="mx-auto text-gray-400 mb-2" size={32} /><p className="text-xs text-gray-500">Klik untuk upload foto</p></div>
                )}
                {isAnalyzing && (<div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10"><Loader2 className="animate-spin text-blue-600 mb-2" size={32} /><span className="text-xs font-medium text-blue-600">AI Menganalisis...</span></div>)}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="w-full lg:w-2/3 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Part</label>
                <input type="text" name="partNumber" required value={formData.partNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: 15400-RAF-T01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Rak</label>
                <input type="text" name="shelf" required value={formData.shelf} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="Contoh: RAK A01" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nama sparepart..." />
            </div>

            {/* --- BRAND (PENGGANTI POSISI SKU) --- */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Brand / Merk</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="HONDA, TOYOTA, DAIHATSU..." />
            </div>
            {/* ------------------------------------ */}

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Harga Modal</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500 text-xs font-bold">Rp</span>
                            <input type="number" name="costPrice" min="0" value={formData.costPrice} onChange={handleChange} className="w-full pl-8 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm transition-all focus:ring-2 focus:ring-gray-200 outline-none" placeholder="0" />
                        </div>
                    </div>
                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className={`block text-xs font-bold uppercase transition-colors flex items-center gap-1 ${activePriceType === 'retail' ? 'text-blue-600' : 'text-purple-600'}`}>{activePriceType === 'retail' ? 'Harga Eceran' : 'Harga King Fano'}</label>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setShowPriceMenu(!showPriceMenu); }} className="text-[10px] flex items-center gap-1 bg-white border border-gray-300 px-2 py-0.5 rounded shadow-sm hover:bg-gray-50 text-gray-600 font-medium transition-all active:scale-95">Ganti Tipe <ChevronDown size={10}/></button>
                        </div>
                        {showPriceMenu && (
                            <div className="absolute right-0 top-7 z-20 w-48 bg-white rounded-lg shadow-xl border border-gray-200 animate-in zoom-in-95 duration-100 overflow-hidden">
                                <div className="p-1">
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pilih Daftar Harga</div>
                                    <button type="button" onClick={() => { setActivePriceType('retail'); setShowPriceMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md flex items-center justify-between group ${activePriceType === 'retail' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}><div className="flex items-center gap-2"><Tag size={14} className={activePriceType === 'retail' ? 'text-blue-500' : 'text-gray-400'}/> Harga Eceran</div>{activePriceType === 'retail' && <Check size={14} />}</button>
                                    <button type="button" onClick={() => { setActivePriceType('kingFano'); setShowPriceMenu(false); }} className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md flex items-center justify-between group ${activePriceType === 'kingFano' ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'}`}><div className="flex items-center gap-2"><Crown size={14} className={activePriceType === 'kingFano' ? 'text-purple-500' : 'text-gray-400'}/> King Fano</div>{activePriceType === 'kingFano' && <Check size={14} />}</button>
                                </div>
                            </div>
                        )}
                        <div className="relative">
                            <span className={`absolute left-3 top-2 text-xs font-bold ${activePriceType === 'retail' ? 'text-blue-600' : 'text-purple-600'}`}>Rp</span>
                            <input type="number" min="0" value={activePriceType === 'retail' ? formData.price : (formData.kingFanoPrice || 0)} onChange={handlePriceChange} className={`w-full pl-8 pr-4 py-2 bg-white border rounded-lg focus:ring-2 outline-none text-sm font-bold text-gray-900 transition-all ${activePriceType === 'retail' ? 'border-blue-300 focus:ring-blue-500' : 'border-purple-300 focus:ring-purple-500'}`} placeholder="0" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Box size={16}/> Manajemen Stok</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stok Awal</label><input type="number" name="initialStock" min="0" value={formData.initialStock} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm text-center" /></div>
                    <div><label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Penambahan</label><input type="number" name="qtyIn" min="0" value={formData.qtyIn} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg outline-none text-sm text-center text-green-700 font-bold" /></div>
                    <div><label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Pengurangan</label><input type="number" name="qtyOut" min="0" value={formData.qtyOut} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg outline-none text-sm text-center text-red-700 font-bold" /></div>
                    <div><label className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Stok Akhir</label><input type="number" readOnly value={formData.quantity} className="w-full px-3 py-2 bg-blue-100 border border-blue-200 rounded-lg text-sm text-center font-extrabold text-blue-900 cursor-not-allowed" /></div>
                </div>
            </div>

            <div className="space-y-4">
                {/* SKU DIHAPUS DARI SINI */}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Commerce Link / Nama Toko</label>
                    <input type="text" name="ecommerce" value={formData.ecommerce} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" placeholder="Misal: Tokopedia - Jaya Abadi" />
                </div>
                
                {/* --- APLIKASI (PENGGANTI DESKRIPSI) --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aplikasi Kendaraan / Keterangan</label>
                    <input 
                        type="text" 
                        name="application" 
                        value={formData.application} 
                        onChange={handleChange} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none" 
                        placeholder="Contoh: CRV G3, JAZZ RS, INNOVA REBORN..." 
                    />
                </div>
                {/* -------------------------------------- */}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center"><Save size={18} className="mr-2" />Simpan Data</button>
        </div>
      </form>
    </div>
  );
};