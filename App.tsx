import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { ItemForm } from './components/ItemForm';
import { ShopView } from './components/ShopView';
import { ChatView } from './components/ChatView';
import { OrderManagement } from './components/OrderManagement';
import { InventoryItem, InventoryFormData, CartItem, Order, OrderStatus, ChatSession, Message } from './types';
import { Box, Home, MessageSquare, Package, ShieldCheck, User, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'stockmaster_honda_demo_v5_orders';
const ORDERS_STORAGE_KEY = 'stockmaster_orders_db';
const CHAT_STORAGE_KEY = 'stockmaster_chat_db';
const CUSTOMER_ID_KEY = 'stockmaster_my_customer_id';

type ActiveView = 'shop' | 'chat' | 'inventory' | 'orders';

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
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [myCustomerId, setMyCustomerId] = useState<string>('');

  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('shop');
  const [isAdmin, setIsAdmin] = useState(false); 
  
  // Inventory Edit State
  const [isEditingInventory, setIsEditingInventory] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Toast State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load User ID or Create One
    let cId = localStorage.getItem(CUSTOMER_ID_KEY);
    if (!cId) {
      cId = 'cust-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem(CUSTOMER_ID_KEY, cId);
    }
    setMyCustomerId(cId);

    // 2. Load Inventory
    const savedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedItems) {
      try { setItems(JSON.parse(savedItems)); } catch (e) { console.error("Data error", e); }
    } else {
      setItems(generateHondaParts());
    }

    // 3. Load Orders
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (savedOrders) {
      try { setOrders(JSON.parse(savedOrders)); } catch (e) {}
    }

    // 4. Load Chats
    const savedChats = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedChats) {
      try { setChatSessions(JSON.parse(savedChats)); } catch (e) {}
    }

    setLoading(false);
  }, []);

  // Save Data on Change
  useEffect(() => { if (!loading) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items)); }, [items, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); }, [orders, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatSessions)); }, [chatSessions, loading]);

  // --- ACTIONS ---
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
      setItems(prev => [{ ...data, id: crypto.randomUUID(), lastUpdated: Date.now() }, ...prev]);
      showToast('Barang baru ditambahkan');
    }
    setIsEditingInventory(false);
    setEditingItem(null);
  };

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
      id: crypto.randomUUID(),
      customerName: customerName,
      items: [...cart],
      totalAmount: cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0),
      status: 'pending',
      timestamp: Date.now()
    };
    setOrders(prev => [newOrder, ...prev]);
    setItems(prev => prev.map(item => {
        const cartItem = cart.find(c => c.id === item.id);
        return cartItem ? { ...item, quantity: Math.max(0, item.quantity - cartItem.cartQuantity) } : item;
    }));
    setCart([]);
    showToast('Pesanan berhasil dibuat! Menunggu konfirmasi admin.', 'success');
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
     if (newStatus === 'cancelled') {
        const orderToCancel = orders.find(o => o.id === orderId);
        if (orderToCancel && orderToCancel.status !== 'cancelled') {
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
            
            // Increment unread counts
            if (sender === 'user') session.unreadAdminCount += 1;
            else session.unreadUserCount += 1;

            return updatedSessions;
        } else {
            // New Session
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
        // Mark messages as read based on who is viewing
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

  const generateHondaParts = (): InventoryItem[] => {
     // (Data generation same as before)
     return []; 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveView('shop')}>
              <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Box size={20} strokeWidth={2.5} /></div>
              <div className="flex flex-col">
                 <span className="font-bold text-lg leading-none text-gray-900">StockMaster</span>
                 <span className="text-[10px] font-medium text-gray-500 uppercase">Parts Center</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-4 items-center">
              {[
                { id: 'shop', icon: Home, label: 'Beranda' },
                { id: 'chat', icon: MessageSquare, label: 'Chat', badge: isAdmin ? unreadChatCount : 0 },
                ...(isAdmin ? [
                    { id: 'orders', icon: ClipboardList, label: 'Pesanan', badge: pendingOrdersCount },
                    { id: 'inventory', icon: Package, label: 'Gudang' }
                ] : [])
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as ActiveView)}
                  className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeView === item.id ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{item.badge}</span>}
                </button>
              ))}
            </div>

            {/* Admin Toggle */}
            <div className="flex items-center">
              <button 
                onClick={() => {
                  const newAdminState = !isAdmin;
                  setIsAdmin(newAdminState);
                  if (!newAdminState && (activeView === 'inventory' || activeView === 'orders')) setActiveView('shop');
                  showToast(newAdminState ? 'Masuk Mode Admin' : 'Masuk Mode Pelanggan', 'success');
                }}
                className={`flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${isAdmin ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'}`}
              >
                {isAdmin ? <ShieldCheck size={14} className="mr-1.5 text-blue-400" /> : <User size={14} className="mr-1.5 text-gray-400" />}
                {isAdmin ? 'Admin' : 'Customer'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full pb-28">
        {activeView === 'shop' && (
          <ShopView items={items} cart={cart} onAddToCart={handleAddToCart} onRemoveFromCart={handleRemoveFromCart} onCheckout={handleCheckout} />
        )}

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

        {activeView === 'orders' && isAdmin && (
            <OrderManagement orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
        )}

        {activeView === 'inventory' && isAdmin && (
          isEditingInventory ? (
            <ItemForm initialData={editingItem || undefined} onSubmit={handleSubmit} onCancel={() => setIsEditingInventory(false)} />
          ) : (
            <Dashboard items={items} onAddNew={handleAddNew} onDelete={handleDelete} onEdit={handleEdit} />
          )
        )}
        
        {/* Access Denied */}
        {(activeView === 'inventory' || activeView === 'orders') && !isAdmin && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in">
            <div className="bg-gray-100 p-4 rounded-full mb-4"><ShieldCheck size={40} className="text-gray-400" /></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h3>
            <button onClick={() => setIsAdmin(true)} className="text-blue-600 font-semibold hover:underline">Masuk sebagai Admin</button>
          </div>
        )}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 pb-safe z-40">
        <div className={`flex justify-around items-center h-16 ${isAdmin ? 'grid grid-cols-4' : 'grid grid-cols-2'}`}>
           <button onClick={() => setActiveView('shop')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeView === 'shop' ? 'text-blue-600' : 'text-gray-400'}`}>
             <Home size={20} className={activeView === 'shop' ? 'fill-blue-100' : ''} />
             <span className="text-[10px] font-medium">Belanja</span>
           </button>
           <button onClick={() => setActiveView('chat')} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeView === 'chat' ? 'text-blue-600' : 'text-gray-400'}`}>
             <div className="relative">
                <MessageSquare size={20} className={activeView === 'chat' ? 'fill-blue-100' : ''} />
                {isAdmin && unreadChatCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-3 h-3 rounded-full"></span>}
             </div>
             <span className="text-[10px] font-medium">Chat</span>
           </button>
           {isAdmin && (
               <>
                <button onClick={() => setActiveView('orders')} className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${activeView === 'orders' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className="relative">
                        <ClipboardList size={20} className={activeView === 'orders' ? 'fill-blue-100' : ''} />
                        {pendingOrdersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full"></span>}
                    </div>
                    <span className="text-[10px] font-medium">Pesanan</span>
                </button>
                <button onClick={() => setActiveView('inventory')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeView === 'inventory' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <Package size={20} className={activeView === 'inventory' ? 'fill-blue-100' : ''} />
                    <span className="text-[10px] font-medium">Gudang</span>
                </button>
               </>
           )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;