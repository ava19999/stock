import React from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle, XCircle, Package, Truck, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders, onUpdateStatus }) => {
  // Sort orders: Pending first, then by date (newest first)
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return b.timestamp - a.timestamp;
  });

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Menunggu Konfirmasi';
      case 'processing': return 'Diproses / Dikemas';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
        <Package size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Belum Ada Pesanan</h3>
        <p className="text-gray-500">Pesanan dari pelanggan akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Truck className="mr-2" /> Daftar Pesanan Masuk
      </h2>
      
      {sortedOrders.map((order) => (
        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
          {/* Header Order */}
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-gray-50/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(order.status)} uppercase tracking-wide flex items-center`}>
                   {order.status === 'pending' && <Clock size={10} className="mr-1" />}
                   {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <User size={14} className="text-gray-400" />
                {order.customerName}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <Calendar size={12} />
                {new Date(order.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
            
            <div className="flex flex-col items-end">
               <span className="text-xs text-gray-500">Total Pesanan</span>
               <span className="text-lg font-bold text-blue-600">{formatRupiah(order.totalAmount)}</span>
            </div>
          </div>

          {/* Item List */}
          <div className="p-4 bg-white">
            <ul className="divide-y divide-gray-100">
              {order.items.map((item, idx) => (
                <li key={idx} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.partNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">x{item.cartQuantity}</p>
                    <p className="text-xs text-gray-500">{formatRupiah(item.price * item.cartQuantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => onUpdateStatus(order.id, 'cancelled')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center"
                >
                  <XCircle size={14} className="mr-1.5" />
                  Tolak Pesanan
                </button>
                <button
                  onClick={() => onUpdateStatus(order.id, 'processing')}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center"
                >
                  <Package size={14} className="mr-1.5" />
                  Proses Pesanan
                </button>
              </>
            )}

            {order.status === 'processing' && (
              <button
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shadow-sm transition-colors flex items-center"
              >
                <CheckCircle size={14} className="mr-1.5" />
                Selesai (Barang Diambil)
              </button>
            )}

             {/* Status final view */}
             {(order.status === 'completed' || order.status === 'cancelled') && (
                <span className="text-xs text-gray-400 italic px-2">
                   Pesanan telah {order.status === 'completed' ? 'selesai' : 'dibatalkan'}
                </span>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};