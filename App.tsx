// FILE: src/App.tsx
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { InventoryItem, InventoryFormData, CartItem, Order, OrderStatus, ChatSession, Message } from './types';
import { fetchInventoryFromSheet, addInventoryToSheet, updateInventoryInSheet, deleteInventoryFromSheet } from './services/googleSheetService';
import { generateId } from './utils';
import { Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, ClipboardList, LogOut, Download, KeyRound, RefreshCw, Lock, Database, ArrowRight, CloudLightning } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'stockmaster_v11_live_api';
const ORDERS_STORAGE_KEY = 'stockmaster_orders_db_v2';
const CHAT_STORAGE_KEY = 'stockmaster_chat_db_v2';
const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-3 rounded-full shadow-lg flex items-center text-white text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${type === 'success' ? 'bg-gray-900' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} className="mr-2 text-green-400" /> : <XCircle size={16} className="mr-2" />}
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
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false); 
  const [activeView, setActiveView] = useState<ActiveView>('shop');
  
  const [myCustomerId, setMyCustomerId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({msg, type});

  useEffect(() => {
    // ANTI-CRASH: Tambahkan || [] untuk mencegah null
    const ord = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (ord) {
        try { setOrders(JSON.parse(ord) || []); } catch { setOrders([]); }
    }
    
    const chat = localStorage.getItem(CHAT_STORAGE_KEY);
    if (chat) {
        try { setChatSessions(JSON.parse(chat) || []); } catch { setChatSessions([]); }
    }
    
    let cId = localStorage.getItem(CUSTOMER_ID_KEY);
    if (!cId) { cId = 'cust-' + generateId(); localStorage.setItem(CUSTOMER_ID_KEY, cId); }
    setMyCustomerId(cId);
  }, []);

  const refreshData = async () => {
    setLoading(true);
    try {
        const data = await fetchInventoryFromSheet();
        if (data.length > 0) {
            setItems(data);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } else {
            const local = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (local) {
                try { setItems(JSON.parse(local) || []); } catch { setItems([]); }
                showToast('Mode Offline: Data lokal dimuat', 'error');
            } else {
                setItems([]);
            }
        }
    } catch (e) { console.error(e); setItems([]); }
    setLoading(false);
  };

  const handleGlobalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginName.toLowerCase() === 'ava' && loginPass === '9193') {
        setIsAdmin(true); setIsAuthenticated(true); setActiveView('inventory');
        setMyCustomerId('ADMIN-AVA'); showToast('Login Admin Berhasil'); refreshData();
    } else if (loginName.trim() !== '') {
        loginAsCustomer(loginName);
    } else {
        showToast('Masukkan Nama', 'error');
    }
  };

  const loginAsCustomer = (name: string) => {
      setIsAdmin(false); setIsAuthenticated(true); setActiveView('shop');
      localStorage.setItem('stockmaster_customer_name', name); 
      showToast(`Selamat Datang, ${name}!`); refreshData();
  };

  const handleLogout = () => { setIsAuthenticated(false); setIsAdmin(false); setLoginName(''); setLoginPass(''); };

  const handleSaveItem = async (data: InventoryFormData) => {
      setLoading(true);
      if (editItem) {
          const updatedItem = { ...data, id: editItem.id, lastUpdated: Date.now() };
          const success = await updateInventoryInSheet(updatedItem);
          if (success) {
              showToast('Update terkirim!');
              setItems(prev => prev.map(i => i.id === editItem.id ? updatedItem : i));
          } else showToast('Gagal update', 'error');
      } else {
          if (items.some(i => i.partNumber === data.partNumber)) { showToast('Part Number ada!', 'error'); setLoading(false); return; }
          const success = await addInventoryToSheet(data);
          if (success) {
              showToast('Terkirim ke Sheet!');
              const newItem = { ...data, id: data.partNumber, lastUpdated: Date.now(), imageUrl: '' };
              setItems(prev => [newItem, ...prev]);
              setTimeout(refreshData, 2000); 
          } else showToast('Gagal kirim', 'error');
      }
      setIsEditing(false); setEditItem(null); setLoading(false);
  };
  
  const handleDelete = async (id: string) => {
      if(confirm('Hapus dari Google Sheet?')) {
          setLoading(true);
          const itemToDelete = items.find(i => i.id === id);
          if (itemToDelete) {
              const success = await deleteInventoryFromSheet(itemToDelete.partNumber);
              if (success) {
                  showToast('Dihapus');
                  setItems(prev => prev.filter(i => i.id !== id));
              } else showToast('Gagal hapus', 'error');
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

  const doCheckout = (name: string) => {
      const newOrder: Order = {
          id: generateId(), customerName: name, items: [...cart], 
          totalAmount: cart.reduce((a,b)=>a+(b.price*b.cartQuantity),0), status: 'pending', timestamp: Date.now()
      };
      setOrders([newOrder, ...orders]);
      setItems(prev => prev.map(i => {
          const c = cart.find(x => x.id === i.id);
          return c ? {...i, quantity: Math.max(0, i.quantity - c.cartQuantity)} : i;
      }));
      setCart([]);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...orders]));
      showToast('Pesanan dibuat!');
  };

  const handleSendMessage = (customerId: string, text: string, sender: 'user' | 'admin') => {
    const newMessage: Message = { id: Date.now().toString(), sender, text, timestamp: Date.now(), read: false };
    setChatSessions(prev => {
        const idx = prev.findIndex(s => s.customerId === customerId);
        if (idx > -1) {
            const updated = [...prev]; updated[idx].messages.push(newMessage); updated[idx].lastMessage = text; updated[idx].lastTimestamp = Date.now();
            sender === 'user' ? updated[idx].unreadAdminCount++ : updated[idx].unreadUserCount++;
            return updated;
        } else {
            return [...prev, { customerId, customerName: loginName || `Guest ${customerId.slice(-4)}`, messages: [newMessage], lastMessage: text, lastTimestamp: Date.now(), unreadAdminCount: sender==='user'?1:0, unreadUserCount: sender==='admin'?1:0 }];
        }
    });
  };

  if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4 font-sans">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl -ml-5 -mb-5"></div>

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="bg-white p-4 rounded-2xl shadow-lg ring-1 ring-gray-100">
                            <Package size={40} className="text-blue-600" strokeWidth={1.5} />
                        </div>
                    </div>
                    
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">StockMaster</h1>
                        <p className="text-gray-500 text-sm">Sistem Inventaris & Penjualan</p>
                    </div>
                    
                    <form onSubmit={handleGlobalLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Identitas</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="text" 
                                    value={loginName}
                                    onChange={(e) => setLoginName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                    placeholder="Nama Anda..."
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Kode Akses <span className="text-gray-300 font-normal">(Opsional)</span></label>
                            <div className="relative group">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input 
                                    type="password" 
                                    value={loginPass}
                                    onChange={(e) => setLoginPass(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                    placeholder="Password Admin"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <span>Masuk Aplikasi</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-3">
                        <button 
                            onClick={() => loginAsCustomer('Tamu')}
                            className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors py-2 px-4 hover:bg-blue-50 rounded-lg w-full text-center"
                        >
                            Masuk sebagai Tamu
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  if (loading) return (
      <div className="flex flex-col h-screen items-center justify-center bg-white font-sans text-gray-600 space-y-6">
          <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                  <CloudLightning size={20} className="text-blue-600 animate-pulse" />
              </div>
          </div>
          <div className="text-center space-y-1">
              <p className="font-medium text-gray-900">Menghubungkan Database</p>
              <p className="text-xs text-gray-400">Sinkronisasi Google Sheet...</p>
          </div>
      </div>
  );

  // ANTI-CRASH: Pastikan array valid sebelum dihitung
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeChats = Array.isArray(chatSessions) ? chatSessions : [];
  
  const pendingOrdersCount = safeOrders.filter(o => o.status === 'pending').length;
  const unreadChatCount = safeChats.reduce((sum, s) => sum + (s.unreadAdminCount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Navbar */}
      <div className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView(isAdmin ? 'inventory' : 'shop')}>
              <div className={`${isAdmin ? 'bg-purple-600' : 'bg-blue-600'} text-white p-2.5 rounded-xl shadow-md group-hover:scale-105 transition-transform`}>
                  {isAdmin ? <ShieldCheck size={20} /> : <Package size={20} />}
              </div>
              <div>
                  <div className="font-bold leading-none text-gray-900">StockMaster</div>
                  <div className={`text-[10px] font-bold mt-0.5 px-1.5 py-0.5 rounded-md inline-block ${isAdmin ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {isAdmin ? 'ADMIN ACCESS' : 'STORE FRONT'}
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button onClick={() => { refreshData(); showToast('Data direfresh'); }} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full transition-colors" title="Refresh Data">
                  <RefreshCw size={20} />
              </button>

              {isAdmin ? (
                  <>
                    <button onClick={() => setActiveView('inventory')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='inventory'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}><Package size={18}/> Gudang</button>
                    <button onClick={() => setActiveView('orders')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='orders'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}>
                        <ClipboardList size={18}/> Pesanan
                        {pendingOrdersCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{pendingOrdersCount}</span>}
                    </button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200':'text-gray-500 hover:bg-gray-50'}`}>
                        <MessageSquare size={18}/> Chat
                        {unreadChatCount > 0 && <span className="bg-red-500 text-white text-[10px] h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-1">{unreadChatCount}</span>}
                    </button>
                  </>
              ) : (
                  <>
                    <button onClick={() => setActiveView('shop')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='shop'?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}><Home size={18}/> Belanja</button>
                    <button onClick={() => setActiveView('chat')} className={`hidden md:flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${activeView==='chat'?'bg-blue-50 text-blue-700 ring-1 ring-blue-200':'text-gray-500 hover:bg-gray-50'}`}><MessageSquare size={18}/> Chat</button>
                  </>
              )}
              
              <div className="h-8 w-px bg-gray-200 mx-2"></div>
              
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all" title="Keluar">
                  <span className="text-xs font-semibold hidden lg:inline">{loginName}</span>
                  <LogOut size={20} />
              </button>
          </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 pb-24 md:pb-10">
        {activeView === 'shop' && !isAdmin && <ShopView items={items} cart={cart} onAddToCart={addToCart} onRemoveFromCart={(id)=>setCart(c=>c.filter(x=>x.id!==id))} onCheckout={doCheckout} />}
        {activeView === 'chat' && <div className="max-w-2xl mx-auto h-[calc(100vh-140px)]"><ChatView isAdmin={isAdmin} currentCustomerId={isAdmin ? 'ADMIN' : myCustomerId} chatSessions={chatSessions} onSendMessage={handleSendMessage} onMarkAsRead={(cid)=>setChatSessions(prev=>prev.map(s=>s.customerId===cid?{...s, [isAdmin?'unreadAdminCount':'unreadUserCount']:0}:s))} /></div>}
        {activeView === 'inventory' && isAdmin && (isEditing ? <ItemForm initialData={editItem || undefined} onSubmit={handleSaveItem} onCancel={()=>{setIsEditing(false); setEditItem(null)}} /> : <Dashboard items={items} onAddNew={()=>{setEditItem(null); setIsEditing(true)}} onEdit={(i)=>{setEditItem(i); setIsEditing(true)}} onDelete={handleDelete} />)}
        {activeView === 'orders' && isAdmin && <OrderManagement orders={orders} onUpdateStatus={(id, s)=>setOrders(o=>o.map(x=>x.id===id?{...x, status:s}:x))} />}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} h-16`}>
            {isAdmin ? (
                <>
                    <button onClick={()=>setActiveView('inventory')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='inventory'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}>
                        <Package size={22} className={activeView==='inventory'?'fill-purple-100':''} /><span className="text-[10px] font-medium">Gudang</span>
                    </button>
                    <button onClick={()=>setActiveView('orders')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='orders'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}>
                        <div className="relative"><ClipboardList size={22} className={activeView==='orders'?'fill-purple-100':''} />{pendingOrdersCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}</div><span className="text-[10px] font-medium">Pesanan</span>
                    </button>
                    <button onClick={()=>setActiveView('chat')} className={`relative flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-purple-600':'text-gray-400 hover:text-gray-600'}`}>
                        <div className="relative"><MessageSquare size={22} className={activeView==='chat'?'fill-purple-100':''} />{unreadChatCount>0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>}</div><span className="text-[10px] font-medium">Chat</span>
                    </button>
                </>
            ) : (
                <>
                    <button onClick={()=>setActiveView('shop')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='shop'?'text-blue-600':'text-gray-400 hover:text-gray-600'}`}>
                        <Home size={22} className={activeView==='shop'?'fill-blue-100':''} /><span className="text-[10px] font-medium">Belanja</span>
                    </button>
                    <button onClick={()=>setActiveView('chat')} className={`flex flex-col items-center justify-center gap-1 ${activeView==='chat'?'text-blue-600':'text-gray-400 hover:text-gray-600'}`}>
                        <MessageSquare size={22} className={activeView==='chat'?'fill-blue-100':''} /><span className="text-[10px] font-medium">Chat</span>
                    </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => <Router><AppContent /></Router>;
export default App;