// FILE: src/components/ItemForm.tsx
import React, { useState, useEffect } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { fetchPriceHistoryBySource, updateInventory, addInventory } from '../services/supabaseService';
import { X, Save, History, Check, ShoppingBag, Calendar, Truck, AlertCircle } from 'lucide-react';

interface ItemFormProps {
  initialData?: InventoryItem;
  onSubmit?: (data: InventoryFormData) => void; 
  onSuccess?: () => void; 
  onCancel: () => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel, onSuccess }) => {
  const isEditMode = !!initialData;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '', name: '', brand: '', application: '', 
    price: 0, costPrice: 0, kingFanoPrice: 0, quantity: 0,
    initialStock: 0, qtyIn: 0, qtyOut: 0, shelf: '', imageUrl: '', ecommerce: ''
  });

  const [showPricePopup, setShowPricePopup] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // State untuk Update Stok (Hanya di mode Edit)
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'none' | 'in' | 'out'>('none');
  const [adjustmentQty, setAdjustmentQty] = useState<string>('');
  const [adjustmentEcommerce, setAdjustmentEcommerce] = useState<string>('');
  const [adjustmentResiTempo, setAdjustmentResiTempo] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        partNumber: initialData.partNumber, name: initialData.name, brand: initialData.brand,
        application: initialData.application, price: initialData.price, costPrice: initialData.costPrice,
        kingFanoPrice: initialData.kingFanoPrice || 0, quantity: initialData.quantity,
        initialStock: initialData.initialStock || 0, qtyIn: initialData.qtyIn || 0, qtyOut: initialData.qtyOut || 0,
        shelf: initialData.shelf, imageUrl: initialData.imageUrl, ecommerce: initialData.ecommerce || ''
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name.includes('Price') || name.includes('Stock') || name.includes('qty') 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData(prev => ({ ...prev, imageUrl: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        let success = false;
        
        if (isEditMode && initialData) {
            // Mode Edit: Kirim data master + data transaksi
            const qtyAdj = Number(adjustmentQty);

            if (stockAdjustmentType !== 'none' && qtyAdj <= 0) {
                setError(`Mohon isi jumlah stok yang valid (lebih dari 0).`);
                setLoading(false);
                return;
            }

            const transactionData = (stockAdjustmentType !== 'none' && qtyAdj > 0) ? {
                type: stockAdjustmentType === 'in' ? 'in' as const : 'out' as const,
                qty: qtyAdj,
                ecommerce: adjustmentEcommerce,
                resiTempo: adjustmentResiTempo
            } : undefined;

            success = await updateInventory({ ...initialData, ...formData }, transactionData);
        } else {
            // Mode Tambah Baru
            const id = await addInventory(formData);
            success = !!id;
        }
        
        if (success) {
            if (onSuccess) onSuccess(); 
            if (onSubmit) onSubmit(formData);
            onCancel(); 
        } else {
            setError('Gagal menyimpan ke database. Data tidak ditemukan atau koneksi bermasalah.');
        }
    } catch (err) {
        setError('Terjadi kesalahan sistem.');
        console.error(err);
    } finally {
        setLoading(false);
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

  const projectedStock = isEditMode ? (
      stockAdjustmentType === 'in' ? (Number(formData.quantity) + (Number(adjustmentQty) || 0)) :
      stockAdjustmentType === 'out' ? (Number(formData.quantity) - (Number(adjustmentQty) || 0)) :
      formData.quantity
  ) : formData.quantity;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">
          {initialData ? 'Edit Barang & Stok' : 'Tambah Barang Baru'}
        </h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm border border-red-100 mb-4 animate-pulse"><AlertCircle size={16} />{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Identitas Produk</h3>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label><input required type="text" name="partNumber" value={formData.partNumber} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Contoh: 123-456-ABC" disabled={!!initialData} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label><input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Nama Suku Cadang" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Merek</label><input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Toyota..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Aplikasi</label><input type="text" name="application" value={formData.application} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Avanza..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Rak / Lokasi</label><input type="text" name="shelf" value={formData.shelf} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="A-01" /></div>
                {!isEditMode && (<div><label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>)}
            </div>
            {isEditMode && (
                <div className="mt-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                    <div className="flex justify-between items-center"><h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">Update Stok <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Saat Ini: {formData.quantity}</span></h3></div>
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button type="button" onClick={() => setStockAdjustmentType('none')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${stockAdjustmentType === 'none' ? 'bg-gray-100 text-gray-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>Tetap</button>
                        <button type="button" onClick={() => setStockAdjustmentType('in')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${stockAdjustmentType === 'in' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>+ Tambah</button>
                        <button type="button" onClick={() => setStockAdjustmentType('out')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${stockAdjustmentType === 'out' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>- Kurangi</button>
                    </div>
                    {stockAdjustmentType !== 'none' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Jml {stockAdjustmentType === 'in' ? 'Masuk' : 'Keluar'}</label><input autoFocus required type="number" min="1" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-gray-800" placeholder="0" /></div>
                                <div className="flex items-end pb-2"><p className="text-xs text-gray-500">Stok Akhir: <strong className={stockAdjustmentType==='in'?'text-green-600':'text-red-600'}>{projectedStock}</strong></p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><ShoppingBag size={10}/> Sumber / E-Commerce</label><input type="text" value={adjustmentEcommerce} onChange={(e) => setAdjustmentEcommerce(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder={stockAdjustmentType === 'in' ? "Tokopedia" : "Shopee"} /></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">{stockAdjustmentType === 'in' ? <Calendar size={10}/> : <Truck size={10}/>} {stockAdjustmentType === 'in' ? ' Tempo' : ' No. Resi'}</label><input type="text" value={adjustmentResiTempo} onChange={(e) => setAdjustmentResiTempo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder={stockAdjustmentType === 'in' ? "Lunas" : "JP123..."} /></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Harga & Foto</h3>
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal (HPP)</label>
                <div className="flex gap-2">
                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="0" />
                    <button type="button" onClick={handleCheckPrices} title="Cek Harga" className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 border border-yellow-200"><History size={20} /></button>
                </div>
                {showPricePopup && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowPricePopup(false)}></div>
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">History Pembelian</span><button type="button" onClick={() => setShowPricePopup(false)}><X size={14} className="text-gray-400" /></button></div>
                            <div className="max-h-60 overflow-y-auto">{loadingPrice ? <div className="p-4 text-center text-sm text-gray-400">Memuat data...</div> : priceHistory.length === 0 ? <div className="p-4 text-center text-sm text-red-400">Belum ada history.</div> : (priceHistory.map((ph, idx) => (<button key={idx} type="button" onClick={() => selectPrice(ph.price)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors flex justify-between items-center group"><div><div className="font-bold text-gray-800 text-sm">{ph.source}</div><div className="text-[10px] text-gray-400">{ph.date}</div></div><div className="flex items-center gap-2"><span className="font-mono text-sm font-semibold text-blue-600">Rp {ph.price.toLocaleString()}</span><Check size={14} className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"/></div></button>)))}</div>
                        </div>
                    </>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono" /></div>
                <div><label className="block text-sm font-medium text-purple-700 mb-1">Harga King Fano</label><input type="number" name="kingFanoPrice" value={formData.kingFanoPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-purple-800" /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
              <div className="flex gap-2"><input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="https://..." /><label className="px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"><span className="text-xs font-bold text-gray-600">Upload</span><input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></label></div>
              {formData.imageUrl && (<div className="mt-2 w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200"><img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" /></div>)}
            </div>
          </div>
        </div>
      </form>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors">Batal</button>
        <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"><Save size={18} /><span>{loading ? 'Menyimpan...' : 'Simpan Barang'}</span></button>
      </div>
    </div>
  );
};