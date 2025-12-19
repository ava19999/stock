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

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setPreview(initialData.imageUrl || '');
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' || name === 'costPrice' || name === 'initialStock' || name === 'kingFanoPrice' ? Number(value) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        }));
        setPreview(base64);
        setFormData(prev => ({ ...prev, imageUrl: base64 }));
      } catch (error) { console.error("Error processing image", error); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (isEditMode && initialData) {
            // Logic Update dengan Transaksi Stok
            let transaction = undefined;
            if (stockAdjustmentType !== 'none' && Number(adjustmentQty) > 0) {
                transaction = {
                    type: stockAdjustmentType as 'in' | 'out',
                    qty: Number(adjustmentQty),
                    ecommerce: adjustmentEcommerce,
                    resiTempo: adjustmentResiTempo,
                    customer: adjustmentCustomer
                };
            }
            // Panggil updateInventory dengan transaction object
            const updated = await updateInventory({ ...initialData, ...formData }, transaction);
            if(updated) onSuccess(updated);
        } else {
            // Logic Add New
            const newId = await addInventory(formData);
            if(newId) onSuccess({ ...formData, id: newId } as InventoryItem);
        }
    } catch (error) {
        console.error("Error saving item:", error);
        alert("Gagal menyimpan barang.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 flex flex-col h-full w-full">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-gray-900 sticky top-0 z-20">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-100">
                    {isEditMode ? <Edit2Icon /> : <Package />} {isEditMode ? 'Edit Barang' : 'Tambah Barang Baru'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Kelola informasi detail dan stok barang.</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* SECTION 1: FOTO & IDENTITAS UTAMA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* FOTO */}
               <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-sm text-center">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Foto Produk</label>
                      <div className="relative group aspect-square bg-gray-900 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center overflow-hidden hover:border-blue-500 transition-colors">
                          {preview ? (
                              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                              <div className="flex flex-col items-center text-gray-500">
                                  <ImageIcon className="w-10 h-10 mb-2 opacity-50"/>
                                  <span className="text-xs">Tap untuk upload</span>
                              </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"><Upload size={18}/></button>
                              <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600"><Camera size={18}/></button>
                          </div>
                      </div>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                  </div>
               </div>

               {/* FORM UTAMA */}
               <div className="md:col-span-2 space-y-6">
                  {/* Basic Info Card */}
                  <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-sm">
                      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Informasi Dasar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Part Number</label>
                              <div className="relative mt-1">
                                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                  <input required type="text" name="partNumber" value={formData.partNumber} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm font-mono text-gray-100 outline-none placeholder-gray-600" placeholder="Kode Part..." />
                              </div>
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Brand / Merk</label>
                              <div className="relative mt-1">
                                  <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                  <input type="text" list="brands" name="brand" value={formData.brand} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none placeholder-gray-600" placeholder="Merk Barang..." />
                                  <datalist id="brands"><option value="Toyota"/><option value="Honda"/><option value="Suzuki"/><option value="Mitsubishi"/><option value="Daihatsu"/></datalist>
                              </div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Barang</label>
                              <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm font-medium text-gray-100 outline-none placeholder-gray-600" placeholder="Nama lengkap sparepart..." />
                          </div>
                          <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Aplikasi Kendaraan</label>
                              <div className="relative mt-1">
                                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                                  <input type="text" name="application" value={formData.application} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none placeholder-gray-600" placeholder="Cocok untuk mobil apa saja..." />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Stock Adjustment Card (Hanya saat Edit) */}
                  {isEditMode && (
                      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 bg-orange-500 h-full"></div>
                          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2 flex items-center gap-2"><History size={16}/> Penyesuaian Stok (Opsional)</h3>
                          
                          <div className="flex gap-4 mb-4">
                              <button type="button" onClick={() => setStockAdjustmentType('none')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${stockAdjustmentType === 'none' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>Tidak Ada Perubahan</button>
                              <button type="button" onClick={() => setStockAdjustmentType('in')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${stockAdjustmentType === 'in' ? 'bg-green-900/30 border-green-600 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>+ Barang Masuk</button>
                              <button type="button" onClick={() => setStockAdjustmentType('out')} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${stockAdjustmentType === 'out' ? 'bg-red-900/30 border-red-600 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>- Barang Keluar</button>
                          </div>

                          {stockAdjustmentType !== 'none' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jumlah {stockAdjustmentType === 'in' ? 'Masuk' : 'Keluar'}</label>
                                      <input type="number" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 text-sm font-bold text-gray-100 outline-none" placeholder="0" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Sumber / Via</label>
                                      <input type="text" value={adjustmentEcommerce} onChange={(e) => setAdjustmentEcommerce(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 text-sm text-gray-100 outline-none" placeholder="Cth: Shopee, Toko..." />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">{stockAdjustmentType === 'in' ? 'Resi / Tempo' : 'Nama Pelanggan'}</label>
                                      <input type="text" value={stockAdjustmentType === 'in' ? adjustmentResiTempo : adjustmentCustomer} onChange={(e) => stockAdjustmentType === 'in' ? setAdjustmentResiTempo(e.target.value) : setAdjustmentCustomer(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 text-sm text-gray-100 outline-none" placeholder="..." />
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
               </div>
            </div>

            {/* SECTION 2: DETAIL HARGA & LOKASI */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-sm">
               <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Detail Harga & Lokasi</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Stok Saat Ini</label>
                              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} disabled={isEditMode} className={`w-full mt-1 px-4 py-2.5 rounded-xl border text-sm font-bold outline-none ${isEditMode ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-900 border-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500/50'}`} />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Rak / Lokasi</label>
                              <input type="text" name="shelf" value={formData.shelf} onChange={handleChange} className="w-full mt-1 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none" placeholder="A-01" />
                          </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Harga Modal</label>
                        <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-gray-900 text-gray-100 font-mono font-bold text-sm rounded-lg border border-gray-700 focus:ring-2 focus:ring-green-500/50 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Harga Jual</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-blue-900/20 text-blue-300 font-mono font-bold text-sm rounded-lg border border-blue-800 focus:ring-2 focus:ring-blue-500/50 outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase ml-1">Hrg King Fano</label>
                        <input type="number" name="kingFanoPrice" value={formData.kingFanoPrice} onChange={handleChange} className="w-full mt-1 px-3 py-2 bg-purple-900/20 text-purple-300 font-mono font-bold text-sm rounded-lg border border-purple-800 focus:ring-2 focus:ring-purple-500/50 outline-none" />
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </form>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex gap-3 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] safe-area-bottom">
            <button onClick={onCancel} className="flex-1 py-3 bg-gray-800 border border-gray-700 text-gray-300 font-bold rounded-xl hover:bg-gray-700 text-sm">Batal</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                Simpan Barang
            </button>
        </div>
    </div>
  );
};

const ImageIcon = ({className}:{className?:string}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const Edit2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;