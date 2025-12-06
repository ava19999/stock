import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Search, Plus, MapPin, Package, DollarSign, Trash2, Edit, AlertTriangle, Layers, Filter, XCircle } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onAddNew: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ items = [], onDelete, onEdit, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');

  // --- STATISTIK ---
  const stats = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return {
      totalJenis: safeItems.length,
      totalQuantity: safeItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      totalAset: safeItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0),
      lowStock: safeItems.filter(i => (Number(i.quantity) || 0) > 0 && (Number(i.quantity) || 0) <= 5).length,
      outStock: safeItems.filter(i => (Number(i.quantity) || 0) <= 0).length
    };
  }, [items]);

  // --- FILTER ---
  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems.filter(item => {
      const name = (item.name || '').toLowerCase();
      const pn = (item.partNumber || '').toLowerCase();
      const shelf = (item.shelf || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchSearch = name.includes(search) || pn.includes(search) || shelf.includes(search) || desc.includes(search);
      
      const qty = Number(item.quantity) || 0;
      let matchStatus = true;
      if (filterStatus === 'low') matchStatus = qty > 0 && qty <= 5;
      if (filterStatus === 'out') matchStatus = qty <= 0;

      return matchSearch && matchStatus;
    });
  }, [items, searchTerm, filterStatus]);

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  const StatCard = ({ icon: Icon, label, value, colorClass, bgClass, onClick }: any) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 cursor-pointer hover:shadow-md transition-all ${onClick ? 'active:scale-95' : ''}`}>
        <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
            <Icon size={24} strokeWidth={2} />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Total Aset" value={formatRupiah(stats.totalAset)} bgClass="bg-blue-50" colorClass="text-blue-600" onClick={() => setFilterStatus('all')} />
        <StatCard icon={AlertTriangle} label="Stok Menipis" value={`${stats.lowStock} Item`} bgClass="bg-orange-50" colorClass="text-orange-600" onClick={() => setFilterStatus('low')} />
        <StatCard icon={Layers} label="Stok Habis" value={`${stats.outStock} Item`} bgClass="bg-red-50" colorClass="text-red-600" onClick={() => setFilterStatus('out')} />
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-purple-600" />
          </div>
          <input
            type="text"
            placeholder="Cari barang..."
            className="pl-10 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
            {[
                { id: 'all', label: 'Semua', icon: Layers },
                { id: 'low', label: 'Menipis', icon: AlertTriangle },
                { id: 'out', label: 'Habis', icon: XCircle }
            ].map((tab: any) => (
                <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`flex items-center px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap gap-1.5 ${
                        filterStatus === tab.id 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>

        <button onClick={onAddNew} className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg transition-colors font-semibold shadow-md text-sm w-full md:w-auto">
            <Plus size={18} />
            <span>Tambah</span>
        </button>
      </div>

      {/* GRID ITEMS */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Filter size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-base font-medium text-gray-900">Data tidak ditemukan</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id || Math.random()} className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition-all duration-200 flex flex-col group relative">
              
              <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32} /></div>
                )}
                
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {(Number(item.quantity) || 0) <= 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm">HABIS</span>}
                    {(Number(item.quantity) || 0) > 0 && (Number(item.quantity) || 0) <= 5 && <span className="bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-sm">MENIPIS</span>}
                </div>
                <div className="absolute top-2 right-2">
                    <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-800 shadow-sm border border-gray-100">{item.partNumber || '-'}</span>
                </div>
              </div>
              
              <div className="p-3 flex-1 flex flex-col">
                <div className="mb-1">
                  <h3 className="text-xs font-bold text-gray-900 line-clamp-1 leading-tight" title={item.name}>
                    {item.name || 'Tanpa Nama'}
                  </h3>
                </div>

                {/* DESKRIPSI DITAMBAHKAN DI SINI */}
                <p className="text-[10px] text-gray-500 line-clamp-2 mb-3 leading-relaxed h-[2.5em]">
                    {item.description || '-'}
                </p>
                
                <div className="space-y-1.5 mb-3 border-t border-dashed border-gray-100 pt-2">
                  <div className="flex items-center text-[10px] text-gray-500">
                    <MapPin size={12} className="mr-1.5 text-purple-500" />
                    <span className="font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                      {item.shelf || '-'}
                    </span>
                  </div>
                  <div className="flex items-center text-[10px] text-gray-500">
                    <Layers size={12} className="mr-1.5 text-gray-400" />
                    <span>Sisa: <b className={`${(Number(item.quantity) || 0) <= 0 ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity || 0}</b> Unit</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
                  <span className="text-xs font-bold text-gray-900">{formatRupiah(item.price || 0)}</span>
                  <div className="flex space-x-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"><Edit size={14} /></button>
                    <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};