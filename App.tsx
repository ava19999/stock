// FILE: src/App.tsx
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { InventoryItem, InventoryFormData, CartItem, Order, OrderStatus, ChatSession, Message } from './types';
import { generateId } from './utils';
import { Box, Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, ClipboardList, LogOut, Download, KeyRound } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'stockmaster_honda_demo_v5_orders';
const ORDERS_STORAGE_KEY = 'stockmaster_orders_db';
const CHAT_STORAGE_KEY = 'stockmaster_chat_db';
const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders' | 'login';

// --- Toast Component ---
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] flex items-center px-4 py-3 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 ${
      type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle size={18} className="mr-2 text-green-400" /> : <XCircle size={18} className="mr-2 text-white" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const AppContent: React.FC = () => {
  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User/Session State
  const [myCustomerId, setMyCustomerId] = useState<string>('');

  // Navigation & Auth State
  const [activeView, setActiveView] = useState<ActiveView>('shop');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  // Edit & Feature State
  const [isEditingInventory, setIsEditingInventory] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load User ID
    let cId = localStorage.getItem(CUSTOMER_ID_KEY);
    if (!cId) {
      cId = 'cust-' + generateId();
      localStorage.setItem(CUSTOMER_ID_KEY, cId);
    }
    setMyCustomerId(cId);

    // 2. Load Data from LocalStorage
    const loadData = (key: string) => {
        const data = localStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Error loading data", e);
            return null;
        }
    };

    setItems(loadData(LOCAL_STORAGE_KEY) || []);
    setOrders(loadData(ORDERS_STORAGE_KEY) || []);
    setChatSessions(loadData(CHAT_STORAGE_KEY) || []);
    setLoading(false);
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => { if (!loading) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); }, [items, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); }, [orders, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatSessions)); }, [chatSessions, loading]);

  // --- ADMIN AUTH ACTIONS ---
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // HARDCODED PASSWORD UNTUK DEMO
    if (adminPasswordInput === 'admin123') {
        setIsAdmin(true);
        setActiveView('inventory');
        showToast('Login Admin Berhasil');
        setAdminPasswordInput('');
    } else {
        showToast('Password Salah!', 'error');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setActiveView('shop');
    showToast('Logout Berhasil');
  };

  const handleBackupData = () => {
    const backupData = {
        exportedAt: new Date().toISOString(),
        items,
        orders,
        chatSessions
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Data berhasil didownload (JSON)');
  };

  // --- INVENTORY ACTIONS ---
  const handleAddNew = () => { setEditingItem(null); setIsEditingInventory(true); };
  const handleEdit = (item: InventoryItem) => { setEditingItem(item); setIsEditingInventory(true); };
  const handleDelete = (id: string) => {
    if (window.confirm('Hapus barang ini dari stok?')) {
      setItems(prev => prev.filter(item => item.id !== id));
      showToast('Barang berhasil dihapus');
    }
  };
  const handleSubmit = (data: InventoryFormData) => {
    if (editingItem) {
      setItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...data, lastUpdated: Date.now() } : item));
      showToast('Data barang diperbarui');
    } else {
      setItems(prev => [{ ...data, id: generateId(), lastUpdated: Date.now() }, ...prev]);
      showToast('Barang baru ditambahkan');
    }
    setIsEditingInventory(false);
    setEditingItem(null);
  };

  // --- SHOPPING ACTIONS ---
  const handleAddToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      return existing ? prev.map(c => c.id === item.id ? { ...c, cartQuantity: c.cartQuantity + 1 } : c) : [...prev, { ...item, cartQuantity: 1 }];
    });
    showToast(`${item.name} masuk keranjang`);
  };

  const handleRemoveFromCart = (itemId: string) => setCart(prev => prev.filter(item => item.id !== itemId));

  const handleCheckout = (customerName: string) => {
    const newOrder: Order = {
      id: generateId(),
      customerName: customerName,
      items: [...cart],
      totalAmount: cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0),
      status: 'pending',
      timestamp: Date.now()
    };
    setOrders(prev => [newOrder, ...prev]);
    // Reduce Stock
    setItems(prev => prev.map(item => {
        const cartItem = cart.find(c => c.id === item.id);
        return cartItem ? { ...item, quantity: Math.max(0, item.quantity - cartItem.cartQuantity) } : item;
    }));
    setCart([]);
    showToast('Pesanan berhasil dibuat! Menunggu konfirmasi admin.', 'success');
  };

  // --- ORDER MANAGEMENT ---
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
     if (newStatus === 'cancelled') {
        const orderToCancel = orders.find(o => o.id === orderId);
        if (orderToCancel && orderToCancel.status !== 'cancelled') {
             // Return stock logic
             setItems(prev => prev.map(item => {
                 const orderItem = orderToCancel.items.find(oi => oi.id === item.id);
                 return orderItem ? { ...item, quantity: item.quantity + orderItem.cartQuantity } : item;
             }));
             showToast('Pesanan dibatalkan. Stok dikembalikan.');
        }
     } else if (newStatus === 'completed') showToast('Pesanan selesai.');
     setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = (customerId: string, text: string, sender: 'user' | 'admin') => {
    const newMessage: Message = { id: Date.now().toString(), sender, text, timestamp: Date.now(), read: false };
    
    setChatSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.customerId === customerId);
        if (sessionIndex > -1) {
            const updatedSessions = [...prev];
            const session = updatedSessions[sessionIndex];
            session.messages.push(newMessage);
            session.lastMessage = text;
            session.lastTimestamp = Date.now();
            
            if (sender === 'user') session.unreadAdminCount += 1;
            else session.unreadUserCount += 1;

            return updatedSessions;
        } else {
            return [...prev, {
                customerId,
                customerName: `Guest ${customerId.slice(-4)}`,
                messages: [newMessage],
                lastMessage: text,
                lastTimestamp: Date.now(),
                unreadAdminCount: sender === 'user' ? 1 : 0,
                unreadUserCount: sender === 'admin' ? 1 : 0
            }];
        }
    });
  };

  const handleMarkAsRead = (customerId: string, reader: 'user' | 'admin') => {
    setChatSessions(prev => prev.map(s => {
        if (s.customerId !== customerId) return s;
        const updatedMessages = s.messages.map(m => {
            if (reader === 'admin' && m.sender === 'user') return { ...m, read: true };
            if (reader === 'user' && m.sender === 'admin') return { ...m, read: true };
            return m;
        });
        return {
            ...s,
            messages: updatedMessages,
            unreadAdminCount: reader === 'admin' ? 0 : s.unreadAdminCount,
            unreadUserCount: reader === 'user' ? 0 : s.unreadUserCount
        };
    }));
  };

  // Stats for badges
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const unreadChatCount = chatSessions.reduce((sum, s) => sum + s.unreadAdminCount, 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('shop')}>
              <div className="bg-gray-900 p-1.5 rounded-lg text-white"><Box size={20} strokeWidth={2.5} /></div>
              <div className="flex flex-col">
                 <span className="font-bold text-lg leading-none text-gray-900">StockMaster</span>
                 <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">AI Inventory</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-1 items-center">
              <NavButton active={activeView === 'shop'} onClick={() => setActiveView('shop')} icon={Home} label="Beranda" />
              <NavButton active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={MessageSquare} label="Chat" badge={!isAdmin ? 0 : unreadChatCount} />
              
              {isAdmin && (
                  <>
                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                    <NavButton active={activeView === 'orders'} onClick={() => setActiveView('orders')} icon={ClipboardList} label="Pesanan" badge={pendingOrdersCount} />
                    <NavButton active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} icon={Package} label="Gudang" />
                  </>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {isAdmin ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                      <button 
                        onClick={handleBackupData}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Download Backup Data"
                      >
                          <Download size={18} />
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        <LogOut size={14} className="mr-1.5" />
                        Keluar
                      </button>
                  </div>
              ) : (
                  <button 
                    onClick={() => setActiveView('login')}
                    className={`flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${activeView === 'login' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <ShieldCheck size={14} className={`mr-1.5 ${activeView === 'login' ? 'text-blue-400' : 'text-gray-400'}`} />
                    Admin
                  </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full pb-24 md:pb-6">
        
        {/* LOGIN VIEW */}
        {activeView === 'login' && !isAdmin && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm text-center">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="text-blue-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Admin</h2>
                    <p className="text-gray-500 text-sm mb-6">Masukkan password untuk mengelola stok.</p>
                    
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <input 
                            type="password" 
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center tracking-widest"
                            placeholder="Password..."
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-gray-900/20"
                        >
                            Masuk Dashboard
                        </button>
                    </form>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button onClick={() => setActiveView('shop')} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                            Kembali ke Menu Belanja
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* SHOP VIEW */}
        {activeView === 'shop' && (
          <ShopView items={items} cart={cart} onAddToCart={handleAddToCart} onRemoveFromCart={handleRemoveFromCart} onCheckout={handleCheckout} />
        )}

        {/* CHAT VIEW */}
        {activeView === 'chat' && (
          <div className="max-w-2xl mx-auto h-[calc(100vh-140px)]">
            <ChatView 
              isAdmin={isAdmin}
              currentCustomerId={myCustomerId}
              chatSessions={chatSessions}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
            />
          </div>
        )}

        {/* ADMIN: ORDERS */}
        {activeView === 'orders' && isAdmin && (
            <OrderManagement orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
        )}

        {/* ADMIN: INVENTORY */}
        {activeView === 'inventory' && isAdmin && (
          isEditingInventory ? (
            <ItemForm initialData={editingItem || undefined} onSubmit={handleSubmit} onCancel={() => setIsEditingInventory(false)} />
          ) : (
            <Dashboard items={items} onAddNew={handleAddNew} onDelete={handleDelete} onEdit={handleEdit} />
          )
        )}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 pb-safe z-50">
        <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} h-16 items-center`}>
           <MobileNavButton active={activeView === 'shop'} onClick={() => setActiveView('shop')} icon={Home} label="Belanja" />
           <MobileNavButton active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={MessageSquare} label="Chat" badge={!isAdmin ? 0 : unreadChatCount} />
           
           {isAdmin ? (
               <>
                <MobileNavButton active={activeView === 'orders'} onClick={() => setActiveView('orders')} icon={ClipboardList} label="Pesanan" badge={pendingOrdersCount} />
                <MobileNavButton active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} icon={Package} label="Gudang" />
               </>
           ) : (
               <MobileNavButton active={activeView === 'login'} onClick={() => setActiveView('login')} icon={User} label="Admin" />
           )}
        </div>
      </div>
    </div>
  );
};

// --- Sub Components for Nav ---
const NavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${active ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
  >
    <Icon size={18} className={active ? "fill-current opacity-20" : ""} />
    <span>{label}</span>
    {badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">{badge}</span>}
  </button>
);

const MobileNavButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}
  >
    <div className="relative">
       <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? "fill-blue-100" : ""} />
       {badge > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 w-2.5 h-2.5 rounded-full border border-white"></span>}
    </div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;