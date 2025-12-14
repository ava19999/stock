// FILE: src/App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { CustomerOrderView } from './components/CustomerOrderView';
import { ScanResiView } from './components/ScanResiView';
import { InventoryItem, InventoryFormData, CartItem, Order, ChatSession, Message, OrderStatus, StockHistory } from './types';
import { ResiAnalysisResult } from './services/geminiService';

// --- IMPORT LOGIKA BARU ---
import { 
  fetchInventory, addInventory, updateInventory, deleteInventory, getItemById,
  fetchOrders, saveOrder, updateOrderStatusService,
  fetchHistory, addHistoryLog,
  fetchChatSessions, saveChatSession,
  addBarangMasuk, addBarangKeluar
} from './services/supabaseService';

import { generateId, formatRupiah } from './utils';
import { 
  Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, 
  ClipboardList, LogOut, ArrowRight, CloudLightning, RefreshCw, KeyRound, 
  ShoppingCart, Car, ScanBarcode 
} from 'lucide-react';

const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';
const BANNER_PART_NUMBER = 'SYSTEM-BANNER-PROMO';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders' | 'scan';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-xl flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${type === 'success' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-700'}`}>
      {type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2" />}
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

  // --- LOGIC SAVE ITEM ---
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

  // --- LOGIC UPDATE STATUS (DIPERBARUI) ---
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      let pureName = order.customerName;
      let extraInfo = '';
      const resiMatch = pureName.match(/\(Resi: (.*?)\)/);
      if (resiMatch) { extraInfo += ` (Resi: ${resiMatch[1]})`; pureName = pureName.replace(/\(Resi:.*?\)/, ''); }
      const viaMatch = pureName.match(/\(Via: (.*?)\)/);
      if (viaMatch) { extraInfo += ` (Via: ${viaMatch[1]})`; pureName = pureName.replace(/\(Via:.*?\)/, ''); }
      pureName = pureName.trim();

      let updateTime = undefined;
      const today = new Date().toISOString().split('T')[0];

      if (newStatus === 'completed' || newStatus === 'cancelled') {
          updateTime = Date.now();
      }

      if (order.status === 'pending' && newStatus === 'processing') {
          if (await updateOrderStatusService(orderId, newStatus)) { 
              for (const orderItem of order.items) {
                  const currentItem = await getItemById(orderItem.id);
                  if (currentItem) {
                      const qtySold = orderItem.cartQuantity;
                      const itemToUpdate = { ...currentItem, qtyOut: (currentItem.qtyOut || 0) + qtySold, quantity: Math.max(0, currentItem.quantity - qtySold), lastUpdated: Date.now() };
                      
                      await updateInventory(itemToUpdate);
                      await addBarangKeluar({
                          tanggal: today,
                          kodeToko: 'APP',
                          tempo: 'MJM',
                          ecommerce: 'APLIKASI',
                          customer: pureName,
                          partNumber: currentItem.partNumber,
                          name: currentItem.name,
                          brand: currentItem.brand,
                          application: currentItem.application,
                          rak: currentItem.shelf,
                          stockAwal: currentItem.quantity,
                          qtyKeluar: qtySold,
                          hargaSatuan: orderItem.customPrice ?? orderItem.price,
                          hargaTotal: (orderItem.customPrice ?? orderItem.price) * qtySold,
                          resi: resiMatch ? resiMatch[1] : '-'
                      });
                  }
              }
              showToast('Pesanan diproses, stok berkurang.'); refreshData();
              setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
          }
      }
      else if (newStatus === 'cancelled' && order.status !== 'cancelled') {
          if (await updateOrderStatusService(orderId, newStatus, updateTime)) {
              if (order.status !== 'pending') {
                  for (const orderItem of order.items) {
                      const currentItem = await getItemById(orderItem.id);
                      if (currentItem) {
                          const restoreQty = orderItem.cartQuantity;
                          const itemToUpdate = { ...currentItem, qtyOut: Math.max(0, (currentItem.qtyOut || 0) - restoreQty), quantity: currentItem.quantity + restoreQty, lastUpdated: Date.now() };
                          
                          await updateInventory(itemToUpdate);
                          await addBarangMasuk({
                              tanggal: today,
                              tempo: 'RETUR',
                              suplier: `RETUR: ${pureName}`,
                              partNumber: itemToUpdate.partNumber,
                              name: itemToUpdate.name,
                              brand: itemToUpdate.brand,
                              application: itemToUpdate.application,
                              rak: itemToUpdate.shelf,
                              stockAwal: itemToUpdate.quantity - restoreQty,
                              qtyMasuk: restoreQty,
                              hargaSatuan: orderItem.customPrice ?? orderItem.price,
                              hargaTotal: (orderItem.customPrice ?? orderItem.price) * restoreQty
                          });
                      }
                  }
                  showToast('Pesanan dibatalkan, stok dikembalikan.');
              } else {
                  showToast('Pesanan dibatalkan (Stok belum dipotong).');
              }
              refreshData();
              setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus, timestamp: updateTime || x.timestamp } : x));
          }
      }
      else {
          if (await updateOrderStatusService(orderId, newStatus, updateTime)) {
              setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus, timestamp: updateTime || x.timestamp } : x));
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

  // --- LOGIC SAVE SCAN (DIPERBARUI) ---
  const handleSaveScannedOrder = async (data: ResiAnalysisResult | any) => {
    if (!data.items || data.items.length === 0) { showToast("Gagal: Tidak ada item terdeteksi.", 'error'); return; }
    setLoading(true);

    let finalCustomerName = data.customerName || 'Pelanggan';
    if (data.resi) finalCustomerName += ` (Resi: ${data.resi})`;
    if (data.ecommerce) finalCustomerName += ` (Via: ${data.ecommerce})`;

    const matchedCartItems: CartItem[] = [];
    const unmatchedItems: string[] = [];

    // Simple matching
    for (const scannedItem of data.items) {
        const foundItem = items.find(i => 
            i.name.toLowerCase().includes(scannedItem.name.toLowerCase()) || 
            (i.partNumber && i.partNumber.toLowerCase() === scannedItem.name.toLowerCase())
        );

        if (foundItem) {
            matchedCartItems.push({
                ...foundItem,
                cartQuantity: scannedItem.qty || 1,
                customPrice: foundItem.price 
            });
        } else {
            unmatchedItems.push(`${scannedItem.name}`);
        }
    }

    if (matchedCartItems.length === 0) {
        showToast(`Gagal! ${unmatchedItems.length} barang tidak ditemukan di sistem.`, 'error');
        setLoading(false);
        return;
    }

    const totalAmount = matchedCartItems.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
    const newOrder: Order = { id: generateId(), customerName: finalCustomerName, items: matchedCartItems, totalAmount: totalAmount, status: 'processing', timestamp: Date.now() };

    if (await saveOrder(newOrder)) {
        const today = new Date().toISOString().split('T')[0];
        
        for (const item of matchedCartItems) {
            const currentItem = await getItemById(item.id);
            if (currentItem) {
                const qtySold = item.cartQuantity;
                const updateData = { ...currentItem, qtyOut: (currentItem.qtyOut || 0) + qtySold, quantity: Math.max(0, currentItem.quantity - qtySold), lastUpdated: Date.now() };
                await updateInventory(updateData);
                
                await addBarangKeluar({
                    tanggal: today,
                    kodeToko: 'SCAN',
                    tempo: 'MJM',
                    ecommerce: data.ecommerce || 'MANUAL',
                    customer: data.customerName || 'GUEST',
                    partNumber: currentItem.partNumber,
                    name: currentItem.name,
                    brand: currentItem.brand,
                    application: currentItem.application,
                    rak: currentItem.shelf,
                    stockAwal: currentItem.quantity,
                    qtyKeluar: qtySold,
                    hargaSatuan: item.price,
                    hargaTotal: item.price * qtySold,
                    resi: data.resi || '-'
                });
            }
        }
        
        if (unmatchedItems.length > 0) showToast(`Sukses Sebagian! ${unmatchedItems.length} SKU dilewati.`, 'error');
        else showToast('Scan Resi Berhasil! Stok Terupdate.', 'success');
        
        if (activeView === 'scan') setActiveView('orders');
        await refreshData();
    } else { showToast('Gagal menyimpan pesanan', 'error'); }
    setLoading(false);
  };

  const handleBulkSave = async (ordersList: any[]) => {
    setLoading(true);
    let successCount = 0;
    for (const orderData of ordersList) {
        try { await handleSaveScannedOrder(orderData); successCount++; } catch (e) { console.error("Gagal import:", orderData.resi); }
    }
    showToast(`Proses Selesai! ${successCount} pesanan diproses.`, 'success');
    setActiveView('orders');
    setLoading(false);
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const myPendingOrdersCount = orders.filter(o => o.customerName === loginName && o.status === 'pending').length;
  const unreadChatCount = chatSessions.reduce((sum, s) => sum + (s.unreadAdminCount || 0), 0);

  if (loading && items.length === 0) return <div className="flex flex-col h-screen items-center justify-center bg-white font-sans text-gray-600 space-y-6"><div className="relative"><div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><CloudLightning size={20} className="text-blue-600 animate-pulse" /></div></div><div className="text-center space-y-1"><p className="font-medium text-gray-900">Menghubungkan Database</p><p className="text-xs text-gray-400">Sinkronisasi Supabase...</p></div></div>;

  if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4 font-sans">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl -ml-5 -mb-5"></div>
                <div className="relative z-10">
                    <div className="flex justify-center mb-6"><div className="bg-white p-4 rounded-2xl shadow-lg ring-1 ring-gray-100"><Car size={40} className="text-blue-600" strokeWidth={1.5} /></div></div>
                    <div className="text-center mb-8"><h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">BJW</h1><p className="text-gray-700 text-lg font-bold uppercase tracking-wider mb-1">Autopart</p><p className="text-gray-500 text-sm">Sukucadang Mobil</p></div>
                    <form onSubmit={handleGlobalLogin} className="space-y-5">
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Identitas</label><div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400" placeholder="Nama Anda..." /></div></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Kode Akses <span className="text-gray-300 font-normal">(Opsional)</span></label><div className="relative group"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400" placeholder="Password Admin" /></div></div>
                        <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"><span>Masuk Aplikasi</span><ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-3"><button onClick={() => loginAsCustomer('Tamu')} className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors py-2 px-4 hover:bg-blue-50 rounded-lg w-full text-center">Masuk sebagai Tamu</button></div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* HEADER ATAS + NAVIGASI DIPINDAH KE SINI */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b">
          
          {/* BARIS 1: LOGO & LOGOUT */}
          <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-3">
                  <div className={`${isAdmin ? 'bg-purple-600' : 'bg-blue-600'} text-white p-2.5 rounded-xl shadow-md`}>
                      {isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />}
                  </div>
                  <div>
                      <div className="font-bold leading-none text-gray-900 text-lg">BJW Autopart</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{isAdmin ? 'ADMIN ACCESS' : 'STORE FRONT'}</div>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => { refreshData(); showToast('Data diperbarui'); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90"><CloudLightning size={20} className={loading ? 'animate-spin text-blue-500' : 'text-gray-500'}/></button>
                  {isAuthenticated && <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors active:scale-90"><LogOut size={20}/></button>}
              </div>
          </div>

          {/* BARIS 2: NAVIGASI (DASH/ORDER/SCAN/CHAT) - SEKARANG DI ATAS */}
          <div className="flex justify-around p-1 bg-white">
            <button onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')} className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${activeView === 'shop' || activeView === 'inventory' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                {isAdmin ? <Home size={20} /> : <Package size={20} />}
                <span className="text-[10px] font-bold mt-1">{isAdmin ? 'Dash' : 'Shop'}</span>
            </button>
            
            <button onClick={() => setActiveView('orders')} className={`flex-1 flex flex-col items-center p-2 rounded-lg relative transition-all ${activeView === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                <ClipboardList size={20} />
                {(isAdmin ? pendingOrdersCount : myPendingOrdersCount) > 0 && <span className="absolute top-1 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                <span className="text-[10px] font-bold mt-1">Order</span>
            </button>

            {isAdmin && (
                <button onClick={() => setActiveView('scan')} className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${activeView === 'scan' ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                    <ScanBarcode size={20} />
                    <span className="text-[10px] font-bold mt-1">Scan</span>
                </button>
            )}

            <button onClick={() => setActiveView('chat')} className={`flex-1 flex flex-col items-center p-2 rounded-lg relative transition-all ${activeView === 'chat' ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                <MessageSquare size={20} />
                {unreadChatCount > 0 && <span className="absolute top-1 right-1/4 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}
                <span className="text-[10px] font-bold mt-1">Chat</span>
            </button>
          </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="flex-1 overflow-y-auto p-0 pb-10">
        {activeView === 'shop' && <ShopView items={items} cart={cart} isAdmin={isAdmin} isKingFano={isKingFano} bannerUrl={bannerUrl} onAddToCart={addToCart} onRemoveFromCart={(id) => setCart(prev => prev.filter(c => c.id !== id))} onUpdateCartItem={updateCartItem} onCheckout={doCheckout} onUpdateBanner={handleUpdateBanner} />}
        {activeView === 'inventory' && isAdmin && <Dashboard items={items} orders={orders} history={history} onViewOrders={() => setActiveView('orders')} onAddNew={() => { setEditItem(null); setIsEditing(true); }} onEdit={(item) => { setEditItem(item); setIsEditing(true); }} onDelete={handleDelete} />}
        {activeView === 'orders' && isAdmin && <OrderManagement orders={orders} onUpdateStatus={handleUpdateStatus} />}
        {activeView === 'orders' && !isAdmin && <CustomerOrderView orders={orders.filter(o => o.customerName === loginName)} />}
        {activeView === 'chat' && <ChatView isAdmin={isAdmin} currentCustomerId={isAdmin ? undefined : myCustomerId} sessions={chatSessions} onSendMessage={handleSendMessage} />}
        {activeView === 'scan' && isAdmin && <ScanResiView onSave={handleSaveScannedOrder} onSaveBulk={handleBulkSave} isProcessing={loading} />}
        
        {isEditing && isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
                    <ItemForm initialData={editItem || undefined} onSubmit={handleSaveItem} onCancel={() => { setIsEditing(false); setEditItem(null); }} />
                </div>
            </div>
        )}
      </div>

      {/* FOOTER KOSONG (KARENA NAVIGASI SUDAH DI ATAS) */}
    </div>
  );
};

const App = () => <Router><AppContent /></Router>;
export default App;