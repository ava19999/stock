// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats, fetchHistoryLogsPaginated, fetchItemHistory } from '../services/supabaseService';
import { ItemForm } from './ItemForm';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Edit, Trash2, MapPin,
  LayoutGrid, List, History, X, ChevronLeft, Loader2, AlertTriangle, AlertCircle, Store, Plus
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
    <div className="bg-gray-950 min-h-screen pb-24 font-sans text-gray-100">
      {/* Jika Form Edit muncul, gunakan logic ItemForm */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-800 shadow-2xl">
                <ItemForm
                    initialData={editingItem}
                    onCancel={() => setShowItemForm(false)}
                    onSubmit={(data) => {
                        // Dummy submit, actual logic handled inside ItemForm via API
                        // This prop might need adjustment based on how you implemented ItemForm props
                        // But sticking to your structure:
                        handleFormSuccess();
                    }}
                />
            </div>
        </div>
      )}

      {/* --- STATS SECTION (DARK MODE) --- */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="px-4 py-3">
            {/* Mobile: Scroll, Desktop: Grid 5 Columns */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x md:grid md:grid-cols-5 md:overflow-visible">
                
                {/* 1. Total Item */}
                <div className="min-w-[140px] snap-start bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-col justify-between h-24 md:w-auto">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <div className="p-1.5 bg-blue-900/30 rounded-lg"><Package size={14} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Item</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-100">{formatCompactNumber(stats.totalItems, false)}</div>
                </div>

                {/* 2. Total Stok */}
                <div className="min-w-[140px] snap-start bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-col justify-between h-24 md:w-auto">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                         <div className="p-1.5 bg-purple-900/30 rounded-lg"><Layers size={14} /></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Stok</span>
                    </div>
                    <div className="text-2xl font-extrabold text-gray-100">{formatCompactNumber(stats.totalStock, false)}</div>
                </div>

                {/* 3. Masuk Hari Ini */}
                <button onClick={() => setShowHistoryDetail('in')} className="min-w-[130px] snap-start bg-gray-800 p-3 rounded-xl border border-green-900/50 flex flex-col justify-between h-24 active:scale-95 transition-transform md:w-auto text-left hover:border-green-700">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-green-400">
                             <div className="p-1.5 bg-green-900/30 rounded-lg"><TrendingUp size={14} /></div>
                            <span className="text-[10px] font-bold uppercase">Masuk</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-extrabold text-gray-100">{stats.todayIn}</div>
                        <div className="text-[9px] text-green-400 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div>
                    </div>
                </button>

                {/* 4. Keluar Hari Ini */}
                <button onClick={() => setShowHistoryDetail('out')} className="min-w-[130px] snap-start bg-gray-800 p-3 rounded-xl border border-red-900/50 flex flex-col justify-between h-24 active:scale-95 transition-transform md:w-auto text-left hover:border-red-700">
                     <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 text-red-400">
                             <div className="p-1.5 bg-red-900/30 rounded-lg"><TrendingDown size={14} /></div>
                            <span className="text-[10px] font-bold uppercase">Keluar</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-extrabold text-gray-100">{stats.todayOut}</div>
                        <div className="text-[9px] text-red-400 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div>
                    </div>
                </button>

                 {/* 5. Aset (PALING BELAKANG/KANAN) */}
                 <div className="min-w-[180px] snap-start bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl shadow-md border border-gray-700 text-white flex flex-col justify-between h-24 relative overflow-hidden md:w-auto">
                    <div className="absolute right-0 top-0 p-2 opacity-10"><Wallet size={48} /></div>
                    <div className="flex items-center gap-2 text-gray-300 mb-1">
                        <Wallet size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Nilai Aset</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight text-white truncate">{formatCompactNumber(stats.totalAsset)}</div>
                </div>

            </div>
        </div>

        {/* --- SEARCH & FILTER BAR (DARK MODE) --- */}
        <div className="px-4 pb-3">
            <div className="flex gap-2 items-center mb-2">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari barang..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none text-gray-200 placeholder-gray-500" 
                    />
                </div>
                <button onClick={handleAddNewClick} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all">
                    <Plus size={20} />
                </button>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                     <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap ${filterType === 'all' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-900 text-gray-400 border-gray-800'}`}>Semua</button>
                     <button onClick={() => setFilterType('low')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'low' ? 'bg-orange-900/40 text-orange-300 border-orange-800' : 'bg-gray-900 text-gray-400 border-gray-800'}`}><AlertTriangle size={12}/> Menipis</button>
                     <button onClick={() => setFilterType('empty')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'empty' ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-gray-900 text-gray-400 border-gray-800'}`}><AlertCircle size={12}/> Habis</button>
                </div>
                <div className="flex bg-gray-800 p-1 rounded-lg ml-2 border border-gray-700">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-gray-700 shadow-sm text-blue-400' : 'text-gray-500'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-700 shadow-sm text-blue-400' : 'text-gray-500'}`}><List size={16}/></button>
                </div>
            </div>
        </div>
      </div>

      {/* --- CONTENT GRID/LIST (DARK MODE) --- */}
      <div className="p-4">
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 size={32} className="animate-spin mb-3 text-blue-500"/>
                <p className="text-xs font-medium">Memuat Data Gudang...</p>
             </div>
        ) : localItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl bg-gray-900">
                <Package size={40} className="opacity-20 mb-3"/>
                <p className="text-sm">Tidak ada barang ditemukan</p>
             </div>
        ) : (
            <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {localItems.map(item => (
                        <div key={item.id} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden flex flex-col hover:border-gray-600 transition-colors">
                            {/* Image Section */}
                            <div className="aspect-[4/3] relative bg-gray-900 cursor-pointer group" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700"><Package size={24}/></div>
                                )}
                                
                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm border ${item.quantity === 0 ? 'bg-red-900 text-red-100 border-red-800' : item.quantity < 4 ? 'bg-orange-900 text-orange-100 border-orange-800' : 'bg-gray-900/90 text-gray-200 backdrop-blur border-gray-700'}`}>
                                        {item.quantity === 0 ? 'HABIS' : `${item.quantity} Unit`}
                                    </span>
                                </div>

                                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <History size={10} /> Riwayat
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-3 flex-1 flex flex-col">
                                <div className="mb-2">
                                    <div className="flex justify-between items-start mb-1">
                                         <span className="text-[9px] font-mono text-gray-400 bg-gray-900 px-1 rounded truncate max-w-[80px]">{item.partNumber}</span>
                                         <span className="text-[9px] font-bold text-gray-500 flex items-center gap-0.5"><MapPin size={8}/> {item.shelf}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-200 text-xs leading-snug line-clamp-2 min-h-[2.5em]">{item.name}</h3>
                                </div>
                                
                                <div className="mt-auto border-t border-gray-700 pt-2">
                                    <div className="text-sm font-extrabold text-blue-400 mb-2">{formatCompactNumber(item.price)}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleEditClick(item)} className="py-1.5 bg-gray-700 text-gray-300 rounded-lg text-[10px] font-bold hover:bg-gray-600 transition-colors">Edit</button>
                                        <button onClick={() => onDelete(item.id)} className="py-1.5 bg-red-900/30 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-900/50 transition-colors">Hapus</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {localItems.map(item => (
                         <div key={item.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 shadow-sm flex items-center gap-3">
                            <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><Package size={20}/></div>}
                                {item.quantity < 4 && <div className="absolute inset-0 border-2 border-orange-500/50 rounded-lg"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-mono bg-gray-900 px-1.5 rounded text-gray-400">{item.partNumber}</span>
                                    <span className={`text-[9px] font-bold px-1.5 rounded ${item.quantity === 0 ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'}`}>{item.quantity} Unit</span>
                                </div>
                                <h3 className="font-bold text-sm text-gray-200 truncate">{item.name}</h3>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                                    <span>Rak: <b>{item.shelf || '-'}</b></span>
                                    <span>App: {item.application}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 pl-2">
                                <div className="font-extrabold text-blue-400 text-sm">{formatCompactNumber(item.price)}</div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEditClick(item)} className="p-1.5 bg-gray-700 rounded text-gray-400 hover:text-blue-400"><Edit size={16}/></button>
                                    <button onClick={() => onDelete(item.id)} className="p-1.5 bg-gray-700 rounded text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                                </div>
                            </div>
                         </div>
                    ))}
                </div>
            )}

            {/* Pagination Floating */}
            <div className="flex justify-between items-center mt-6 bg-gray-800/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-gray-700 sticky bottom-4 z-10 max-w-sm mx-auto">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600"><ChevronLeft size={18} /></button>
                <span className="text-xs font-medium text-gray-300">Hal <b>{page}</b> / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600"><ChevronRight size={18} /></button>
            </div>
            </>
        )}
      </div>

      {/* --- MODAL DETAIL RIWAYAT (DARK MODE) --- */}
      {showHistoryDetail && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
            <div className="bg-gray-900 w-full md:max-w-7xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-800">
                <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                    <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
                        {showHistoryDetail === 'in' ? <TrendingUp size={18} className="text-green-500"/> : <TrendingDown size={18} className="text-red-500"/>}
                        Riwayat {showHistoryDetail === 'in' ? 'Barang Masuk' : 'Barang Keluar'}
                    </h3>
                    <button onClick={() => setShowHistoryDetail(null)} className="text-gray-400 hover:text-gray-200 text-xs font-bold bg-gray-800 border border-gray-700 px-3 py-1 rounded-lg">Tutup</button>
                </div>
                
                <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex gap-3 justify-between items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Cari Resi, Toko, Barang..." 
                            className="w-full pl-9 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                            value={historyDetailSearch} 
                            onChange={(e) => { setHistoryDetailSearch(e.target.value); setHistoryDetailPage(1); }} 
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setHistoryDetailPage(p => Math.max(1, p - 1))} disabled={historyDetailPage === 1} className="p-1.5 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-30 text-gray-400"><ChevronLeft size={14}/></button>
                        <span className="text-[10px] font-bold text-gray-400 min-w-[50px] text-center">Hal {historyDetailPage}/{historyDetailTotalPages}</span>
                        <button onClick={() => setHistoryDetailPage(p => Math.min(historyDetailTotalPages, p + 1))} disabled={historyDetailPage === historyDetailTotalPages || historyDetailTotalPages === 0} className="p-1.5 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-30 text-gray-400"><ChevronRight size={14}/></button>
                    </div>
                </div>

                <div className="overflow-auto flex-1 p-0 bg-gray-900">
                    {historyDetailLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-blue-500"><Loader2 size={24} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat...</p></div>
                    ) : historyDetailData.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2"><History size={32} className="opacity-20"/><p>Belum ada riwayat ditemukan.</p></div>
                    ) : (
                        <div className="min-w-[1000px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 w-28 bg-gray-800">Tanggal</th>
                                        <th className="px-3 py-2 w-36 bg-gray-800">Resi / Tempo</th>
                                        <th className="px-3 py-2 w-24 bg-gray-800">E-Commerce</th>
                                        <th className="px-3 py-2 w-28 bg-gray-800">No. Part</th>
                                        <th className="px-3 py-2 bg-gray-800">Nama Barang</th>
                                        <th className="px-3 py-2 text-right w-16 bg-gray-800">Qty</th>
                                        <th className="px-3 py-2 text-right w-24 bg-gray-800">Harga</th>
                                        <th className="px-3 py-2 text-right w-24 bg-gray-800">Total</th>
                                        <th className="px-3 py-2 w-48 bg-gray-800">Ket / Pelanggan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-xs bg-gray-900">
                                    {historyDetailData.map((h) => { 
                                        const price = h.price || 0; 
                                        const total = h.totalPrice || (price * (Number(h.quantity) || 0)); 
                                        const { ecommerce, customer, keterangan, resi } = parseHistoryReason(h.reason); 
                                        
                                        let displayResi = '-';
                                        let displayShop = '-';
                                        
                                        if (h.type === 'in') {
                                            if (h.tempo && h.tempo.includes(' / ')) {
                                                const parts = h.tempo.split(' / ');
                                                displayResi = parts[0] !== '-' ? parts[0] : '-';
                                                displayShop = parts[1] !== '-' ? parts[1] : '-';
                                            } else {
                                                displayShop = h.tempo || '-';
                                            }
                                        } else {
                                            displayResi = resi !== '-' ? resi : (h.resi || '-');
                                            displayShop = h.tempo || '-';
                                        }

                                        let ketContent = h.type === 'in' ? h.reason.replace(/\(Via:.*?\)/, '').trim() : (customer !== '-' ? customer : keterangan);
                                        const isRetur = ketContent.toUpperCase().includes('(RETUR)');
                                        const cleanName = ketContent.replace(/\(RETUR\)/i, '').trim();

                                        return (
                                        <tr key={h.id} className="hover:bg-gray-800 transition-colors">
                                            <td className="px-3 py-2 align-top text-gray-300 whitespace-nowrap">
                                                {h.timestamp ? <><div className="font-bold">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-[9px] text-gray-500 font-mono">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div></> : '-'}
                                            </td>
                                            
                                            <td className="px-3 py-2 align-top font-mono text-[10px]">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {displayResi !== '-' && displayResi !== '' && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded font-bold bg-blue-900/30 text-blue-300 border border-blue-800 truncate max-w-[120px]">
                                                            {displayResi}
                                                        </span>
                                                    )}
                                                    {displayShop !== '-' && displayShop !== '' && (
                                                        <div className="flex items-center gap-1 text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 shadow-sm">
                                                            <Store size={8} className="text-gray-500" />
                                                            <span className="font-bold text-[9px] uppercase truncate max-w-[100px]">{displayShop}</span>
                                                        </div>
                                                    )}
                                                    {displayResi === '-' && displayShop === '-' && <span className="text-gray-600">-</span>}
                                                </div>
                                            </td>
                                            
                                            <td className="px-3 py-2 align-top">
                                                {ecommerce !== '-' ? <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-900/30 text-orange-300 border border-orange-800">{ecommerce}</span> : <span className="text-gray-600">-</span>}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-500 text-[10px] align-top">{h.partNumber || '-'}</td>
                                            <td className="px-3 py-2 font-medium text-gray-300 max-w-[200px] align-top truncate" title={h.name}>{h.name}</td>
                                            <td className={`px-3 py-2 text-right font-bold align-top ${showHistoryDetail==='in'?'text-green-400':'text-red-400'}`}>{showHistoryDetail==='in' ? '+' : '-'}{h.quantity}</td>
                                            <td className="px-3 py-2 text-right text-gray-500 font-mono align-top text-[10px]">{formatRupiah(price)}</td>
                                            <td className="px-3 py-2 text-right text-gray-200 font-bold font-mono align-top text-[10px]">{formatRupiah(total)}</td>
                                            
                                            <td className="px-3 py-2 align-top text-gray-400 font-medium text-[10px]">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="font-bold text-gray-300 truncate max-w-[150px]" title={cleanName}>{cleanName}</span>
                                                    {isRetur && (
                                                        <span className="bg-red-900/30 text-red-300 px-1 py-0.5 rounded text-[8px] font-bold border border-red-800 flex items-center gap-1">
                                                            <TrendingDown size={8} /> RETUR
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>); 
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL RIWAYAT PER ITEM (DARK MODE) --- */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4 animate-in fade-in">
            <div className="bg-gray-900 w-full md:max-w-4xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-800">
                <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-start bg-gray-900">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-100 text-base flex items-center gap-2">
                            <History size={18} className="text-blue-500"/> Riwayat: {selectedItemHistory.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{selectedItemHistory.partNumber}</p>
                    </div>
                    <button onClick={() => setSelectedItemHistory(null)} className="p-1 hover:bg-gray-800 rounded-full transition-colors ml-4"><X size={18} className="text-gray-500"/></button>
                </div>
                
                <div className="px-4 py-2 bg-gray-900 border-b border-gray-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input autoFocus type="text" placeholder="Cari..." className="w-full pl-9 pr-4 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 outline-none focus:ring-1 focus:ring-blue-500" value={itemHistorySearch} onChange={(e) => setItemHistorySearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-auto flex-1 p-0 bg-gray-900">
                    {loadingItemHistory ? (
                        <div className="flex flex-col items-center justify-center h-48 text-blue-500"><Loader2 size={24} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat...</p></div>
                    ) : filteredItemHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500"><History size={32} className="opacity-20 mb-2"/><p className="text-xs">Tidak ada riwayat.</p></div>
                    ) : (
                        <div className="min-w-[700px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-800 text-gray-400 text-[10px] font-bold uppercase sticky top-0 z-10 border-b border-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 w-28 bg-gray-800">Tanggal</th>
                                        <th className="px-3 py-2 w-20 text-center bg-gray-800">Tipe</th>
                                        <th className="px-3 py-2 w-16 text-right bg-gray-800">Qty</th>
                                        <th className="px-3 py-2 w-24 text-right bg-gray-800">Harga</th>
                                        <th className="px-3 py-2 w-24 text-right bg-gray-800">Total</th>
                                        <th className="px-3 py-2 bg-gray-800">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-xs bg-gray-900">
                                    {filteredItemHistory.map(h => { 
                                        const { resi, ecommerce, customer, keterangan } = parseHistoryReason(h.reason); 
                                        return (
                                        <tr key={h.id} className="hover:bg-blue-900/10 transition-colors">
                                            <td className="px-3 py-2 align-top text-gray-400">
                                                {h.timestamp ? <><div className="font-bold text-gray-300">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-[9px] text-gray-500 font-mono">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div></> : '-'}
                                            </td>
                                            <td className="px-3 py-2 align-top text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${h.type === 'in' ? 'bg-green-900/40 text-green-300 border-green-800' : 'bg-red-900/40 text-red-300 border-red-800'}`}>
                                                    {h.type === 'in' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </td>
                                            <td className={`px-3 py-2 align-top text-right font-bold ${h.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                                {h.type === 'in' ? '+' : '-'}{h.quantity}
                                            </td>
                                            <td className="px-3 py-2 align-top text-right font-mono text-gray-500 text-[10px]">{formatRupiah(h.price)}</td>
                                            <td className="px-3 py-2 align-top text-right font-bold font-mono text-gray-300 text-[10px]">{formatRupiah(h.totalPrice)}</td>
                                            <td className="px-3 py-2 align-top text-gray-400">
                                                <div className="font-bold text-gray-300 text-[10px] mb-1">{h.type === 'in' ? h.reason.replace(/\(Via:.*?\)/, '').trim() : (customer !== '-' ? customer : keterangan)}</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {resi !== '-' && <div className="bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded text-[9px] border border-blue-800 font-mono">{resi}</div>}
                                                    {ecommerce !== '-' && <div className="bg-orange-900/30 text-orange-300 px-1.5 py-0.5 rounded text-[9px] border border-orange-800">{ecommerce}</div>}
                                                </div>
                                            </td>
                                        </tr>); 
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};