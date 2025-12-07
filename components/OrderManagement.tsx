// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle, XCircle, Package, Truck, User, Calendar, ClipboardList, ChevronRight } from 'lucide-react';
import { formatRupiah } from '../utils';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'pending') return o.status === 'pending';
      if (activeTab === 'processing') return o.status === 'processing';
      if (activeTab === 'history') return o.status === 'completed' || o.status === 'cancelled';
      return false;
    }).sort((a, b) => {
        // Sort pending dan processing berdasarkan yang terlama (biar cepat diproses)
        if (activeTab !== 'history') return a.timestamp - b.timestamp; 
        // History berdasarkan terbaru
        return b.timestamp - a.timestamp; 
    });
  }, [orders, activeTab]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[80vh] flex flex-col">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
           <ClipboardList className="text-purple-600" />
           Manajemen Pesanan
        </h2>
        <p className="text-xs text-gray-500 mt-1">Kelola pesanan masuk dan pengiriman barang.</p>
      </div>

      {/* Tabs Navigasi */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
              { id: 'pending', label: 'Pesanan Baru', icon: Clock, count: orders.filter(o=>o.status==='pending').length, color: 'text-amber-600' },
              { id: 'processing', label: 'Siap Dikirim', icon: Package, count: orders.filter(o=>o.status==='processing').length, color: 'text-blue-600' },
              { id: 'history', label: 'Riwayat', icon: CheckCircle, count: 0, color: 'text-gray-600' }
          ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-white relative
                    ${activeTab === tab.id ? `border-purple-600 text-purple-700 bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}
                `}
              >
                  <tab.icon size={18} className={activeTab === tab.id ? tab.color : ''} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{tab.count}</span>}
              </button>
          ))}
      </div>
      
      {/* Order List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {filteredOrders.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
             <ClipboardList size={48} className="opacity-20 mb-3" />
             <p className="text-sm font-medium">Tidak ada data pesanan</p>
           </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden hover:border-purple-200 transition-all">
              {/* Header Card */}
              <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(order.status)} uppercase tracking-wide flex items-center`}>
                       {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <User size={16} className="text-gray-400" />
                    {order.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Calendar size={12} />
                    {new Date(order.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <span className="text-xs text-gray-500">Total Nilai</span>
                   <span className="text-lg font-extrabold text-purple-700">{formatRupiah(order.totalAmount)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="p-4 bg-gray-50/30">
                <ul className="space-y-2">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-200 text-gray-600 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">{item.cartQuantity}x</div>
                        <div className="flex flex-col">
                           <span className="font-medium text-gray-700 line-clamp-1">{item.name}</span>
                           <span className="text-[10px] text-gray-400">{item.partNumber}</span>
                        </div>
                      </div>
                      <span className="font-medium text-gray-600">{formatRupiah(item.price * item.cartQuantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              {activeTab !== 'history' && (
                <div className="p-3 bg-white border-t border-gray-100 flex gap-2 justify-end">
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'cancelled')}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => onUpdateStatus(order.id, 'processing')}
                        className="px-5 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 shadow-sm transition-all flex items-center"
                      >
                        <Package size={14} className="mr-2" />
                        Proses Pesanan
                      </button>
                    </>
                  )}

                  {order.status === 'processing' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="px-5 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shadow-sm transition-all flex items-center"
                    >
                      <Truck size={14} className="mr-2" />
                      Selesaikan (Barang Dikirim/Diambil)
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};