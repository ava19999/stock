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
import { fetchInventory, addInventory, updateInventory, deleteInventory, getItemById, fetchOrders, saveOrder, updateOrderStatusService, fetchHistory, addHistoryLog, fetchChatSessions, saveChatSession, addBarangKeluar } from './services/supabaseService';
import { generateId } from './utils';
import { Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, ClipboardList, LogOut, ArrowRight, CloudLightning, ShoppingCart, Car, ScanBarcode } from 'lucide-react';

const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';
const BANNER_PART_NUMBER = 'SYSTEM-BANNER-PROMO';
type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders' | 'scan';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-full shadow-xl flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 border ${type === 'success' ? 'bg-gray-900 border-gray-700' : 'bg-red-600 border-red-700'}`}>{type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2" />}{message}</div>);
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
  const isKingFano = useMemo(() => { return loginName.trim().toLowerCase() === 'king fano'; }, [loginName]);

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
    if (loginName.toLowerCase() === 'ava' && loginPass === '9193') { setIsAdmin(true); setIsAuthenticated(true); setActiveView('inventory'); setMyCustomerId('ADMIN-AVA'); showToast('Login Admin Berhasil'); refreshData(); } 
    else if (loginName.trim() !== '') { loginAsCustomer(loginName); } 
    else { showToast('Masukkan Nama', 'error'); }
  };

  const loginAsCustomer = (name: string) => { setIsAdmin(false); setIsAuthenticated(true); setActiveView('shop'); localStorage.setItem('stockmaster_customer_name', name); showToast(`Selamat Datang, ${name}!`); };
  const handleLogout = () => { setIsAuthenticated(false); setIsAdmin(false); setLoginName(''); setLoginPass(''); localStorage.removeItem('stockmaster_customer_name'); };

  const handleSaveItem = async (data: InventoryFormData) => {
      setLoading(true);
      const newQuantity = Number(data.quantity) || 0;
      let updatedItem: InventoryItem = { ...editItem, ...data, quantity: newQuantity, initialStock: data.initialStock || 0, qtyIn: data.qtyIn || 0, qtyOut: data.qtyOut || 0, lastUpdated: Date.now() };
      if (editItem) { if (await updateInventory(updatedItem)) { showToast('Update berhasil!'); refreshData(); } } 
      else { if (await addInventory(data)) { showToast('Tersimpan!'); refreshData(); } }
      setIsEditing(false); setEditItem(null); setLoading(false);
  };

  const handleUpdateBanner = async (base64: string) => { const bannerData: any = { partNumber: BANNER_PART_NUMBER, name: 'SYSTEM BANNER PROMO', application: 'DO NOT DELETE', brand:'SYSTEM', price: 0, costPrice: 0, ecommerce: '', quantity: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, shelf: 'SYSTEM', imageUrl: base64 }; if (await (bannerUrl ? updateInventory(bannerData) : addInventory(bannerData))) { setBannerUrl(base64); showToast('Banner diperbarui!'); } else { showToast('Gagal update banner', 'error'); } };
  const handleDelete = async (id: string) => { if(confirm('Hapus Barang Permanen?')) { setLoading(true); if (await deleteInventory(id)) { showToast('Dihapus'); refreshData(); } setLoading(false); } }
  const addToCart = (item: InventoryItem) => { setCart(prev => { const ex = prev.find(c => c.id === item.id); return ex ? prev.map(c => c.id === item.id ? {...c, cartQuantity: c.cartQuantity + 1} : c) : [...prev, {...item, cartQuantity: 1}]; }); showToast('Masuk keranjang'); };
  const updateCartItem = (itemId: string, changes: Partial<CartItem>) => { setCart(prev => prev.map(item => item.id === itemId ? { ...item, ...changes } : item)); };
  
  const doCheckout = async (name: string) => {
      if (name !== loginName && !isAdmin) { setLoginName(name); localStorage.setItem('stockmaster_customer_name', name); }
      const totalAmount = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.price) * item.cartQuantity), 0);
      const newOrder: Order = { id: generateId(), customerName: name, items: [...cart], totalAmount: totalAmount, status: 'pending', timestamp: Date.now() };
      setLoading(true);
      if (await saveOrder(newOrder)) { showToast('Pesanan berhasil dibuat!'); setCart([]); setActiveView('orders'); await refreshData(); } else { showToast('Gagal membuat pesanan', 'error'); }
      setLoading(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
      const order = orders.find(o => o.id === orderId); if (!order) return;
      let updateTime = (newStatus === 'completed' || newStatus === 'cancelled') ? Date.now() : undefined;
      
      if (order.status === 'pending' && newStatus === 'processing') {
          if (await updateOrderStatusService(orderId, newStatus)) { 
              for (const orderItem of order.items) {
                  const currentItem = await getItemById(orderItem.id);
                  if (currentItem) {
                      const qtySold = orderItem.cartQuantity;
                      const itemToUpdate = { ...currentItem, qtyOut: (currentItem.qtyOut || 0) + qtySold, quantity: Math.max(0, currentItem.quantity - qtySold), lastUpdated: Date.now() };
                      await updateInventory(itemToUpdate);
                      await addBarangKeluar({ tanggal: new Date().toISOString().split('T')[0], kodeToko: 'APP', tempo: 'AUTO', ecommerce: 'APP', customer: order.customerName, partNumber: currentItem.partNumber, name: currentItem.name, brand: currentItem.brand, application: currentItem.application, rak: currentItem.shelf, stockAwal: currentItem.quantity, qtyKeluar: qtySold, hargaSatuan: orderItem.customPrice ?? orderItem.price, hargaTotal: (orderItem.customPrice ?? orderItem.price) * qtySold, resi: '-' });
                  }
              }
              showToast('Pesanan diproses, stok berkurang.'); refreshData(); setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus } : x));
          }
      } else { if (await updateOrderStatusService(orderId, newStatus, updateTime)) { setOrders(prev => prev.map(x => x.id === orderId ? { ...x, status: newStatus, timestamp: updateTime || x.timestamp } : x)); } }
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

  const handleBulkSave = async (ordersList: any[]) => { showToast(`Fitur Import Batch sedang diperbarui.`, 'success'); };
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const myPendingOrdersCount = orders.filter(o => o.customerName === loginName && o.status === 'pending').length;
  const unreadChatCount = chatSessions.reduce((sum, s) => sum + (s.unreadAdminCount || 0), 0);

  if (loading && items.length === 0) return <div className="flex flex-col h-screen items-center justify-center bg-white"><div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div><p className="mt-4 text-gray-500">Memuat Data...</p></div>;

  if (!isAuthenticated) {
      return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">{toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}<div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"><h1 className="text-3xl font-bold mb-6 text-gray-900">BJW Autopart</h1><form onSubmit={handleGlobalLogin} className="space-y-4"><input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="Nama Anda..." /><input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full px-4 py-3 border rounded-xl" placeholder="Password Admin (Opsional)" /><button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Masuk</button></form><button onClick={() => loginAsCustomer('Tamu')} className="mt-4 text-sm text-gray-500 hover:text-blue-600">Masuk sebagai Tamu</button></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
              <div className={`${isAdmin ? 'bg-purple-600' : 'bg-blue-600'} text-white p-2 rounded-lg`}>{isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />}</div>
              <div><div className="font-bold text-gray-900">BJW Autopart</div><div className="text-xs text-gray-500">{isAdmin ? 'Admin' : 'Store'}</div></div>
          </div>
          <div className="flex items-center gap-2"><button onClick={() => { refreshData(); showToast('Data diperbarui'); }} className="p-2 hover:bg-gray-100 rounded-full"><CloudLightning size={20}/></button><button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-500 rounded-full"><LogOut size={20}/></button></div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeView === 'shop' && <ShopView items={items} cart={cart} isAdmin={isAdmin} isKingFano={isKingFano} bannerUrl={bannerUrl} onAddToCart={addToCart} onRemoveFromCart={(id) => setCart(prev => prev.filter(c => c.id !== id))} onUpdateCartItem={updateCartItem} onCheckout={doCheckout} onUpdateBanner={handleUpdateBanner} />}
        {activeView === 'inventory' && isAdmin && <Dashboard items={items} orders={orders} history={history} onViewOrders={() => setActiveView('orders')} onAddNew={() => { setEditItem(null); setIsEditing(true); }} onEdit={(item) => { setEditItem(item); setIsEditing(true); }} onDelete={handleDelete} />}
        {activeView === 'orders' && isAdmin && <OrderManagement orders={orders} onUpdateStatus={handleUpdateStatus} />}
        {activeView === 'orders' && !isAdmin && <CustomerOrderView orders={orders.filter(o => o.customerName === loginName)} />}
        {activeView === 'chat' && <ChatView isAdmin={isAdmin} currentCustomerId={isAdmin ? undefined : myCustomerId} sessions={chatSessions} onSendMessage={handleSendMessage} />}
        {activeView === 'scan' && isAdmin && <ScanResiView onSave={handleSaveScannedOrder} onSaveBulk={handleBulkSave} isProcessing={loading} />}
        {isEditing && isAdmin && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-4xl"><ItemForm initialData={editItem || undefined} onSubmit={handleSaveItem} onCancel={() => { setIsEditing(false); setEditItem(null); }} /></div></div>}
      </div>

      <div className="bg-white border-t flex justify-around p-2 sticky bottom-0 z-40 safe-area-pb">
        <button onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')} className={`flex flex-col items-center p-2 rounded-lg ${activeView === 'shop' || activeView === 'inventory' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>{isAdmin ? <Home size={20} /> : <Package size={20} />}<span className="text-[10px] font-medium mt-1">{isAdmin ? 'Dash' : 'Shop'}</span></button>
        <button onClick={() => setActiveView('orders')} className={`flex flex-col items-center p-2 rounded-lg relative ${activeView === 'orders' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><ClipboardList size={20} />{(isAdmin ? pendingOrdersCount : myPendingOrdersCount) > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}<span className="text-[10px] font-medium mt-1">Order</span></button>
        {isAdmin && <button onClick={() => setActiveView('scan')} className={`flex flex-col items-center p-2 rounded-lg ${activeView === 'scan' ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}><ScanBarcode size={20} /><span className="text-[10px] font-medium mt-1">Scan</span></button>}
        <button onClick={() => setActiveView('chat')} className={`flex flex-col items-center p-2 rounded-lg relative ${activeView === 'chat' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}><MessageSquare size={20} />{unreadChatCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}<span className="text-[10px] font-medium mt-1">Chat</span></button>
      </div>
    </div>
  );
};

const App = () => <Router><AppContent /></Router>;
export default App;