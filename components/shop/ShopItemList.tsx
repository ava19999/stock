// FILE: src/components/shop/ShopItemList.tsx
import React from 'react';
import { InventoryItem } from '../../types';
import { formatRupiah } from '../../utils';
import { Loader2, Search, Car, Crown, Tag, Plus } from 'lucide-react';

interface ShopItemListProps {
    loading: boolean;
    shopItems: InventoryItem[];
    viewMode: 'grid' | 'list';
    isAdmin: boolean;
    isKingFano: boolean;
    adminPriceMode: 'retail' | 'kingFano';
    onAddToCart: (item: InventoryItem) => void;
}

export const ShopItemList: React.FC<ShopItemListProps> = ({ 
    loading, shopItems, viewMode, isAdmin, isKingFano, adminPriceMode, onAddToCart 
}) => {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-blue-500"><Loader2 size={32} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat Produk...</p></div>
        );
    }

    if (shopItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500"><Search size={48} className="opacity-20 mb-3" /><p>Tidak ditemukan barang yang tersedia</p></div>
        );
    }

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 mt-4">
                {shopItems.map((item) => {
                    const isSpecialView = isAdmin ? (adminPriceMode === 'kingFano') : isKingFano;
                    const useSpecialPrice = isSpecialView && item.kingFanoPrice && item.kingFanoPrice > 0;
                    const displayPrice = useSpecialPrice ? item.kingFanoPrice : item.price;
                    
                    return (
                    <div key={item.id} className="group bg-gray-800 rounded-xl shadow-none hover:shadow-lg border border-gray-700 overflow-hidden flex flex-col transition-all duration-300 transform hover:-translate-y-1 hover:border-gray-600">
                        <div className="aspect-square w-full bg-gray-700 relative overflow-hidden">
                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-600"><Car size={32}/><span className="text-[10px] mt-1">No Image</span></div>}
                            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold text-gray-200 shadow-sm border border-gray-600">{item.quantity} Unit</div>
                            
                            {useSpecialPrice && (
                                <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 border border-purple-400">
                                    <Crown size={10} fill="white"/> SPECIAL
                                </div>
                            )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-1.5"><Tag size={10} className="text-blue-400" /><span className="text-xs font-mono text-gray-400 uppercase tracking-wider truncate">{item.partNumber || '-'}</span></div>
                            <h3 className="text-sm font-bold text-gray-100 mb-1 leading-snug line-clamp-1" title={item.name}>{item.name}</h3>
                            
                            <div className="flex flex-wrap gap-1 mb-2">
                                {item.brand && <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded font-medium border border-gray-600">{item.brand}</span>}
                                {item.application && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded font-medium border border-blue-900/50">{item.application}</span>}
                            </div>
                            
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed flex-1">{item.description}</p>
                            <div className="mt-auto pt-3 border-t border-gray-700 flex flex-col justify-between gap-2">
                                <div className="flex flex-col">
                                    <span className={`text-sm font-extrabold ${useSpecialPrice ? 'text-purple-400' : 'text-gray-100'}`}>{formatRupiah(displayPrice)}</span>
                                </div>
                                <button onClick={() => onAddToCart({ ...item, customPrice: displayPrice })} className="bg-gray-100 text-gray-900 py-2 px-3 rounded-lg hover:bg-blue-600 hover:text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5 w-full shadow-sm font-bold"><Plus size={14} /><span className="text-[10px] sm:text-xs uppercase tracking-wide">Keranjang</span></button>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 mt-4">
            {shopItems.map((item) => {
                const isSpecialView = isAdmin ? (adminPriceMode === 'kingFano') : isKingFano;
                const useSpecialPrice = isSpecialView && item.kingFanoPrice && item.kingFanoPrice > 0;
                const displayPrice = useSpecialPrice ? item.kingFanoPrice : item.price;

                return (
                <div key={item.id} className="bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-700 flex gap-3 hover:border-gray-600 transition-colors">
                        <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Car size={20}/></div>}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] font-bold text-center py-0.5">{item.quantity} Unit</div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                                <h3 className="text-sm font-bold text-gray-100 leading-tight line-clamp-2 mb-1">{item.name}</h3>
                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-400 bg-gray-700 px-1 rounded truncate border border-gray-600">{item.partNumber || '-'}</span>
                                {item.brand && <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded font-medium border border-gray-600">{item.brand}</span>}
                                {item.application && <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded font-medium border border-blue-900/50">{item.application}</span>}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-1 truncate">{item.description}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <div>
                                    <span className={`text-sm font-extrabold ${useSpecialPrice ? 'text-purple-400' : 'text-gray-100'}`}>{formatRupiah(displayPrice)}</span>
                                </div>
                                <button onClick={() => onAddToCart({ ...item, customPrice: displayPrice })} className="bg-gray-100 text-gray-900 p-2 rounded-lg hover:bg-blue-600 hover:text-white active:scale-95 transition-all shadow-sm flex items-center gap-1"><Plus size={14} /><span className="text-[10px] font-bold">Beli</span></button>
                            </div>
                        </div>
                </div>
                );
            })}
        </div>
    );
};