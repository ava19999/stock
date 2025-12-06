import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Search, Plus, MapPin, Package, DollarSign, Trash2, Edit, AlertTriangle, Layers, Filter } from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  onEdit: (item: InventoryItem) => void;
  onAddNew: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ items, onDelete, onEdit, onAddNew }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate stats
  const totalValue = useMemo(() => items.reduce((sum, item) => sum + (item.price * item.quantity), 0), [items]);
  const totalItems = items.length;
  const totalStockCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.shelf.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const StatCard = ({ icon: Icon, label, value, colorClass, bgClass }: any) => (
    <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center space-x-3">
        <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Jenis Barang" value={totalItems} bgClass="bg-blue-50" colorClass="text-blue-600" />
        <StatCard icon={Layers} label="Total Unit" value={totalStockCount.toLocaleString('id-ID')} bgClass="bg-indigo-50" colorClass="text-indigo-600" />
        <StatCard icon={DollarSign} label="Estimasi Aset" value={formatRupiah(totalValue)} bgClass="bg-green-50" colorClass="text-green-600" />
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-blue-600" />
          </div>
          <input
            type="text"
            placeholder="Cari di gudang..."
            className="pl-10 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button className="p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                <Filter size={18} />
            </button>
            <button
            onClick={onAddNew}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg transition-colors font-semibold shadow-md text-sm"
            >
            <Plus size={18} />
            <span>Tambah Stok</span>
            </button>
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-base font-medium text-gray-900">Data tidak ditemukan</h3>
          <p className="text-sm text-gray-500">Coba kata kunci lain atau tambah barang baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition-all duration-200 flex flex-col group">
              <div className="aspect-square w-full bg-gray-100 relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package size={24} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span className="bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono font-bold text-gray-800 shadow-sm">{item.partNumber}</span>
                </div>
                {item.quantity <= 5 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[10px] py-1 text-center font-bold backdrop-blur-sm">
                    Stok Menipis
                  </div>
                )}
              </div>
              
              <div className="p-3 flex-1 flex flex-col">
                <div className="mb-2">
                  <h3 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight min-h-[2.5em]">{item.name}</h3>
                </div>
                
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center text-[10px] text-gray-500">
                    <MapPin size={12} className="mr-1.5 text-blue-500" />
                    <span className="font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.shelf}</span>
                  </div>
                  <div className="flex items-center text-[10px] text-gray-500">
                    <Layers size={12} className="mr-1.5 text-gray-400" />
                    <span>Sisa: <b className="text-gray-900">{item.quantity}</b> Unit</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                  <span className="text-xs font-bold text-gray-900">{formatRupiah(item.price)}</span>
                  <div className="flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
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