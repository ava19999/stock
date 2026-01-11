// FILE: src/components/layout/Header.tsx
import React from 'react';
import { 
  ShieldCheck, Package, CloudLightning, ShoppingCart, Plus, 
  ClipboardList, Home, LogOut 
} from 'lucide-react';
import { ActiveView } from '../../types/ui';
import { StoreId, getStoreConfig } from '../../config/storeConfig';

interface HeaderProps {
  isAdmin: boolean;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  loading: boolean;
  onRefresh: () => void;
  loginName: string;
  onLogout: () => void;
  pendingOrdersCount: number;
  myPendingOrdersCount: number;
  selectedStore: StoreId | null;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin, activeView, setActiveView, loading, onRefresh,
  loginName, onLogout, pendingOrdersCount, myPendingOrdersCount, selectedStore
}) => {
  const storeConfig = getStoreConfig(selectedStore);
  
  // Dynamic colors based on store
  const primaryColor = isAdmin 
    ? 'purple' 
    : (selectedStore === 'mjm' ? 'yellow' : 'red');
  const secondaryColor = isAdmin 
    ? 'purple' 
    : (selectedStore === 'mjm' ? 'cyan' : 'blue');
  
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-gray-800/90">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
            {/* Store Logo or Icon */}
            <div className={`${isAdmin ? 'bg-purple-600' : `bg-${storeConfig.colors.primary}`} text-white p-2.5 rounded-xl shadow-md group-hover:scale-105 transition-transform flex items-center justify-center overflow-hidden`}>
                {storeConfig.logo && storeConfig.logo !== '/assets/mjm-logo.png' && storeConfig.logo !== '/assets/bjw-logo.png' ? (
                    <img src={storeConfig.logo} alt={storeConfig.name} className="w-5 h-5 object-contain" onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = isAdmin 
                            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
                            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
                    }} />
                ) : (
                    isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />
                )}
            </div>
            <div>
                <div className="font-bold leading-none text-gray-100 text-lg">{storeConfig.name}</div>
                <div className="text-[10px] font-bold text-gray-400 leading-none mt-0.5">AUTOPART</div>
                <div className="text-[9px] text-gray-500 leading-none">{storeConfig.subtitle}</div>
                <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block ${isAdmin ? 'bg-purple-900/30 text-purple-300 border border-purple-800' : `bg-${primaryColor}-900/30 text-${primaryColor}-300 border border-${primaryColor}-800`}`}>
                    {isAdmin ? 'ADMIN ACCESS' : 'STORE FRONT'}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onRefresh} className="p-2 hover:bg-gray-700 rounded-full transition-colors active:scale-90">
                <CloudLightning size={20} className={loading ? 'animate-spin text-blue-400' : 'text-gray-400'}/>
            </button>
            
            {/* NAVIGASI DESKTOP */}
            {isAdmin ? (
                <>
                  <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><ShoppingCart size={18}/> Beranda</button>
                  <button onClick={() => setActiveView('inventory')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='inventory'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Package size={18}/> Gudang</button>
                  <button onClick={() => setActiveView('quick_input')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='quick_input'?'bg-green-900/30 text-green-300 ring-1 ring-green-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Plus size={18}/> Input Barang</button>
                  <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
                    <ClipboardList size={18}/> Manajemen Pesanan {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{pendingOrdersCount}</span>}
                  </button>
                </>
            ) : (
                <>
                  <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?`bg-${primaryColor}-900/30 text-${primaryColor}-300 ring-1 ring-${primaryColor}-800`:'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Home size={18}/> Belanja</button>
                  <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?`bg-${primaryColor}-900/30 text-${primaryColor}-300 ring-1 ring-${primaryColor}-800`:'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
                    <ClipboardList size={18}/> Pesanan {myPendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-gray-900"></span>}
                  </button>
                </>
            )}

            <div className="h-8 w-px bg-gray-700 mx-2"></div>
            <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-all" title="Keluar">
                <span className="text-xs font-semibold hidden lg:inline">{loginName}</span>
                <LogOut size={20} />
            </button>
        </div>
    </div>
  );
};