// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats, fetchHistoryLogsPaginated, fetchItemHistory } from '../services/supabaseService';
import { ItemForm } from './ItemForm';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Edit, Trash2, MapPin,
  LayoutGrid, List, History, X, ChevronLeft, ChevronRight as ChevronRightIcon, Loader2, AlertTriangle, AlertCircle, Store, Plus, Tag, PenTool
} from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[]; 
  orders: Order[];
  history: StockHistory[];
  refreshTrigger: number;
  onViewOrders: () => void;
  onAddNew: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  items, orders, history, refreshTrigger, onViewOrders, onAddNew, onEdit, onDelete 
}) => {
  const [localItems, setLocalItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [brandSearch, setBrandSearch] = useState('');
  const [debouncedBrand, setDebouncedBrand] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [debouncedApp, setDebouncedApp] = useState('');

  const [filterType, setFilterType] = useState<'all' | 'low' | 'empty'>('all');
  
  const [stats, setStats] = useState({ totalItems: 0, totalStock: 0, totalAsset: 0, todayIn: 0, todayOut: 0 });

  const [showHistoryDetail, setShowHistoryDetail] = useState<'in' | 'out' | null>(null);
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
  const [itemHistorySearch, setItemHistorySearch] = useState('');
  const [itemHistoryData, setItemHistoryData] = useState<StockHistory[]>([]);
  const [itemHistoryPage, setItemHistoryPage] = useState(1);
  const [loadingItemHistory, setLoadingItemHistory] = useState(false);

  const [historyDetailData, setHistoryDetailData] = useState<StockHistory[]>([]);
  const [historyDetailPage, setHistoryDetailPage] = useState(1);
  const [historyDetailTotalPages, setHistoryDetailTotalPages] = useState(1);
  const [historyDetailSearch, setHistoryDetailSearch] = useState('');
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const timer = setTimeout(() => { 
        setDebouncedSearch(searchTerm); 
        setDebouncedBrand(brandSearch);
        setDebouncedApp(appSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, brandSearch, appSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    // @ts-ignore
    const { data, count } = await fetchInventoryPaginated(page, 50, debouncedSearch, filterType, debouncedBrand, debouncedApp);
    setLocalItems(data);
    setTotalCount(count);
    setTotalPages(Math.ceil(count / 50));
    setLoading(false);
  }, [page, debouncedSearch, filterType, debouncedBrand, debouncedApp]);

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

  useEffect(() => { loadData(); }, [loadData, refreshTrigger]);
  useEffect(() => { loadStats(); }, [loadStats, refreshTrigger]);

  const handleEditClick = (item: InventoryItem) => { setEditingItem(item); setShowItemForm(true); };
  const handleAddNewClick = () => { setEditingItem(undefined); setShowItemForm(true); };

  const handleFormSuccess = (updatedItem?: InventoryItem) => {
      if (updatedItem) {
          setLocalItems(currentItems => currentItems.map(item => item.id === updatedItem.id ? updatedItem : item));
          if (editingItem) {
             const diff = updatedItem.quantity - editingItem.quantity;
             setStats(prev => ({ ...prev, totalStock: prev.totalStock + diff }));
          }
          setShowItemForm(false);
      } else {
          setShowItemForm(false);
          loadData(); loadStats();
      }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  const formatCompactNumber = (num: number, isCurrency = true) => { const n = num || 0; if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'M'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt'; return isCurrency ? formatRupiah(n) : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n); };
  
  useEffect(() => { if (showHistoryDetail) { setHistoryDetailLoading(true); const timer = setTimeout(async () => { const { data, count } = await fetchHistoryLogsPaginated(showHistoryDetail, historyDetailPage, 50, historyDetailSearch); setHistoryDetailData(data); setHistoryDetailTotalPages(Math.ceil(count / 50)); setHistoryDetailLoading(false); }, 500); return () => clearTimeout(timer); } else { setHistoryDetailData([]); setHistoryDetailPage(1); setHistoryDetailSearch(''); } }, [showHistoryDetail, historyDetailPage, historyDetailSearch]);
  
  useEffect(() => { 
      if (selectedItemHistory && selectedItemHistory.partNumber) { 
          setLoadingItemHistory(true); 
          setItemHistoryData([]); 
          fetchItemHistory(selectedItemHistory.partNumber).then((data) => { 
              setItemHistoryData(data); 
              setLoadingItemHistory(false); 
          }).catch(() => setLoadingItemHistory(false)); 
      } 
  }, [selectedItemHistory]);

  useEffect(() => {
    setItemHistoryPage(1);
  }, [selectedItemHistory, itemHistorySearch]);
  
  const parseHistoryReason = (h: StockHistory) => { 
      let resi = h.resi || '-';
      let ecommerce = '-'; 
      let customer = '-'; 
      let text = h.reason || ''; 
      let tempo = h.tempo || '-'; 

      const resiMatch = text.match(/\(Resi: (.*?)\)/); 
      if (resiMatch && resiMatch[1]) { 
          resi = resiMatch[1]; 
          text = text.replace(/\s*\(Resi:.*?\)/, ''); 
      } 
      const viaMatch = text.match(/\(Via: (.*?)\)/); 
      if (viaMatch && viaMatch[1]) { 
          ecommerce = viaMatch[1]; 
          text = text.replace(/\s*\(Via:.*?\)/, ''); 
      } 
      text = text.replace(/\s*\(\-\)/, '').replace(/\s*\(\)/, '').trim();

      let keterangan = '';
      let isRetur = false;

      if (h.customer && h.customer !== '-' && h.customer !== '') {
         customer = h.customer;
      }

      if (h.type === 'out') {
          if (customer === '-' && text) {
             customer = text.replace(/\s*\(.*?\)/g, '').trim();
          }
          keterangan = 'Terjual';
      } else {
          if (text.toLowerCase().includes('retur') || text.toLowerCase().includes('cancel')) {
              isRetur = true;
              keterangan = 'RETUR';
              if (customer === '-') {
                   let tempName = text.replace(/\s*\(RETUR\)/i, '').replace(/\s*\(CANCEL\)/i, '');
                   customer = tempName.replace(/\s*\(.*?\)/g, '').trim();
              }
          } else {
              const standardTexts = ['Manual Restock', 'Restock', 'Stok Awal', 'System Log', 'Opname', 'Adjustment'];
              const isStandard = standardTexts.some(st => st.toLowerCase() === text.toLowerCase());

              if (isStandard || text === '') {
                  keterangan = (text === '' || text === 'Manual Restock') ? 'Restock' : text; 
              } else {
                  if (customer === '-') customer = text;
                  keterangan = 'Restock';
              }
          }
      }

      let subInfo = '-';
      if (tempo && tempo.includes('/')) {
          const parts = tempo.split('/');
          if (parts.length >= 2) {
              resi = parts[0].trim();
              subInfo = parts[1].trim();
          } else {
              const hasTempo = tempo && tempo !== '-' && tempo !== '' && tempo !== 'AUTO' && tempo !== 'APP';
              if (hasTempo) subInfo = tempo;
          }
      } else {
          const hasTempo = tempo && tempo !== '-' && tempo !== '' && tempo !== 'AUTO' && tempo !== 'APP';
          if (hasTempo) {
              subInfo = tempo;
          } else {
              if (ecommerce !== '-' && ecommerce !== 'Lainnya' && ecommerce !== 'APP' && ecommerce !== 'SYSTEM') {
                  subInfo = ecommerce;
              }
          }
      }

      return { resi, subInfo, customer, keterangan, ecommerce, isRetur }; 
  };

  const filteredItemHistory = useMemo(() => { 
      if (!selectedItemHistory) return []; 
      let itemHistory = [...itemHistoryData]; 
      
      if (itemHistorySearch.trim() !== '') { 
          const lowerSearch = itemHistorySearch.toLowerCase(); 
          itemHistory = itemHistory.filter(h => { 
              const { resi, subInfo, customer, keterangan } = parseHistoryReason(h); 
              return ( keterangan.toLowerCase().includes(lowerSearch) || resi.toLowerCase().includes(lowerSearch) || subInfo.toLowerCase().includes(lowerSearch) || customer.toLowerCase().includes(lowerSearch) || h.reason.toLowerCase().includes(lowerSearch) ); 
          }); 
      } 
      return itemHistory; 
  }, [itemHistoryData, selectedItemHistory, itemHistorySearch]);

  const paginatedItemHistory = useMemo(() => {
      const startIndex = (itemHistoryPage - 1) * 50;
      return filteredItemHistory.slice(startIndex, startIndex + 50);
  }, [filteredItemHistory, itemHistoryPage]);

  const itemHistoryTotalPages = Math.ceil(filteredItemHistory.length / 50) || 1;

  // --- UPDATE WARNA BACKGROUND KARTU (FIXED: SEKARANG KUNING BENING) ---
  const getItemCardStyle = (qty: number) => {
      if (qty === 0) return "bg-red-900/30 border-red-800 hover:border-red-600";
      // SEBELUMNYA: bg-yellow-900/20 (Terlihat Orange)
      // SEKARANG: bg-yellow-500/10 (Terlihat Kuning Transparan)
      if (qty < 4) return "bg-yellow-500/10 border-yellow-500 hover:border-yellow-400";
      return "bg-gray-800 border-gray-700 hover:border-gray-600";
  };

  const HistoryTable = ({ data }: { data: StockHistory[] }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                <tr>
                    <th className="px-3 py-2 border-r border-gray-700 w-24">Tanggal</th>
                    <th className="px-3 py-2 border-r border-gray-700 w-32">Resi / Toko</th>
                    <th className="px-3 py-2 border-r border-gray-700 w-36">Via</th>
                    <th className="px-3 py-2 border-r border-gray-700 w-32">Pelanggan</th>
                    <th className="px-3 py-2 border-r border-gray-700 w-28">Part No</th>
                    <th className="px-3 py-2 border-r border-gray-700">Barang</th>
                    <th className="px-3 py-2 border-r border-gray-700 text-right w-16">Qty</th>
                    <th className="px-3 py-2 border-r border-gray-700 text-right w-24">Satuan</th>
                    <th className="px-3 py-2 border-r border-gray-700 text-right w-24">Total</th>
                    <th className="px-3 py-2 text-center w-28">Keterangan</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-xs bg-gray-900/30">
                {data.map((h, idx) => {
                    const { resi, subInfo, customer, ecommerce, keterangan, isRetur } = parseHistoryReason(h);
                    
                    let ketStyle = 'bg-gray-700 text-gray-300 border-gray-600';
                    if (h.type === 'in') {
                        if (isRetur) {
                            ketStyle = 'bg-red-900/30 text-red-400 border-red-800'; 
                        } else {
                            ketStyle = 'bg-green-900/30 text-green-400 border-green-800'; 
                        }
                    } else if (h.type === 'out') {
                        ketStyle = 'bg-blue-900/30 text-blue-400 border-blue-800';
                    }

                    return (
                        <tr key={h.id || idx} className="hover:bg-blue-900/10 transition-colors group">
                            <td className="px-3 py-2 align-top border-r border-gray-700 whitespace-nowrap text-gray-400">
                                <div className="font-bold text-gray-200">{new Date(h.timestamp || 0).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'2-digit'})}</div>
                                <div className="text-[9px] opacity-70 font-mono">{new Date(h.timestamp || 0).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700 font-mono text-[10px]">
                                <div className="flex flex-col items-start gap-2"> 
                                    <span className={`px-1.5 py-0.5 rounded w-fit font-bold border ${resi !== '-' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'text-gray-500 bg-gray-800 border-gray-600'}`}>
                                        {resi !== '-' ? resi : '-'}
                                    </span>
                                    {subInfo !== '-' ? (
                                        <div className="flex items-center gap-1 text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-600 w-fit">
                                            <Store size={8}/>
                                            <span className="uppercase truncate max-w-[90px]">{subInfo}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700">
                                {ecommerce !== '-' ? (
                                    <span className="px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 text-[9px] font-bold border border-orange-800 break-words">{ecommerce}</span>
                                ) : <span className="text-gray-600">-</span>}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700 text-gray-300 font-medium">
                                {customer !== '-' ? customer : '-'}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700 font-mono text-[10px] text-gray-400">
                                {h.partNumber}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700">
                                <div className="font-bold text-gray-200 text-xs">{h.name}</div>
                            </td>
                            <td className={`px-3 py-2 align-top border-r border-gray-700 text-right font-bold ${h.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                {h.type === 'in' ? '+' : '-'}{h.quantity}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700 text-right font-mono text-[10px] text-gray-400">
                                {formatRupiah(h.price)}
                            </td>
                            <td className="px-3 py-2 align-top border-r border-gray-700 text-right font-mono text-[10px] font-bold text-gray-200">
                                {formatRupiah(h.totalPrice || ((h.price||0) * h.quantity))}
                            </td>
                            <td className="px-3 py-2 align-top text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${ketStyle}`}>
                                    {keterangan}
                                </span>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen pb-24 font-sans text-gray-100">
      {showItemForm && ( <ItemForm initialData={editingItem} onCancel={() => setShowItemForm(false)} onSuccess={handleFormSuccess} /> )}

      {/* STATS SECTION */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20 shadow-md">
        <div className="px-4 py-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x md:grid md:grid-cols-5 md:overflow-visible">
                <div className="min-w-[140px] snap-start bg-gradient-to-br from-blue-900/40 to-gray-800 p-3 rounded-xl border border-blue-900/50 flex flex-col justify-between h-24 md:w-auto"><div className="flex items-center gap-2 text-blue-400 mb-1"><div className="p-1.5 bg-blue-900/50 rounded-lg"><Package size={14} /></div><span className="text-[10px] font-bold uppercase tracking-wider">Item</span></div><div className="text-2xl font-extrabold text-white">{formatCompactNumber(stats.totalItems, false)}</div></div>
                <div className="min-w-[140px] snap-start bg-gradient-to-br from-purple-900/40 to-gray-800 p-3 rounded-xl border border-purple-900/50 flex flex-col justify-between h-24 md:w-auto"><div className="flex items-center gap-2 text-purple-400 mb-1"><div className="p-1.5 bg-purple-900/50 rounded-lg"><Layers size={14} /></div><span className="text-[10px] font-bold uppercase tracking-wider">Stok</span></div><div className="text-2xl font-extrabold text-white">{formatCompactNumber(stats.totalStock, false)}</div></div>
                <button onClick={() => setShowHistoryDetail('in')} className="min-w-[130px] snap-start bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-col justify-between h-24 active:scale-95 transition-transform md:w-auto text-left hover:border-green-700/50 hover:bg-gray-750"><div className="flex items-center justify-between w-full"><div className="flex items-center gap-2 text-green-500"><div className="p-1.5 bg-green-900/30 rounded-lg"><TrendingUp size={14} /></div><span className="text-[10px] font-bold uppercase">Masuk</span></div></div><div><div className="text-xl font-extrabold text-white">{stats.todayIn}</div><div className="text-[9px] text-green-500 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div></div></button>
                <button onClick={() => setShowHistoryDetail('out')} className="min-w-[130px] snap-start bg-gray-800 p-3 rounded-xl border border-gray-700 flex flex-col justify-between h-24 active:scale-95 transition-transform md:w-auto text-left hover:border-red-700/50 hover:bg-gray-750"><div className="flex items-center justify-between w-full"><div className="flex items-center gap-2 text-red-500"><div className="p-1.5 bg-red-900/30 rounded-lg"><TrendingDown size={14} /></div><span className="text-[10px] font-bold uppercase">Keluar</span></div></div><div><div className="text-xl font-extrabold text-white">{stats.todayOut}</div><div className="text-[9px] text-red-500 font-medium flex items-center">Lihat Detail <ChevronRight size={10} /></div></div></button>
                <div className="min-w-[180px] snap-start bg-gradient-to-br from-gray-950 to-gray-800 p-3 rounded-xl shadow-md text-white flex flex-col justify-between h-24 relative overflow-hidden md:w-auto border border-gray-700"><div className="absolute right-0 top-0 p-2 opacity-10"><Wallet size={48} /></div><div className="flex items-center gap-2 text-gray-400 mb-1"><Wallet size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Nilai Aset</span></div><div className="text-xl font-bold tracking-tight text-white truncate">{formatCompactNumber(stats.totalAsset)}</div></div>
            </div>
        </div>

        {/* FILTER BAR */}
        <div className="px-4 pb-3">
            {/* PENCARIAN UTAMA */}
            <div className="flex gap-2 items-center mb-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" placeholder="Cari nama / part number..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-400" />
                </div>
                <button onClick={handleAddNewClick} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"><Plus size={20} /></button>
            </div>
            
            {/* PENCARIAN TAMBAHAN (BRAND & APPLICATION) */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Filter Brand..." 
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-500" 
                    />
                </div>
                <div className="relative">
                    <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Filter Aplikasi..." 
                        value={appSearch}
                        onChange={(e) => setAppSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-500" 
                    />
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                    <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap ${filterType === 'all' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}>Semua</button>
                    {/* TOMBOL FILTER 'MENIPIS' (KUNING TERANG) */}
                    <button onClick={() => setFilterType('low')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'low' ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}><AlertTriangle size={12}/> Menipis</button>
                    <button onClick={() => setFilterType('empty')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterType === 'empty' ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}><AlertCircle size={12}/> Habis</button>
                </div>
                <div className="flex bg-gray-800 p-1 rounded-lg ml-2 border border-gray-700">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-gray-700 shadow-sm text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-700 shadow-sm text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}><List size={16}/></button>
                </div>
            </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? ( <div className="flex flex-col items-center justify-center py-20 text-gray-500"><Loader2 size={32} className="animate-spin mb-3 text-blue-500"/><p className="text-xs font-medium">Memuat Data Gudang...</p></div> ) : localItems.length === 0 ? ( <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-800/50"><Package size={40} className="opacity-20 mb-3"/><p className="text-sm">Tidak ada barang ditemukan</p></div> ) : (
            <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {localItems.map(item => (
                        <div key={item.id} className={`rounded-xl shadow-none border overflow-hidden flex flex-col transition-all ${getItemCardStyle(item.quantity)}`}>
                            <div className="aspect-[4/3] relative bg-gray-700 cursor-pointer group" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? ( <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/> ) : ( <div className="w-full h-full flex items-center justify-center text-gray-600"><Package size={24}/></div> )}
                                {/* LABEL STOK DI GAMBAR */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1"><span className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm border ${item.quantity === 0 ? 'bg-red-600 text-white border-red-700' : item.quantity < 4 ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-gray-900/90 text-white backdrop-blur border-gray-700'}`}>{item.quantity === 0 ? 'HABIS' : `${item.quantity} Unit`}</span></div>
                                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><History size={10} /> Riwayat</div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col">
                                <div className="mb-2">
                                    <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-white bg-black px-1.5 py-0.5 rounded border border-black">{item.partNumber}</span><span className="text-[9px] font-bold text-gray-500 flex items-center gap-0.5"><MapPin size={8}/> {item.shelf}</span></div>
                                    <h3 className="font-bold text-gray-200 text-xs leading-snug line-clamp-2 min-h-[2.5em]">{item.name}</h3>
                                    <div className="flex flex-wrap gap-1 mt-1.5 mb-2">{item.brand && <span className="text-[9px] px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded font-medium border border-gray-600">{item.brand}</span>}{item.application && <span className="text-[9px] px-1.5 py-0.5 bg-blue-900/30 text-blue-300 rounded font-medium border border-blue-900/50">{item.application}</span>}</div>
                                </div>
                                <div className="mt-auto border-t border-gray-700 pt-2"><div className="text-sm font-extrabold text-blue-400 mb-2">{formatCompactNumber(item.price)}</div><div className="grid grid-cols-2 gap-2"><button onClick={() => handleEditClick(item)} className="py-1.5 bg-blue-900/20 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-900/40 transition-colors border border-blue-900/30">Edit</button><button onClick={() => onDelete(item.id)} className="py-1.5 bg-red-900/20 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-900/40 transition-colors border border-red-900/30">Hapus</button></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {localItems.map(item => (
                         <div key={item.id} className={`rounded-xl p-3 border shadow-none flex items-center gap-3 ${getItemCardStyle(item.quantity)}`}>
                            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative" onClick={() => setSelectedItemHistory(item)}>{item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Package size={20}/></div>}</div>
                            {/* LABEL STOK DI LIST */}
                            <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-bold text-white bg-black px-1.5 py-0.5 rounded border border-black">{item.partNumber}</span><span className={`text-[9px] font-bold px-1.5 rounded ${item.quantity === 0 ? 'bg-red-900/40 text-red-400 border border-red-900/50' : item.quantity < 4 ? 'bg-yellow-400 text-black border border-yellow-500' : 'bg-green-900/30 text-green-400 border border-green-900/50'}`}>{item.quantity} Unit</span></div><h3 className="font-bold text-sm text-gray-200 truncate">{item.name}</h3><div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-gray-400">{item.brand && <span className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600 font-medium">{item.brand}</span>}{item.application && <span className="bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-900/50 font-medium">{item.application}</span>}<span className="flex items-center gap-1 ml-1"><MapPin size={10}/> Rak: <b>{item.shelf || '-'}</b></span></div></div>
                            <div className="flex flex-col items-end gap-2 pl-2"><div className="font-extrabold text-blue-400 text-sm">{formatCompactNumber(item.price)}</div><div className="flex gap-1"><button onClick={() => handleEditClick(item)} className="p-1.5 bg-gray-700 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-600 border border-gray-600"><Edit size={16}/></button><button onClick={() => onDelete(item.id)} className="p-1.5 bg-gray-700 rounded text-gray-400 hover:text-red-400 hover:bg-gray-600 border border-gray-600"><Trash2 size={16}/></button></div></div>
                         </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-center mt-6 bg-gray-800/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-gray-700 sticky bottom-4 z-10 max-w-sm mx-auto"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-700"><ChevronLeft size={18} /></button><span className="text-xs font-medium text-gray-400">Hal <b className="text-white">{page}</b> / {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-700"><ChevronRightIcon size={18} /></button></div>
            </>
        )}
      </div>

      {showHistoryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
             <div className="bg-gray-800 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-gray-700 shadow-2xl m-4">
                 <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                     <h3 className="font-bold text-gray-100 flex items-center gap-2">{showHistoryDetail === 'in' ? <TrendingUp className="text-green-500" size={20}/> : <TrendingDown className="text-red-500" size={20}/>} Detail Barang {showHistoryDetail === 'in' ? 'Masuk' : 'Keluar'}</h3>
                     <button onClick={() => setShowHistoryDetail(null)} className="p-1 hover:bg-gray-700 rounded-full"><X size={20}/></button>
                 </div>
                 <div className="p-3 border-b border-gray-700 bg-gray-800"><input type="text" placeholder="Cari Resi / Nama Barang..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500 outline-none" value={historyDetailSearch} onChange={(e) => setHistoryDetailSearch(e.target.value)} /></div>
                 <div className="flex-1 overflow-auto bg-gray-900/30 p-2">
                     {historyDetailLoading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={30}/></div> ) : historyDetailData.length === 0 ? ( <div className="text-center py-10 text-gray-500">Tidak ada data history</div> ) : (
                         <HistoryTable data={historyDetailData} />
                     )}
                 </div>
                 <div className="p-3 border-t border-gray-700 flex justify-between items-center bg-gray-800 rounded-b-2xl">
                     <button onClick={() => setHistoryDetailPage(p => Math.max(1, p - 1))} disabled={historyDetailPage === 1} className="p-1 bg-gray-700 rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
                     <span className="text-xs text-gray-400">Hal {historyDetailPage} / {historyDetailTotalPages}</span>
                     <button onClick={() => setHistoryDetailPage(p => Math.min(historyDetailTotalPages, p + 1))} disabled={historyDetailPage === historyDetailTotalPages} className="p-1 bg-gray-700 rounded disabled:opacity-30"><ChevronRightIcon size={18}/></button>
                 </div>
             </div>
        </div>
      )}

      {selectedItemHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="bg-gray-800 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl m-4 overflow-hidden">
                   <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                       <div><h3 className="font-bold text-gray-100 flex items-center gap-2"><History size={16} className="text-blue-400"/> Riwayat Item</h3><p className="text-xs text-gray-400 truncate max-w-[300px]">{selectedItemHistory.name}</p></div>
                       <button onClick={() => setSelectedItemHistory(null)} className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full"><X size={18}/></button>
                   </div>
                   <div className="p-3 bg-gray-800 border-b border-gray-700"><input type="text" placeholder="Cari Resi / Nama Customer..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-blue-500 outline-none" value={itemHistorySearch} onChange={(e) => setItemHistorySearch(e.target.value)} /></div>
                   
                   <div className="flex-1 overflow-auto p-2 bg-gray-900/30">
                       {loadingItemHistory ? ( <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24}/></div> ) : paginatedItemHistory.length === 0 ? ( <div className="text-center py-8 text-gray-500 text-xs">Belum ada riwayat transaksi.</div> ) : (
                           <HistoryTable data={paginatedItemHistory} />
                       )}
                   </div>

                   <div className="p-3 border-t border-gray-700 flex justify-between items-center bg-gray-800 rounded-b-2xl">
                       <button onClick={() => setItemHistoryPage(p => Math.max(1, p - 1))} disabled={itemHistoryPage === 1} className="p-1 bg-gray-700 rounded disabled:opacity-30"><ChevronLeft size={18}/></button>
                       <span className="text-xs text-gray-400">Hal {itemHistoryPage} / {itemHistoryTotalPages}</span>
                       <button onClick={() => setItemHistoryPage(p => Math.min(itemHistoryTotalPages, p + 1))} disabled={itemHistoryPage === itemHistoryTotalPages} className="p-1 bg-gray-700 rounded disabled:opacity-30"><ChevronRightIcon size={18}/></button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};