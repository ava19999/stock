// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle, Package, Truck, ClipboardList, RotateCcw, Edit3, ShoppingBag, Tag, Search, X, Store } from 'lucide-react';
import { formatRupiah } from '../utils';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [], onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
        const savedNotes = localStorage.getItem('stockmaster_order_notes');
        if (savedNotes) {
            setOrderNotes(JSON.parse(savedNotes));
        }
    } catch (e) {
        console.error("Gagal load notes", e);
    }
  }, []);

  useEffect(() => { setSearchTerm(''); }, [activeTab]);

  const handleNoteChange = (orderId: string, text: string) => {
      const newNotes = { ...orderNotes, [orderId]: text };
      setOrderNotes(newNotes);
      localStorage.setItem('stockmaster_order_notes', JSON.stringify(newNotes));
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = useMemo(() => {
    return safeOrders.filter(o => {
      if (!o) return false;
      let matchesTab = false;
      if (activeTab === 'pending') matchesTab = o.status === 'pending';
      if (activeTab === 'processing') matchesTab = o.status === 'processing';
      if (activeTab === 'history') matchesTab = o.status === 'completed' || o.status === 'cancelled';
      if (!matchesTab) return false;

      if ((activeTab === 'processing' || activeTab === 'history') && searchTerm.trim() !== '') {
          const lowerSearch = searchTerm.toLowerCase();
          return (
              o.id.toLowerCase().includes(lowerSearch) ||
              o.customerName.toLowerCase().includes(lowerSearch) ||
              o.items.some(item => item.name.toLowerCase().includes(lowerSearch))
          );
      }
      return true;
    }).sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        if (activeTab !== 'history') return timeA - timeB; 
        return timeB - timeA; 
    });
  }, [safeOrders, activeTab, searchTerm]);

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
      if (status === 'cancelled') return 'RETUR';
      if (status === 'processing') return 'TERJUAL';
      if (status === 'pending') return 'BARU';
      if (status === 'completed') return 'SELESAI';
      return status;
  };

  const getOrderDetails = (order: Order) => {
      let cleanName = order.customerName || 'Tanpa Nama';
      let orderId = order.id || '???';
      let resiText = `#${orderId.slice(0, 8)}`;
      let isResi = false;
      let ecommerce = '-';
      let shopName = '-';

      try {
          const resiMatch = cleanName.match(/\(Resi: (.*?)\)/);
          if (resiMatch && resiMatch[1]) {
              resiText = resiMatch[1];
              isResi = true;
              cleanName = cleanName.replace(/\s*\(Resi:.*?\)/, '');
          }
          const shopMatch = cleanName.match(/\(Toko: (.*?)\)/);
          if (shopMatch && shopMatch[1]) {
              shopName = shopMatch[1];
              cleanName = cleanName.replace(/\s*\(Toko:.*?\)/, '');
          }
          const viaMatch = cleanName.match(/\(Via: (.*?)\)/);
          if (viaMatch && viaMatch[1]) {
              ecommerce = viaMatch[1];
              cleanName = cleanName.replace(/\s*\(Via:.*?\)/, '');
          }
      } catch (e) { console.error("Error parsing name", e); }

      return { cleanName: cleanName.trim(), resiText, isResi, ecommerce, shopName };
  };

  const formatDate = (ts: number) => {
      try {
          const date = new Date(ts || Date.now());
          return {
              date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
      } catch (e) { return { date: '-', time: '-' }; }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[80vh] flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-white flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="text-purple-600" /> Manajemen Pesanan</h2>
            <p className="text-xs text-gray-500 mt-1">Kelola pesanan masuk dan pengiriman barang.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
              { id: 'pending', label: 'Pesanan Baru', icon: Clock, count: safeOrders.filter(o=>o?.status==='pending').length, color: 'text-amber-600' },
              { id: 'processing', label: 'Terjual', icon: Package, count: safeOrders.filter(o=>o?.status==='processing').length, color: 'text-blue-600' },
              { id: 'history', label: 'Riwayat', icon: CheckCircle, count: 0, color: 'text-gray-600' }
          ].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-white relative ${activeTab === tab.id ? `border-purple-600 text-purple-700 bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  <tab.icon size={18} className={activeTab === tab.id ? tab.color : ''} /><span>{tab.label}</span>{tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{tab.count}</span>}
              </button>
          ))}
      </div>

      {(activeTab === 'processing' || activeTab === 'history') && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top-2">
              <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Cari Resi, Nama Pembeli, atau E-Commerce..." className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>{searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>)}
              </div>
          </div>
      )}
      
      <div className="flex-1 overflow-x-auto p-4 bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-w-[1200px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="p-4 w-32">Tanggal</th>
                        <th className="p-4 w-40">Resi / Tempo</th>
                        <th className="p-4 w-32">E-Commerce</th> 
                        <th className="p-4 w-40">Pelanggan</th>
                        <th className="p-4 w-32">No. Part</th>
                        <th className="p-4">Nama Barang</th>
                        <th className="p-4 text-right w-20">Qty</th>
                        <th className="p-4 text-right w-32">Harga Satuan</th>
                        <th className="p-4 text-right w-32">Total</th>
                        <th className="p-4 text-center w-32">Status</th>
                        <th className="p-4 text-center w-48">{activeTab === 'history' ? 'Keterangan' : 'Aksi'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length === 0 ? (
                        <tr><td colSpan={11} className="p-12 text-center text-gray-400"><ClipboardList size={48} className="opacity-20 mx-auto mb-3" /><p className="font-medium">{searchTerm ? 'Tidak ditemukan pesanan yang cocok' : 'Tidak ada data pesanan'}</p></td></tr>
                    ) : (
                        filteredOrders.map(order => {
                            if (!order) return null;
                            const { cleanName, resiText, isResi, ecommerce, shopName } = getOrderDetails(order);
                            const dt = formatDate(order.timestamp);
                            const items = Array.isArray(order.items) ? order.items : [];
                            if (items.length === 0) return null;

                            return items.map((item, index) => {
                                const dealPrice = item.customPrice ?? item.price ?? 0;
                                const dealTotal = dealPrice * (item.cartQuantity || 0);
                                const hasCustomPrice = item.customPrice !== undefined && item.customPrice !== item.price;

                                return (
                                <tr key={`${order.id}-${index}`} className="hover:bg-blue-50/30 transition-colors group">
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={items.length} className="p-4 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                <div className="font-bold text-gray-900">{dt.date}</div><div className="text-xs text-gray-500 font-mono mt-0.5">{dt.time}</div>
                                            </td>
                                            
                                            <td rowSpan={items.length} className="p-4 align-top border-r border-gray-100 font-mono text-xs bg-white group-hover:bg-blue-50/30">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`block px-2 py-1 rounded w-fit font-bold ${isResi ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-gray-500 bg-gray-50'}`}>
                                                        {resiText}
                                                    </span>
                                                    {shopName !== '-' && (
                                                        <div className="flex items-center gap-1.5 text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit border border-gray-200 shadow-sm">
                                                            <Store size={10} className="text-gray-500" />
                                                            <span className="font-bold text-[10px] uppercase truncate max-w-[120px]" title={shopName}>{shopName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td rowSpan={items.length} className="p-4 align-top border-r border-gray-100 font-medium bg-white group-hover:bg-blue-50/30 text-gray-600">
                                                {ecommerce !== '-' ? (<div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-100 w-fit"><ShoppingBag size={12} /><span className="text-xs font-bold">{ecommerce}</span></div>) : (<span className="text-gray-300">-</span>)}
                                            </td>
                                            <td rowSpan={items.length} className="p-4 align-top border-r border-gray-100 font-medium text-gray-900 bg-white group-hover:bg-blue-50/30">{cleanName}</td>
                                        </>
                                    )}
                                    <td className="p-4 align-top font-mono text-xs text-gray-500">{item.partNumber || '-'}</td>
                                    <td className="p-4 align-top text-gray-700 font-medium max-w-[250px]">{item.name || 'Item Tanpa Nama'}</td>
                                    <td className="p-4 align-top text-right font-bold text-gray-800">{item.cartQuantity || 0}</td>
                                    <td className="p-4 align-top text-right text-gray-500 font-mono text-xs"><div className={hasCustomPrice ? "text-orange-600 font-bold" : ""}>{formatRupiah(dealPrice)}</div>{hasCustomPrice && (<div className="flex items-center justify-end gap-1 text-[9px] text-orange-500 mt-0.5"><Tag size={8}/> Khusus</div>)}</td>
                                    <td className="p-4 align-top text-right font-bold text-gray-900 font-mono text-xs">{formatRupiah(dealTotal)}</td>
                                    {index === 0 && (
                                        <>
                                            <td rowSpan={items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                {/* UPDATED: Status 'TERJUAL' lebih besar */}
                                                <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold border uppercase tracking-wider mb-2 shadow-sm ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">Total Order:</div><div className="text-sm font-extrabold text-purple-700">{formatRupiah(order.totalAmount || 0)}</div>
                                            </td>
                                            <td rowSpan={items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                {activeTab === 'history' ? (
                                                    <div className="relative group/note"><textarea className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none min-h-[60px] transition-all" placeholder="Tambah keterangan..." value={orderNotes[order.id] || ''} onChange={(e) => handleNoteChange(order.id, e.target.value)} /><div className="absolute top-2 right-2 text-gray-300 pointer-events-none group-focus-within/note:text-blue-300"><Edit3 size={10} /></div></div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 items-center">
                                                        {order.status === 'pending' && (<><button onClick={() => onUpdateStatus(order.id, 'processing')} className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-1"><Package size={12} /> Proses</button><button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="w-full py-1.5 bg-white border border-gray-300 text-gray-600 text-[10px] font-bold rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">Tolak</button></>)}
                                                        
                                                        {/* UPDATED: Hanya Tombol Retur (Kecil) */}
                                                        {order.status === 'processing' && (
                                                            <button 
                                                                onClick={() => onUpdateStatus(order.id, 'cancelled')} 
                                                                className="w-2/3 py-1 bg-orange-50 border border-orange-200 text-orange-600 text-[9px] font-bold rounded hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <RotateCcw size={10} /> Retur
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                                );
                            });
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};