// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats, fetchHistoryLogsPaginated, fetchItemHistory } from '../services/supabaseService';
import { ItemForm } from './ItemForm';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Edit, Trash2, MapPin,
  LayoutGrid, List, History, X, ChevronLeft, Loader2, AlertTriangle, AlertCircle, Store, Filter, Plus
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
  const [localItems, setLocalItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterType, setFilterType] = useState<'all' | 'low' | 'empty'>('all');
  
  const [stats, setStats] = useState({ totalItems: 0, totalStock: 0, totalAsset: 0, todayIn: 0, todayOut: 0 });

  const [showHistoryDetail, setShowHistoryDetail] = useState<'in' | 'out' | null>(null);
  
  // State untuk Edit / Tambah di dalam Dashboard
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  // State untuk History Item Specific
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
  const [itemHistorySearch, setItemHistorySearch] = useState('');
  const [itemHistoryData, setItemHistoryData] = useState<StockHistory[]>([]);
  const [loadingItemHistory, setLoadingItemHistory] = useState(false);

  // State untuk History Logs Global
  const [historyDetailData, setHistoryDetailData] = useState<StockHistory[]>([]);
  const [historyDetailPage, setHistoryDetailPage] = useState(1);
  const [historyDetailTotalPages, setHistoryDetailTotalPages] = useState(1);
  const [historyDetailSearch, setHistoryDetailSearch] = useState('');
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, count } = await fetchInventoryPaginated(page, 50, searchTerm, filterType);
    setLocalItems(data);
    setTotalCount(count);
    setTotalPages(Math.ceil(count / 50));
    setLoading(false);
  }, [page, searchTerm, filterType]);

  const loadStats = useCallback(async () => {
    const invStats = await fetchInventoryStats();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayIn = history
      .filter(h => h.type === 'in' && h.timestamp && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);
    const todayOut = history
      .filter(h => h.type === 'out' && h.timestamp && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);

    setStats({ ...invStats, todayIn, todayOut });
  }, [history]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleEditClick = (item: InventoryItem) => {
      setEditingItem(item);
      setShowItemForm(true);
  };

  const handleAddNewClick = () => {
      setEditingItem(undefined);
      setShowItemForm(true);
  };

  const handleFormSuccess = (updatedItem?: InventoryItem) => {
      if (updatedItem) {
          setLocalItems(currentItems => 
              currentItems.map(item => item.id === updatedItem.id ? updatedItem : item)
          );
          if (editingItem) {
             const diff = updatedItem.quantity - editingItem.quantity;
             setStats(prev => ({ ...prev, totalStock: prev.totalStock + diff }));
          }
          setShowItemForm(false);
      } else {
          setShowItemForm(false);
          loadData(); 
          loadStats();
      }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  const formatCompactNumber = (num: number, isCurrency = true) => { const n = num || 0; if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'M'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt'; return isCurrency ? formatRupiah(n) : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n); };
  
  useEffect(() => { if (showHistoryDetail) { setHistoryDetailLoading(true); const timer = setTimeout(async () => { const { data, count } = await fetchHistoryLogsPaginated(showHistoryDetail, historyDetailPage, 50, historyDetailSearch); setHistoryDetailData(data); setHistoryDetailTotalPages(Math.ceil(count / 50)); setHistoryDetailLoading(false); }, 500); return () => clearTimeout(timer); } else { setHistoryDetailData([]); setHistoryDetailPage(1); setHistoryDetailSearch(''); } }, [showHistoryDetail, historyDetailPage, historyDetailSearch]);
  useEffect(() => { if (selectedItemHistory && selectedItemHistory.partNumber) { setLoadingItemHistory(true); setItemHistoryData([]); fetchItemHistory(selectedItemHistory.partNumber).then((data) => { setItemHistoryData(data); setLoadingItemHistory(false); }).catch(() => setLoadingItemHistory(false)); } }, [selectedItemHistory]);
  
  const parseHistoryReason = (reason: string) => { 
      let resi = '-'; 
      let ecommerce = '-'; 
      let customer = '-'; 
      let keterangan = reason || ''; 
      
      const resiMatch = keterangan.match(/\(Resi: (.*?)\)/); 
      if (resiMatch && resiMatch[1]) { resi = resiMatch[1]; keterangan = keterangan.replace(/\s*\(Resi:.*?\)/, ''); } 
      
      const viaMatch = keterangan.match(/\(Via: (.*?)\)/); 
      if (viaMatch && viaMatch[1]) { ecommerce = viaMatch[1]; keterangan = keterangan.replace(/\s*\(Via:.*?\)/, ''); } 
      
      const nameMatch = keterangan.match(/\((.*?)\)/); 
      if (nameMatch && nameMatch[1]) { 
          if (nameMatch[1] !== 'RETUR') {
              customer = nameMatch[1]; 
              keterangan = keterangan.replace(/\s*\(.*?\)/, ''); 
          }
      } 
      
      if (keterangan.toLowerCase().includes('cancel order')) { keterangan = 'Retur Pesanan'; } 
      if (!keterangan.trim()) keterangan = 'Transaksi'; 
      
      return { resi, ecommerce, customer, keterangan: keterangan.trim() }; 
  };

  const filteredItemHistory = useMemo(() => { if (!selectedItemHistory) return []; let itemHistory = [...itemHistoryData]; if (itemHistorySearch.trim() !== '') { const lowerSearch = itemHistorySearch.toLowerCase(); itemHistory = itemHistory.filter(h => { const { resi, ecommerce, customer, keterangan } = parseHistoryReason(h.reason); return ( keterangan.toLowerCase().includes(lowerSearch) || resi.toLowerCase().includes(lowerSearch) || ecommerce.toLowerCase().includes(lowerSearch) || customer.toLowerCase().includes(lowerSearch) || h.reason.toLowerCase().includes(lowerSearch) ); }); } return itemHistory; }, [itemHistoryData, selectedItemHistory, itemHistorySearch]);

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans">
      {showItemForm && (
        <ItemForm
            initialData={editingItem}
            onCancel={() => setShowItemForm(false)}
            onSuccess={handleFormSuccess}
        />
      )}

      {/* --- STATS SECTION (SCROLLABLE ON MOBILE) --- */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x">
                {/* Total Item */}
                <div className="min-w-[140px] snap-start bg-gradient-to-br from-blue-50 to-white p-3 rounded-xl border border-blue-100 flex flex-col justify-between h-24">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <div className="p-1.5 bg-blue-100 rounded-lg"><Package size={14} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Item</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-800">{formatCompactNumber(stats.totalItems, false)}</div>
                </div>

                {/* Total Stok */}
                <div className="min-w-[140px] snap-start bg-gradient-to-br from-purple-50 to-white p-3 rounded-xl border border-purple-100 flex flex-col justify-between h-24">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                         <div className="p-1.5 bg-purple-100 rounded-lg"><Layers size={14} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Stok</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-800">{formatCompactNumber(stats.totalStock, false)}</div>
                </div>

                 {/* Aset */}
                 <div className="min-w-[180px] snap-start bg-gradient-to-br from-gray-900 to-gray-800 p-3 rounded-xl shadow-md text-white flex flex-col justify-between h-24 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-10"><Wallet size={48} /></div>
                    <div className="flex items-center gap-2 text-gray-300 mb-1">
                        <Wallet size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Nilai Aset</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight text-white truncate">{formatCompactNumber(stats.totalAsset)}</div>
                </div>

                {/* Masuk Hari Ini */}
                <button onClick={() => setShowHistoryDetail('in')} className="min-w-[130px] snap-start bg-white p-3 rounded-xl border border-green-100 flex flex-col justify-between h-24 active:scale-95 transition-transform">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-green-600">
                             <div className="p-1.5 bg-green-100 rounded-lg"><TrendingUp size={14} /></div>
                            <span className="text-[10px] font-bold uppercase">Masuk</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-extrabold text-gray-800">{stats.todayIn}</div>
                        <div className="text-[9px] text-green-600 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div>
                    </div>
                </button>

                {/* Keluar Hari Ini */}
                <button onClick={() => setShowHistoryDetail('out')} className="min-w-[130px] snap-start bg-white p-3 rounded-xl border border-red-100 flex flex-col justify-between h-24 active:scale-95 transition-transform">
                     <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-red-600">
                             <div className="p-1.5 bg-red-100 rounded-lg"><TrendingDown size={14} /></div>
                            <span className="text-[10px] font-bold uppercase">Keluar</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-extrabold text-gray-800">{stats.todayOut}</div>
                        <div className="text-[9px] text-red-600 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div>
                    </div>
                </button>
            </div>
        </div>

        {/* --- SEARCH & FILTER BAR --- */}
        <div className="px-4 pb-3">
            <div className="flex gap-2 items-center mb-2">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari barang..." 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none" 
                    />
                </div>
                <button onClick={handleAddNewClick} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                     <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap ${filterType === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}>Semua</button>
                     <button onClick={() => setFilterType('low')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'low' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-500 border-gray-200'}`}><AlertTriangle size={12}/> Menipis</button>
                     <button onClick={() => setFilterType('empty')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'empty' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200'}`}><AlertCircle size={12}/> Habis</button>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg ml-2">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><List size={16}/></button>
                </div>
            </div>
        </div>
      </div>

      {/* --- CONTENT GRID/LIST --- */}
      <div className="p-4">
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-3 text-blue-500"/>
                <p className="text-xs font-medium">Memuat Data Gudang...</p>
             </div>
        ) : localItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                <Package size={40} className="opacity-20 mb-3"/>
                <p className="text-sm">Tidak ada barang ditemukan</p>
             </div>
        ) : (
            <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {localItems.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            {/* Image Section */}
                            <div className="aspect-[4/3] relative bg-gray-100 cursor-pointer group" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={24}/></div>
                                )}
                                
                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm border ${item.quantity === 0 ? 'bg-gray-900 text-white border-gray-900' : item.quantity < 4 ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/90 text-gray-800 backdrop-blur border-gray-200'}`}>
                                        {item.quantity === 0 ? 'HABIS' : `${item.quantity} Unit`}
                                    </span>
                                </div>

                                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <History size={10} /> Riwayat
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-3 flex-1 flex flex-col">
                                <div className="mb-2">
                                    <div className="flex justify-between items-start mb-1">
                                         <span className="text-[9px] font-mono text-gray-500 bg-gray-50 px-1 rounded truncate max-w-[80px]">{item.partNumber}</span>
                                         <span className="text-[9px] font-bold text-gray-400 flex items-center gap-0.5"><MapPin size={8}/> {item.shelf}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-xs leading-snug line-clamp-2 min-h-[2.5em]">{item.name}</h3>
                                </div>
                                
                                <div className="mt-auto border-t border-gray-50 pt-2">
                                    <div className="text-sm font-extrabold text-blue-700 mb-2">{formatCompactNumber(item.price)}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleEditClick(item)} className="py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors">Edit</button>
                                        <button onClick={() => onDelete(item.id)} className="py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors">Hapus</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {localItems.map(item => (
                         <div key={item.id} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20}/></div>}
                                {item.quantity < 4 && <div className="absolute inset-0 border-2 border-orange-500 rounded-lg opacity-50"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 rounded text-gray-600">{item.partNumber}</span>
                                    <span className={`text-[9px] font-bold px-1.5 rounded ${item.quantity === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{item.quantity} Unit</span>
                                </div>
                                <h3 className="font-bold text-sm text-gray-900 truncate">{item.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                                    <span>Rak: <b>{item.shelf || '-'}</b></span>
                                    <span>App: {item.application}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 pl-2">
                                <div className="font-extrabold text-blue-700 text-sm">{formatCompactNumber(item.price)}</div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditClick(item)} className="p-1.5 bg-gray-100 rounded text-gray-600 hover:text-blue-600"><Edit size={16}/></button>
                                    <button onClick={() => onDelete(item.id)} className="p-1.5 bg-gray-100 rounded text-gray-600 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            </div>
                         </div>
                    ))}
                </div>
            )}

            {/* Pagination Floating */}
            <div className="flex justify-between items-center mt-6 bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-gray-100 sticky bottom-4 z-10 max-w-sm mx-auto">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"><ChevronLeft size={18} /></button>
                <span className="text-xs font-medium text-gray-600">Hal <b>{page}</b> / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
            </>
        )}
      </div>

      {/* --- MODALS (HISTORY DETAIL & ITEM HISTORY) --- */}
      {/* (Menggunakan kode modal yang sama tapi dipercantik sedikit layoutnya) */}
      {showHistoryDetail && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full md:max-w-4xl h-[90vh] md:h-[80vh] rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {showHistoryDetail === 'in' ? <TrendingUp size={20} className="text-green-600"/> : <TrendingDown size={20} className="text-red-600"/>}
                        History {showHistoryDetail === 'in' ? 'Masuk' : 'Keluar'}
                    </h3>
                    <button onClick={() => setShowHistoryDetail(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X size={16}/></button>
                </div>
                {/* Search Bar Detail */}
                <div className="p-3 border-b bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input type="text" className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" placeholder="Cari data history..." value={historyDetailSearch} onChange={(e) => setHistoryDetailSearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 p-3">
                     {/* Reuse table logic from original code but wrapped in better container */}
                     {historyDetailLoading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></div> : (
                         <div className="space-y-2">
                             {historyDetailData.map((h) => {
                                 const { resi, ecommerce, customer, keterangan } = parseHistoryReason(h.reason);
                                 return (
                                     <div key={h.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                         <div className="flex justify-between items-start">
                                             <div>
                                                 <div className="text-[10px] text-gray-400">{new Date(h.timestamp||0).toLocaleString('id-ID')}</div>
                                                 <div className="font-bold text-sm text-gray-800">{h.name}</div>
                                                 <div className="text-xs text-gray-500 font-mono">{h.partNumber}</div>
                                             </div>
                                             <div className={`text-sm font-bold ${showHistoryDetail==='in'?'text-green-600':'text-red-600'}`}>
                                                 {showHistoryDetail==='in' ? '+' : '-'}{h.quantity}
                                             </div>
                                         </div>
                                         <div className="flex items-center gap-2 mt-1 pt-2 border-t border-gray-50 text-[10px]">
                                             {resi !== '-' && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">{resi}</span>}
                                             {customer !== '-' && <span className="text-gray-600 font-medium truncate max-w-[150px]">{customer}</span>}
                                             {ecommerce !== '-' && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{ecommerce}</span>}
                                         </div>
                                     </div>
                                 )
                             })}
                         </div>
                     )}
                </div>
             </div>
        </div>
      )}

      {selectedItemHistory && (
         <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full md:max-w-2xl h-[85vh] rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-900">Riwayat Item</h3>
                        <p className="text-xs text-gray-500">{selectedItemHistory.name}</p>
                    </div>
                    <button onClick={() => setSelectedItemHistory(null)} className="p-2 bg-gray-200 rounded-full"><X size={16}/></button>
                </div>
                <div className="flex-1 overflow-auto bg-gray-50 p-4">
                    {loadingItemHistory ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></div> : (
                        <div className="relative border-l-2 border-gray-200 ml-2 space-y-6">
                            {filteredItemHistory.map((h, idx) => (
                                <div key={idx} className="ml-4 relative">
                                    <div className={`absolute -left-[25px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${h.type === 'in' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] text-gray-400">{new Date(h.timestamp||0).toLocaleDateString('id-ID')}</span>
                                            <span className={`text-xs font-bold ${h.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{h.type === 'in' ? 'Masuk' : 'Keluar'} {h.quantity}</span>
                                        </div>
                                        <div className="text-xs text-gray-700 font-medium">{h.reason}</div>
                                        {h.price > 0 && <div className="text-[10px] text-gray-400 mt-1 text-right">@ {formatRupiah(h.price)}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
         </div>
      )}
    </div>
  );
};