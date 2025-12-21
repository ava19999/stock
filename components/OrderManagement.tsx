// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { 
  Search, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle, 
  Clock, Truck, RotateCcw, ArrowRight, Package, Calendar, User, 
  MapPin, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

interface OrderManagementProps {
  orders: Order[];
  isLoading?: boolean; // <--- Prop Baru
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onProcessReturn: (orderId: string, returnedItems: { itemId: string, qty: number }[]) => void;
  onRefresh: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ 
  orders, isLoading = false, onUpdateStatus, onProcessReturn, onRefresh 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // State untuk Modal Retur
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'processing': return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case 'shipped': return 'bg-purple-900/30 text-purple-400 border-purple-800';
      case 'completed': return 'bg-green-900/30 text-green-400 border-green-800';
      case 'cancelled': return 'bg-red-900/30 text-red-400 border-red-800';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'processing': return <Loader2 size={14} />; 
      case 'shipped': return <Truck size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  // --- LOGIC MODAL RETUR ---
  const openReturnModal = (order: Order) => {
      setSelectedOrderForReturn(order);
      const initialQty: Record<string, number> = {};
      order.items.forEach(item => { initialQty[item.id] = 0; });
      setReturnQuantities(initialQty);
      setIsReturnModalOpen(true);
  };

  const handleReturnQtyChange = (itemId: string, val: number, max: number) => {
      if (val < 0) val = 0;
      if (val > max) val = max;
      setReturnQuantities(prev => ({ ...prev, [itemId]: val }));
  };

  const submitReturn = () => {
      if (!selectedOrderForReturn) return;
      const itemsToReturn = Object.entries(returnQuantities)
          .filter(([_, qty]) => qty > 0)
          .map(([itemId, qty]) => ({ itemId, qty }));
      
      if (itemsToReturn.length === 0) {
          alert("Pilih minimal 1 barang untuk diretur.");
          return;
      }

      onProcessReturn(selectedOrderForReturn.id, itemsToReturn);
      setIsReturnModalOpen(false);
      setSelectedOrderForReturn(null);
  };

