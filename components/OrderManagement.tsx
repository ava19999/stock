// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, ReturRecord } from '../types';
import { Clock, CheckCircle, Package, ClipboardList, RotateCcw, Edit3, ShoppingBag, Tag, Search, X, Store, Save, Loader, Calendar } from 'lucide-react';
import { formatRupiah } from '../utils';
import { updateInventory, updateOrderData, saveOrder, addReturTransaction, updateReturKeterangan, fetchReturRecords } from '../services/supabaseService';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onProcessReturn: (orderId: string, returnedItems: { itemId: string, qty: number }[]) => void;
  onRefresh?: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [], onUpdateStatus, onProcessReturn, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [returDbRecords, setReturDbRecords] = useState<ReturRecord[]>([]);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // FETCH DATA RETUR UNTUK DITAMPILKAN (KETERANGAN & TANGGAL RETUR)
  useEffect(() => {
      if (activeTab === 'history') {
          fetchReturRecords().then(records => {
              setReturDbRecords(records);
              
              const dbNotes: Record<string, string> = {};
              orders.forEach(order => {
                  const { resiText } = getOrderDetails(order);
                  const foundRetur = records.find(r => r.resi === resiText);
                  if (foundRetur && foundRetur.keterangan) {
                      dbNotes[order.id] = foundRetur.keterangan;
                  }
              });
              setLocalNotes(prev => ({...prev, ...dbNotes}));
          });
      }
  }, [activeTab, orders]);

  useEffect(() => { setSearchTerm(''); }, [activeTab]);

  const handleNoteChange = (orderId: string, text: string) => {
      setLocalNotes(prev => ({ ...prev, [orderId]: text }));
  };

  const handleNoteSave = async (order: Order) => {
      const newNote = localNotes[order.id];
      if (newNote !== undefined) {
          const { resiText } = getOrderDetails(order);
          await updateReturKeterangan(resiText, newNote);
      }
  };

  const openReturnModal = (order: Order) => {
      setSelectedOrderForReturn(order);
      const initialQty: Record<string, number> = {};
      order.items.forEach(item => { initialQty[item.id] = 0; });
      setReturnQuantities(initialQty);
      setIsReturnModalOpen(true);
  };

  const getOrderDetails = (order: Order) => {
      let cleanName = order.customerName || 'Tanpa Nama';
      let orderId = order.id || '???';
      let resiText = `#${orderId.slice(0, 8)}`;
      let ecommerce = '-';
      let shopName = '-';

      try {
          const resiMatch = cleanName.match(/\(Resi: (.*?)\)/);
          if (resiMatch && resiMatch[1]) {
              resiText = resiMatch[1];
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
          cleanName = cleanName.replace(/\(RETUR\)/i, ''); 

      } catch (e) { console.error("Error parsing name", e); }

      return { cleanName: cleanName.trim(), resiText, ecommerce, shopName };
  };

  const handleProcessReturn = async () => {
      if (!selectedOrderForReturn) return;

      const itemsToReturnData = selectedOrderForReturn.items
        .map(item => {
            const qtyRetur = returnQuantities[item.id] || 0;
            if (qtyRetur > 0) {
                return { ...item, cartQuantity: qtyRetur };
            }
            return null;
        })
        .filter(Boolean) as any[];

      if (itemsToReturnData.length === 0) {
          alert("Pilih minimal 1 barang untuk diretur.");
          return;
      }

      setIsLoading(true);

      try {
        const { resiText, shopName, ecommerce, cleanName } = getOrderDetails(selectedOrderForReturn);
        const combinedResiShop = `${resiText} / ${shopName}`;

        for (const item of itemsToReturnData) {
            const hargaSatuan = item.customPrice ?? item.price ?? 0;
            const totalRetur = hargaSatuan * item.cartQuantity;

            await updateInventory({
                ...item,
                quantity: item.quantity 
            }, {
                type: 'in',
                qty: item.cartQuantity,
                ecommerce: ecommerce, 
                resiTempo: combinedResiShop, 
                customer: cleanName, 
                price: hargaSatuan, 
                isReturn: true 
            });

            const returData: ReturRecord = {
                tanggal_pemesanan: new Date(selectedOrderForReturn.timestamp).toISOString(), 
                resi: resiText,
                toko: shopName,
                ecommerce: ecommerce,
                customer: cleanName,
                part_number: item.partNumber,
                nama_barang: item.name,
                quantity: item.cartQuantity,
                harga_satuan: hargaSatuan,
                harga_total: totalRetur,
                tanggal_retur: new Date().toISOString(),
                status: 'Diterima',
                keterangan: 'Retur Barang'
            };

            await addReturTransaction(returData);
        }

        const remainingItems = selectedOrderForReturn.items.map(item => {
            const returItem = itemsToReturnData.find(r => r.id === item.id);
            if (returItem) {
                const newQty = (item.cartQuantity || 0) - returItem.cartQuantity;
                return { ...item, cartQuantity: newQty };
            }
            return item;
        }).filter(item => (item.cartQuantity || 0) > 0);

        if (remainingItems.length === 0) {
            await updateOrderData(
                selectedOrderForReturn.id,
                selectedOrderForReturn.items,
                selectedOrderForReturn.totalAmount,
                'cancelled'
            );
            alert('Retur Berhasil! Stok fisik dikembalikan dan riwayat tercatat.');
        } else {
            const returnTotal = itemsToReturnData.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            
            const newReturnOrder: Order = {
                id: `${selectedOrderForReturn.id}-RET`,
                customerName: `${selectedOrderForReturn.customerName} (RETUR)`,
                items: itemsToReturnData,
                totalAmount: returnTotal,
                status: 'cancelled',
                timestamp: Date.now()
            };
            await saveOrder(newReturnOrder);

            const remainingTotal = remainingItems.reduce((sum, item) => sum + ((item.customPrice ?? item.price ?? 0) * item.cartQuantity), 0);
            await updateOrderData(
                selectedOrderForReturn.id,
                remainingItems,
                remainingTotal,
                'processing'
            );
            alert('Retur Sebagian Berhasil! Stok fisik dikembalikan.');
        }

        setIsReturnModalOpen(false);
        setSelectedOrderForReturn(null);
        if (onRefresh) onRefresh();
        else window.location.reload();

      } catch (error) {
          console.error("Error processing return:", error);
          alert("Terjadi kesalahan saat memproses retur.");
      } finally {
          setIsLoading(false);
      }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = useMemo(() => {
    return safeOrders.filter(o => {
      if (!o) return false;
      if (activeTab === 'pending') return o.status === 'pending';
      if (activeTab === 'processing') return o.status === 'processing';
      if (activeTab === 'history') return o.status === 'completed' || o.status === 'cancelled';
      return false;
    }).filter(o => {
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
      if (status === 'cancelled') return 'RETUR / BATAL';
      if (status === 'completed') return 'SELESAI';
      if (status === 'processing') return 'TERJUAL';
      if (status === 'pending') return 'BARU';
      return status;
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[80vh] flex flex-col overflow-hidden relative">
      {/* MODAL RETUR */}
      {isReturnModalOpen && selectedOrderForReturn && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90%]">
                  <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2"><RotateCcw size={20}/> Form Retur Barang</h3>
                      <button onClick={() => setIsReturnModalOpen(false)}><X size={20} className="text-orange-400 hover:text-orange-600"/></button>
                  </div>
                  <div className="p-6 overflow-y-auto">
                      <div className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          Pilih jumlah barang yang dikembalikan.<br/>
                          <span className="text-orange-600 font-bold">• Data retur akan disimpan ke tabel khusus 'Retur'.</span><br/>
                          <span className="text-blue-600 font-bold">• Stok fisik gudang akan bertambah otomatis.</span>
                      </div>
                      <div className="space-y-3">
                          {selectedOrderForReturn.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-orange-200 transition-colors">
                                  <div className="flex-1">
                                      <div className="font-bold text-gray-800 text-sm">{item.name}</div>
                                      <div className="text-xs text-gray-500 font-mono">{item.partNumber}</div>
                                      <div className="text-xs text-blue-600 font-semibold mt-1">Dibeli: {item.cartQuantity} unit</div>
                                  </div>
                                  <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                                      <button 
                                          onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))}
                                          className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-red-50 text-gray-600 font-bold"
                                      >-</button>
                                      <div className="w-8 text-center font-bold text-lg text-gray-800">{returnQuantities[item.id] || 0}</div>
                                      <button 
                                          onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.min(item.cartQuantity || 0, (prev[item.id] || 0) + 1)}))}
                                          className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 hover:bg-green-50 text-gray-600 font-bold"
                                      >+</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                      <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Batal</button>
                      <button 
                        onClick={handleProcessReturn} 
                        disabled={isLoading}
                        className="px-6 py-2 text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isLoading ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>} Simpan Retur
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER TABEL */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="text-purple-600" /> Manajemen Pesanan</h2>
            <p className="text-xs text-gray-500 mt-1">Kelola pesanan masuk dan pengiriman barang.</p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
              { id: 'pending', label: 'Pesanan Baru', icon: Clock, count: safeOrders.filter(o=>o?.status==='pending').length, color: 'text-amber-600' },
              { id: 'processing', label: 'Terjual', icon: Package, count: 0, color: 'text-blue-600' }, 
              { id: 'history', label: 'Retur', icon: CheckCircle, count: 0, color: 'text-gray-600' }
          ].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-white relative ${activeTab === tab.id ? `border-purple-600 text-purple-700 bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  <tab.icon size={18} className={activeTab === tab.id ? tab.color : ''} /><span>{tab.label}</span>{tab.count > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{tab.count}</span>}
              </button>
          ))}
      </div>

      {/* SEARCH BAR */}
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
                        {/* KOLOM BARU: TANGGAL RETUR */}
                        {activeTab === 'history' && <th className="p-4 w-32 text-center text-red-600">Tanggal Retur</th>}
                        <th className="p-4 text-center w-32">Status</th>
                        <th className="p-4 text-center w-48">{activeTab === 'history' ? 'Keterangan' : 'Aksi'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length === 0 ? (
                        <tr><td colSpan={12} className="p-12 text-center text-gray-400"><ClipboardList size={48} className="opacity-20 mx-auto mb-3" /><p className="font-medium">{searchTerm ? 'Tidak ditemukan pesanan yang cocok' : 'Tidak ada data pesanan'}</p></td></tr>
                    ) : (
                        filteredOrders.map(order => {
                            if (!order) return null;
                            const { cleanName, resiText, ecommerce, shopName } = getOrderDetails(order);
                            const isResi = resiText.startsWith('#') === false;
                            const dt = formatDate(order.timestamp);
                            const items = Array.isArray(order.items) ? order.items : [];
                            if (items.length === 0) return null;

                            // LOGIC AMBIL TANGGAL RETUR
                            let returnDateDisplay = '-';
                            if (activeTab === 'history') {
                                const returRecord = returDbRecords.find(r => r.resi === resiText);
                                if (returRecord && returRecord.tanggal_retur) {
                                    const d = new Date(returRecord.tanggal_retur);
                                    returnDateDisplay = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: '2-digit'});
                                }
                            }

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
                                            {/* KOLOM TANGGAL RETUR */}
                                            {activeTab === 'history' && (
                                                <td rowSpan={items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                    {returnDateDisplay !== '-' ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="bg-red-50 text-red-700 px-2 py-1 rounded-lg border border-red-100 flex items-center gap-1 w-fit">
                                                                <Calendar size={10}/> <span className="text-[10px] font-bold">{returnDateDisplay}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            )}

                                            <td rowSpan={items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                <div className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider mb-2 shadow-sm ${getStatusColor(order.status)}`}>
                                                    {order.status === 'cancelled' 
                                                        ? (order.id.endsWith('-RET') ? 'RETUR SEBAGIAN' : 'FULL RETUR')
                                                        : getStatusLabel(order.status)
                                                    }
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-medium">Total Order:</div><div className="text-sm font-extrabold text-purple-700">{formatRupiah(order.totalAmount || 0)}</div>
                                            </td>
                                            <td rowSpan={items.length} className="p-4 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/30">
                                                {activeTab === 'history' ? (
                                                    <div className="relative group/note">
                                                        <textarea 
                                                            className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none min-h-[60px] transition-all" 
                                                            placeholder="Tambah keterangan..." 
                                                            value={localNotes[order.id] || ''} 
                                                            onChange={(e) => handleNoteChange(order.id, e.target.value)}
                                                            onBlur={() => handleNoteSave(order)} 
                                                        />
                                                        <div className="absolute top-2 right-2 text-gray-300 pointer-events-none group-focus-within/note:text-blue-300"><Edit3 size={10} /></div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 items-center">
                                                        {order.status === 'pending' && (<><button onClick={() => onUpdateStatus(order.id, 'processing')} className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-1"><Package size={12} /> Proses</button><button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="w-full py-1.5 bg-white border border-gray-300 text-gray-600 text-[10px] font-bold rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">Tolak</button></>)}
                                                        
                                                        {order.status === 'processing' && (
                                                            <button 
                                                                onClick={() => openReturnModal(order)} 
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