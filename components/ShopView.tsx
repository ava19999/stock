import React, { useState } from 'react';
import { InventoryItem, CartItem } from '../types';
import { ShoppingCart, Search, Plus, X, ChevronRight, Tag, User } from 'lucide-react';

interface ShopViewProps {
  items: InventoryItem[];
  cart: CartItem[];
  onAddToCart: (item: InventoryItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onCheckout: (customerName: string) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ 
  items, 
  cart, 
  onAddToCart, 
  onRemoveFromCart, 
  onCheckout 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const filteredItems = items.filter(item => 
    item.quantity > 0 && (
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const handleInitialCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const confirmCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim()) {
        onCheckout(customerName);
        setIsCheckoutModalOpen(false);
        setCustomerName('');
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Sticky Search Bar */}
      <div className="sticky top-[64px] z-30 bg-gray-50/95 backdrop-blur-sm pt-2 pb-4 -mx-2 px-2 md:mx-0 md:px-0">
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Cari sparepart berdasarkan nama atau kode..."
            className="pl-10 pr-4 py-3 w-full bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="group bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1">
            <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
                {item.quantity} Unit
              </div>
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag size={10} className="text-blue-500" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{item.partNumber}</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 leading-snug line-clamp-2">{item.name}</h3>
              <p className="hidden sm:block text-xs text-gray-500 mb-3 line-clamp-2 flex-1 leading-relaxed">{item.description}</p>
              
              <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-gray-900">{formatRupiah(item.price)}</span>
                <button
                  onClick={() => onAddToCart(item)}
                  className="bg-gray-900 text-white py-2 px-3 rounded-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center space-x-1.5 w-full sm:w-auto shadow-sm"
                >
                  <Plus size={14} />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">Beli</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
         <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
             <Search size={48} className="mb-4 opacity-20" />
             <p className="text-sm font-medium">Produk tidak ditemukan</p>
         </div>
      )}

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 bg-gray-900 text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all z-30 flex items-center justify-center group"
      >
        <ShoppingCart size={22} className="group-hover:animate-bounce-subtle" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {cartItemCount}
          </span>
        )}
      </button>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Keranjang Belanja</h2>
                <p className="text-xs text-gray-500">{cartItemCount} barang terpilih</p>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-full">
                      <ShoppingCart size={40} className="opacity-20 text-gray-900" />
                  </div>
                  <p className="text-sm font-medium">Keranjang Anda kosong</p>
                  <button onClick={() => setIsCartOpen(false)} className="text-blue-600 text-xs font-bold hover:underline">
                      Mulai Belanja
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 bg-white p-1 rounded-xl group">
                    <div className="w-16 h-16 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                         <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-gray-500 mb-1">{item.partNumber}</p>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold text-gray-900">{formatRupiah(item.price)}</span>
                         <div className="flex items-center gap-3">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">x{item.cartQuantity}</span>
                            <button 
                              onClick={() => onRemoveFromCart(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/50 safe-area-bottom">
              <div className="flex justify-between items-end mb-4">
                <span className="text-sm text-gray-500 font-medium">Total Pembayaran</span>
                <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{formatRupiah(cartTotal)}</span>
              </div>
              <button
                onClick={handleInitialCheckout}
                disabled={cart.length === 0}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center group"
              >
                <span>Checkout</span>
                <ChevronRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Info Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCheckoutModalOpen(false)}></div>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Konfirmasi Pesanan</h3>
              </div>
              <form onSubmit={confirmCheckout} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemesan</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={16} className="text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        required
                        autoFocus
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Masukkan nama Anda..."
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                    <p className="font-semibold mb-1">Total Pembayaran: {formatRupiah(cartTotal)}</p>
                    <p>Pesanan akan diproses oleh Admin setelah konfirmasi.</p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={!customerName.trim()}
                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    Buat Pesanan
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};