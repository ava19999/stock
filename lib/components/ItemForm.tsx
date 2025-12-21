// FILE: src/components/ItemForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { fetchPriceHistoryBySource, updateInventory, addInventory } from '../services/supabaseService';
import { X, Save, Upload, Loader2, Package, Tag, Layers, DollarSign, LayoutGrid, Info, Calendar, Truck, ShoppingBag, User, History, Check, AlertCircle, ArrowLeft, Camera } from 'lucide-react';
import { compressImage } from '../utils';

interface ItemFormProps {
  initialData?: InventoryItem;
  onCancel: () => void;
  onSuccess: (item?: InventoryItem) => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onCancel, onSuccess }) => {
  const isEditMode = !!initialData;
  
  // Base Form State
  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '', name: '', brand: '', application: '',
    quantity: 0, shelf: '', price: 0, costPrice: 0,
    ecommerce: '', imageUrl: '', initialStock: 0,
    qtyIn: 0, qtyOut: 0, kingFanoPrice: 0
  });

  // Stock Adjustment State
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'none' | 'in' | 'out'>('none');
  const [adjustmentQty, setAdjustmentQty] = useState<string>('');
  const [adjustmentEcommerce, setAdjustmentEcommerce] = useState<string>('');
  const [adjustmentResiTempo, setAdjustmentResiTempo] = useState<string>('');
  const [adjustmentCustomer, setAdjustmentCustomer] = useState<string>('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPricePopup, setShowPricePopup] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        partNumber: initialData.partNumber, name: initialData.name, brand: initialData.brand,
        application: initialData.application, quantity: initialData.quantity, shelf: initialData.shelf,
        price: initialData.price, costPrice: initialData.costPrice, ecommerce: initialData.ecommerce || '',
        imageUrl: initialData.imageUrl, initialStock: initialData.initialStock,
        qtyIn: initialData.qtyIn, qtyOut: initialData.qtyOut, kingFanoPrice: initialData.kingFanoPrice
      });
      setImagePreview(initialData.imageUrl);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'price' || name === 'costPrice' || name === 'kingFanoPrice' || name === 'quantity') 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(prev => ({ ...prev, imageUrl: compressed }));
        setImagePreview(compressed);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Gagal memproses gambar. Pastikan format file didukung.");
      }
    }
  };

  const handleCheckPrices = async () => {
    if (!formData.partNumber) { alert("Isi Part Number terlebih dahulu!"); return; }
    setLoadingPrice(true);
    setShowPricePopup(true);
    try {
        const history = await fetchPriceHistoryBySource(formData.partNumber);
        setPriceHistory(history);
    } catch (error) { console.error(error); }
    setLoadingPrice(false);
  };

  const selectPrice = (price: number) => {
      setFormData(prev => ({ ...prev, costPrice: price }));
      setShowPricePopup(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditMode && initialData) {
        // Validation for Stock Adjustment
        const qtyAdj = Number(adjustmentQty);
        if (stockAdjustmentType !== 'none' && qtyAdj <= 0) {
            setError(`Mohon isi jumlah stok yang valid (lebih dari 0).`);
            setLoading(false);
            return;
        }

        // Build Transaction Object
        const transactionData = (stockAdjustmentType !== 'none' && qtyAdj > 0) ? {
            type: stockAdjustmentType === 'in' ? 'in' as const : 'out' as const,
            qty: qtyAdj,
            ecommerce: adjustmentEcommerce,
            resiTempo: adjustmentResiTempo,
            customer: stockAdjustmentType === 'out' ? adjustmentCustomer : undefined 
        } : undefined;

        const updated = await updateInventory({ ...initialData, ...formData }, transactionData);
        
        if (updated) onSuccess(updated);
        else setError("Gagal update database.");

      } else {
        // Add Mode
        const newId = await addInventory(formData);
        if (newId) onSuccess();
        else setError("Gagal tambah barang.");
      }
    } catch (error) {
      console.error(error);
      setError("Kesalahan Sistem.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate projected stock
  const projectedStock = isEditMode ? (
      stockAdjustmentType === 'in' ? (Number(formData.quantity) + (Number(adjustmentQty) || 0)) :
      stockAdjustmentType === 'out' ? (Number(formData.quantity) - (Number(adjustmentQty) || 0)) :
      formData.quantity
  ) : formData.quantity;

  // --- LOGIKA WARNA MODAL BERDASARKAN STOK ---
  let modalBorderClass = "border-gray-700";
  let modalHeaderClass = "bg-gray-900/80 border-gray-700";
  
  // Gunakan quantity dari formData agar reaktif, atau initialData jika ingin statis.
  // Biasanya status stok dilihat dari data saat ini.
  if (formData.quantity === 0) {
      modalBorderClass = "border-red-600";
      modalHeaderClass = "bg-red-900/90 border-red-700";
  } else if (formData.quantity < 4) {
      modalBorderClass = "border-orange-600";
      modalHeaderClass = "bg-orange-900/90 border-orange-700";
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container Responsif: Full di HP, Modal di PC */}
      <div className={`bg-gray-800 w-full h-[95vh] md:h-auto md:max-h-[90vh] md:max-w-4xl rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${modalBorderClass} transition-colors duration-300`}>
        
        {/* HEADER */}
        <div className={`px-5 py-4 border-b flex justify-between items-center backdrop-blur-md sticky top-0 z-10 ${modalHeaderClass} transition-colors duration-300`}>
          <div className="flex items-center gap-3">
             <button onClick={onCancel} className="md:hidden p-2 -ml-2 hover:bg-gray-700 rounded-full text-gray-300">
                <ArrowLeft size={22} />
             </button>
             <div>
                <h2 className="text-lg font-extrabold text-gray-100 flex items-center gap-2">
                {initialData ? 'Edit Barang' : 'Tambah Baru'}
                </h2>
                <p className="text-xs text-gray-200 hidden md:block">{initialData ? formData.name : 'Isi detail barang baru'}</p>
             </div>
          </div>
          <button onClick={onCancel} className="hidden md:block p-2 hover:bg-gray-700 rounded-full text-gray-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-24 md:pb-6 bg-gray-800">
          {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs border border-red-900/50 mb-5 font-bold"><AlertCircle size={16} />{error}</div>}

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* KOLOM KIRI: GAMBAR & STOCK AWAL */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video lg:aspect-square w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-sm bg-gray-700 ${imagePreview ? 'border-blue-500' : 'border-gray-600 hover:border-gray-500'}`}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white"/>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400 shadow-sm border border-gray-500">
                      <Upload size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-400">Upload Foto</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
              
              {!isEditMode && (
                  <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/40">
                    <label className="text-[10px] font-bold text-blue-300 uppercase mb-1 block flex items-center gap-1"><Layers size={12}/> Stok Awal</label>
                    <input type="number" name="quantity" required min="0" className="w-full bg-gray-900 border border-blue-800 rounded-lg p-2.5 text-xl font-bold text-center text-blue-400 focus:ring-2 focus:ring-blue-800 outline-none" value={formData.quantity} onChange={handleChange} />
                  </div>
              )}
            </div>

            {/* KOLOM KANAN: INPUT FIELDS */}
            <div className="flex-1 space-y-5">
               {/* 1. INFO UTAMA */}
               <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-700 pb-1 mb-2">Info Produk</h3>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><Package size={16}/></span>
                    <input type="text" name="name" required placeholder="Nama Barang" className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm font-bold text-gray-100 focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:font-normal placeholder-gray-400" value={formData.name} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Part Number</label>
                        <input type="text" name="partNumber" required disabled={isEditMode} className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs font-mono font-medium focus:bg-gray-600 focus:border-blue-500 outline-none text-gray-200 disabled:opacity-50" value={formData.partNumber} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Brand</label>
                        <input type="text" name="brand" className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs font-medium focus:bg-gray-600 focus:border-blue-500 outline-none text-gray-200" value={formData.brand} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Aplikasi</label>
                        <input type="text" name="application" className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs font-medium focus:bg-gray-600 focus:border-blue-500 outline-none text-gray-200" value={formData.application} onChange={handleChange} />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Rak</label>
                        <input type="text" name="shelf" className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs font-medium focus:bg-gray-600 focus:border-blue-500 outline-none text-gray-200" value={formData.shelf} onChange={handleChange} />
                     </div>
                  </div>
               </div>

               {/* 2. UPDATE STOK (SESUAI GAMBAR REQUEST) */}
               {isEditMode && (
                   <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-900/40">
                       <h3 className="text-sm font-bold text-blue-300 flex items-center gap-1.5 mb-3"><History size={16}/> Mutasi Stok</h3>
                       
                       <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700 shadow-sm mb-4">
                            <button type="button" onClick={() => setStockAdjustmentType('none')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'none' ? 'bg-gray-700 text-gray-200 shadow-sm' : 'text-gray-500 hover:bg-gray-800'}`}>Tetap</button>
                            <button type="button" onClick={() => setStockAdjustmentType('in')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'in' ? 'bg-green-600 text-white shadow-md shadow-green-900' : 'text-gray-500 hover:text-green-400 hover:bg-gray-800'}`}>+ Masuk</button>
                            <button type="button" onClick={() => setStockAdjustmentType('out')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'out' ? 'bg-red-600 text-white shadow-md shadow-red-900' : 'text-gray-500 hover:text-red-400 hover:bg-gray-800'}`}>- Keluar</button>
                       </div>
                       
                       {stockAdjustmentType !== 'none' && (
                           <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                {/* BARIS 1: JUMLAH & ESTIMASI */}
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                            Jumlah {stockAdjustmentType === 'in' ? 'Masuk' : 'Keluar'}
                                        </label>
                                        <input type="number" required min="1" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full px-3 py-2.5 bg-gray-900 border-2 border-blue-900/50 rounded-xl text-lg font-bold text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-900/20 outline-none transition-all placeholder-gray-600" placeholder="0"/>
                                    </div>
                                    <div className="pb-3 text-right">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase block mb-0.5">Estimasi Akhir</span>
                                        <span className={`text-2xl font-extrabold ${stockAdjustmentType==='in'?'text-green-400':'text-red-400'}`}>{projectedStock}</span>
                                    </div>
                                </div>

                                {/* BAGIAN FORM SESUAI TIPE (IN / OUT) */}
                                {stockAdjustmentType === 'in' ? (
                                    // --- TAMPILAN MASUK (Sesuai Gambar 1) ---
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><ShoppingBag size={10}/> Via / Sumber</label>
                                            <input type="text" placeholder="Tokopedia" value={adjustmentEcommerce} onChange={(e) => setAdjustmentEcommerce(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-blue-500 outline-none placeholder-gray-600" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><Calendar size={10}/> Tempo</label>
                                            <input type="text" placeholder="Lunas / 30 Hari" value={adjustmentResiTempo} onChange={(e) => setAdjustmentResiTempo(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-blue-500 outline-none placeholder-gray-600" />
                                        </div>
                                    </div>
                                ) : (
                                    // --- TAMPILAN KELUAR (Sesuai Gambar 2) ---
                                    <div className="space-y-3 pt-1">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><User size={10}/> Penerima / Customer</label>
                                            <input type="text" placeholder="Nama Bengkel / Pembeli..." value={adjustmentCustomer} onChange={(e) => setAdjustmentCustomer(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-blue-500 outline-none placeholder-gray-600" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><ShoppingBag size={10}/> Via / Sumber</label>
                                                <input type="text" placeholder="Shopee" value={adjustmentEcommerce} onChange={(e) => setAdjustmentEcommerce(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-blue-500 outline-none placeholder-gray-600" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 flex items-center gap-1"><Truck size={10}/> Resi</label>
                                                <input type="text" placeholder="JP..." value={adjustmentResiTempo} onChange={(e) => setAdjustmentResiTempo(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-blue-500 outline-none placeholder-gray-600" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                           </div>
                       )}
                   </div>
               )}

               {/* 3. HARGA */}
               <div className="bg-gray-700 p-4 rounded-2xl border border-gray-600 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12}/> Harga</h3>
                  <div className="relative">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Harga Modal (HPP)</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="flex-1 px-3 py-2 bg-orange-900/20 text-orange-300 font-mono font-bold text-sm rounded-lg border border-orange-900/50 focus:ring-2 focus:ring-orange-800 outline-none placeholder-orange-800" placeholder="0"/>
                        <button type="button" onClick={handleCheckPrices} className="px-3 py-2 bg-gray-800 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white"><History size={18}/></button>
                      </div>
                      {showPricePopup && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 shadow-xl border border-gray-600 rounded-xl z-20 max-h-40 overflow-y-auto">
                           {priceHistory.map((ph, idx) => (
                               <div key={idx} onClick={() => selectPrice(ph.price)} className="p-2.5 border-b border-gray-700 text-xs flex justify-between hover:bg-gray-700 cursor-pointer">
                                   <div><div className="font-bold text-gray-200">{ph.source}</div><div className="text-[10px] text-gray-500">{ph.date}</div></div>
                                   <div className="font-mono font-bold text-blue-400 self-center">Rp {ph.price.toLocaleString()}</div>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Harga Jual</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-blue-900/20 text-blue-300 font-mono font-bold text-sm rounded-lg border border-blue-900/50 focus:ring-2 focus:ring-blue-800 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase ml-1">Hrg King Fano</label>
                        <input type="number" name="kingFanoPrice" value={formData.kingFanoPrice} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-purple-900/20 text-purple-300 font-mono font-bold text-sm rounded-lg border border-purple-900/50 focus:ring-2 focus:ring-purple-800 outline-none" />
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-3 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] safe-area-bottom">
            <button onClick={onCancel} className="flex-1 py-3 bg-gray-700 border border-gray-600 text-gray-300 font-bold rounded-xl hover:bg-gray-600 text-sm">Batal</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-blue-900/50">
                {loading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan
            </button>
        </div>
      </div>
    </div>
  );
};