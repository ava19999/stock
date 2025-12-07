// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle, Package, Truck, ClipboardList, RotateCcw, Edit3 } from 'lucide-react';
import { formatRupiah } from '../utils';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');
  
  // State untuk menyimpan catatan/keterangan (Persisted di LocalStorage)
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});

  // Load notes dari local storage saat component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('stockmaster_order_notes');
    if (savedNotes) {
        try {
            setOrderNotes(JSON.parse(savedNotes));
        } catch (e) {
            console.error("Gagal load notes", e);
        }
    }
  }, []);

  // Handler untuk menyimpan note
  const handleNoteChange = (orderId: string, text: string) => {
      const newNotes = { ...orderNotes, [orderId]: text };
      setOrderNotes(newNotes);
      localStorage.setItem('stockmaster_order_notes', JSON.stringify(newNotes));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'pending') return o.status === 'pending';
      if (activeTab === 'processing') return o.status === 'processing';
      if (activeTab === 'history') return o.status === 'completed' || o.status === 'cancelled';
      return false;
    }).sort((a, b) => {
        // Sort pending dan processing berdasarkan yang terlama (FIFO)
        if (activeTab !== 'history') return a.timestamp - b.timestamp; 
        // History berdasarkan terbaru (LIFO)
        return b.timestamp - a.timestamp; 
    });
  }, [orders, activeTab]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'; // Warna merah untuk Retur
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper untuk menampilkan teks status (Cancelled -> RETUR)
  const getStatusLabel = (status: OrderStatus) => {
      if (status === 'cancelled') return 'RETUR';
      return status;
  };

  const getResiOrId = (order: Order) => {
      const match = order.customerName.match(/\(Resi: (.*?)\)/);
      if (match && match[1]) {
          return { text: match[1], isResi: true };
      }
      return { text: `#${order.id.slice(0, 8)}`, isResi: false };
  };

  const getCleanName = (name: string) => {
      return name.replace(/\s*\(Resi:.*?\)/, '');
  };

  const formatDate = (ts: number) => {
      const date = new Date(ts);
      return {
          date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[80vh] flex flex-col overflow-hidden">
      
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
      
      {/* Table View */}
      <div className="flex-1 overflow-x-auto p-4 bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-w-[1000px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 w-32">Tanggal</th>
                        <th className="p-4 w-32">Resi / ID</th>
                        <th className="p-4 w-40">Pelanggan</th>
                        <th className="p-4 w-32">No. Part</th>
                        <th className="p-4">Nama Barang</th>
                        <th className="p-4 text-right w-20">Qty</th>
                        <th className="p-4 text-right w-32">Harga</th>
                        <th className="p-4 text-right w-32">Total</th>
                        <th className="p-4 text-center w-32">Status</th>
                        {/* Header Berubah Sesuai Tab */}
                        <th className="p-4 text-center w-48">
                            {activeTab === 'history' ? 'Keterangan' : 'Aksi'}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="p-12 text-center text-gray-400">
                                <ClipboardList size={48} className="opacity-20 mx-auto mb-3" />
                                <p className="font-medium">Tidak ada data pesanan</p>
                            </td>
                        </tr>
                    ) : (
                        filteredOrders.map(order => {
                            const { text: resi, isResi } = getResiOrId(order);
                            const cleanName = isResi ? getCleanName(order.customerName) : order.customerName;
                            const dt = formatDate(order.timestamp);

                            return order.items.map((item, index) => (
                                <tr key={`${order.id}-${index}`} className="hover:bg-blue-50/30 transition-colors group">
                                    {/* Kolom yang digabung (Merged Rows) untuk info Order */}
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={order.items.length} className="p-4 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                <div className="font-bold text-gray-900">{dt.date}</div>
                                                <div className="text-xs text-gray-500 font-mono mt-0.5">{dt.time}</div>
                                            </td>
                                            <td rowSpan={order.items.length} className="p-4 align-top border-r border-gray-100 font-mono text-xs bg-white group-hover:bg-blue-50/30">
                                                <span className={`block px-2 py-1 rounded w-fit ${isResi ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' : 'text-gray-500 bg-gray-50'}`}>
                                                    {resi}
                                                </span>
                                            </td>
                                            <td rowSpan={order.items.length} className="p-4 align-top border-r border-gray-100 font-medium text-gray-900 bg-white group-hover:bg-blue-50/30">
                                                {cleanName}
                                            </td>
                                        </>
                                    )}
                                    
                                    {/* Kolom Detail Item */}
                                    <td className="p-4 align-top font-mono text-xs text-gray-500">{item.partNumber}</td>
                                    <td className="p-4 align-top text-gray-700 font-medium max-w-[250px]">{item.name}</td>
                                    <td className="p-4 align-top text-right font-bold text-gray-800">{item.cartQuantity}</td>
                                    <td className="p-4 align-top text-right text-gray-500 font-mono text-xs">{formatRupiah(item.price)}</td>
                                    <td className="p-4 align-top text-right font-bold text-gray-900 font-mono text-xs">{formatRupiah(item.price * item.cartQuantity)}</td>

                                    {/* Kolom Status & Aksi/Keterangan (Merged) */}
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={order.items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                <div className={`inline-block px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide mb-2 ${getStatusColor(order.status)}`}>
                                                    {getStatusLabel(order.status)}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium">Total Order:</div>
                                                <div className="text-sm font-extrabold text-purple-700">{formatRupiah(order.totalAmount)}</div>
                                            </td>
                                            <td rowSpan={order.items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                
                                                {/* Logic Tampilan Berdasarkan Tab */}
                                                {activeTab === 'history' ? (
                                                    // Tampilan KETERANGAN (Editable)
                                                    <div className="relative group/note">
                                                        <textarea 
                                                            className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none min-h-[60px] transition-all"
                                                            placeholder="Tambah keterangan..."
                                                            value={orderNotes[order.id] || ''}
                                                            onChange={(e) => handleNoteChange(order.id, e.target.value)}
                                                        />
                                                        <div className="absolute top-2 right-2 text-gray-300 pointer-events-none group-focus-within/note:text-blue-300">
                                                            <Edit3 size={10} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Tampilan AKSI (Tombol)
                                                    <div className="flex flex-col gap-2">
                                                        {order.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => onUpdateStatus(order.id, 'processing')}
                                                                    className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-1"
                                                                >
                                                                    <Package size={12} /> Proses
                                                                </button>
                                                                <button
                                                                    onClick={() => onUpdateStatus(order.id, 'cancelled')}
                                                                    className="w-full py-1.5 bg-white border border-gray-300 text-gray-600 text-[10px] font-bold rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                                >
                                                                    Tolak
                                                                </button>
                                                            </>
                                                        )}
                                                        {order.status === 'processing' && (
                                                            <>
                                                                <button
                                                                    onClick={() => onUpdateStatus(order.id, 'completed')}
                                                                    className="w-full py-1.5 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700 shadow-sm transition-all flex items-center justify-center gap-1"
                                                                >
                                                                    <Truck size={12} /> Selesai
                                                                </button>
                                                                <button
                                                                    onClick={() => onUpdateStatus(order.id, 'cancelled')}
                                                                    className="w-full py-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-bold rounded hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
                                                                >
                                                                    <RotateCcw size={12} /> Retur
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ));
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};