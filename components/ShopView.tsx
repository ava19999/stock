// FILE: src/components/ShopView.tsx
import React, { useState, useMemo } from 'react';
import { InventoryItem, CartItem } from '../types';
import { ShoppingCart, Search, Plus, X, Tag, Car, Package } from 'lucide-react';
import { formatRupiah } from '../utils';

interface ShopViewProps {
  items: InventoryItem[];
  cart: CartItem[];
  onAddToCart: (item: InventoryItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onCheckout: (customerName: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ 
  items = [], cart = [], onAddToCart, onRemoveFromCart, onCheckout 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  
  // Modals State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  
  const [customerNameInput, setCustomerNameInput] = useState('');

  const safeItems = Array.isArray(items) ? items : [];

  // --- LOGIC FILTER BARANG ---
  const carCategories = useMemo(() => {
    const categories = new Set<string>();
    safeItems.forEach(item => {
        const desc = item.description || '';
        const match = desc.match(/^\[(.*?)\]/);
        if (match && match[1]) categories.add(match[1]);
    });
    return ['Semua', ...Array.from(categories).sort()];
  }, [safeItems]);

  const filteredItems = useMemo(() => {
    return safeItems.filter(item => {
      const name = (item.name || '').toLowerCase();
      const pn = (item.partNumber || '').toLowerCase();
      const desc = (item.description || '');
      const term = searchTerm.toLowerCase();
      const matchesSearch = name.includes(term) || pn.includes(term);
      const matchesCategory = selectedCategory === 'Semua' ? true : desc.startsWith(`[${selectedCategory}]`);
      return (Number(item.quantity) || 0) > 0 && matchesSearch && matchesCategory;
    });
  }, [safeItems, searchTerm, selectedCategory]);

  // --- HELPERS ---
  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.cartQuantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  return (
    <div className="relative min-h-full">
      
      {/* HEADER TOOLS */}
      <div className="sticky top-[64px] z-30 bg-gray-50/95 backdrop-blur-sm pt-2 pb-2 -mx-2 px-2 md:mx-0 md:px-0 space-y-3 border-b border-gray-200/50">
        <div className="flex gap-2">
            {/* Search Bar */}
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                  type="text"
                  placeholder="Cari sparepart..."
                  className="pl-10 pr-4 py-3 w-full bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </div>

        {/* Category Tabs */}
        {carCategories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {carCategories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:text-blue-600'}`}>{cat === 'Semua' ? 'Semua Mobil' : cat}</button>
                ))}
            </div>
        )}
      </div>

      {/* ITEMS GRID */}
      {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400"><Search size={48} className="opacity-20 mb-3" /><p>Tidak ditemukan</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 mt-4">
            {filteredItems.map((item) => (
            <div key={item.id || Math.random()} className="group bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1">
                <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300"><Car size={32}/><span className="text-[10px] mt-1">No Image</span></div>}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-700 shadow-sm">{item.quantity || 0} Unit</div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Tag size={10} className="text-blue-500" />
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider truncate">{item.partNumber || '-'}</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 leading-snug line-clamp-1" title={item.name}>{item.name}</h3>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">{item.description}</p>
                    <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col justify-between gap-2">
                        <span className="text-sm font-extrabold text-gray-900">{formatRupiah(item.price)}</span>
                        <button onClick={() => onAddToCart(item)} className="bg-gray-900 text-white py-2 px-3 rounded-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center space-x-1.5 w-full shadow-sm">
                            <Plus size={14} /><span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">Keranjang</span>
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>
      )}

      {/* FLOATING CART BUTTON */}
      <button onClick={() => setIsCartOpen(true)} className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 bg-gray-900 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center group">
        <ShoppingCart size={24} />{cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cartItemCount}</span>}
      </button>

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="px-5 py-4 border-b flex justify-between items-center bg-white"><h2 className="text-lg font-bold">Keranjang</h2><button onClick={() => setIsCartOpen(false)}><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {cart.map(item => (
                  <div key={item.id} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <div className="h-full flex items-center justify-center"><Package size={20}/></div>}</div>
                    <div className="flex-1 flex flex-col justify-between">
                        <h4 className="text-sm font-bold line-clamp-1">{item.name}</h4>
                        <div className="flex justify-between items-center mt-2"><span className="text-sm font-bold text-blue-600">{formatRupiah(item.price)}</span><div className="flex gap-2 items-center bg-gray-50 px-2 py-1 rounded"><span className="text-xs font-bold">x {item.cartQuantity}</span><button onClick={() => onRemoveFromCart(item.id)} className="text-red-500"><X size={14}/></button></div></div>
                    </div>
                  </div>
              ))}
            </div>
            <div className="p-5 border-t bg-white safe-area-bottom">
              <div className="flex justify-between mb-4"><span className="font-bold">Total</span><span className="font-extrabold text-xl">{formatRupiah(cartTotal)}</span></div>
              <button onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }} disabled={cart.length===0} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black disabled:opacity-50">Lanjut Bayar</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCheckoutModalOpen(false)}></div>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95">
              <div className="bg-gray-50 px-6 py-4 border-b"><h3 className="text-lg font-bold">Konfirmasi</h3></div>
              <form onSubmit={(e) => { e.preventDefault(); if(customerNameInput.trim()) { onCheckout(customerNameInput); setIsCheckoutModalOpen(false); setCustomerNameInput(''); } }} className="p-6">
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Nama</label><input type="text" required autoFocus value={customerNameInput} onChange={(e) => setCustomerNameInput(e.target.value)} className="w-full p-3 border rounded-xl mt-1" placeholder="Nama Anda..." /></div>
                  <div className="bg-blue-50 p-4 rounded-xl text-blue-900 font-bold flex justify-between text-sm"><span>Total</span><span>{formatRupiah(cartTotal)}</span></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setIsCheckoutModalOpen(false)} className="py-3 bg-gray-100 font-bold rounded-xl">Batal</button>
                  <button type="submit" disabled={!customerNameInput.trim()} className="py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">Kirim</button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};