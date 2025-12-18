// FILE: src/components/OrderManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, ReturRecord } from '../types';
import { 
  Clock, CheckCircle, Package, ClipboardList, RotateCcw, Edit3, 
  ShoppingBag, Tag, Search, X, Store, Save, Loader, FileText, 
  AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { formatRupiah } from '../utils';
import { 
  updateInventory, 
  updateOrderData, 
  saveOrder, 
  addReturTransaction, 
  updateReturKeterangan, 
  fetchReturRecords, 
  getItemByPartNumber 
} from '../services/supabaseService';

interface OrderManagementProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onProcessReturn: (orderId: string, returnedItems: { itemId: string, qty: number }[]) => void;
  onRefresh?: () => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ orders = [], onUpdateStatus, onProcessReturn, onRefresh }) => {
  // Tab 'processing' kita mapping sebagai 'Terjual' di UI
  const [activeTab, setActiveTab] = useState<'pending' | 'processing' | 'history'>('processing'); // Default ke Terjual jika diinginkan, atau ubah ke 'pending'
  const [searchTerm, setSearchTerm] = useState('');
  
  // PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; 

  const [returDbRecords, setReturDbRecords] = useState<ReturRecord[]>([]);

  // State untuk Modal Retur Barang
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // State untuk Modal Edit Keterangan
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState<{ id: string, resi: string, currentText: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // FETCH DATA RETUR
  useEffect(() => {
      fetchReturRecords().then(records => {
          setReturDbRecords(records);
      });
  }, [activeTab, orders]);

  // Reset halaman ke 1 saat tab atau search berubah
  useEffect(() => { 
      setSearchTerm(''); 
      setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  // --- LOGIC EDIT KETERANGAN ---
  const openNoteModal = (retur: ReturRecord) => {
      setEditingNoteData({
          id: retur.id ? retur.id.toString() : '',
          resi: retur.resi || '',
          currentText: retur.keterangan || ''
      });
      setNoteText(retur.keterangan || '');
      setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
      if (!editingNoteData) return;
      setIsSavingNote(true);
      try {
          const success = await updateReturKeterangan(editingNoteData.resi, noteText);
          if (success) {
              setReturDbRecords(prev => prev.map(item => {
                  if ((item.id && item.id.toString() === editingNoteData.id) || item.resi === editingNoteData.resi) {
                      return { ...item, keterangan: noteText };
                  }
                  return item;
              }));
              setIsNoteModalOpen(false);
          } else {
              alert("Gagal menyimpan keterangan.");
          }
      } catch (error) {
          console.error("Error saving note:", error);
      } finally {
          setIsSavingNote(false);
      }
  };

  // --- LOGIC RETUR BARANG ---
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
            if (qtyRetur > 0) return { ...item, cartQuantity: qtyRetur };
            return null;
        })
        .filter(Boolean) as any[];

      if (itemsToReturnData.length === 0) return;
      setIsLoading(true);

      try {
        const { resiText, shopName, ecommerce, cleanName } = getOrderDetails(selectedOrderForReturn);
        const combinedResiShop = `${resiText} / ${shopName}`;
        const orderDate = new Date(selectedOrderForReturn.timestamp).toISOString();

        for (const item of itemsToReturnData) {
            const hargaSatuan = item.customPrice ?? item.price ?? 0;
            const totalRetur = hargaSatuan * item.cartQuantity;
            const realItem = await getItemByPartNumber(item.partNumber);
            if (realItem) {
                await updateInventory({
                    ...realItem,
                    quantity: realItem.quantity 
                }, {
                    type: 'in',
                    qty: item.cartQuantity,
                    ecommerce: ecommerce, 
                    resiTempo: combinedResiShop, 
                    customer: cleanName, 
                    price: hargaSatuan, 
                    isReturn: true 
                });
            }

            const originalItem = selectedOrderForReturn.items.find(i => i.id === item.id);
            const originalQty = originalItem ? originalItem.cartQuantity : 0;
            const statusRetur = item.cartQuantity === originalQty ? 'Full Retur' : 'Retur Sebagian';

            const returData: ReturRecord = {
                tanggal_pemesanan: orderDate,
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
                status: statusRetur,
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
            await updateOrderData(selectedOrderForReturn.id, selectedOrderForReturn.items, selectedOrderForReturn.totalAmount, 'cancelled');
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
            await updateOrderData(selectedOrderForReturn.id, remainingItems, remainingTotal, 'processing');
        }

        setIsReturnModalOpen(false);
        setSelectedOrderForReturn(null);
        setActiveTab('history');
        if (onRefresh) onRefresh();

      } catch (error) {
          console.error("Error processing return:", error);
      } finally {
          setIsLoading(false);
      }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  // 1. Filter Data
  const filteredData = useMemo(() => {
    if (activeTab === 'history') {
        return returDbRecords.filter(r => {
            if (!searchTerm) return true;
            const lower = searchTerm.toLowerCase();
            return (
                (r.resi && r.resi.toLowerCase().includes(lower)) ||
                (r.customer && r.customer.toLowerCase().includes(lower)) ||
                (r.nama_barang && r.nama_barang.toLowerCase().includes(lower))
            );
        }).sort((a, b) => new Date(b.tanggal_retur).getTime() - new Date(a.tanggal_retur).getTime());
    } else {
        return safeOrders.filter(o => {
            if (!o) return false;
            // MAPPING PENTING:
            // Tab 'pending' -> status 'pending' (Pesanan Baru)
            // Tab 'processing' -> status 'processing' (Terjual / Siap Kirim)
            if (activeTab === 'pending') return o.status === 'pending';
            if (activeTab === 'processing') return o.status === 'processing';
            return false;
        }).filter(o => {
            if (activeTab === 'processing' && searchTerm.trim() !== '') {
                const lowerSearch = searchTerm.toLowerCase();
                return (
                    o.id.toLowerCase().includes(lowerSearch) ||
                    o.customerName.toLowerCase().includes(lowerSearch) ||
                    o.items.some(item => item.name.toLowerCase().includes(lowerSearch))
                );
            }
            return true;
        }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Ascending untuk order (lama diatas)
    }
  }, [safeOrders, returDbRecords, activeTab, searchTerm]);

  // 2. Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200'; // Warna untuk TERJUAL
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
      if (status === 'cancelled') return 'RETUR / BATAL';
      if (status === 'completed') return 'SELESAI';
      if (status === 'processing') return 'TERJUAL'; // LABEL Processing = TERJUAL
      if (status === 'pending') return 'BARU';
      return status;
  };

  const formatDate = (ts: number | string) => {
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
      
      {/* MODAL & POPUP */}
      {isNoteModalOpen && editingNoteData && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                  <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex justify-between items-center">
                      <h3 className="text-base font-bold text-purple-800 flex items-center gap-2"><FileText size={18}/> Edit Keterangan</h3>
                      <button onClick={() => setIsNoteModalOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <div className="p-4">
                      <textarea 
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none text-sm min-h-[100px]"
                          placeholder="Masukkan alasan atau catatan..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                      />
                  </div>
                  <div className="p-3 border-t bg-gray-50 flex justify-end gap-2">
                      <button onClick={() => setIsNoteModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
                      <button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow flex items-center gap-2">
                        {isSavingNote ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Simpan
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isReturnModalOpen && selectedOrderForReturn && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90%]">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex justify-between items-center">
                      <h3 className="text-base font-bold text-orange-800 flex items-center gap-2"><RotateCcw size={18}/> Retur Barang</h3>
                      <button onClick={() => setIsReturnModalOpen(false)}><X size={18} className="text-orange-400 hover:text-orange-600"/></button>
                  </div>
                  <div className="p-4 overflow-y-auto text-sm">
                      <div className="space-y-2">
                          {selectedOrderForReturn.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:border-orange-200">
                                  <div className="flex-1">
                                      <div className="font-bold text-gray-800 text-xs">{item.name}</div>
                                      <div className="text-[10px] text-gray-500 font-mono">{item.partNumber}</div>
                                  </div>
                                  <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                      <button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1)}))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-red-50 text-gray-600 font-bold">-</button>
                                      <div className="w-6 text-center font-bold text-sm text-gray-800">{returnQuantities[item.id] || 0}</div>
                                      <button onClick={() => setReturnQuantities(prev => ({...prev, [item.id]: Math.min(item.cartQuantity || 0, (prev[item.id] || 0) + 1)}))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-green-50 text-gray-600 font-bold">+</button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-3 border-t bg-gray-50 flex justify-end gap-2">
                      <button onClick={() => setIsReturnModalOpen(false)} className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg">Batal</button>
                      <button onClick={handleProcessReturn} disabled={isLoading} className="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white hover:bg-orange-700 rounded-lg shadow flex items-center gap-2">
                        {isLoading ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>} Proses
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER UTAMA */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="text-purple-600" size={20} /> Manajemen Pesanan</h2>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
          {[
              { id: 'pending', label: 'Baru', icon: Clock, count: safeOrders.filter(o=>o?.status==='pending').length, color: 'text-amber-600' },
              
              // MAPPING: Tab 'processing' = 'Terjual' (Sesuai Logic)
              { id: 'processing', label: 'Terjual', icon: Package, count: safeOrders.filter(o=>o?.status==='processing').length, color: 'text-blue-600' }, 
              
              { id: 'history', label: 'Retur', icon: CheckCircle, count: returDbRecords.length, color: 'text-red-600' }
          ].map((tab: any) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all hover:bg-white relative ${activeTab === tab.id ? `border-purple-600 text-purple-700 bg-white` : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  <tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} /><span>{tab.label}</span>
                  {tab.id === 'pending' && tab.count > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{tab.count}</span>}
                  
                  {/* Tampilkan count juga untuk tab processing / terjual */}
                  {tab.id === 'processing' && tab.count > 0 && <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">{tab.count}</span>}
              </button>
          ))}
      </div>

      {/* SEARCH BAR (Compact) */}
      {(activeTab === 'processing' || activeTab === 'history') && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" placeholder="Cari Resi / Nama..." className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-purple-200 focus:border-purple-400 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                  {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>)}
              </div>
          </div>
      )}
      
      {/* TABLE CONTENT */}
      <div className="flex-1 overflow-x-auto p-2 bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-w-[1000px]">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                    <tr>
                        <th className="px-3 py-2 w-28">Tanggal</th>
                        <th className="px-3 py-2 w-32">Resi / Toko</th>
                        <th className="px-3 py-2 w-24">Via</th> 
                        <th className="px-3 py-2 w-32">Pelanggan</th>
                        <th className="px-3 py-2 w-28">Part No.</th>
                        <th className="px-3 py-2">Barang</th>
                        <th className="px-3 py-2 text-right w-16">Qty</th>
                        <th className="px-3 py-2 text-right w-24">Satuan</th>
                        <th className="px-3 py-2 text-right w-24">Total</th>
                        
                        {activeTab === 'history' ? (
                            <>
                                <th className="px-3 py-2 w-24 bg-red-50/50 text-red-600 border-l border-red-100">Tgl Retur</th>
                                <th className="px-3 py-2 text-center w-24 bg-red-50/50 text-red-600">Status</th>
                            </>
                        ) : (
                            <th className="px-3 py-2 text-center w-24">Status</th>
                        )}
                        
                        <th className="px-3 py-2 text-center w-32">{activeTab === 'history' ? 'Ket' : 'Aksi'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                    {/* --- TAB HISTORY (RETUR) --- */}
                    {activeTab === 'history' ? (
                        currentItems.length === 0 ? (
                            <tr><td colSpan={13} className="p-8 text-center text-gray-400"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>Belum ada data</p></td></tr>
                        ) : (
                            (currentItems as ReturRecord[]).map((retur) => {
                                const dtOrder = formatDate(retur.tanggal_pemesanan || '');
                                const dtRetur = formatDate(retur.tanggal_retur);

                                return (
                                    <tr key={`retur-${retur.id}`} className="hover:bg-red-50/20 transition-colors">
                                        <td className="px-3 py-2 align-top border-r border-gray-100">
                                            <div className="font-bold text-gray-900">{dtOrder.date}</div>
                                        </td>
                                        <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-600">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit">{retur.resi || '-'}</span>
                                                {retur.toko && <span className="uppercase text-gray-500 bg-gray-100 px-1 py-0.5 rounded w-fit">{retur.toko}</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            {retur.ecommerce ? <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[9px] font-bold rounded border border-orange-100">{retur.ecommerce}</span> : '-'}
                                        </td>
                                        <td className="px-3 py-2 align-top font-medium text-gray-900 truncate max-w-[120px]" title={retur.customer}>{retur.customer || 'Guest'}</td>
                                        <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{retur.part_number || '-'}</td>
                                        <td className="px-3 py-2 align-top text-gray-700 font-medium truncate max-w-[200px]" title={retur.nama_barang}>{retur.nama_barang}</td>
                                        <td className="px-3 py-2 align-top text-right font-bold text-red-600">-{retur.quantity}</td>
                                        <td className="px-3 py-2 align-top text-right font-mono text-[10px] text-gray-500">{formatRupiah(retur.harga_satuan)}</td>
                                        <td className="px-3 py-2 align-top text-right font-mono text-[10px] font-bold text-gray-800">{formatRupiah(retur.harga_total)}</td>
                                        
                                        <td className="px-3 py-2 align-top border-l border-red-100 bg-red-50/10">
                                            <div className="font-bold text-red-700 text-[10px]">{dtRetur.date}</div>
                                        </td>
                                        <td className="px-3 py-2 align-top text-center bg-red-50/10">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                                retur.status === 'Full Retur' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                                            }`}>
                                                {retur.status || 'Retur'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <div className="flex items-start justify-between gap-1 group/edit">
                                                <div className="text-[10px] text-gray-600 italic truncate max-w-[100px]">{retur.keterangan || '-'}</div>
                                                <button onClick={() => openNoteModal(retur)} className="text-blue-500 hover:bg-blue-50 p-1 rounded opacity-0 group-hover/edit:opacity-100"><Edit3 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )
                    ) : (
                        /* --- TAB PENDING & PROCESSING --- */
                        currentItems.length === 0 ? (
                            <tr><td colSpan={11} className="p-8 text-center text-gray-400"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>{searchTerm ? 'Tidak ditemukan' : 'Tidak ada data'}</p></td></tr>
                        ) : (
                            (currentItems as Order[]).map(order => {
                                if (!order) return null;
                                const { cleanName, resiText, ecommerce, shopName } = getOrderDetails(order);
                                const isResi = !resiText.startsWith('#');
                                const dt = formatDate(order.timestamp);
                                const items = Array.isArray(order.items) ? order.items : [];
                                if (items.length === 0) return null;

                                return items.map((item, index) => {
                                    const dealPrice = item.customPrice ?? item.price ?? 0;
                                    const dealTotal = dealPrice * (item.cartQuantity || 0);
                                    const hasCustomPrice = item.customPrice !== undefined && item.customPrice !== item.price;

                                    return (
                                    <tr key={`${order.id}-${index}`} className="hover:bg-blue-50/10 transition-colors group">
                                        {index === 0 && (
                                            <>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/10">
                                                    <div className="font-bold text-gray-900">{dt.date}</div><div className="text-[9px] text-gray-400 font-mono">{dt.time}</div>
                                                </td>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 font-mono text-[10px] bg-white group-hover:bg-blue-50/10">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`px-1.5 py-0.5 rounded w-fit font-bold border ${isResi ? 'bg-blue-50 text-blue-700 border-blue-100' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>{resiText}</span>
                                                        {shopName !== '-' && <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded w-fit border border-gray-200"><Store size={8} /><span className="uppercase truncate max-w-[80px]">{shopName}</span></div>}
                                                    </div>
                                                </td>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 bg-white group-hover:bg-blue-50/10">
                                                    {ecommerce !== '-' ? <div className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 w-fit text-[9px] font-bold">{ecommerce}</div> : <span className="text-gray-300">-</span>}
                                                </td>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-100 font-medium text-gray-900 bg-white group-hover:bg-blue-50/10 truncate max-w-[120px]" title={cleanName}>{cleanName}</td>
                                            </>
                                        )}
                                        <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{item.partNumber || '-'}</td>
                                        <td className="px-3 py-2 align-top text-gray-700 font-medium truncate max-w-[180px]" title={item.name}>{item.name}</td>
                                        <td className="px-3 py-2 align-top text-right font-bold text-gray-800">{item.cartQuantity || 0}</td>
                                        <td className="px-3 py-2 align-top text-right text-gray-500 font-mono text-[10px]"><div className={hasCustomPrice ? "text-orange-600 font-bold" : ""}>{formatRupiah(dealPrice)}</div></td>
                                        <td className="px-3 py-2 align-top text-right font-bold text-gray-900 font-mono text-[10px]">{formatRupiah(dealTotal)}</td>
                                        
                                        {index === 0 && (
                                            <>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/10">
                                                    <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase mb-1 shadow-sm ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div>
                                                    <div className="text-[10px] font-extrabold text-purple-700">{formatRupiah(order.totalAmount || 0)}</div>
                                                </td>
                                                <td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-100 bg-white group-hover:bg-blue-50/10">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        {order.status === 'pending' && (
                                                            <>
                                                                <button onClick={() => onUpdateStatus(order.id, 'processing')} className="w-full py-1 bg-purple-600 text-white text-[9px] font-bold rounded hover:bg-purple-700 shadow-sm flex items-center justify-center gap-1">Proses</button>
                                                                <button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="w-full py-1 bg-white border border-gray-300 text-gray-600 text-[9px] font-bold rounded hover:bg-red-50 hover:text-red-600">Tolak</button>
                                                            </>
                                                        )}
                                                        {order.status === 'processing' && (
                                                            <button onClick={() => openReturnModal(order)} className="w-full py-1 bg-orange-50 border border-orange-200 text-orange-600 text-[9px] font-bold rounded hover:bg-orange-100 flex items-center justify-center gap-1">Retur</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    );
                                });
                            })
                        )
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* PAGINATION FOOTER */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} data
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                  <ChevronLeft size={16}/>
              </button>
              <span className="font-bold text-gray-900">Halaman {currentPage}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                  <ChevronRight size={16}/>
              </button>
          </div>
      </div>
    </div>
  );
};