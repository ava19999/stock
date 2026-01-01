// FILE: src/components/shop/ShopFilterBar.tsx
import React from 'react';
import { Search, Eye, ChevronDown, Tag, Check, Crown, LayoutGrid, List } from 'lucide-react';

interface ShopFilterBarProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    isAdmin: boolean;
    adminPriceMode: 'retail' | 'kingFano';
    setAdminPriceMode: (mode: 'retail' | 'kingFano') => void;
    showAdminPriceMenu: boolean;
    setShowAdminPriceMenu: (show: boolean) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
}

export const ShopFilterBar: React.FC<ShopFilterBarProps> = ({
    searchTerm, setSearchTerm, isAdmin, adminPriceMode, setAdminPriceMode, 
    showAdminPriceMenu, setShowAdminPriceMenu, viewMode, setViewMode
}) => {
    return (
        <div className="sticky top-[64px] z-30 bg-gray-900/95 backdrop-blur-sm pt-2 pb-2 -mx-2 px-2 md:mx-0 md:px-0 space-y-3 border-b border-gray-800">
            <div className="flex gap-2">
                <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    </div>
                    <input type="text" placeholder="Cari sparepart..." className="pl-10 pr-4 py-3 w-full bg-gray-800 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none shadow-sm transition-all text-white placeholder-gray-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                </div>
                
                {/* ADMIN PRICE SWITCHER */}
                {isAdmin && (
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowAdminPriceMenu(!showAdminPriceMenu); }}
                            className={`h-full px-3 rounded-xl flex items-center gap-2 border shadow-sm transition-all whitespace-nowrap ${adminPriceMode === 'kingFano' ? 'bg-purple-900/30 border-purple-800 text-purple-300' : 'bg-gray-800 border-gray-700 text-gray-300'}`}
                        >
                            <Eye size={16} />
                            <span className="text-xs font-bold hidden sm:inline">{adminPriceMode === 'retail' ? 'Harga Eceran' : 'View: King Fano'}</span>
                            <ChevronDown size={14} className="opacity-50" />
                        </button>

                        {showAdminPriceMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden z-50 animate-in zoom-in-95">
                                <div className="p-1">
                                    <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mode Tampilan Harga</div>
                                    <button 
                                        onClick={() => { setAdminPriceMode('retail'); setShowAdminPriceMenu(false); }}
                                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between group transition-colors ${adminPriceMode === 'retail' ? 'bg-blue-900/30 text-blue-300' : 'text-gray-300 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-2"><Tag size={14} /> Eceran (Umum)</div>
                                        {adminPriceMode === 'retail' && <Check size={14}/>}
                                    </button>
                                    <button 
                                        onClick={() => { setAdminPriceMode('kingFano'); setShowAdminPriceMenu(false); }}
                                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between group transition-colors ${adminPriceMode === 'kingFano' ? 'bg-purple-900/30 text-purple-300' : 'text-gray-300 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-2"><Crown size={14} /> King Fano</div>
                                        {adminPriceMode === 'kingFano' && <Check size={14}/>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="bg-gray-800 rounded-xl p-1 flex shadow-sm border border-gray-700">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><LayoutGrid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-700 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><List size={18}/></button>
                </div>
            </div>
        </div>
    );
};