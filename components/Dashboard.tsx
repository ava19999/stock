// FILE: src/components/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Clock, Edit, Trash2, MapPin, FileText,
  LayoutGrid, List
} from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  orders: Order[];
  history: StockHistory[];
  onViewOrders: () => void;
  onAddNew: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  items, orders, history, onViewOrders, onAddNew, onEdit, onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistoryDetail, setShowHistoryDetail] = useState<'in' | 'out' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalStock = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalAsset = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const todayIn = history
      .filter(h => h.type === 'in' && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + h.quantity, 0);

    const todayOut = history
      .filter(h => h.type === 'out' && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + h.quantity, 0);

    return { totalItems, totalStock, totalAsset, todayIn, todayOut };
  }, [items, history]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatCompactNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'M';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'jt';
    return formatRupiah(num);
  };

  const HistoryModal = () => {
    if (!showHistoryDetail) return null;
    const type = showHistoryDetail;
    const filteredHistory = history.filter(h => h.type === type).slice(0, 20);

    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              {type === 'in' ? <TrendingUp size={18} className="text-green-600"/> : <TrendingDown size={18} className="text-red-600"/>}
              Detail Riwayat {type === 'in' ? 'Masuk' : 'Keluar'}
            </h3>
            <button onClick={() => setShowHistoryDetail(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Tutup</button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-0">
            {filteredHistory.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat.</div> : (
              <div className="divide-y divide-gray-100">
                {filteredHistory.map((h) => (
                  <div key={h.id} className="p-3 flex justify-between items-start hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><Clock size={10}/> {new Date(h.timestamp).toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{h.reason}</div>
                    </div>
                    <div className={`font-bold text-sm ${type==='in'?'text-green-600':'text-red-600'}`}>{type==='in' ? '+' : '-'}{h.quantity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <HistoryModal />

      {/* STATS */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
        <div className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={32} className="text-blue-600" /></div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Package size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Item</span></div>
            <div className="text-xl font-bold text-gray-800">{stats.totalItems}</div>
        </div>
        <div className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Layers size={32} className="text-purple-600" /></div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1"><Layers size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Stok</span></div>
            <div className="text-xl font-bold text-gray-800">{stats.totalStock}</div>
        </div>
        <button onClick={() => setShowHistoryDetail('in')} className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 text-left active:scale-95 transition-transform relative overflow-hidden hover:border-green-200">
            <div className="absolute right-2 top-2"><div className="bg-green-50 text-green-600 p-0.5 rounded-full"><ArrowUpRight size={10}/></div></div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1"><TrendingUp size={12} className="text-green-500" /><span className="text-[9px] uppercase font-bold tracking-wider">Masuk</span></div>
            <div><div className="text-lg font-bold text-gray-800 leading-none">{stats.todayIn} <span className="text-[10px] font-normal text-gray-400">Pcs</span></div><div className="text-[8px] text-green-600 font-medium flex items-center mt-1">Detail <ChevronRight size={8} /></div></div>
        </button>
        <button onClick={() => setShowHistoryDetail('out')} className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 text-left active:scale-95 transition-transform relative overflow-hidden hover:border-red-200">
            <div className="absolute right-2 top-2"><div className="bg-red-50 text-red-600 p-0.5 rounded-full"><ArrowDownRight size={10}/></div></div>
            <div className="flex items-center gap-1.5 text-gray-500 mb-1"><TrendingDown size={12} className="text-red-500" /><span className="text-[9px] uppercase font-bold tracking-wider">Keluar</span></div>
            <div><div className="text-lg font-bold text-gray-800 leading-none">{stats.todayOut} <span className="text-[10px] font-normal text-gray-400">Pcs</span></div><div className="text-[8px] text-red-600 font-medium flex items-center mt-1">Detail <ChevronRight size={8} /></div></div>
        </button>
        <div className="min-w-[160px] snap-start bg-gradient-to-r from-gray-900 to-gray-800 p-3 rounded-xl shadow-lg text-white flex flex-col justify-between h-20 relative overflow-hidden">
             <div className="absolute right-0 top-0 p-2 opacity-10"><Wallet size={40} /></div>
            <div className="flex items-center gap-1.5 text-gray-300 mb-1"><Wallet size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Nilai Aset</span></div>
            <div className="text-lg font-bold tracking-tight text-white truncate" title={formatRupiah(stats.totalAsset)}>{formatCompactNumber(stats.totalAsset)}</div>
        </div>
      </div>

      {/* ITEMS LIST */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-800">Daftar Barang</h2>
            <div className="flex gap-2">
                <div className="bg-white rounded-lg p-1 flex shadow-sm border border-gray-100">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={16}/></button>
                </div>
                <button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5">+ Barang</button>
            </div>
        </div>
        
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm" /></div>

        {filteredItems.length === 0 ? <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200"><Package size={24} className="mx-auto mb-2 opacity-50"/><p className="text-xs">Tidak ada barang</p></div> : (
             viewMode === 'grid' ? (
                // --- GRID VIEW (FONT DIPERBESAR) ---
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                   {filteredItems.map(item => (
                     <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
                        <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden border-b border-gray-50">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                          )}
                          <div className="absolute top-1.5 left-1.5"><span className={`text-[8px] font-bold px-1 py-0.5 rounded shadow-sm border ${item.quantity < 5 ? 'bg-red-500 text-white border-red-600' : 'bg-white/90 text-gray-700 backdrop-blur-sm border-gray-200'}`}>{item.quantity} Unit</span></div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col">
                          <div className="mb-2">
                            {/* NAMA BARANG: Text SM */}
                            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.4em] mb-1">{item.name}</h3>
                            
                            {/* PART NUMBER: Text XS (Lebih besar dari sebelumnya) */}
                            <p className="text-xs text-gray-500 font-mono truncate bg-gray-50 inline-block px-1 rounded">{item.partNumber || '-'}</p>
                            
                            {/* DESKRIPSI: Text XS */}
                            <div className="mt-1.5 flex items-start gap-1.5">
                                <FileText size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-600 leading-snug line-clamp-2 min-h-[2.5em]">{item.description || "-"}</p>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-2 border-t border-gray-50 space-y-2">
                             <div className="flex justify-between items-end">
                                <div className="text-sm font-bold text-blue-700 truncate">{formatCompactNumber(item.price)}</div>
                                {/* LOKASI RAK: Text XS */}
                                <div className="flex items-center text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"><MapPin size={9} className="mr-0.5 text-gray-500"/>{item.shelf}</div>
                             </div>
                             <div className="grid grid-cols-2 gap-1.5">
                                <button onClick={() => onEdit(item)} className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Edit size={10} /> Edit</button>
                                <button onClick={() => onDelete(item.id)} className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Trash2 size={10} /> Hapus</button>
                             </div>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
             ) : (
                // --- LIST VIEW (FONT DIPERBESAR) ---
                <div className="flex flex-col gap-2">
                    {filteredItems.map(item => (
                        <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
                            <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100 relative">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm truncate">{item.name}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs text-gray-500 font-mono truncate bg-gray-50 px-1.5 py-0.5 rounded">{item.partNumber}</p>
                                    <div className="flex items-center text-xs text-gray-600"><MapPin size={10} className="mr-0.5 text-gray-400"/>{item.shelf}</div>
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-1">{item.description || "-"}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 pl-3 border-l border-gray-50 ml-1">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-blue-700">{formatCompactNumber(item.price)}</div>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border inline-block mt-0.5 ${item.quantity < 5 ? 'bg-red-500 text-white border-red-600' : 'bg-green-50 text-green-700 border-green-100'}`}>{item.quantity} Unit</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => onEdit(item)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"><Edit size={14} /></button>
                                    <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )
        )}
      </div>
    </div>
  );
};