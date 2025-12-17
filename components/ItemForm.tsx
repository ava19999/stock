// FILE: src/components/ItemForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { fetchPriceHistoryBySource, updateInventory, addInventory } from '../services/supabaseService';
import { X, Save, Upload, Loader2, Package, Tag, Layers, DollarSign, Globe, Hash, LayoutGrid, Info, Calendar, Truck, ShoppingBag, User, History, Check, AlertCircle } from 'lucide-react';
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

  // Stock Adjustment State (Transaction Logic)
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
      } catch (err) {
        console.error("Gagal kompres gambar", err);
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
    } catch (error) { console.error("Gagal ambil harga", error); }
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
        else setError("Gagal update barang ke database.");

      } else {
        // Add Mode
        const newId = await addInventory(formData);
        if (newId) onSuccess();
        else setError("Gagal menambah barang baru.");
      }
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate projected stock for display
  const projectedStock = isEditMode ? (
      stockAdjustmentType === 'in' ? (Number(formData.quantity) + (Number(adjustmentQty) || 0)) :
      stockAdjustmentType === 'out' ? (Number(formData.quantity) - (Number(adjustmentQty) || 0)) :
      formData.quantity
  ) : formData.quantity;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
              {initialData ? <><Package className="text-blue-600" size={20}/> Edit Barang</> : <><Package className="text-green-600" size={20}/> Tambah Barang Baru</>}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{initialData ? 'Perbarui detail barang & catat mutasi stok.' : 'Masukkan detail barang untuk menambah stok baru.'}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm border border-red-100 mb-6"><AlertCircle size={16} />{error}</div>}

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* KOLOM KIRI: GAMBAR & STOCK */}
            <div className="w-full lg:w-1/3 flex flex-col gap-5">
              {/* Image Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group shadow-sm ${imagePreview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 p-2 rounded-full shadow-lg">
                        <Upload size={20} className="text-blue-600"/>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-500">
                      <Upload size={24} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 block">Upload Foto</span>
                    <span className="text-[10px] text-gray-400">Klik untuk memilih</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
              
              {/* Stock Display / Initial Stock Input */}
              {!isEditMode ? (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                    <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2 block flex items-center gap-1"><Layers size={12}/> Stok Awal</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      required 
                      min="0"
                      className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-2xl font-bold text-blue-700 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                      value={formData.quantity} 
                      onChange={handleChange} 
                    />
                  </div>
              ) : (
                  <div className="bg-gray-100 rounded-xl p-4 border border-gray-200 text-center">
                      <span className="text-xs text-gray-500 uppercase font-bold">Total Stok Fisik</span>
                      <div className="text-3xl font-extrabold text-gray-800 mt-1">{formData.quantity} <span className="text-sm font-medium text-gray-400">Unit</span></div>
                  </div>
              )}
            </div>

            {/* KOLOM KANAN: INPUT FIELDS */}
            <div className="flex-1 space-y-6">
              
              {/* 1. INFORMASI PRODUK */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2 mb-3">Informasi Produk</h3>
                
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400"><Package size={16}/></span>
                  <input type="text" name="name" required placeholder="Nama Barang" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:font-normal" value={formData.name} onChange={handleChange} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><Hash size={16}/></span>
                    <input type="text" name="partNumber" required placeholder="No. Part" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:bg-white focus:border-blue-500 outline-none" value={formData.partNumber} onChange={handleChange} disabled={isEditMode} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><Tag size={16}/></span>
                    <input type="text" name="brand" placeholder="Brand / Merk" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none" value={formData.brand} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><LayoutGrid size={16}/></span>
                    <input type="text" name="application" placeholder="Aplikasi Mobil" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none" value={formData.application} onChange={handleChange} />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400"><Info size={16}/></span>
                    <input type="text" name="shelf" placeholder="Rak / Lokasi" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 outline-none" value={formData.shelf} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* 2. UPDATE STOK (HANYA MUNCUL SAAT EDIT) */}
              {isEditMode && (
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><History size={16}/> Mutasi Stok</h3>
                    </div>
                    
                    {/* Toggle Buttons */}
                    <div className="flex bg-white p-1 rounded-xl border border-blue-100 shadow-sm">
                        <button type="button" onClick={() => setStockAdjustmentType('none')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'none' ? 'bg-gray-100 text-gray-700 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}>Tetap</button>
                        <button type="button" onClick={() => setStockAdjustmentType('in')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'in' ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>+ Masuk</button>
                        <button type="button" onClick={() => setStockAdjustmentType('out')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${stockAdjustmentType === 'out' ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>- Keluar</button>
                    </div>

                    {/* Adjustment Inputs */}
                    {stockAdjustmentType !== 'none' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 pt-2">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Jumlah {stockAdjustmentType === 'in' ? 'Masuk' : 'Keluar'}</label>
                                    <input autoFocus required type="number" min="1" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full px-4 py-2 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold text-gray-800 text-lg" placeholder="0" />
                                </div>
                                <div className="pb-3 text-right">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Estimasi Akhir</span>
                                    <span className={`text-xl font-extrabold ${stockAdjustmentType === 'in' ? 'text-green-600' : 'text-red-600'}`}>{projectedStock}</span>
                                </div>
                            </div>
                            
                            {/* Input Customer (Khusus Keluar) */}
                            {stockAdjustmentType === 'out' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><User size={10}/> Penerima / Customer</label>
                                    <input type="text" value={adjustmentCustomer} onChange={(e) => setAdjustmentCustomer(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none" placeholder="Nama Bengkel / Pembeli..." />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><ShoppingBag size={10}/> Via / Sumber</label>
                                    <input type="text" value={adjustmentEcommerce} onChange={(e) => setAdjustmentEcommerce(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none" placeholder={stockAdjustmentType === 'in' ? "Tokopedia" : "Shopee"} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">{stockAdjustmentType === 'in' ? <Calendar size={10}/> : <Truck size={10}/>} {stockAdjustmentType === 'in' ? ' Tempo' : ' Resi'}</label>
                                    <input type="text" value={adjustmentResiTempo} onChange={(e) => setAdjustmentResiTempo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none" placeholder={stockAdjustmentType === 'in' ? "Lunas / 30 Hari" : "JP..."} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
              )}

              {/* 3. INFORMASI HARGA */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1"><DollarSign size={14}/> Harga Modal & Jual</h3>
                
                {/* Cost Price with History */}
                <div className="mb-4">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Harga Modal (HPP)</label>
                    <div className="relative flex gap-2">
                        <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm font-mono font-medium text-orange-600 focus:bg-white focus:border-orange-400 outline-none" placeholder="0" />
                        <button type="button" onClick={handleCheckPrices} className="px-3 py-2 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 border border-orange-200 transition-colors" title="Cek Riwayat Harga"><History size={18} /></button>
                        
                        {/* Price History Popup */}
                        {showPricePopup && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowPricePopup(false)}></div>
                                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center"><span className="text-[10px] font-bold text-gray-500 uppercase">Riwayat Pembelian</span><button type="button" onClick={() => setShowPricePopup(false)}><X size={14} className="text-gray-400" /></button></div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {loadingPrice ? <div className="p-4 text-center text-xs text-gray-400">Memuat data...</div> : priceHistory.length === 0 ? <div className="p-4 text-center text-xs text-red-400">Belum ada riwayat.</div> : (
                                            priceHistory.map((ph, idx) => (
                                                <button key={idx} type="button" onClick={() => selectPrice(ph.price)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center group">
                                                    <div><div className="font-bold text-gray-800 text-xs">{ph.source}</div><div className="text-[10px] text-gray-400">{ph.date}</div></div>
                                                    <div className="flex items-center gap-2"><span className="font-mono text-xs font-semibold text-blue-600">Rp {ph.price.toLocaleString()}</span><Check size={14} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"/></div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">Harga Jual Umum</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm font-mono font-bold text-gray-800 focus:bg-white focus:border-green-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-600 mb-1 uppercase">Harga King Fano</label>
                    <input type="number" name="kingFanoPrice" value={formData.kingFanoPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 text-sm font-mono font-bold text-purple-800 focus:bg-white focus:border-purple-500 outline-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-all shadow-sm"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {initialData ? 'Simpan Perubahan' : 'Simpan Barang'}
          </button>
        </div>

      </div>
    </div>
  );
};