// FILE: src/App.tsx
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { CustomerOrderView } from './components/CustomerOrderView';
import { InventoryItem, InventoryFormData, CartItem, Order, ChatSession, Message, OrderStatus, StockHistory } from './types';
// GANTI IMPORT SERVICE KE SUPABASE
import { 
  fetchInventory, addInventory, updateInventory, deleteInventory,
  fetchOrders, saveOrder, updateOrderStatusService,
  fetchHistory, addHistoryLog,
  fetchChatSessions, saveChatSession
} from './services/supabaseService';
import { generateId } from './utils';
import { Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, ClipboardList, LogOut, ArrowRight, CloudLightning, RefreshCw, KeyRound, ShoppingCart, Car, ScanBarcode } from 'lucide-react';

const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';
const BANNER_PART_NUMBER = 'SYSTEM-BANNER-PROMO';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders' | 'scan';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-full shadow-lg flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${type === 'success' ? 'bg-gray-900' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} className="mr-2 text-green-400" /> : <XCircle size={16} className="mr-2" />}
      {message}
    </div>
  );
};

const ScanResiView = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
            <ScanBarcode size={64} className="opacity-40"/>
        </div>
        <h2 className="text-xl font-bold text-gray-700">Fitur Scan Resi</h2>
        <p className="text-sm">Segera Hadir</p>
    </div>
);

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

  // --- INITIAL LOAD DATA FROM SUPABASE ---
  useEffect(() => {
    let cId = localStorage.getItem(CUSTOMER_ID_KEY);
    if (!cId) { cId = 'cust-' + generateId(); localStorage.setItem(CUSTOMER_ID_KEY, cId); }
    setMyCustomerId(cId);

    // Initial Fetch saat aplikasi dimuat
    refreshData();
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
        // 1. Fetch Inventory
        const inventoryData = await fetchInventory();
        const bannerItem = inventoryData.find(i => i.partNumber === BANNER_PART_NUMBER);
        if (bannerItem) setBannerUrl(bannerItem.imageUrl);
        setItems(inventoryData.filter(i => i.partNumber !== BANNER_PART_NUMBER));

        // 2. Fetch Orders
        const ordersData = await fetchOrders();
        setOrders(ordersData);

        // 3. Fetch History
        const historyData = await fetchHistory();
        setHistory(historyData);

        // 4. Fetch Chat
        const chatData = await fetchChatSessions();
        setChatSessions(chatData);

    } catch (e) { 
        console.error("Gagal memuat data:", e); 
        showToast("Gagal memuat data dari server", 'error');
    }
    setLoading(false);
  };

  // Helper untuk update history lokal & server
  const addNewHistory = async (newRecord: StockHistory) => {
      // Update Server
      await addHistoryLog(newRecord);
      // Update Lokal
      setHistory(prev => [newRecord, ...prev]);
  };

  const handleGlobalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginName.toLowerCase() === 'ava' && loginPass === '9193') {
        setIsAdmin(true); setIsAuthenticated(true); setActiveView('inventory');
        setMyCustomerId('ADMIN-AVA'); showToast('Login Admin Berhasil'); 
        refreshData(); // Refresh data saat login admin untuk memastikan data terbaru
    } else if (loginName.trim() !== '') {
        loginAsCustomer(loginName);
    } else {
        showToast('Masukkan Nama', 'error');
    }
  };

  const loginAsCustomer = (name: string) => {
      setIsAdmin(false); setIsAuthenticated(true); setActiveView('shop');
      localStorage.setItem('stockmaster_customer_name', name); 
      showToast(`Selamat Datang, ${name}!`);
  };

  const handleLogout = () => { setIsAuthenticated(false); setIsAdmin(false); setLoginName(''); setLoginPass(''); };

  const handleSaveItem = async (data: InventoryFormData) => {
      setLoading(true);
      const newQuantity = Number(data.quantity) || 0;
      const currentPrice = Number(data.price) || 0; // Ambil harga saat ini
      const ecommerceInfo = data.ecommerce ? ` (Via: ${data.ecommerce})` : '';

      if (editItem) {
          const oldQty = Number(editItem.quantity) || 0;
          const diff = newQuantity - oldQty;
          
          // Construct item updated
          // Note: Kita gunakan ID dari editItem karena Supabase butuh ID/PartNumber yang konsisten
          let updatedItem: InventoryItem = { 
              ...editItem, 
              ...data, 
              // Pastikan field stok terupdate
              quantity: newQuantity,
              initialStock: data.initialStock || 0,
              qtyIn: data.qtyIn || 0,
              qtyOut: data.qtyOut || 0,
              lastUpdated: Date.now() 
          };

          // Logic History
          if (diff !== 0) {
              if (diff > 0) {
                  // updatedItem.qtyIn = (updatedItem.qtyIn || 0) + diff; 
                  addNewHistory({
                      id: generateId(), itemId: editItem.id, partNumber: data.partNumber, name: data.name,
                      type: 'in', quantity: diff, 
                      
                      // --- UPDATED ---
                      price: currentPrice,
                      totalPrice: currentPrice * diff,
                      // ---------------
                      
                      previousStock: oldQty, currentStock: newQuantity,
                      timestamp: Date.now(), 
                      reason: `Restock Manual${ecommerceInfo}` 
                  });
              } else {
                  const absDiff = Math.abs(diff);
                  // updatedItem.qtyOut = (updatedItem.qtyOut || 0) + absDiff;
                  addNewHistory({
                      id: generateId(), itemId: editItem.id, partNumber: data.partNumber, name: data.name,
                      type: 'out', quantity: absDiff, 
                      
                      // --- UPDATED ---
                      price: currentPrice,
                      totalPrice: currentPrice * absDiff,
                      // ---------------
                      
                      previousStock: oldQty, currentStock: newQuantity,
                      timestamp: Date.now(), 
                      reason: 'Koreksi Stok Manual'
                  });
              }
          }
          
          // Save to Supabase
          const success = await updateInventory(updatedItem);
          if (success) { 
              showToast('Update berhasil!'); 
              setItems(prev => prev.map(i => i.id === editItem.id ? updatedItem : i)); 
          } else {
              showToast('Gagal update', 'error');
          }

      } else {
          // BARANG BARU
          if (items.some(i => i.partNumber === data.partNumber)) { showToast('Part Number ada!', 'error'); setLoading(false); return; }
          
          addNewHistory({ 
              id: generateId(), itemId: data.partNumber, partNumber: data.partNumber, name: data.name, 
              type: 'in', quantity: newQuantity, 
              
              // --- UPDATED ---
              price: currentPrice,
              totalPrice: currentPrice * newQuantity,
              // ---------------
              
              previousStock: 0, currentStock: newQuantity, 
              timestamp: Date.now(), 
              reason: `Barang Baru${ecommerceInfo}` 
          });
          
          const success = await addInventory(data);
          if (success) {
              showToast('Tersimpan di Database!');
              // Refresh full data agar mendapat ID dari supabase, atau buat objek sementara
              refreshData(); 
          } else {
              showToast('Gagal simpan', 'error');
          }
      }
      setIsEditing(false); setEditItem(null); setLoading(false);
  };

  const handleUpdateBanner = async (base64: string) => {
      const bannerData: any = { // Pakai any sementara agar compatible dengan InventoryItem/FormData
          partNumber: BANNER_PART_NUMBER, name: 'SYSTEM BANNER PROMO', description: 'DO NOT DELETE',
          price: 0, costPrice: 0, ecommerce: '', quantity: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, shelf: 'SYSTEM', imageUrl: base64
      };

      let success = false;
      if (bannerUrl) {
           success = await updateInventory(bannerData);
      } else {
           success = await addInventory(bannerData);
      }

      if (success) {
          setBannerUrl(base64); showToast('Banner diperbarui!'); 
      } else {
          showToast('Gagal update banner', 'error'); 
      }
  };
  
  const handleDelete = async (id: string) => {
      const itemToDelete = items.find(i => i.id === id);
      if (!itemToDelete) return;

      if(confirm('Hapus Permanen dari Database?')) {
          setLoading(true);
          const success = await deleteInventory(itemToDelete.partNumber);
          if (success) { 
              showToast('Dihapus'); 
              setItems(prev => prev.filter(i => i.id !== id)); 
          } else {
              showToast('Gagal hapus', 'error');
          }
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

  const doCheckout = async (name: string) => {
      if (name !== loginName && !isAdmin) {
          setLoginName(name);
          localStorage.setItem('stockmaster_customer_name', name);
      }

      const newOrder: Order = {
          id: generateId(), customerName: name, items: [...cart], 
          totalAmount: cart.reduce((a,b)=>a+(b.price*b.cartQuantity),0), status: 'pending', timestamp: Date.now()
      };
      
      setLoading(true);
      
      // 1. Simpan Order ke Supabase
      const orderSuccess = await saveOrder(newOrder);
      
      if (orderSuccess) {
          // 2. Update Stok & History untuk setiap item
          const updatedItemsList = [...items];
          for (const cartItem of cart) {
              const idx = updatedItemsList.findIndex(i => i.id === cartItem.id);
              if (idx > -1) {
                  const itemToUpdate = { ...updatedItemsList[idx] };
                  const qtySold = cartItem.cartQuantity;
                  const currentPrice = Number(itemToUpdate.price) || 0;

                  itemToUpdate.qtyOut = (itemToUpdate.qtyOut || 0) + qtySold;
                  itemToUpdate.quantity = Math.max(0, itemToUpdate.quantity - qtySold);

                  // Update State Lokal
                  updatedItemsList[idx] = itemToUpdate;
                  
                  // Update DB
                  await updateInventory(itemToUpdate);
                  await addNewHistory({
                      id: generateId(), itemId: cartItem.id, partNumber: cartItem.partNumber, name: cartItem.name,
                      type: 'out', quantity: qtySold, 
                      
                      // --- UPDATED ---
                      price: currentPrice,
                      totalPrice: currentPrice * qtySold,
                      // ---------------

                      previousStock: itemToUpdate.quantity + qtySold, 
                      currentStock: itemToUpdate.quantity,
                      timestamp: Date.now(), reason: `Order #${newOrder.id.slice(0,6)} (${name})`
                  });
              }
          }

          setItems(updatedItemsList);
          setOrders([newOrder, ...orders]);
          setCart([]);
          setActiveView('orders');
          showToast('Pesanan dibuat, stok terpotong!');
      } else {
          showToast('Gagal membuat pesanan', 'error');
      }
      setLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const success = await updateOrderStatusService(orderId, newStatus);
      if (!success) { showToast('Gagal update status', 'error'); return; }

      // Logic Pembatalan (Restock kembali)
      if (newStatus === 'cancelled' && order.status !== 'cancelled') {
          const newItems = [...items];
          
          for (const orderItem of order.items) {
              const idx = newItems.findIndex(i => i.id === orderItem.id);
              if (idx > -1) {
                  const restoreQty = orderItem.cartQuantity;
                  const itemToUpdate = { ...newItems[idx] };
                  const currentPrice = Number(itemToUpdate.price) || 0;
                  
                  itemToUpdate.qtyOut = Math.max(0, (itemToUpdate.qtyOut || 0) - restoreQty);
                  itemToUpdate.quantity = itemToUpdate.quantity + restoreQty;
                  
                  newItems[idx] = itemToUpdate;

                  await updateInventory(itemToUpdate);
                  await addNewHistory({
                      id: generateId(), itemId: itemToUpdate.id, partNumber: itemToUpdate.partNumber, name: itemToUpdate.name,
                      type: 'in', quantity: restoreQty,
                      
                      // --- UPDATED ---
                      price: currentPrice,
                      totalPrice: currentPrice * restoreQty,
                      // ---------------

                      previousStock: itemToUpdate.quantity - restoreQty, currentStock: itemToUpdate.quantity,
                      timestamp: Date.now(), reason: `Cancel Order #${orderId.slice(0,6)} (${order.customerName})`
                  });
              }
          }
          setItems(newItems);
          showToast('Pesanan dibatalkan, stok dikembalikan.');
      }

      // Update Order State Lokal
      setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
  };

  const handleSendMessage = async (customerId: string, text: string, sender: 'user' | 'admin') => {
    const newMessage: Message = { id: Date.now().toString(), sender, text, timestamp: Date.now(), read: false };
    
    // Cari sesi lokal atau buat baru sementara
    let currentSession = chatSessions.find(s => s.customerId === customerId);
    let isNew = false;

    if (!currentSession) {
        currentSession = { 
            customerId, 
            customerName: loginName || `Guest ${customerId.slice(-4)}`, 
            messages: [], 
            lastMessage: '', 
            lastTimestamp: Date.now(), 
            unreadAdminCount: 0, 
            unreadUserCount: 0 
        };
        isNew = true;
    }

    const updatedSession: ChatSession = {
        ...currentSession,
        messages: [...currentSession.messages, newMessage],
        lastMessage: text,
        lastTimestamp: Date.now(),
        unreadAdminCount: sender === 'user' ? (currentSession.unreadAdminCount || 0) + 1 : (currentSession.unreadAdminCount || 0),
        unreadUserCount: sender === 'admin' ? (currentSession.unreadUserCount || 0) + 1 : (currentSession.unreadUserCount || 0)
    };

    // Update Lokal
    if (isNew) {
        setChatSessions(prev => [...prev, updatedSession]);
    } else {
        setChatSessions(prev => prev.map(s => s.customerId === customerId ? updatedSession : s));
    }

    // Save to Supabase
    await saveChatSession(updatedSession);
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
                    
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">BJW</h1>
                        <p className="text-gray-700 text-lg font-bold uppercase tracking-wider mb-1">Autopart</p>
                        <p className="text-gray-500 text-sm">Sukucadang Mobil</p>
                    </div>

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
      
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
              <div className={`${isAdmin ? 'bg-purple-600' : 'bg-blue-600'} text-white p-2.5 rounded-xl shadow-md group-hover:scale-105 transition-transform`}>{isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />}</div>
              <div>
                  <div className="font-bold leading-none text-gray-900 text-lg">BJW</div>
                  <div className="text-[10px] font-bold text-gray-600 leading-none mt-0.5">Autopart</div>
                  <div className="text-[9px] text-gray-400 leading-none">Sukucadang Mobil</div>
                  <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block ${isAdmin ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{isAdmin ? 'ADMIN ACCESS' : 'STORE FRONT'}</div>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => { refreshData(); showToast('Data direfresh'); }} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full transition-colors" title="Refresh Data"><RefreshCw size={20} /></button>
              {isAdmin ? (
                  <>
                    <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><ShoppingCart size={18}/> Beranda</button>
                    <button onClick={() => setActiveView('scan')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='scan'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><ScanBarcode size={18}/> Scan Resi</button>
                    <button onClick={() => setActiveView('inventory')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='inventory'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><Package size={18}/> Gudang</button>
                    <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><ClipboardList size={18}/> Pesanan {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{pendingOrdersCount}</span>}</button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><MessageSquare size={18}/> Chat {unreadChatCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{unreadChatCount}</span>}</button>
                  </>
              ) : (
                  <>
                    <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}><Home size={18}/> Belanja</button>
                    <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}><ClipboardList size={18}/> Pesanan {myPendingOrdersCount > 0 && <span className="bg-orange-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{myPendingOrdersCount}</span>}</button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}><MessageSquare size={18}/> Chat</button>
                  </>
              )}
              <div className="h-8 w-px bg-gray-200 mx-2"></div>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all" title="Keluar"><span className="text-xs font-semibold hidden lg:inline">{loginName}</span><LogOut size={20} /></button>
          </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 pb-24 md:pb-10">
        {activeView === 'shop' && <ShopView items={items} cart={cart} isAdmin={isAdmin} bannerUrl={bannerUrl} onUpdateBanner={handleUpdateBanner} onAddToCart={addToCart} onRemoveFromCart={(id)=>setCart(c=>c.filter(x=>x.id!==id))} onCheckout={doCheckout} />}
        {activeView === 'scan' && <ScanResiView />}
        {activeView === 'chat' && <div className="max-w-2xl mx-auto h-[calc(100vh-140px)]"><ChatView isAdmin={isAdmin} currentCustomerId={isAdmin ? 'ADMIN' : myCustomerId} chatSessions={chatSessions} onSendMessage={handleSendMessage} onMarkAsRead={(cid)=>setChatSessions(prev=>prev.map(s=>s.customerId===cid?{...s, [isAdmin?'unreadAdminCount':'unreadUserCount']:0}:s))} /></div>}
        {activeView === 'inventory' && isAdmin && (
            isEditing 
                ? <ItemForm initialData={editItem || undefined} onSubmit={handleSaveItem} onCancel={()=>{setIsEditing(false); setEditItem(null)}} /> 
                : <Dashboard items={items} orders={orders} history={history} onViewOrders={() => setActiveView('orders')} onAddNew={()=>{setEditItem(null); setIsEditing(true)}} onEdit={(i)=>{setEditItem(i); setIsEditing(true)}} onDelete={handleDelete} />
        )}
        {activeView === 'orders' && (isAdmin ? <OrderManagement orders={orders} onUpdateStatus={handleUpdateStatus} /> : <CustomerOrderView orders={orders} currentCustomerName={loginName} />)}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* UPDATE GRID COLS UNTUK MOBILE */}
        <div className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} h-16`}>
            {isAdmin ? (
                <>
                    <button onClick={()=>setActiveView('shop')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='shop'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}><ShoppingCart size={22} className={activeView==='shop'?'fill-purple-100':''} /><span className="text-[10px] font-medium">Beranda</span></button>
                    {/* BUTTON SCAN MOBILE */}
                    <button onClick={()=>setActiveView('scan')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='scan'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}><ScanBarcode size={22} className={activeView==='scan'?'text-purple-600':''} /><span className="text-[10px] font-medium">Scan</span></button>
                    
                    <button onClick={()=>setActiveView('inventory')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='inventory'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}><Package size={22} className={activeView==='inventory'?'fill-purple-100':''} /><span className="text-[10px] font-medium">Gudang</span></button>
                    <button onClick={()=>setActiveView('orders')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='orders'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}><div className="relative"><ClipboardList size={22} className={activeView==='orders'?'fill-purple-100':''} />{pendingOrdersCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}</div><span className="text-[10px] font-medium">Pesanan</span></button>
                    <button onClick={()=>setActiveView('chat')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}><div className="relative"><MessageSquare size={22} className={activeView==='chat'?'fill-purple-100':''} />{unreadChatCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}</div><span className="text-[10px] font-medium">Chat</span></button>
                </>
            ) : (
                <>
                    <button onClick={()=>setActiveView('shop')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='shop'?'text-blue-600':'text-gray-400 hover:text-gray-600'}`}><Home size={22} className={activeView==='shop'?'fill-blue-100':''} /><span className="text-[10px] font-medium">Belanja</span></button>
                    <button onClick={()=>setActiveView('orders')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='orders'?'text-blue-600':'text-gray-400 hover:text-gray-600'}`}>
                        <div className="relative">
                            <ClipboardList size={22} className={activeView==='orders'?'fill-blue-100':''} />
                            {myPendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white"></span>}
                        </div>
                        <span className="text-[10px] font-medium">Pesanan</span>
                    </button>
                    <button onClick={()=>setActiveView('chat')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-blue-600':'text-gray-400 hover:text-gray-600'}`}><MessageSquare size={22} className={activeView==='chat'?'fill-blue-100':''} /><span className="text-[10px] font-medium">Chat</span></button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => <Router><AppContent /></Router>;
export default App;