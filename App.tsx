// FILE: src/App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { CustomerOrderView } from './components/CustomerOrderView';
import { QuickInputView } from './components/QuickInputView';
import { InventoryItem, InventoryFormData, CartItem, Order, ChatSession, Message, OrderStatus, StockHistory } from './types';

// --- IMPORT LOGIKA ---
import { 
  fetchInventory, addInventory, updateInventory, deleteInventory, getItemById, getItemByPartNumber, 
  fetchOrders, saveOrder, updateOrderStatusService,
  fetchHistory,
  fetchChatSessions, saveChatSession,
  addBarangMasuk, addBarangKeluar,
  updateOrderData 
} from './services/supabaseService';

import { generateId } from './utils';
import { 
  Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, 
  ClipboardList, LogOut, ArrowRight, CloudLightning, KeyRound, 
  ShoppingCart, Car, Plus
} from 'lucide-react';

const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';
const BANNER_PART_NUMBER = 'SYSTEM-BANNER-PROMO';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'quick_input' | 'orders';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-xl flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${type === 'success' ? 'bg-gray-800 border-gray-600 shadow-green-900/20' : 'bg-red-900/90 border-red-700'}`}>
      {type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2 text-red-300" />}
      {message}
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false); 
  const [activeView, setActiveView] = useState<ActiveView>('shop');
  
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [myCustomerId, setMyCustomerId] = useState<string>('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // --- TRIGGER UNTUK DASHBOARD ---
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg, type});

  const isKingFano = useMemo(() => {
      return loginName.trim().toLowerCase() === 'king fano';
  }, [loginName]);

  useEffect(() => {
    let cId = localStorage.getItem(CUSTOMER_ID_KEY);
    if (!cId) { cId = 'cust-' + generateId(); localStorage.setItem(CUSTOMER_ID_KEY, cId); }
    setMyCustomerId(cId);
    
    const savedName = localStorage.getItem('stockmaster_customer_name');
    if(savedName) { setLoginName(savedName); setIsAuthenticated(true); }
    
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
        const inventoryData = await fetchInventory();
        const bannerItem = inventoryData.find(i => i.partNumber === BANNER_PART_NUMBER);
        if (bannerItem) setBannerUrl(bannerItem.imageUrl);
        setItems(inventoryData.filter(i => i.partNumber !== BANNER_PART_NUMBER));

        const ordersData = await fetchOrders();
        setOrders(ordersData);

        const historyData = await fetchHistory();
        setHistory(historyData);

        const chatData = await fetchChatSessions();
        setChatSessions(chatData);

        // Update trigger agar Dashboard me-reload tabelnya
        setRefreshTrigger(prev => prev + 1);

    } catch (e) { console.error("Gagal memuat data:", e); showToast("Gagal sinkronisasi data", 'error'); }
    setLoading(false);
  };

  const handleGlobalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginName.toLowerCase() === 'ava' && loginPass === '9193') {
        setIsAdmin(true); setIsAuthenticated(true); setActiveView('inventory');
        setMyCustomerId('ADMIN-AVA'); showToast('Login Admin Berhasil'); 
        refreshData();
    } else if (loginName.trim() !== '') {
        loginAsCustomer(loginName);
    } else { showToast('Masukkan Nama', 'error'); }
  };

  const loginAsCustomer = (name: string) => {
      setIsAdmin(false); setIsAuthenticated(true); setActiveView('shop');
      localStorage.setItem('stockmaster_customer_name', name); 
      if (name.toLowerCase() === 'king fano') showToast(`Selamat Datang, King Fano! Harga Khusus Aktif.`);
      else showToast(`Selamat Datang, ${name}!`);
  };

  const handleLogout = () => { setIsAuthenticated(false); setIsAdmin(false); setLoginName(''); setLoginPass(''); localStorage.removeItem('stockmaster_customer_name'); };

  const handleSaveItem = async (data: InventoryFormData) => {
      setLoading(true);
      const newQuantity = Number(data.quantity) || 0;
      let updatedItem: InventoryItem = { ...editItem, ...data, quantity: newQuantity, initialStock: data.initialStock || 0, qtyIn: data.qtyIn || 0, qtyOut: data.qtyOut || 0, lastUpdated: Date.now() };

      if (editItem) {
          if (await updateInventory(updatedItem)) { showToast('Update berhasil!'); refreshData(); }
      } else {
          if (items.some(i => i.partNumber === data.partNumber)) { showToast('Part Number sudah ada!', 'error'); setLoading(false); return; }
          if (await addInventory(data)) { showToast('Tersimpan!'); refreshData(); }
      }
      setIsEditing(false); setEditItem(null); setLoading(false);
  };

  const handleUpdateBanner = async (base64: string) => {
      const bannerData: any = { partNumber: BANNER_PART_NUMBER, name: 'SYSTEM BANNER PROMO', application: 'DO NOT DELETE', brand: 'SYS', price: 0, costPrice: 0, ecommerce: '', quantity: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, shelf: 'SYSTEM', imageUrl: base64 };
      if (await (bannerUrl ? updateInventory(bannerData) : addInventory(bannerData))) { setBannerUrl(base64); showToast('Banner diperbarui!'); } else { showToast('Gagal update banner', 'error'); }
  };
  
  const handleDelete = async (id: string) => {
      if(confirm('Hapus Barang Permanen?')) {
          setLoading(true);
          if (await deleteInventory(id)) { showToast('Dihapus'); refreshData(); }
          setLoading(false);
      }
  }

  const addToCart = (item: InventoryItem) => {
      setCart(prev => {
          const ex = prev.find(c => c.id === item.id);
          return ex ? prev.map(c => c.id === item.id ? {...c, cartQuantity: c.cartQuantity + 1} : c) : [...prev, {...item, cartQuantity: 1}];
      });
      showToast('Masuk keranjang');
  };

  const updateCartItem = (itemId: string, changes: Partial<CartItem>) => {
      setCart(prev => prev.map(item => item.id === itemId ? { ...item, ...changes } : item));
  };

  const doCheckout = async (name: string) => {
      if (name !== loginName && !isAdmin) { setLoginName(name); localStorage.setItem('stockmaster_customer_name', name); }
      const totalAmount = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.price) * item.cartQuantity), 0);
      const newOrder: Order = { id: generateId(), customerName: name, items: [...cart], totalAmount: totalAmount, status: 'pending', timestamp: Date.now() };
      
      setLoading(true);
      if (await saveOrder(newOrder)) {
          showToast('Pesanan berhasil dibuat!'); setCart([]); setActiveView('orders'); await refreshData();
      } else { showToast('Gagal membuat pesanan', 'error'); }
      setLoading(false);
  };

  const handleProcessReturn = async (orderId: string, returnedItems: { itemId: string, qty: number }[]) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      let pureName = order.customerName;
      let resiVal = '-';
      let shopVal = '';
      let ecommerceVal = 'APLIKASI';

      const resiMatch = pureName.match(/\(Resi: (.*?)\)/);
      if (resiMatch) { resiVal = resiMatch[1]; pureName = pureName.replace(/\(Resi:.*?\)/, ''); }
      const shopMatch = pureName.match(/\(Toko: (.*?)\)/);
      if (shopMatch) { shopVal = shopMatch[1]; pureName = pureName.replace(/\(Toko:.*?\)/, ''); }
      const viaMatch = pureName.match(/\(Via: (.*?)\)/);
      if (viaMatch) { ecommerceVal = viaMatch[1]; pureName = pureName.replace(/\(Via:.*?\)/, ''); }
      pureName = pureName.trim() || "Pelanggan";

      for (const retur of returnedItems) {
          const itemInOrder = order.items.find(i => i.id === retur.itemId);
          if (!itemInOrder) continue;

          const currentItem = await getItemByPartNumber(itemInOrder.partNumber);
          
          if (currentItem) {
              const restoreQty = retur.qty;
              const newQuantity = currentItem.quantity + restoreQty;
              const itemToUpdate = { ...currentItem, qtyOut: Math.max(0, (currentItem.qtyOut || 0) - restoreQty), quantity: newQuantity, lastUpdated: Date.now() };
              await updateInventory(itemToUpdate);

              await addBarangMasuk({
                  tanggal: today,
                  tempo: `${resiVal} / ${shopVal}`,
                  ecommerce: ecommerceVal,          
                  keterangan: `${pureName} (RETUR)`,
                  partNumber: itemToUpdate.partNumber,
                  name: itemToUpdate.name,
                  brand: itemToUpdate.brand,
                  application: itemToUpdate.application,
                  rak: itemToUpdate.shelf,
                  stockAhir: newQuantity,
                  qtyMasuk: restoreQty,
                  hargaSatuan: itemInOrder.customPrice ?? itemInOrder.price,
                  hargaTotal: (itemInOrder.customPrice ?? itemInOrder.price) * restoreQty
              });
          }
      }

      const newItems = order.items.map(item => {
          const returInfo = returnedItems.find(r => r.itemId === item.id);
          if (returInfo) {
              const newQty = item.cartQuantity - returInfo.qty;
              return { ...item, cartQuantity: newQty };
          }
          return item;
      }).filter(item => item.cartQuantity > 0); 

      const newTotal = newItems.reduce((sum, item) => sum + ((item.customPrice ?? item.price) * item.cartQuantity), 0);
      const newStatus = newItems.length === 0 ? 'cancelled' : 'completed';

      if (await updateOrderData(orderId, newItems, newTotal, newStatus)) {
          showToast('Retur berhasil diproses & Stok kembali!');
          await refreshData();
      } else {
          showToast('Gagal update data pesanan', 'error');
      }
      setLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      let pureName = order.customerName;
      let resiVal = '-';
      let shopVal = '';
      let ecommerceVal = 'APLIKASI';

      const resiMatch = pureName.match(/\(Resi: (.*?)\)/);
      if (resiMatch) { resiVal = resiMatch[1]; pureName = pureName.replace(/\(Resi:.*?\)/, ''); }
      const shopMatch = pureName.match(/\(Toko: (.*?)\)/);
      if (shopMatch) { shopVal = shopMatch[1]; pureName = pureName.replace(/\(Toko:.*?\)/, ''); }
      const viaMatch = pureName.match(/\(Via: (.*?)\)/);
      if (viaMatch) { ecommerceVal = viaMatch[1]; pureName = pureName.replace(/\(Via:.*?\)/, ''); }
      pureName = pureName.trim() || "Pelanggan";

      const today = new Date().toISOString().split('T')[0];
      let updateTime = (newStatus === 'completed' || newStatus === 'cancelled') ? Date.now() : undefined;

      if (order.status === 'pending' && newStatus === 'processing') {
          if (await updateOrderStatusService(orderId, newStatus)) { 
              for (const orderItem of order.items) {
                  const currentItem = await getItemByPartNumber(orderItem.partNumber);
                  
                  if (currentItem) {
                      const qtySold = orderItem.cartQuantity;
                      const newQuantity = Math.max(0, currentItem.quantity - qtySold);
                      const itemToUpdate = { ...currentItem, qtyOut: (currentItem.qtyOut || 0) + qtySold, quantity: newQuantity, lastUpdated: Date.now() };
                      
                      await updateInventory(itemToUpdate);
                      
                      await addBarangKeluar({
                          tanggal: today,
                          kodeToko: 'APP',
                          tempo: shopVal, 
                          ecommerce: ecommerceVal, 
                          customer: pureName, 
                          partNumber: currentItem.partNumber,
                          name: currentItem.name,
                          brand: currentItem.brand,
                          application: currentItem.application,
                          rak: currentItem.shelf,
                          stockAhir: newQuantity,
                          qtyKeluar: qtySold,
                          hargaSatuan: orderItem.customPrice ?? orderItem.price,
                          hargaTotal: (orderItem.customPrice ?? orderItem.price) * qtySold,
                          resi: resiVal
                      });
                  }
              }
              showToast('Pesanan diproses, stok berkurang.'); refreshData();
          }
      }
      else if (newStatus === 'cancelled' && order.status !== 'cancelled') {
          if (await updateOrderStatusService(orderId, newStatus, updateTime)) {
              if (order.status !== 'pending') {
                  for (const orderItem of order.items) {
                      const currentItem = await getItemByPartNumber(orderItem.partNumber);
                      if (currentItem) {
                          const restoreQty = orderItem.cartQuantity;
                          const newQuantity = currentItem.quantity + restoreQty;
                          const itemToUpdate = { ...currentItem, qtyOut: Math.max(0, (currentItem.qtyOut || 0) - restoreQty), quantity: newQuantity, lastUpdated: Date.now() };
                          
                          await updateInventory(itemToUpdate);
                          
                          await addBarangMasuk({
                              tanggal: today,
                              tempo: `${resiVal} / ${shopVal}`, 
                              ecommerce: ecommerceVal,          
                              keterangan: `${pureName} (RETUR FULL)`, 
                              partNumber: itemToUpdate.partNumber,
                              name: itemToUpdate.name,
                              brand: itemToUpdate.brand,
                              application: itemToUpdate.application,
                              rak: itemToUpdate.shelf,
                              stockAhir: newQuantity,
                              qtyMasuk: restoreQty,
                              hargaSatuan: orderItem.customPrice ?? orderItem.price,
                              hargaTotal: (orderItem.customPrice ?? orderItem.price) * restoreQty
                          });
                      }
                  }
                  showToast('Pesanan dibatalkan sepenuhnya.');
              } else {
                  showToast('Pesanan ditolak (Stok belum dipotong).');
              }
              refreshData();
          }
      }
      else {
          if (await updateOrderStatusService(orderId, newStatus, updateTime)) {
              refreshData();
          }
      }
  };

  const handleSendMessage = async (customerId: string, text: string, sender: 'user' | 'admin') => {
    const newMessage: Message = { id: Date.now().toString(), sender, text, timestamp: Date.now(), read: false };
    let currentSession = chatSessions.find(s => s.customerId === customerId);
    let isNew = false;
    if (!currentSession) { currentSession = { customerId, customerName: loginName || `Guest ${customerId.slice(-4)}`, messages: [], lastMessage: '', lastTimestamp: Date.now(), unreadAdminCount: 0, unreadUserCount: 0 }; isNew = true; }
    const updatedSession: ChatSession = { ...currentSession, messages: [...currentSession.messages, newMessage], lastMessage: text, lastTimestamp: Date.now(), unreadAdminCount: sender === 'user' ? (currentSession.unreadAdminCount || 0) + 1 : (currentSession.unreadAdminCount || 0), unreadUserCount: sender === 'admin' ? (currentSession.unreadUserCount || 0) + 1 : (currentSession.unreadUserCount || 0) };
    if (isNew) setChatSessions(prev => [...prev, updatedSession]); else setChatSessions(prev => prev.map(s => s.customerId === customerId ? updatedSession : s));
    await saveChatSession(updatedSession);
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const myPendingOrdersCount = orders.filter(o => o.customerName === loginName && o.status === 'pending').length;
  const unreadChatCount = chatSessions.reduce((sum, s) => sum + (s.unreadAdminCount || 0), 0);

  if (loading && items.length === 0) return <div className="flex flex-col h-screen items-center justify-center bg-gray-900 font-sans text-gray-400 space-y-6"><div className="relative"><div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><CloudLightning size={20} className="text-blue-500 animate-pulse" /></div></div><div className="text-center space-y-1"><p className="font-medium text-gray-200">Menghubungkan Database</p><p className="text-xs">Sinkronisasi Supabase...</p></div></div>;

  if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-[80px] -ml-10 -mb-10"></div>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <div className="bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700/50 relative z-10">
                <div className="relative z-10">
                    <div className="flex justify-center mb-6"><div className="bg-gray-700 p-4 rounded-2xl shadow-lg ring-1 ring-gray-600"><Car size={40} className="text-blue-400" strokeWidth={1.5} /></div></div>
                    <div className="text-center mb-8"><h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">BJW</h1><p className="text-gray-300 text-lg font-bold uppercase tracking-wider mb-1">Autopart</p><p className="text-gray-500 text-sm">Sukucadang Mobil</p></div>
                    <form onSubmit={handleGlobalLogin} className="space-y-5">
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Identitas</label><div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} /><input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-medium text-gray-100 placeholder:text-gray-500" placeholder="Nama Anda..." /></div></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Kode Akses <span className="text-gray-600 font-normal">(Opsional)</span></label><div className="relative group"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} /><input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl focus:bg-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-medium text-gray-100 placeholder:text-gray-500" placeholder="Password Admin" /></div></div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"><span>Masuk Aplikasi</span><ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col items-center gap-3"><button onClick={() => loginAsCustomer('Tamu')} className="text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors py-2 px-4 hover:bg-gray-700 rounded-lg w-full text-center">Masuk sebagai Tamu</button></div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans text-gray-100">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* HEADER ATAS (NAVIGASI DESKTOP) */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-gray-800/90">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
              <div className={`${isAdmin ? 'bg-purple-600' : 'bg-blue-600'} text-white p-2.5 rounded-xl shadow-md group-hover:scale-105 transition-transform`}>{isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />}</div>
              <div>
                  <div className="font-bold leading-none text-gray-100 text-lg">BJW</div>
                  <div className="text-[10px] font-bold text-gray-400 leading-none mt-0.5">Autopart</div>
                  <div className="text-[9px] text-gray-500 leading-none">Sukucadang Mobil</div>
                  <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block ${isAdmin ? 'bg-purple-900/30 text-purple-300 border border-purple-800' : 'bg-blue-900/30 text-blue-300 border border-blue-800'}`}>{isAdmin ? 'ADMIN ACCESS' : 'STORE FRONT'}</div>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => { refreshData(); showToast('Data diperbarui'); }} className="p-2 hover:bg-gray-700 rounded-full transition-colors active:scale-90"><CloudLightning size={20} className={loading ? 'animate-spin text-blue-400' : 'text-gray-400'}/></button>
              
              {/* NAVIGASI DESKTOP (Tampil di Layar Besar) */}
              {isAdmin ? (
                  <>
                    <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><ShoppingCart size={18}/> Beranda</button>
                    <button onClick={() => setActiveView('inventory')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='inventory'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Package size={18}/> Gudang</button>
                    <button onClick={() => setActiveView('quick_input')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='quick_input'?'bg-green-900/30 text-green-300 ring-1 ring-green-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Plus size={18}/> Input Barang</button>
                    <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><ClipboardList size={18}/> Manajemen Pesanan {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{pendingOrdersCount}</span>}</button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-purple-900/30 text-purple-300 ring-1 ring-purple-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><MessageSquare size={18}/> Chat {unreadChatCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{unreadChatCount}</span>}</button>
                  </>
              ) : (
                  <>
                    <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-blue-900/30 text-blue-300 ring-1 ring-blue-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><Home size={18}/> Belanja</button>
                    <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-blue-900/30 text-blue-300 ring-1 ring-blue-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><ClipboardList size={18}/> Pesanan {myPendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-gray-900"></span>}</button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-blue-900/30 text-blue-300 ring-1 ring-blue-800':'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}><MessageSquare size={18}/> Chat</button>
                  </>
              )}

              <div className="h-8 w-px bg-gray-700 mx-2"></div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-all" title="Keluar"><span className="text-xs font-semibold hidden lg:inline">{loginName}</span><LogOut size={20} /></button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-900">
        {activeView === 'shop' && <ShopView items={items} cart={cart} isAdmin={isAdmin} isKingFano={isKingFano} bannerUrl={bannerUrl} onAddToCart={addToCart} onRemoveFromCart={(id) => setCart(prev => prev.filter(c => c.id !== id))} onUpdateCartItem={updateCartItem} onCheckout={doCheckout} onUpdateBanner={handleUpdateBanner} />}
        
        {/* --- DASHBOARD MENGGUNAKAN TRIGGER --- */}
        {activeView === 'inventory' && isAdmin && (
          <Dashboard 
            items={items} 
            orders={orders} 
            history={history} 
            refreshTrigger={refreshTrigger}
            onViewOrders={() => setActiveView('orders')} 
            onAddNew={() => { setEditItem(null); setIsEditing(true); }} 
            onEdit={(item) => { setEditItem(item); setIsEditing(true); }} 
            onDelete={handleDelete} 
          />
        )}
        
        {/* --- QUICK INPUT VIEW --- */}
        {activeView === 'quick_input' && isAdmin && (
          <QuickInputView 
            items={items}
            onRefresh={refreshData}
            showToast={showToast}
          />
        )}
        
        {/* --- ORDER MANAGEMENT DENGAN LOADING STATE --- */}
        {activeView === 'orders' && isAdmin && (
          <OrderManagement 
              orders={orders} 
              isLoading={loading}
              onUpdateStatus={handleUpdateStatus} 
              onProcessReturn={handleProcessReturn} 
              onRefresh={refreshData} 
          />
        )}
        
        {activeView === 'orders' && !isAdmin && <CustomerOrderView orders={orders.filter(o => o.customerName === loginName)} />}
        {activeView === 'chat' && <ChatView isAdmin={isAdmin} currentCustomerId={isAdmin ? undefined : myCustomerId} sessions={chatSessions} onSendMessage={handleSendMessage} />}
        
        {isEditing && isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
                    <ItemForm initialData={editItem || undefined} onCancel={() => { setIsEditing(false); setEditItem(null); }} onSuccess={(item) => { handleSaveItem(item as any); }} />
                </div>
            </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} h-16`}>
            {isAdmin ? (
                <>
                    <button onClick={()=>setActiveView('shop')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='shop'?'text-purple-400':'text-gray-500 hover:text-gray-300'}`}><ShoppingCart size={22} className={activeView==='shop'?'fill-purple-900/50':''} /><span className="text-[10px] font-medium">Beranda</span></button>
                    <button onClick={()=>setActiveView('inventory')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='inventory'?'text-purple-400':'text-gray-500 hover:text-gray-300'}`}><Package size={22} className={activeView==='inventory'?'fill-purple-900/50':''} /><span className="text-[10px] font-medium">Gudang</span></button>
                    <button onClick={()=>setActiveView('quick_input')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='quick_input'?'text-green-400':'text-gray-500 hover:text-gray-300'}`}><div className="relative"><Plus size={22} className={activeView==='quick_input'?'fill-green-900/50':''} /></div><span className="text-[10px] font-medium">Input</span></button>
                    <button onClick={()=>setActiveView('orders')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='orders'?'text-purple-400':'text-gray-500 hover:text-gray-300'}`}><div className="relative"><ClipboardList size={22} className={activeView==='orders'?'fill-purple-900/50':''} />{pendingOrdersCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-gray-900"></span>}</div><span className="text-[10px] font-medium">Pesanan</span></button>
                    <button onClick={()=>setActiveView('chat')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-purple-400':'text-gray-500 hover:text-gray-300'}`}><div className="relative"><MessageSquare size={22} className={activeView==='chat'?'fill-purple-900/50':''} />{unreadChatCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-gray-900"></span>}</div><span className="text-[10px] font-medium">Chat</span></button>
                </>
            ) : (
                <>
                    <button onClick={()=>setActiveView('shop')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='shop'?'text-blue-400':'text-gray-500 hover:text-gray-300'}`}><Home size={22} className={activeView==='shop'?'fill-blue-900/50':''} /><span className="text-[10px] font-medium">Belanja</span></button>
                    <button onClick={()=>setActiveView('orders')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='orders'?'text-blue-400':'text-gray-500 hover:text-gray-300'}`}>
                        <div className="relative"><ClipboardList size={22} className={activeView==='orders'?'fill-blue-900/50':''} />{myPendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-gray-900"></span>}</div>
                        <span className="text-[10px] font-medium">Pesanan</span></button>
                    <button onClick={()=>setActiveView('chat')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-blue-400':'text-gray-500 hover:text-gray-300'}`}><MessageSquare size={22} className={activeView==='chat'?'fill-blue-900/50':''} /><span className="text-[10px] font-medium">Chat</span></button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

const App = () => <Router><AppContent /></Router>;
export default App;