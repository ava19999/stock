// FILE: src/components/ShopView.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InventoryItem, CartItem } from '../types';
import { fetchShopItems } from '../services/supabaseService'; 
import { compressImage } from '../utils';
import { ShoppingCart } from 'lucide-react';

import { ImageCropper } from './shop/ImageCropper';
import { ShopBanner } from './shop/ShopBanner';
import { ShopFilterBar } from './shop/ShopFilterBar';
import { ShopItemList } from './shop/ShopItemList';
import { ShopPagination } from './shop/ShopPagination';
import { ShopCartModal } from './shop/ShopCartModal';
import { ShopCheckoutModal } from './shop/ShopCheckoutModal';

interface ShopViewProps { 
    items: InventoryItem[]; 
    cart: CartItem[]; 
    isAdmin: boolean;
    isKingFano: boolean; 
    bannerUrl: string; 
    onAddToCart: (item: InventoryItem) => void; 
    onRemoveFromCart: (itemId: string) => void; 
    onUpdateCartItem: (itemId: string, changes: Partial<CartItem>) => void; 
    onCheckout: (customerName: string) => void; 
    onUpdateBanner: (base64: string) => Promise<void>; 
}

export const ShopView: React.FC<ShopViewProps> = ({ 
    cart = [], 
    isAdmin,
    isKingFano, 
    bannerUrl, 
    onAddToCart, 
    onRemoveFromCart, 
    onUpdateCartItem, 
    onCheckout, 
    onUpdateBanner 
}) => {
  const [shopItems, setShopItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false); 
  const [isUploadingBanner, setIsUploadingBanner] = useState(false); 
  const [tempBannerImg, setTempBannerImg] = useState<string | null>(null);
  
  const bannerInputRef = useRef<HTMLInputElement>(null); 
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const loadShopData = useCallback(async () => {
    setLoading(true);
    const { data, count } = await fetchShopItems(page, 20, searchTerm, 'Semua');
    setShopItems(data);
    setTotalPages(Math.ceil(count / 20));
    setLoading(false);
  }, [page, searchTerm]); 

  useEffect(() => {
    const timer = setTimeout(() => {
        setPage(1); 
        loadShopData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]); 

  useEffect(() => { loadShopData(); }, [page]); 

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => { setTempBannerImg(reader.result as string); if (bannerInputRef.current) bannerInputRef.current.value = ''; }; reader.readAsDataURL(file); };
  const handleCropConfirm = async (base64: string) => { setTempBannerImg(null); setIsUploadingBanner(true); try { const compressed = await compressImage(base64); await onUpdateBanner(compressed); } catch (error) { console.error("Gagal upload banner", error); alert("Gagal memproses gambar banner"); } finally { setIsUploadingBanner(false); } };
  const handleCheckoutConfirm = (finalName: string) => {
      onCheckout(finalName);
      setIsCheckoutModalOpen(false);
  };

  return (
    <div className="relative min-h-full pb-20 bg-gray-900 text-gray-100">
      {tempBannerImg && <ImageCropper imageSrc={tempBannerImg} onConfirm={handleCropConfirm} onCancel={() => setTempBannerImg(null)} />}
      
      <ShopBanner 
        bannerUrl={bannerUrl} 
        isAdmin={isAdmin} 
        isUploading={isUploadingBanner} 
        fileInputRef={bannerInputRef}
        onUploadClick={() => bannerInputRef.current?.click()}
        onFileSelect={handleFileSelect}
      />

      <ShopFilterBar 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm}
        isAdmin={isAdmin}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <ShopItemList 
        loading={loading}
        shopItems={shopItems}
        viewMode={viewMode}
        isAdmin={isAdmin}
        isKingFano={isKingFano}
        adminPriceMode={'retail'} // Placeholder
        onAddToCart={onAddToCart}
      />

      <ShopPagination 
        page={page} 
        totalPages={totalPages} 
        setPage={setPage} 
      />

      <button onClick={() => setIsCartOpen(true)} className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 bg-gray-100 text-gray-900 p-4 rounded-full shadow-xl hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center group"><ShoppingCart size={24} />{cartItemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-sm">{cartItemCount}</span>}</button>
      
      <ShopCartModal 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveFromCart={onRemoveFromCart}
        onUpdateCartItem={onUpdateCartItem}
        onCheckoutClick={() => { setIsCartOpen(false); setIsCheckoutModalOpen(true); }}
      />

      <ShopCheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onConfirm={handleCheckoutConfirm}
      />
    </div>
  );
};