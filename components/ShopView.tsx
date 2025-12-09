// FILE: src/components/ShopView.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { InventoryItem, CartItem } from '../types';
import { fetchShopItems } from '../services/supabaseService'; 
import { 
  ShoppingCart, Search, Plus, X, Tag, Car, Package, Camera, Loader2, Sparkles, 
  Grid, List, Check, ZoomIn, Move, ChevronLeft, ChevronRight, ShoppingBag // <-- GANTI LayoutGrid JADI Grid
} from 'lucide-react';
import { formatRupiah, compressImage } from '../utils';

// ... (Sisa kode ShopView.tsx sama persis, karena hanya import yang diubah)
// Untuk keamanan, saya akan sertakan kode lengkap ShopView.tsx di bawah ini:

interface ImageCropperProps { imageSrc: string; onConfirm: (croppedBase64: string) => void; onCancel: () => void; }
const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const [zoom, setZoom] = useState(1); const [crop, setCrop] = useState({ x: 0, y: 0 }); const [isDragging, setIsDragging] = useState(false); const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); const imgRef = useRef<HTMLImageElement>(null); const containerRef = useRef<HTMLDivElement>(null); const ASPECT_RATIO = 32 / 9;
  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); setIsDragging(true); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setDragStart({ x: clientX - crop.x, y: clientY - crop.y }); };
  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => { if (!isDragging) return; e.preventDefault(); const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX; const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY; setCrop({ x: clientX - dragStart.x, y: clientY - dragStart.y }); };
  const onPointerUp = () => setIsDragging(false);
  const handleCrop = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const img = imgRef.current; const container = containerRef.current; if (!ctx || !img || !container) return; const OUTPUT_WIDTH = 1280; const OUTPUT_HEIGHT = OUTPUT_WIDTH / ASPECT_RATIO; canvas.width = OUTPUT_WIDTH; canvas.height = OUTPUT_HEIGHT; const containerRect = container.getBoundingClientRect(); const imgRect = img.getBoundingClientRect(); const scaleX = OUTPUT_WIDTH / containerRect.width; const scaleY = OUTPUT_HEIGHT / containerRect.height; const drawX = (imgRect.left - containerRect.left) * scaleX; const drawY = (imgRect.top - containerRect.top) * scaleY; const drawW = imgRect.width * scaleX; const drawH = imgRect.height * scaleY; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, drawX, drawY, drawW, drawH); const base64 = canvas.toDataURL('image/jpeg', 0.9); onConfirm(base64); };
  return (<div className="fixed inset-0 z-[80] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in"><div className="w-full max-w-3xl flex justify-between items-center text-white mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Move size={20}/> Sesuaikan Posisi</h3><button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-full"><X size={24}/></button></div><div ref={containerRef} className="relative w-full max-w-4xl bg-gray-800 overflow-hidden shadow-2xl border-2 border-white/20 cursor-move rounded-lg touch-none" style={{ aspectRatio: `${ASPECT_RATIO}` }} onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp} onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}><img ref={imgRef} src={imageSrc} alt="Crop Target" draggable={false} className="absolute max-w-none origin-center pointer-events-none transition-transform duration-75" style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px) scale(${zoom})`, minWidth: '100%', minHeight: '100%' }} /><div className="absolute inset-0 pointer-events-none opacity-30"><div className="w-full h-full border border-white/50 flex"><div className="flex-1 border-r border-white/30"></div><div className="flex-1 border-r border-white/30"></div><div className="flex-1"></div></div></div></div><div className="w-full max-w-md mt-6 space-y-4"><div className="flex items-center gap-4 text-white"><ZoomIn size={20} /><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/><span className="text-xs font-mono w-8">{zoom.toFixed(1)}x</span></div><div className="grid grid-cols-2 gap-4"><button onClick={onCancel} className="py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600">Batal</button><button onClick={handleCrop} className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 flex items-center justify-center gap-2"><Check size={18}/> Simpan & Upload</button></div><p className="text-center text-gray-400 text-xs">Geser gambar untuk mengatur posisi. Gunakan slider untuk zoom.</p></div></div>);
};

interface ShopViewProps { items: InventoryItem[]; cart: CartItem[]; isAdmin: boolean; bannerUrl: string; onAddToCart: (item: InventoryItem) => void; onRemoveFromCart: (itemId: string) => void; onCheckout: (customerName: string) => void; onUpdateBanner: (base64: string) => Promise<void>; }

export const ShopView: React.FC<ShopViewProps> = ({ cart = [], isAdmin, bannerUrl, onAddToCart, onRemoveFromCart, onCheckout, onUpdateBanner }) => {
  const [shopItems, setShopItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false); 
  const [isUploadingBanner, setIsUploadingBanner] = useState(false); 
  const [tempBannerImg, setTempBannerImg] = useState<string | null>(null);
  
  const [customerNameInput, setCustomerNameInput] = useState(''); 
  const [resiInput, setResiInput] = useState('');
  const [ecommerceInput, setEcommerceInput] = useState('');
  
  const bannerInputRef = useRef<HTMLInputElement>(null); 

  const loadShopData = useCallback(async () => {
    setLoading(true);
    const { data, count } = await fetchShopItems(page, 20, searchTerm, selectedCategory);
    setShopItems(data);
    setTotalPages(Math.ceil(count / 20));
    setLoading(false);
  }, [page, searchTerm, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1); 
        loadShopData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadShopData();
  }, [page]); 

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { setTempBannerImg(reader.result as string); if (bannerInputRef.current) bannerInputRef.current.value = ''; }; reader.readAsDataURL(file); };
  const handleCropConfirm = async (base64: string) => { setTempBannerImg(null); setIsUploadingBanner(true); try { const compressed = await compressImage(base64); await onUpdateBanner(compressed); } catch (error) { console.error("Gagal upload banner", error); alert("Gagal memproses gambar banner"); } finally { setIsUploadingBanner(false); } };
  
  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.cartQuantity), 0); 
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const carCategories = ['Semua', 'Honda', 'Toyota', 'Suzuki', 'Nissan', 'Daihatsu', 'Mitsubishi', 'Wuling', 'Mazda'];

  return (
    <div className="relative min-h-full pb-20">
      {tempBannerImg && <ImageCropper imageSrc={tempBannerImg} onConfirm={handleCropConfirm} onCancel={() => setTempBannerImg(null)} />}
      
      <div className="relative w-full aspect-[21/9] md:aspect-[32/9] bg-gray-900 rounded-2xl overflow-hidden shadow-lg mb-6 group select-none">
          {bannerUrl ? <img src={bannerUrl} alt="Promo Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 flex flex-col items-center justify-center text-white p-6 text-center"><Sparkles className="mb-3 text-yellow-400 opacity-80" size={32} /><h2 className="text-xl md:text-3xl font-bold mb-1">Promo Spesial Hari Ini</h2><p className="text-blue-200 text-xs md:text-sm">Temukan sparepart terbaik untuk mobil Anda</p></div>}
          {isAdmin && (<div className="absolute top-3 right-3 z-10"><button onClick={() => bannerInputRef.current?.click()} disabled={isUploadingBanner} className="bg-white/90 backdrop-blur text-gray-800 px-3 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-white flex items-center gap-2 transition-all active:scale-95">{isUploadingBanner ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>}{isUploadingBanner ? 'Upload...' : 'Ganti Banner'}</button><input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} /></div>)}
      </div>

      <div className="sticky top-[64px] z-30 bg-gray-50/95 backdrop-blur-sm pt-2 pb-2 -mx-2 px-2 md:mx-0 md:px-0 space-y-3 border-b border-gray-200/50">
        <div className="flex gap-2">
            <div className="relative w-full group"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Search size={18} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" /></div><input type="text" placeholder="Cari sparepart..." className="pl-10 pr-4 py-3 w-full bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
            <div className="bg-white rounded-xl p-1 flex shadow-sm border border-gray-200"><button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18}/></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={18}/></button></div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {carCategories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:text-blue-600'}`}>
                    {cat === 'Semua' ? 'Semua Mobil' : cat}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-500"><Loader2 size={32} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat Produk...</p></div>
      ) : shopItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400"><Search size={48} className="opacity-20 mb-3" /><p>Tidak ditemukan barang yang tersedia</p></div>
      ) : (
        <>
        {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 mt-4">
                {shopItems.map((item) => (
                <div key={item.id} className="group bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1">
                    <div className="aspect-square w-full bg-gray-50 relative overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300"><Car size={32}/><span className="text-[10px] mt-1">No Image</span></div>}
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">{item.quantity} Unit</div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1.5"><Tag size={10} className="text-blue-500" /><span className="text-xs font-mono text-gray-500 uppercase tracking-wider truncate">{item.partNumber || '-'}</span></div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1 leading-snug line-clamp-1" title={item.name}>{item.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">{item.description}</p>
                        <div className="mt-auto pt-3 border-t border-gray-50 flex flex-col justify-between gap-2">
                            <span className="text-sm font-extrabold text-gray-900">{formatRupiah(item.price)}</span>
                            <button onClick={() => onAddToCart(item)} className="bg-gray-900 text-white py-2 px-3 rounded-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center space-x-1.5 w-full shadow-sm"><Plus size={14} /><span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">Keranjang</span></button>
                        </div>
                    </div>
                </div>
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-3 mt-4">
                {shopItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex gap-3 hover:shadow-md transition-shadow">
                         <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Car size={20}/></div>}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] font-bold text-center py-0.5">{item.quantity} Unit</div>
                         </div>
                         <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                             <div>
                                 <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                 <div className="flex items-center gap-2 mb-1"><span className="text-xs font-mono text-gray-500 bg-gray-50 px-1 rounded truncate">{item.partNumber || '-'}</span></div>
                                 <p className="text-xs text-gray-500 line-clamp-1 truncate">{item.description}</p>
                             </div>
                             <div className="flex justify-between items-end mt-2">
                                 <span className="text-sm font-extrabold text-gray-900">{formatRupiah(item.price)}</span>
                                 <button onClick={() => onAddToCart(item)} className="bg-gray-900 text-white p-2 rounded-lg hover:bg-blue-600 active:scale-95 transition-all shadow-sm flex items-center gap-1"><Plus size={14} /><span className="text-[10px] font-bold">Beli</span></button>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        )}

        <div className="flex justify-between items-center mt-8 bg-white p-3 rounded-xl border border-gray-100 shadow-sm sticky bottom-20 md:bottom-4 z-20">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /> Sebelumnya</button>
            <span className="text-xs font-medium text-gray-500">Halaman <span className="font-bold text-gray-900">{page}</span> dari {totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">Selanjutnya <ChevronRight size={16} /></button>
        </div>
        </>
      )}

      <button onClick={() => setIsCartOpen(true)} className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 bg-gray-900 text-white p-4 rounded-full shadow-xl hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center group"><ShoppingCart size={24} />{cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cartItemCount}</span>}</button>
      
      {isCartOpen && (<div className="fixed inset-0 z-[60] flex justify-end"><div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div><div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right"><div className="px-5 py-4 border-b flex justify-between items-center bg-white"><h2 className="text-lg font-bold">Keranjang</h2><button onClick={() => setIsCartOpen(false)}><X size={20}/></button></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">{cart.map(item => (<div key={item.id} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100"><div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer"/> : <div className="h-full flex items-center justify-center"><Package size={20}/></div>}</div><div className="flex-1 flex flex-col justify-between"><h4 className="text-sm font-bold line-clamp-1">{item.name}</h4><div className="flex justify-between items-center mt-2"><span className="text-sm font-bold text-blue-600">{formatRupiah(item.price)}</span><div className="flex gap-2 items-center bg-gray-50 px-2 py-1 rounded"><span className="text-xs font-bold">x {item.cartQuantity}</span><button onClick={() => onRemoveFromCart(item.id)} className="text-red-500"><X size={14}/></button></div></div></div></div>))}{cart.length === 0 && <div className="flex flex-col items-center justify-center h-64 text-gray-400"><ShoppingCart size={48} className="mb-2 opacity-20"/><p>Keranjang kosong</p></div>}</div><div className="p-5 border-t bg-white safe-area-bottom"><div className="flex justify-between mb-4"><span className="font-bold">Total</span><span className="font-extrabold text-xl">{formatRupiah(cartTotal)}</span></div><button onClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }} disabled={cart.length===0} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black disabled:opacity-50">Lanjut Bayar</button></div></div></div>)}
      
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCheckoutModalOpen(false)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden animate-in zoom-in-95">
                <div className="bg-gray-50 px-6 py-4 border-b">
                    <h3 className="text-lg font-bold">Konfirmasi</h3>
                </div>
                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    if(customerNameInput.trim()) { 
                        let finalName = customerNameInput;
                        if(resiInput.trim()) finalName += ` (Resi: ${resiInput})`;
                        if(ecommerceInput.trim()) finalName += ` (Via: ${ecommerceInput})`;
                        onCheckout(finalName); 
                        setIsCheckoutModalOpen(false); 
                        setCustomerNameInput(''); 
                        setResiInput('');
                        setEcommerceInput('');
                    } 
                }} className="p-6">
                    <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nama</label><input type="text" required autoFocus value={customerNameInput} onChange={(e) => setCustomerNameInput(e.target.value)} className="w-full p-3 border rounded-xl mt-1" placeholder="Nama Anda..." /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">No. Resi</label><input type="text" value={resiInput} onChange={(e) => setResiInput(e.target.value)} className="w-full p-3 border rounded-xl mt-1" placeholder="Nomor Resi..." /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">E-Commerce</label><input type="text" value={ecommerceInput} onChange={(e) => setEcommerceInput(e.target.value)} className="w-full p-3 border rounded-xl mt-1" placeholder="Contoh: Shopee..." /></div>
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