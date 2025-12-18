// FILE: src/components/ItemForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { fetchPriceHistoryBySource, updateInventory, addInventory } from '../services/supabaseService';
import { X, Save, Upload, Loader2, Package, Tag, Layers, DollarSign, Info, Calendar, Truck, ShoppingBag, User, History, Check, AlertCircle, ArrowLeft, Camera } from 'lucide-react';
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
    quantity: 0, shelf: '',QX: '', price: 0, costPrice: 0,
    ecommerce: '', imageUrl: '',YX: '', initialStock: 0,
    qtyIn: 0, qtyOut: 0, kingFanoPrice: 0
  });

  const [stockAdjustmentType, setStockAdjustmentType] = useState<'none' | 'in' | 'out'>('none');
  const [adjustmentQty, setAdjustmentQty] = useState<string>('');
  const [adjustmentEcommerce, setAdjustmentEcommerce] = useState<string>('');
  const [adjustmentResiTempo, setAdjustmentResiTempo] = useState<string>('');
  const [adjustmentCustomer, setAdjustmentCustomer] = useState<string>('');

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
      } catch (err) {
        alert("Gagal memproses gambar.");
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
        const qtyAdj = Number(adjustmentQty);
        if (stockAdjustmentType !== 'none' && qtyAdj <= 0) {
            setError(`Mohon isi jumlah stok valid.`); setLoading(false); return;
        }

        const transactionData = (stockAdjustmentType !== 'none' && qtyAdj > 0) ? {
            type: stockAdjustmentType === 'in' ? 'in' as const : 'out' as const,
            qty: qtyAdj,
            ecommerce: adjustmentEcommerce,
            resiTempo: adjustmentResiTempo,
            customer: stockAdjustmentType === 'out' ? adjustmentCustomer : undefined 
        } : undefined;

        const updated = await updateInventory({ ...initialData, ...formData }, transactionData);
        if (updated) onSuccess(updated); else setError("Gagal update database.");

      } else {
        const newId = await addInventory(formData);
        if (newId) onSuccess(); else setError("Gagal tambah barang.");
      }
    } catch (error) { setError("Kesalahan Sistem."); } finally { setLoading(false); }
  };

  const projectedStock = isEditMode ? (
      stockAdjustmentType === 'in' ? (Number(formData.quantity) + (Number(adjustmentQty) || 0)) :
      stockAdjustmentType === 'out' ? (Number(formData.quantity) - (Number(adjustmentQty) || 0)) :
      formData.quantity
  ) : formData.quantity;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-50 md:bg-black/60 md:backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-none md:shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER MOBILE & DESKTOP */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white sticky top-0 z-20">
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 transition-colors md:hidden">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {initialData ? 'Edit Barang' : 'Tambah Baru'}
            </h2>
            <p className="text-xs text-gray-500">{initialData ? formData.name : 'Isi detail barang'}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full hidden md:block text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* FORM SCROLLABLE AREA */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50 md:bg-white pb-24">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs border border-red-100 mb-4 font-bold"><AlertCircle size={16} />{error}</div>}

          <div className="flex flex-col md:flex-row gap-6">
            
            {/* GAMBAR */}
            <div className="w-full md:w-1/3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video md:aspect-square w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-sm bg-white ${imagePreview ? 'border-blue-300' : 'border-gray-300'}`}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={24} className="text-white"/>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                      <Upload size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">Upload Foto</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
              
              {!isEditMode && (
                  <div className="mt-4 bg-white p-3 rounded-xl border border-gray-200">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Stok Awal</label>
                    <input type="number" name="quantity" required min="0" className="w-full bg-gray-50 border-none rounded-lg p-2 text-xl font-bold text-center focus:ring-2 focus:ring-blue-100" value={formData.quantity} onChange={handleChange} />
                  </div>
              )}
            </div>

            {/* DETAIL INPUT */}
            <div className="flex-1 space-y-5">
               {/* INFO UTAMA */}
               <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Package size={12}/> Info Produk</h3>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Nama Barang</label>
                    <input type="text" name="name" required className="w-full mt-1 p-3 bg-gray-50 rounded-xl text-sm font-bold border-none focus:ring-2 focus:ring-blue-100" placeholder="Contoh: Kampas Rem Depan..." value={formData.name} onChange={handleChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Part Number</label>
                        <input type="text" name="partNumber" required disabled={isEditMode} className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl text-xs font-mono border-none focus:ring-2 focus:ring-blue-100" value={formData.partNumber} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Brand</label>
                        <input type="text" name="brand" className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl text-xs font-medium border-none focus:ring-2 focus:ring-blue-100" value={formData.brand} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Aplikasi Mobil</label>
                        <input type="text" name="application" className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl text-xs border-none focus:ring-2 focus:ring-blue-100" value={formData.application} onChange={handleChange} />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Rak</label>
                        <input type="text" name="shelf" className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl text-xs border-none focus:ring-2 focus:ring-blue-100" value={formData.shelf} onChange={handleChange} />
                     </div>
                  </div>
               </div>

               {/* HARGA */}
               <div className="bg-white p-4 rounded-2xlqh border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><DollarSign size={12}/> Harga</h3>
                  <div className="relative">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Harga Modal (HPP)</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="flex-1 p-2.5 bg-orange-50 text-orange-700 font-mono font-bold text-sm rounded-xl border-none focus:ring-2 focus:ring-orange-200" />
                        <button type="button" onClick={handleCheckPrices} className="p-2.5 bg-gray-100 rounded-xl text-gray-600"><History size={18}/></button>
                      </div>
                      {showPricePopup && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-xl border rounded-xl z-20 max-h-40 overflow-y-auto">
                           {priceHistory.map((ph, idx) => (
                               <div key={idx} onClick={() => selectPrice(ph.price)} className="p-2 border-b text-xs flex justify-between hover:bg-gray-50 cursor-pointer">
                                   <span>{ph.source}</span><span className="font-bold">{ph.price.toLocaleString()}</span>
                               </div>
                           ))}
                        </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Harga Jual</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full mt-1 p-2.5 bg-blue-50 text-blue-700 font-mono font-bold text-sm rounded-xlYW border-none focus:ring-2 focus:ring-blue-200" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-500 uppercase">Hrg King Fano</label>
                        <input type="number" name="kingFanoPrice" value={formData.kingFanoPrice} onChange={handleChange} className="w-full mt-1 p-2.5 bg-purple-50 text-purple-700 font-mono font-bold text-sm rounded-xl border-none focus:ring-2 focus:ring-purple-200" />
                      </div>
                  </div>
               </div>

               {/* MUTASI STOK (HANYA EDIT) */}
               {isEditMode && (
                   <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Update Stok</h3>
                       <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                            <button type="button" onClick={() => setStockAdjustmentType('none')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${stockAdjustmentType === 'none' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Tetap</button>
                            <button type="button" onClick={() => setStockAdjustmentType('in')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${stockAdjustmentType === 'in' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>+ Masuk</button>
                            <button type="button" onClick={() => setStockAdjustmentType('out')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${stockAdjustmentType === 'out' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>- Keluar</button>
                       </div>
                       
                       {stockAdjustmentType !== 'none' && (
                           <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Jumlah</label>
                                        <input type="number" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full mt-1 p-2.5 border-2 border-blue-100 rounded-xl font-bold text-center" placeholder="0"/>
                                    </div>
                                    <div className="flex-1 text-center bg-gray-50 rounded-xl flex flex-col justify-center">
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">Estimasi Akhir</span>
                                        <span className={`text-lg font-extrabold ${stockAdjustmentType==='in'?'text-green-600':'text-red-600'}`}>{projectedStock}</span>
                                    </div>
                                </div>
                                <input type="text" placeholder={stockAdjustmentType === 'in' ? "Sumber (Tokopedia/Sales)..." : "Penerima / Customer..."} value={stockAdjustmentType === 'out' ? adjustmentCustomer : adjustmentEcommerce} onChange={(e) => stockAdjustmentType === 'out' ? setAdjustmentCustomer(e.target.value) : setAdjustmentEcommerce(e.target.value)} className="w-full p-2.5 bg-gray-50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-200" />
                           </div>
                       )}
                   </div>
               )}
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-white border-t border-gray-100 flex gap-3 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Batal</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70">
                {loading ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} Simpan
            </button>
        </div>
      </div>
    </div>
  );
};