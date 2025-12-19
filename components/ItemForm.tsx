// FILE: src/components/ItemForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { fetchPriceHistoryBySource, updateInventory, addInventory } from '../services/supabaseService';
import { 
  X, Save, Upload, Loader2, Package, Tag, Layers, DollarSign, 
  LayoutGrid, Info, Calendar, Truck, ShoppingBag, ImageIcon, Camera, 
  History, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { compressImage, formatRupiah } from '../utils';

interface ItemFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onCancel: () => void;
  onSuccess?: (item?: InventoryItem) => void; // Add this prop
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '', name: '', brand: '', application: '', quantity: 0,
    price: 0, costPrice: 0, kingFanoPrice: 0, initialStock: 0, qtyIn: 0, qtyOut: 0,
    shelf: '', imageUrl: '', ecommerce: ''
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setPreview(initialData.imageUrl || '');
      loadHistory(initialData.partNumber);
    }
  }, [initialData]);

  const loadHistory = async (partNumber: string) => {
      if(!partNumber) return;
      const history = await fetchPriceHistoryBySource(partNumber);
      setPriceHistory(history);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = await compressImage(reader.result as string);
            setPreview(base64);
            setFormData(prev => ({ ...prev, imageUrl: base64 }));
            setLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (error) { console.error(error); setLoading(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Logic untuk menyimpan data
    try {
        let result = null;
        if (initialData) {
            // Update
            const updatedItem = { ...initialData, ...formData };
            result = await updateInventory(updatedItem);
        } else {
            // Add New
            const newId = await addInventory(formData);
            if (newId) result = { ...formData, id: newId } as InventoryItem;
        }

        if (result && onSuccess) {
            onSuccess(result);
        } else if (result) {
            onSubmit(formData); // Fallback for old prop usage
        }
    } catch (error) {
        console.error("Error saving:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 p-0 md:p-6 h-full flex flex-col w-full">
        {/* Header - Dark Mode */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 px-4 md:px-0 pt-4 md:pt-0">
            <div>
                <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    {initialData ? <Edit2Icon /> : <Package />} {initialData ? 'Edit Barang & Detail' : 'Tambah Barang Baru'}
                </h2>
                <p className="text-gray-500 text-xs mt-1">Kelola informasi stok, harga, dan riwayat barang.</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 md:px-0 pb-20 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                
                {/* KOLOM KIRI: Foto & Status Stok */}
                <div className="space-y-6">
                    {/* Image Uploader */}
                    <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-sm">
                        <label className="block text-sm font-bold text-gray-300 mb-3">Foto Barang</label>
                        <div className="aspect-square rounded-xl border-2 border-dashed border-gray-600 bg-gray-900 hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer relative group overflow-hidden flex flex-col items-center justify-center">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"><ImageIcon className="text-gray-500" /></div>
                                    <p className="text-xs text-gray-500">Tap untuk upload</p>
                                </div>
                            )}
                            
                            {/* Overlay Controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-500"><Upload size={20}/></button>
                                <button type="button" onClick={() => cameraInputRef.current?.click()} className="p-3 bg-gray-700 rounded-full text-white hover:bg-gray-600"><Camera size={20}/></button>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                        </div>
                    </div>

                    {/* Status Stok (Live Calculation) */}
                    {initialData && (
                        <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><Layers size={16}/> Pergerakan Stok</h3>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Masuk</div>
                                    <div className="text-lg font-bold text-green-400 flex items-center justify-center gap-1">
                                        <ArrowUpRight size={14}/> {formData.qtyIn||0}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-xl border border-gray-700">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Keluar</div>
                                    <div className="text-lg font-bold text-red-400 flex items-center justify-center gap-1">
                                        <ArrowDownRight size={14}/> {formData.qtyOut||0}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 ring-1 ring-blue-500/30">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sisa</div>
                                    <div className="text-lg font-bold text-blue-400">{formData.quantity}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* KOLOM KANAN: Form Input */}
                <div className="lg:col-span-2 space-y-6">
                    {/* INFO UTAMA */}
                    <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Informasi Utama</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Part Number</label>
                                <div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input required type="text" value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm font-mono text-gray-100 outline-none placeholder-gray-600" placeholder="Cth: 123-456-ABC" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Kategori / Brand</label>
                                <div className="relative"><LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input list="brands" type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none placeholder-gray-600" placeholder="Cth: Toyota" />
                                <datalist id="brands"><option value="Toyota"/><option value="Honda"/><option value="Suzuki"/><option value="Mitsubishi"/></datalist></div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Nama Barang</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 font-medium outline-none placeholder-gray-600" placeholder="Nama lengkap sparepart..." />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Aplikasi Kendaraan</label>
                            <div className="relative"><Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input type="text" value={formData.application} onChange={e => setFormData({...formData, application: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none placeholder-gray-600" placeholder="Cth: Avanza 2012, Rush, Terios" /></div>
                        </div>
                    </div>

                    {/* INFO HARGA & LOKASI */}
                    <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Harga & Lokasi</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Harga Modal</label>
                                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                                <input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="w-full pl-8 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500/50 text-sm text-gray-100 outline-none" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Harga Jual</label>
                                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                                <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full pl-8 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 font-bold outline-none" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Harga King Fano</label>
                                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                                <input type="number" value={formData.kingFanoPrice} onChange={e => setFormData({...formData, kingFanoPrice: Number(e.target.value)})} className="w-full pl-8 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/50 text-sm text-gray-100 outline-none" /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Stok Awal / Update</label>
                                <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">Rak / Lokasi</label>
                                <input type="text" value={formData.shelf} onChange={e => setFormData({...formData, shelf: e.target.value})} className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-100 outline-none placeholder-gray-600" placeholder="Cth: A-12" />
                            </div>
                        </div>
                    </div>

                    {/* TABEL RIWAYAT TRANSAKSI / HARGA (DARK MODE) */}
                    {priceHistory.length > 0 && (
                        <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-sm">
                            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
                                <History size={16}/> Riwayat Harga & Suplier
                            </h3>
                            <div className="overflow-x-auto rounded-lg border border-gray-700">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-900/50 text-xs font-bold text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-gray-700">Sumber / Toko</th>
                                            <th className="px-4 py-2 border-b border-gray-700">Tanggal</th>
                                            <th className="px-4 py-2 border-b border-gray-700 text-right">Harga Beli</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-700">
                                        {priceHistory.map((ph, idx) => (
                                            <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-2 text-gray-200 font-medium">{ph.source}</td>
                                                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{ph.date}</td>
                                                <td className="px-4 py-2 text-right text-gray-200 font-bold">{formatRupiah(ph.price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </form>

        {/* Footer Actions - Sticky Bottom */}
        <div className="border-t border-gray-800 p-4 bg-gray-900/90 backdrop-blur-md flex justify-between items-center sticky bottom-0 z-20">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Batal</button>
            <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan Barang
            </button>
        </div>
    </div>
  );
};

const Edit2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;