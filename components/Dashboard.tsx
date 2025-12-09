// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats } from '../services/supabaseService';
import { 
  Package, Layers, TrendingUp, TrendingDown, Wallet, ChevronRight, Search, 
  ArrowUpRight, ArrowDownRight, Edit, Trash2, MapPin, FileText,
  Grid, List, ShoppingBag, History, X, ChevronLeft, Loader2 // <-- GANTI LayoutGrid JADI Grid
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
  history, onAddNew, onEdit, onDelete 
}) => {
  const [localItems, setLocalItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({ totalItems: 0, totalStock: 0, totalAsset: 0, todayIn: 0, todayOut: 0 });

  const [showHistoryDetail, setShowHistoryDetail] = useState<'in' | 'out' | null>(null);
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, count } = await fetchInventoryPaginated(page, 50, searchTerm);
    setLocalItems(data);
    setTotalCount(count);
    setTotalPages(Math.ceil(count / 50));
    setLoading(false);
  }, [page, searchTerm]);

  const loadStats = useCallback(async () => {
    const invStats = await fetchInventoryStats();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayIn = history
      .filter(h => h.type === 'in' && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);
    const todayOut = history
      .filter(h => h.type === 'out' && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);
    setStats({ ...invStats, todayIn, todayOut });
  }, [history]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  
  const formatCompactNumber = (num: number, isCurrency = true) => {
    const n = num || 0;
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'M';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt';
    return isCurrency ? formatRupiah(n) : new Intl.NumberFormat('id-ID').format(n);
  };

  const parseHistoryReason = (reason: string) => {
      let resi = '-';
      let ecommerce = '-';
      let keterangan = reason || '';
      const resiMatch = keterangan.match(/\(Resi: (.*?)\)/);
      if (resiMatch && resiMatch[1]) { resi = resiMatch[1]; keterangan = keterangan.replace(/\s*\(Resi:.*?\)/, ''); }
      const viaMatch = keterangan.match(/\(Via: (.*?)\)/);
      if (viaMatch && viaMatch[1]) { ecommerce = viaMatch[1]; keterangan = keterangan.replace(/\s*\(Via:.*?\)/, ''); }
      if (keterangan.toLowerCase().includes('cancel order')) { keterangan = 'Retur'; }
      return { resi, ecommerce, keterangan };
  };

  const getDisplayStock = (h: StockHistory) => {
      if (h.currentStock !== undefined && h.currentStock !== null) {
          return h.currentStock;
      }
      if (h.previousStock !== undefined && h.previousStock !== null) {
          if (h.type === 'in') return h.previousStock + h.quantity;
          if (h.type === 'out') return Math.max(0, h.previousStock - h.quantity);
      }
      return 0; 
  };

  // --- HISTORY MODAL ---
  const HistoryModal = () => {
    if (!showHistoryDetail) return null;
    const type = showHistoryDetail;
    const filteredHistory = history.filter(h => h.type === type).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              {type === 'in' ? <TrendingUp size={18} className="text-green-600"/> : <TrendingDown size={18} className="text-red-600"/>}
              Detail Riwayat {type === 'in' ? 'Masuk' : 'Keluar'}
            </h3>
            <button onClick={() => setShowHistoryDetail(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Tutup</button>
          </div>
          <div className="overflow-auto flex-1 p-0">
            {filteredHistory.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">Belum ada riwayat.</div> : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                        <tr><th className="p-3 border-b border-gray-200 w-28">Tanggal</th><th className="p-3 border-b border-gray-200 w-32">Resi</th><th className="p-3 border-b border-gray-200 w-32">E-Commerce</th><th className="p-3 border-b border-gray-200 w-32">No. Part</th><th className="p-3 border-b border-gray-200">Nama Barang</th><th className="p-3 border-b border-gray-200 text-right w-20">Qty</th><th className="p-3 border-b border-gray-200 text-right w-32">Harga Satuan</th><th className="p-3 border-b border-gray-200 text-right w-32">Total Harga</th>{type === 'in' && <th className="p-3 border-b border-gray-200 w-48">Keterangan</th>}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredHistory.map((h) => {
                            const price = h.price || 0; 
                            const total = h.totalPrice || (price * (Number(h.quantity) || 0));
                            const { resi, ecommerce, keterangan } = parseHistoryReason(h.reason);
                            
                            return (
                                <tr key={h.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-3 text-gray-600 whitespace-nowrap align-top"><div className="font-medium">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div></td>
                                    <td className="p-3 align-top"><span className={`inline-block px-2 py-1 rounded text-xs font-medium ${resi !== '-' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-300'}`}>{resi}</span></td>
                                    <td className="p-3 align-top"><span className={`inline-block px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit ${ecommerce !== '-' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'text-gray-300'}`}>{ecommerce !== '-' && <ShoppingBag size={10} />}{ecommerce}</span></td>
                                    <td className="p-3 font-mono text-gray-500 text-xs align-top">{h.partNumber || '-'}</td>
                                    <td className="p-3 font-medium text-gray-800 max-w-[200px] align-top"><div className="line-clamp-2">{h.name || 'Unknown Item'}</div></td>
                                    <td className={`p-3 text-right font-bold align-top ${type==='in'?'text-green-600':'text-red-600'}`}>{type==='in' ? '+' : '-'}{h.quantity}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono align-top text-xs">{formatRupiah(price)}</td>
                                    <td className="p-3 text-right text-gray-800 font-bold font-mono align-top text-xs">{formatRupiah(total)}</td>
                                    {type === 'in' && <td className="p-3 align-top text-xs">{keterangan}</td>}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- ITEM HISTORY MODAL ---
  const ItemHistoryModal = () => {
    if (!selectedItemHistory) return null;
    const itemHistory = history.filter(h => h.itemId === selectedItemHistory.id || h.partNumber === selectedItemHistory.partNumber).sort((a, b) => b.timestamp - a.timestamp);

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-start bg-gray-50">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><History size={20} className="text-blue-600"/> Riwayat Transaksi Barang</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{selectedItemHistory.name || 'Tanpa Nama'}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700 font-mono">{selectedItemHistory.partNumber || '-'}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Sisa Stok: {selectedItemHistory.quantity}</span>
                    </div>
                </div>
                <button onClick={() => setSelectedItemHistory(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500"/></button>
            </div>
            <div className="overflow-auto flex-1 p-0">
                {itemHistory.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-gray-400"><History size={48} className="opacity-20 mb-3"/><p>Belum ada riwayat transaksi</p></div> : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr><th className="p-3 border-b border-gray-200 w-32">Tanggal</th><th className="p-3 border-b border-gray-200 w-24 text-center">Tipe</th><th className="p-3 border-b border-gray-200 w-20 text-right">Jml</th><th className="p-3 border-b border-gray-200 w-28 text-right">Harga</th><th className="p-3 border-b border-gray-200 w-28 text-right">Total</th><th className="p-3 border-b border-gray-200 w-24 text-right">Stok Akhir</th><th className="p-3 border-b border-gray-200">Keterangan / Resi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {itemHistory.map(h => {
                                const { resi, ecommerce, keterangan } = parseHistoryReason(h.reason);
                                const price = h.price || 0;
                                const total = h.totalPrice || (price * (Number(h.quantity) || 0));

                                return (
                                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 align-top text-gray-600"><div className="font-medium">{new Date(h.timestamp).toLocaleDateString('id-ID')}</div><div className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</div></td>
                                        <td className="p-3 align-top text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${h.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{h.type === 'in' ? 'Masuk' : 'Keluar'}</span></td>
                                        <td className={`p-3 align-top text-right font-bold ${h.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{h.type === 'in' ? '+' : '-'}{h.quantity}</td>
                                        <td className="p-3 align-top text-right font-mono text-gray-600 text-xs">{formatRupiah(price)}</td>
                                        <td className="p-3 align-top text-right font-bold font-mono text-gray-800 text-xs">{formatRupiah(total)}</td>
                                        <td className="p-3 align-top text-right font-mono text-gray-600 bg-gray-50 font-bold">{getDisplayStock(h)}</td>
                                        <td className="p-3 align-top text-gray-700"><div className="font-medium text-xs mb-1">{keterangan}</div>{resi !== '-' && (<div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-100 mr-1">Resi: {resi}</div>)}{ecommerce !== '-' && (<div className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-[10px] border border-orange-100"><ShoppingBag size={8}/> {ecommerce}</div>)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      <HistoryModal />
      <ItemHistoryModal />
      
      {/* STATS */}
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
            <div className="flex gap-2"><div className="bg-white rounded-lg p-1 flex shadow-sm border border-gray-100"><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16}/></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={16}/></button></div><button onClick={onAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5">+ Barang</button></div>
        </div>
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input type="text" placeholder="Cari (Tekan Enter atau Tunggu)..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm" /></div>

        {loading ? <div className="flex flex-col items-center justify-center h-64 text-blue-500"><Loader2 size={32} className="animate-spin mb-2"/><p className="text-xs font-medium">Memuat Data...</p></div> : localItems.length === 0 ? <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200"><Package size={24} className="mx-auto mb-2 opacity-50"/><p className="text-xs">Tidak ada barang</p></div> : (
             <>
             {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                   {localItems.map(item => (
                     <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">
                        <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden border-b border-gray-50 cursor-pointer group-hover:opacity-90 transition-opacity" onClick={() => setSelectedItemHistory(item)}>
                          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}}/> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>}
                          <div className="absolute top-1.5 left-1.5"><span className={`text-[8px] font-bold px-1 py-0.5 rounded shadow-sm border ${item.quantity < 5 ? 'bg-red-500 text-white border-red-600' : 'bg-white/90 text-gray-700 backdrop-blur-sm border-gray-200'}`}>{item.quantity} Unit</span></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"><span className="bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1"><History size={10}/> Riwayat</span></div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col">
                          <div className="mb-2"><h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 min-h-[2.4em] mb-1">{item.name || 'Tanpa Nama'}</h3><p className="text-xs text-gray-500 font-mono truncate bg-gray-50 inline-block px-1 rounded">{item.partNumber || '-'}</p><div className="mt-1.5 flex items-start gap-1.5"><FileText size={10} className="text-gray-400 mt-0.5 flex-shrink-0" /><p className="text-xs text-gray-600 leading-snug line-clamp-2 min-h-[2.5em]">{item.description || "-"}</p></div></div>
                          <div className="mt-auto pt-2 border-t border-gray-50 space-y-2">
                             <div className="flex justify-between items-end"><div className="text-sm font-bold text-blue-700 truncate">{formatCompactNumber(item.price)}</div><div className="flex items-center text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"><MapPin size={9} className="mr-0.5 text-gray-500"/>{item.shelf || '-'}</div></div>
                             <div className="grid grid-cols-2 gap-1.5"><button onClick={() => onEdit(item)} className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Edit size={10} /> Edit</button><button onClick={() => onDelete(item.id)} className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded text-[10px] font-bold transition-colors"><Trash2 size={10} /> Hapus</button></div>
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
                            <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-900 text-sm truncate">{item.name || 'Tanpa Nama'}</h3><div className="flex items-center gap-3 mt-1"><p className="text-xs text-gray-500 font-mono truncate bg-gray-50 px-1.5 py-0.5 rounded">{item.partNumber || '-'}</p><div className="flex items-center text-xs text-gray-600"><MapPin size={10} className="mr-0.5 text-gray-400"/>{item.shelf || '-'}</div></div><p className="text-xs text-gray-500 truncate mt-1">{item.description || "-"}</p></div>
                            <div className="flex flex-col items-end gap-2 pl-3 border-l border-gray-50 ml-1"><div className="text-right"><div className="text-sm font-bold text-blue-700">{formatCompactNumber(item.price)}</div><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm border inline-block mt-0.5 ${item.quantity < 5 ? 'bg-red-500 text-white border-red-600' : 'bg-green-50 text-green-700 border-green-100'}`}>{item.quantity} Unit</span></div><div className="flex gap-1.5"><button onClick={() => onEdit(item)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"><Edit size={14} /></button><button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"><Trash2 size={14} /></button></div></div>
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