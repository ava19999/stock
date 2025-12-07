// FILE: src/components/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { Search, Plus, MapPin, Package, Layers, Filter, Edit, Trash2, ArrowUpRight, ArrowDownRight, Box, X, Calendar, Tag, FileText } from 'lucide-react';
import { formatRupiah } from '../utils';

interface DashboardProps {
  items: InventoryItem[];
  orders: Order[];
  history: StockHistory[]; // Prop baru: history
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onAddNew: () => void;
  onViewOrders: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  items = [], 
  orders = [], 
  history = [], // Default empty
  onDelete, 
  onEdit, 
  onAddNew, 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDetail, setActiveDetail] = useState<'incoming' | 'outgoing' | null>(null);
  
  // --- STATISTIK ---
  const stats = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const safeHistory = Array.isArray(history) ? history : [];
    
    // 1. Total Jenis Barang
    const totalJenis = safeItems.length;

    // 2. Total Stok Fisik
    const totalQuantity = safeItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);

    // 3. Data Barang Masuk (Dari History 'in')
    // Ini menampilkan setiap transaksi penambahan stok (misal: +1, +5)
    const incomingHistory = safeHistory
        .filter(h => h.type === 'in')
        .sort((a, b) => b.timestamp - a.timestamp);

    const totalBarangMasuk = incomingHistory.reduce((sum, h) => sum + h.quantity, 0);

    // 4. Data Barang Keluar (Dari History 'out')
    const outgoingHistory = safeHistory
        .filter(h => h.type === 'out')
        .sort((a, b) => b.timestamp - a.timestamp);

    const totalBarangKeluar = outgoingHistory.reduce((sum, h) => sum + h.quantity, 0);

    // 5. Total Aset
    const totalAset = safeItems.reduce((sum, item) => sum + ((Number(item?.price) || 0) * (Number(item?.quantity) || 0)), 0);

    return { 
        totalJenis, 
        totalQuantity, 
        totalBarangKeluar, 
        outgoingHistory, 
        totalBarangMasuk, 
        incomingHistory,
        totalAset 
    };
  }, [items, orders, history]);

  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.filter(item => {
      if (!item) return false;
      const name = (item.name || '').toLowerCase();
      const pn = (item.partNumber || '').toLowerCase();
      const shelf = (item.shelf || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      return name.includes(search) || pn.includes(search) || shelf.includes(search);
    });
  }, [items, searchTerm]);

  const StatCard = ({ icon: Icon, label, value, colorClass, bgClass, onClick, isClickable }: any) => (
    <div onClick={isClickable ? onClick : undefined} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95' : ''}`}>
        <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}><Icon size={24} strokeWidth={2} /></div>
        <div><p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p>{isClickable && <p className="text-[10px] text-blue-500 mt-1">Klik untuk detail</p>}</div>
    </div>
  );

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Jenis Barang" value={`${stats.totalJenis} Item`} bgClass="bg-indigo-50" colorClass="text-indigo-600" />
        <StatCard icon={Box} label="Total Stok Fisik" value={`${stats.totalQuantity} Pcs`} bgClass="bg-blue-50" colorClass="text-blue-600" />
        <StatCard icon={ArrowDownRight} label="Riwayat Masuk" value={`${stats.totalBarangMasuk} Pcs`} bgClass="bg-emerald-50" colorClass="text-emerald-600" isClickable={true} onClick={() => setActiveDetail('incoming')} />
        <StatCard icon={ArrowUpRight} label="Riwayat Keluar" value={`${stats.totalBarangKeluar} Pcs`} bgClass="bg-orange-50" colorClass="text-orange-600" isClickable={true} onClick={() => setActiveDetail('outgoing')} />
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white shadow-lg flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="p-2 bg-white/10 rounded-lg"><Layers size={20} /></div><div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Estimasi Nilai Aset</p><p className="text-lg font-bold">{formatRupiah(stats.totalAset)}</p></div></div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-400 group-focus-within:text-purple-600" /></div><input type="text" placeholder="Cari barang..." className="pl-10 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <button onClick={onAddNew} className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg transition-colors font-semibold shadow-md text-sm w-full md:w-auto"><Plus size={18} /><span>Tambah</span></button>
      </div>

      {filteredItems.length === 0 ? <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300"><Filter size={48} className="mx-auto text-gray-200 mb-3" /><h3 className="text-base font-medium text-gray-900">Data tidak ditemukan</h3></div> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id || Math.random()} className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition-all duration-200 flex flex-col group relative">
              <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32} /></div>}
                <div className="absolute top-2 left-2 flex flex-col gap-1">{(Number(item.quantity) || 0) <= 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm">HABIS</span>}{(Number(item.quantity) || 0) > 0 && (Number(item.quantity) || 0) <= 5 && <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm">MENIPIS</span>}</div>
                <div className="absolute top-2 right-2"><span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-800 shadow-sm border border-gray-100">{item.partNumber || '-'}</span></div>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="mb-1"><h3 className="text-xs font-bold text-gray-900 line-clamp-1 leading-tight" title={item.name}>{item.name || 'Tanpa Nama'}</h3></div>
                <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 leading-relaxed h-[2.5em]">{item.description || '-'}</p>
                <div className="space-y-1.5 mb-3 border-t border-dashed border-gray-100 pt-2"><div className="flex items-center text-[10px] text-gray-500"><MapPin size={12} className="mr-1.5 text-purple-500" /><span className="font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded truncate max-w-[100px]">{item.shelf || '-'}</span></div><div className="flex items-center text-[10px] text-gray-500"><Layers size={12} className="mr-1.5 text-gray-400" /><span>Sisa: <b className={`${(Number(item.quantity) || 0) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity || 0}</b> Unit</span></div></div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto"><span className="text-xs font-bold text-gray-900">{formatRupiah(item.price || 0)}</span><div className="flex space-x-1"><button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit size={14} /></button><button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={14} /></button></div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveDetail(null)}></div>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col relative overflow-hidden animate-in zoom-in-95">
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${activeDetail === 'incoming' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{activeDetail === 'incoming' ? <ArrowDownRight size={24} /> : <ArrowUpRight size={24} />}</div><div><h3 className="text-xl font-bold text-gray-900">{activeDetail === 'incoming' ? 'Riwayat Barang Masuk' : 'Riwayat Barang Keluar'}</h3><p className="text-xs text-gray-500">{activeDetail === 'incoming' ? 'Menampilkan log penambahan stok manual.' : 'Menampilkan log penjualan barang.'}</p></div></div>
                <button onClick={() => setActiveDetail(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-auto p-0">
                 {/* TABEL BARANG MASUK */}
                 {activeDetail === 'incoming' && (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider shadow-sm">
                            <tr><th className="px-4 py-3 border-b">Tanggal</th><th className="px-4 py-3 border-b">Part Number</th><th className="px-4 py-3 border-b">Nama Barang</th><th className="px-4 py-3 border-b">Keterangan</th><th className="px-4 py-3 border-b text-center text-emerald-700 bg-emerald-50">Jml Masuk</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.incomingHistory.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Belum ada riwayat masuk</td></tr> : stats.incomingHistory.map((h, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(h.timestamp)}</td>
                                    <td className="px-4 py-3 text-xs font-mono text-gray-600 font-semibold">{h.partNumber}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{h.name}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500"><div className="flex flex-col"><span className="font-medium text-gray-700">{h.reason}</span><span className="text-[10px]">Stok: {h.previousStock} → {h.currentStock}</span></div></td>
                                    <td className="px-4 py-3 text-sm font-bold text-emerald-700 text-center bg-emerald-50/30">+{h.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )}
                 {/* TABEL BARANG KELUAR */}
                 {activeDetail === 'outgoing' && (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-bold tracking-wider shadow-sm">
                            <tr><th className="px-4 py-3 border-b">Tanggal</th><th className="px-4 py-3 border-b">Part Number</th><th className="px-4 py-3 border-b">Nama Barang</th><th className="px-4 py-3 border-b">Keterangan</th><th className="px-4 py-3 border-b text-center text-orange-700 bg-orange-50">Jml Keluar</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.outgoingHistory.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Belum ada riwayat keluar</td></tr> : stats.outgoingHistory.map((h, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(h.timestamp)}</td>
                                    <td className="px-4 py-3 text-xs font-mono text-gray-600 font-semibold">{h.partNumber}</td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{h.name}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500"><div className="flex flex-col"><span className="font-medium text-gray-700">{h.reason}</span><span className="text-[10px]">Stok: {h.previousStock} → {h.currentStock}</span></div></td>
                                    <td className="px-4 py-3 text-sm font-bold text-orange-700 text-center bg-orange-50/30">-{h.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 )}
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-right"><button onClick={() => setActiveDetail(null)} className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors">Tutup</button></div>
           </div>
        </div>
      )}
    </div>
  );
};