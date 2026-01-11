// FILE: src/components/layout/Header.tsx
import React from 'react';
import { 
  ShieldCheck, Package, CloudLightning, ShoppingCart, Plus, 
  ClipboardList, Home, LogOut 
} from 'lucide-react';
import { ActiveView } from '../../types/ui';

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
  selectedStore: 'mjm' | 'bjw';
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin, activeView, setActiveView, loading, onRefresh,
  loginName, onLogout, pendingOrdersCount, myPendingOrdersCount, selectedStore
}) => {
  const storeName = selectedStore === 'mjm' ? 'MJM86' : 'BJW';
  const logoPath = `/assets/${selectedStore}-logo.png`;
  
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-gray-800/90">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
            <div className="bg-gray-700/50 p-2 rounded-xl shadow-md group-hover:scale-105 transition-transform border border-gray-600/50">
                <img 
                  src={logoPath} 
                  alt={storeName}
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    // Fallback to icon if image fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const icon = document.createElement('div');
                      icon.className = `${isAdmin ? 'text-purple-400' : 'text-blue-400'}`;
                      icon.innerHTML = isAdmin ? '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><circle cx="6" cy="6" r="4"></circle><path d="M2 18h4v4H2z"></path></svg>';
                      parent.appendChild(icon);
                    }
                  }}
                />
            </div>
            <div>
                <div className="font-bold leading-none text-gray-100 text-lg">{storeName}</div>
                <div className="text-[10px] font-bold text-gray-400 leading-none mt-0.5">Autopart</div>
                <div className="text-[9px] text-gray-500 leading-none">Sukucadang Mobil</div>
                <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block ${isAdmin ? 'bg-purple-900/30 text-purple-300 border border-purple-800' : 'bg-blue-900/30 text-blue-300 border border-blue-800'}`}>
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
                  <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-blue-900/30 text-blue-300 ring-1 ring-blue-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Home size={18}/> Belanja</button>
                  <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-blue-900/30 text-blue-300 ring-1 ring-blue-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}>
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