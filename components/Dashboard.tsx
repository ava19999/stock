// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats, fetchHistoryLogsPaginated, fetchItemHistory } from '../services/supabaseService';
import { ItemForm } from './ItemForm';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Edit, Trash2, MapPin,
  LayoutGrid, List, History, X, ChevronLeft, Loader2, AlertTriangle, AlertCircle, Store
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
    <div className="space-y-4 pb-24">
      {showItemForm && (
        <ItemForm
            initialData={editingItem}
            onCancel={() => setShowItemForm(false)}
            onSuccess={handleFormSuccess}
        />
      )}

      {/* --- MODAL DETAIL RIWAYAT (Global Masuk/Keluar) --- */}
      {showHistoryDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* HEADER MODAL */}
                <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                        {showHistoryDetail === 'in' ? <TrendingUp size={18} className="text-green-600"/> : <TrendingDown size={18} className="text-red-600"/>}
                        Riwayat {showHistoryDetail === 'in' ? 'Barang Masuk' : 'Barang Keluar'}
                    </h3>
                    <button onClick={() => setShowHistoryDetail(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-lg">Tutup</button>
                </div>
                
                {/* SEARCH & PAGINATION HEADER */}
                <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-3 justify-between items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Cari Resi, Toko, Barang..." 
                            className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                            value={historyDetailSearch} 
                            onChange={(e) => { setHistoryDetailSearch(e.target.value); setHistoryDetailPage(1); }} 
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setHistoryDetailPage(p => Math.max(1, p - 1))} disabled={historyDetailPage === 1} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-30"><ChevronLeft size={14}/></button>
                        <span className="text-[10px] font-bold text-gray-600 min-w-[50px] text-center">Hal {historyDetailPage}/{historyDetailTotalPages}</span>
                        <button onClick={() => setHistoryDetailPage(p => Math.min(historyDetailTotalPages, p + 1))} disabled={historyDetailPage === historyDetailTotalPages || historyDetailTotalPages === 0} className="p-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-30"><ChevronRight size={14}/></button>
                    </div>
                </div>

                {/* TABEL DATA */}
                <div className="overflow-auto flex-1 p-0 bg-gray-50">
                    {historyDetailLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-blue-500"><Loader2 size={24} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat...</p></div>
                    ) : historyDetailData.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-xs flex flex-col items-center gap-2"><History size={32} className="opacity-20"/><p>Belum ada riwayat ditemukan.</p></div>
                    ) : (
                        <div className="min-w-[1000px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-2 w-28 bg-gray-50">Tanggal</th>
                                        <th className="px-3 py-2 w-36 bg-gray-50">Resi / Tempo</th>
                                        <th className="px-3 py-2 w-24 bg-gray-50">E-Commerce</th>
                                        <th className="px-3 py-2 w-28 bg-gray-50">No. Part</th>
                                        <th className="px-3 py-2 bg-gray-50">Nama Barang</th>
                                        <th className="px-3 py-2 text-right w-16 bg-gray-50">Qty</th>
                                        <th className="px-3 py-2 text-right w-24 bg-gray-50">Harga</th>
                                        <th className="px-3 py-2 text-right w-24 bg-gray-50">Total</th>
                                        <th className="px-3 py-2 w-48 bg-gray-50">Ket / Pelanggan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs bg-white">
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
                                        <tr key={h.id} className="hover:bg-blue-50/10 transition-colors">
                                            <td className="px-3 py-2 align-top text-gray-700 whitespace-nowrap">
                                                {h.timestamp ? <><div className="font-bold">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-[9px] text-gray-400 font-mono">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div></> : '-'}
                                            </td>
                                            
                                            <td className="px-3 py-2 align-top font-mono text-[10px]">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {displayResi !== '-' && displayResi !== '' && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-[120px]">
                                                            {displayResi}
                                                        </span>
                                                    )}
                                                    {displayShop !== '-' && displayShop !== '' && (
                                                        <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">
                                                            <Store size={8} className="text-gray-500" />
                                                            <span className="font-bold text-[9px] uppercase truncate max-w-[100px]">{displayShop}</span>
                                                        </div>
                                                    )}
                                                    {displayResi === '-' && displayShop === '-' && <span className="text-gray-300">-</span>}
                                                </div>
                                            </td>
                                            
                                            <td className="px-3 py-2 align-top">
                                                {ecommerce !== '-' ? <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-100">{ecommerce}</span> : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-500 text-[10px] align-top">{h.partNumber || '-'}</td>
                                            <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] align-top truncate" title={h.name}>{h.name}</td>
                                            <td className={`px-3 py-2 text-right font-bold align-top ${showHistoryDetail==='in'?'text-green-600':'text-red-600'}`}>{showHistoryDetail==='in' ? '+' : '-'}{h.quantity}</td>
                                            <td className="px-3 py-2 text-right text-gray-500 font-mono align-top text-[10px]">{formatRupiah(price)}</td>
                                            <td className="px-3 py-2 text-right text-gray-900 font-bold font-mono align-top text-[10px]">{formatRupiah(total)}</td>
                                            
                                            <td className="px-3 py-2 align-top text-gray-700 font-medium text-[10px]">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="font-bold text-gray-900 truncate max-w-[150px]" title={cleanName}>{cleanName}</span>
                                                    {isRetur && (
                                                        <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[8px] font-bold border border-red-200 flex items-center gap-1">
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

      {/* --- MODAL RIWAYAT PER ITEM --- */}
      {selectedItemHistory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="px-4 py-3 border-b flex justify-between items-start bg-gray-50">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                            <History size={18} className="text-blue-600"/> Riwayat: {selectedItemHistory.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{selectedItemHistory.partNumber}</p>
                    </div>
                    <button onClick={() => setSelectedItemHistory(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors ml-4"><X size={18} className="text-gray-500"/></button>
                </div>
                
                <div className="px-4 py-2 bg-white border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input autoFocus type="text" placeholder="Cari..." className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-300" value={itemHistorySearch} onChange={(e) => setItemHistorySearch(e.target.value)} />
                    </div>
                </div>

                <div className="overflow-auto flex-1 p-0 bg-gray-50">
                    {loadingItemHistory ? (
                        <div className="flex flex-col items-center justify-center h-48 text-blue-500"><Loader2 size={24} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat...</p></div>
                    ) : filteredItemHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400"><History size={32} className="opacity-20 mb-2"/><p className="text-xs">Tidak ada riwayat.</p></div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 w-28 bg-gray-50">Tanggal</th>
                                    <th className="px-3 py-2 w-20 text-center bg-gray-50">Tipe</th>
                                    <th className="px-3 py-2 w-16 text-right bg-gray-50">Qty</th>
                                    <th className="px-3 py-2 w-24 text-right bg-gray-50">Harga</th>
                                    <th className="px-3 py-2 w-24 text-right bg-gray-50">Total</th>
                                    <th className="px-3 py-2 bg-gray-50">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs bg-white">
                                {filteredItemHistory.map(h => { 
                                    const { resi, ecommerce, customer, keterangan } = parseHistoryReason(h.reason); 
                                    return (
                                    <tr key={h.id} className="hover:bg-blue-50/10 transition-colors">
                                        <td className="px-3 py-2 align-top text-gray-700">
                                            {h.timestamp ? <><div className="font-bold">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-[9px] text-gray-400 font-mono">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div></> : '-'}
                                        </td>
                                        <td className="px-3 py-2 align-top text-center">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${h.type === 'in' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                {h.type === 'in' ? 'Masuk' : 'Keluar'}
                                            </span>
                                        </td>
                                        <td className={`px-3 py-2 align-top text-right font-bold ${h.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {h.type === 'in' ? '+' : '-'}{h.quantity}
                                        </td>
                                        <td className="px-3 py-2 align-top text-right font-mono text-gray-500 text-[10px]">{formatRupiah(h.price)}</td>
                                        <td className="px-3 py-2 align-top text-right font-bold font-mono text-gray-800 text-[10px]">{formatRupiah(h.totalPrice)}</td>
                                        <td className="px-3 py-2 align-top text-gray-700">
                                            <div className="font-bold text-gray-900 text-[10px] mb-1">{h.type === 'in' ? h.reason.replace(/\(Via:.*?\)/, '').trim() : (customer !== '-' ? customer : keterangan)}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {resi !== '-' && <div className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] border border-blue-100 font-mono">{resi}</div>}
                                                {ecommerce !== '-' && <div className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-[9px] border border-orange-100">{ecommerce}</div>}
                                            </div>
                                        </td>
                                    </tr>); 
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {/* STATS CARDS */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
        <div className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group"><div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={32} className="text-blue-600" /></div><div className="flex items-center gap-1.5 text-gray-500 mb-1"><Package size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Item</span></div><div className="text-xl font-bold text-gray-800">{formatCompactNumber(stats.totalItems, false)}</div></div>
        <div className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group"><div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Layers size={32} className="text-purple-600" /></div><div className="flex items-center gap-1.5 text-gray-500 mb-1"><Layers size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Stok</span></div><div className="text-xl font-bold text-gray-800">{formatCompactNumber(stats.totalStock, false)}</div></div>
        <button onClick={() => setShowHistoryDetail('in')} className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 text-left active:scale-95 transition-transform relative overflow-hidden hover:border-green-200"><div className="absolute right-2 top-2"><div className="bg-green-50 text-green-600 p-0.5 rounded-full"><ArrowUpRight size={10}/></div></div><div className="flex items-center gap-1.5 text-gray-500 mb-1"><TrendingUp size={12} className="text-green-500" /><span className="text-[9px] uppercase font-bold tracking-wider">Masuk</span></div><div><div className="text-lg font-bold text-gray-800 leading-none">{stats.todayIn} <span className="text-[10px] font-normal text-gray-400">Pcs</span></div><div className="text-[8px] text-green-600 font-medium flex items-center mt-1">Detail <ChevronRight size={8} /></div></div></button>
        <button onClick={() => setShowHistoryDetail('out')} className="min-w-[120px] snap-start bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-20 text-left active:scale-95 transition-transform relative overflow-hidden hover:border-red-200"><div className="absolute right-2 top-2"><div className="bg-red-50 text-red-600 p-0.5 rounded-full"><ArrowDownRight size={10}/></div></div><div className="flex items-center gap-1.5 text-gray-500 mb-1"><TrendingDown size={12} className="text-red-500" /><span className="text-[9px] uppercase font-bold tracking-wider">Keluar</span></div><div><div className="text-lg font-bold text-gray-800 leading-none">{stats.todayOut} <span className="text-[10px] font-normal text-gray-400">Pcs</span></div><div className="text-[8px] text-red-600 font-medium flex items-center mt-1">Detail <ChevronRight size={8} /></div></div></button>
        <div className="min-w-[160px] snap-start bg-gradient-to-r from-gray-900 to-gray-800 p-3 rounded-xl shadow-lg text-white flex flex-col justify-between h-20 relative overflow-hidden"><div className="absolute right-0 top-0 p-2 opacity-10"><Wallet size={40} /></div><div className="flex items-center gap-1.5 text-gray-300 mb-1"><Wallet size={12} /><span className="text-[9px] uppercase font-bold tracking-wider">Nilai Aset</span></div><div className="text-lg font-bold tracking-tight text-white truncate" title={formatRupiah(stats.totalAsset)}>{formatCompactNumber(stats.totalAsset)}</div></div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3"><h2 className="text-base font-bold text-gray-800">Daftar Barang</h2><span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{totalCount} Item</span></div>
            <div className="flex gap-2">
                <div className="bg-white rounded-lg p-1 flex shadow-sm border border-gray-100 items-center">
                    <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${filterType === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>Semua</button>
                    <button onClick={() => setFilterType('low')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${filterType === 'low' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} title="Stok Kurang dari 4"><AlertTriangle size={12}/> Menipis</button>
                    <button onClick={() => setFilterType('empty')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${filterType === 'empty' ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} title="Stok Habis (0)"><AlertCircle size={12}/> Habis</button>
                </div>
                
                <div className="bg-white rounded-lg p-1 flex shadow-sm border border-gray-100 ml-2">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={16}/></button>
                </div>
                <button onClick={handleAddNewClick} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 ml-2">+ Barang</button>
            </div>
        </div>
        
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Cari (Tekan Enter atau Tunggu)..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm" /></div>

        {loading ? <div className="flex flex-col items-center justify-center h-64 text-blue-500"><Loader2 size={32} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat Data...</p></div> : localItems.length === 0 ? <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200"><Package size={24} className="mx-auto mb-2 opacity-50"/><p className="text-xs">Tidak ada barang yang cocok.</p></div> : (
             <>
             {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                   {localItems.map(item => (
                     <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
                        <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden border-b border-gray-50 cursor-pointer group-hover:opacity-90 transition-opacity" onClick={() => setSelectedItemHistory(item)}>
                          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>}
                          <div className="absolute top-1.5 left-1.5"><span className={`text-[8px] font-bold px-1 py-0.5 rounded shadow-sm border ${item.quantity === 0 ? 'bg-black text-white border-gray-600' : item.quantity < 4 ? 'bg-orange-500 text-white border-orange-600' : 'bg-white/90 text-gray-700 backdrop-blur-sm border-gray-200'}`}>{item.quantity === 0 ? 'HABIS' : item.quantity + ' Unit'}</span></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"><span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1"><History size={10}/> Riwayat</span></div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col">
                          <div className="mb-2"><h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.4em] mb-1">{item.name || 'Tanpa Nama'}</h3><p className="text-xs text-gray-500 font-mono truncate bg-gray-50 inline-block px-1 rounded">{item.partNumber || '-'}</p><div className="text-xs text-gray-500 mb-3 flex-1 flex flex-col gap-0.5 mt-1.5"><div className="truncate">App: <span className="font-bold text-gray-900">{item.application || "-"}</span></div><div className="truncate">Brand: <span className="font-bold text-gray-900">{item.brand || "-"}</span></div></div></div>
                          <div className="mt-auto pt-2 border-t border-gray-50 space-y-2">
                             <div className="flex justify-between items-end"><div className="text-sm font-bold text-blue-700 truncate">{formatCompactNumber(item.price)}</div><div className="flex items-center text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"><MapPin size={9} className="mr-0.5 text-gray-500"/>{item.shelf || '-'}</div></div>
                             <div className="grid grid-cols-2 gap-1.5">
                                 <button onClick={() => handleEditClick(item)} className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Edit size={10} /> Edit</button>
                                 <button onClick={() => onDelete(item.id)} className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Trash2 size={10} /> Hapus</button>
                             </div>
                          </div>
                        </div>
                     </div>
                   ))}
                </div>
             ) : (
                <div className="flex flex-col gap-2">
                    {localItems.map(item => (
                        <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow group">
                            <div className="w-14 h-14 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100 relative cursor-pointer group-hover:ring-2 group-hover:ring-blue-200 transition-all" onClick={() => setSelectedItemHistory(item)}>
                                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>}
                            </div>
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 text-sm truncate">{item.name || 'Tanpa Nama'}</h3><div className="flex items-center gap-3 mt-1"><p className="text-xs text-gray-500 font-mono truncate bg-gray-50 px-1.5 py-0.5 rounded">{item.partNumber || '-'}</p><div className="flex items-center text-xs text-gray-600"><MapPin size={10} className="mr-0.5 text-gray-400"/>{item.shelf || '-'}</div></div><div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1"><span>App: <span className="font-bold text-gray-900">{item.application || "-"}</span></span><span>Brand: <span className="font-bold text-gray-900">{item.brand || "-"}</span></span></div></div>
                            <div className="flex flex-col items-end gap-2 pl-3 border-l border-gray-50 ml-1"><div className="text-right"><div className="text-sm font-bold text-blue-700">{formatCompactNumber(item.price)}</div><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border inline-block mt-0.5 ${item.quantity === 0 ? 'bg-black text-white border-gray-600' : item.quantity < 4 ? 'bg-orange-500 text-white border-orange-600' : 'bg-green-50 text-green-700 border-green-100'}`}>{item.quantity === 0 ? 'HABIS' : item.quantity + ' Unit'}</span></div><div className="flex gap-1.5">
                                <button onClick={() => handleEditClick(item)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"><Edit size={14} /></button>
                                <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"><Trash2 size={14} /></button>
                            </div></div>
                        </div>
                    ))}
                </div>
             )}
             <div className="flex justify-between items-center mt-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm sticky bottom-20 md:bottom-4 z-20"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /> Sebelumnya</button><span className="text-xs font-medium text-gray-500">Halaman <span className="font-bold text-gray-900">{page}</span> dari {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">Selanjutnya <ChevronRight size={16} /></button></div>
             </>
        )}
      </div>
    </div>
  );
};