  return (
    <div className="p-4 md:p-6 pb-24 max-w-7xl mx-auto font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-blue-500" /> Manajemen Pesanan
          </h1>
          <p className="text-gray-400 text-sm mt-1">Kelola status pesanan dan retur barang</p>
        </div>
        
        {/* REFRESH INDICATOR / BUTTON */}
        <div className="flex items-center gap-3">
            {isLoading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 text-blue-400 rounded-full border border-blue-900/50 animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs font-medium">Sinkronisasi Data...</span>
                </div>
            )}
            {/* Tombol refresh manual (opsional, karena sudah ada di header global) */}
            <button onClick={onRefresh} disabled={isLoading} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-50">
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''}/>
            </button>
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Cari ID Pesanan, Nama Pelanggan, atau Barang..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-4 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer hover:bg-gray-750 transition-colors"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="processing">Diproses</option>
            <option value="shipped">Dikirim</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {isLoading && filteredOrders.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 size={40} className="animate-spin mb-4 text-blue-500"/>
                <p>Memuat Data Pesanan...</p>
             </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700">
            <Package size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">Tidak ada pesanan yang ditemukan</p>
            <p className="text-gray-600 text-sm">Coba ubah kata kunci pencarian atau filter</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all shadow-sm">
              
              {/* ORDER HEADER */}
              <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-gray-750 transition-colors" onClick={() => toggleExpand(order.id)}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-full ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'}`}>
                    <Package size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-lg truncate">{order.customerName}</span>
                      <span className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded border border-gray-700 font-mono">#{order.id.slice(0,8)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(order.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="hidden md:inline">•</span>
                      <span className="flex items-center gap-1"><Package size={12}/> {order.items.reduce((sum, i) => sum + i.cartQuantity, 0)} Barang</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                   <div className="text-right mr-2">
                      <div className="text-xs text-gray-400">Total Pesanan</div>
                      <div className="font-bold text-blue-400 text-lg">{formatRupiah(order.totalAmount)}</div>
                   </div>
                   
                   <div className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status === 'processing' ? 'Diproses' : order.status === 'pending' ? 'Menunggu' : order.status === 'completed' ? 'Selesai' : order.status === 'cancelled' ? 'Batal' : order.status}</span>
                   </div>
                   
                   {expandedOrderId === order.id ? <ChevronUp size={20} className="text-gray-500"/> : <ChevronDown size={20} className="text-gray-500"/>}
                </div>
              </div>

              {/* ORDER DETAILS (EXPANDABLE) */}
              {expandedOrderId === order.id && (
                <div className="border-t border-gray-700 bg-gray-900/30 p-4 md:p-6 animate-in slide-in-from-top-2">
                   
                   {/* TABEL ITEM */}
                   <div className="overflow-x-auto rounded-lg border border-gray-700 mb-6">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-800 text-gray-400 font-semibold uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3">Barang</th>
                            <th className="px-4 py-3 text-center">Jml</th>
                            <th className="px-4 py-3 text-right">Harga Satuan</th>
                            <th className="px-4 py-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-800/50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-white">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.partNumber}</div>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-gray-300">x{item.cartQuantity}</td>
                              <td className="px-4 py-3 text-right text-gray-400">{formatRupiah(item.customPrice || item.price)}</td>
                              <td className="px-4 py-3 text-right font-medium text-white">{formatRupiah((item.customPrice || item.price) * item.cartQuantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-800/80 font-bold">
                           <tr>
                              <td colSpan={3} className="px-4 py-3 text-right text-gray-300">Total Akhir</td>
                              <td className="px-4 py-3 text-right text-blue-400 text-base">{formatRupiah(order.totalAmount)}</td>
                           </tr>
                        </tfoot>
                      </table>
                   </div>

                   {/* ACTION BUTTONS */}
                   <div className="flex flex-wrap gap-3 justify-end">
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30 flex items-center gap-2 text-sm font-bold transition-colors">
                            <XCircle size={16}/> Tolak Pesanan
                          </button>
                          <button onClick={() => onUpdateStatus(order.id, 'processing')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20 transition-all">
                            <CheckCircle size={16}/> Terima & Proses
                          </button>
                        </>
                      )}

                      {order.status === 'processing' && (
                         <div className="flex gap-2">
                            <button onClick={() => onUpdateStatus(order.id, 'completed')} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white flex items-center gap-2 text-sm font-bold shadow-lg shadow-green-900/20 transition-all">
                              <CheckCircle size={16}/> Selesaikan Pesanan
                            </button>
                            <button onClick={() => openReturnModal(order)} className="px-4 py-2 rounded-lg border border-orange-700 text-orange-400 hover:bg-orange-900/30 flex items-center gap-2 text-sm font-bold transition-colors">
                              <RotateCcw size={16}/> Retur (Sebagian/Full)
                            </button>
                         </div>
                      )}
                      
                      {(order.status === 'completed' || order.status === 'cancelled') && (
                          <div className="flex items-center gap-2 text-gray-500 text-sm italic bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                              <AlertCircle size={14}/> Pesanan ini telah ditutup
                              {order.status === 'completed' && <button onClick={() => openReturnModal(order)} className="ml-2 text-orange-400 hover:underline font-bold not-italic">Ajukan Retur Susulan</button>}
                          </div>
                      )}
                   </div>

                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- MODAL RETUR BARANG --- */}
      {isReturnModalOpen && selectedOrderForReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                      <h3 className="font-bold text-white flex items-center gap-2"><RotateCcw className="text-orange-500"/> Proses Retur Barang</h3>
                      <button onClick={() => setIsReturnModalOpen(false)} className="text-gray-400 hover:text-white"><XCircle size={24}/></button>
                  </div>
                  
                  <div className="p-4 overflow-y-auto flex-1">
                      <div className="bg-orange-900/20 border border-orange-900/50 p-3 rounded-lg mb-4 text-xs text-orange-300 flex gap-2">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          <div>
                            <p className="font-bold mb-1">Perhatian:</p>
                            <p>Barang yang diretur akan <b>dikembalikan ke stok gudang</b>. Transaksi retur akan tercatat otomatis di history barang masuk.</p>
                          </div>
                      </div>

                      <div className="space-y-3">
                          {selectedOrderForReturn.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-gray-700/30 p-3 rounded-xl border border-gray-700">
                                  <div className="flex-1 min-w-0 pr-3">
                                      <div className="font-bold text-white text-sm truncate">{item.name}</div>
                                      <div className="text-xs text-gray-500">Dibeli: {item.cartQuantity} Unit</div>
                                  </div>
                                  <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-1 border border-gray-600">
                                      <button onClick={() => handleReturnQtyChange(item.id, (returnQuantities[item.id] || 0) - 1, item.cartQuantity)} className="p-1 hover:bg-gray-700 rounded text-gray-300"><ChevronDown size={16}/></button>
                                      <span className="text-white font-mono font-bold w-8 text-center">{returnQuantities[item.id] || 0}</span>
                                      <button onClick={() => handleReturnQtyChange(item.id, (returnQuantities[item.id] || 0) + 1, item.cartQuantity)} className="p-1 hover:bg-gray-700 rounded text-gray-300"><ChevronUp size={16}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl flex justify-end gap-3">
                      <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-medium text-sm">Batal</button>
                      <button onClick={submitReturn} className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-900/20 flex items-center gap-2">
                          <RotateCcw size={16}/> Konfirmasi Retur
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};