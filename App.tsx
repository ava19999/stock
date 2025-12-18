// FILE: src/App.tsx
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ClipboardList, 
  MessageSquare, 
  Menu, 
  X, 
  LogOut,
  User,
  PlusCircle,
  BarChart3
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ShopView } from './components/ShopView';
import { OrderManagement } from './components/OrderManagement'; // Fitur Scan Resi sekarang ada di sini
import { CustomerOrderView } from './components/CustomerOrderView';
import { ChatView } from './components/ChatView';
import { ItemForm } from './components/ItemForm';
import { 
  fetchInventory, 
  fetchOrders, 
  fetchInventoryStats, 
  addInventory, 
  updateInventory, 
  deleteInventory,
  updateOrderStatusService 
} from './services/supabaseService';
import { InventoryItem, InventoryFormData, OrderStatus } from './types';

// Login sederhana (Hardcoded untuk demo)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '123'
};

function App() {
  // State Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'customer' | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // State Aplikasi
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, totalStock: 0, totalAsset: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Initial Load ---
  useEffect(() => {
    const checkSession = localStorage.getItem('stock_session');
    if (checkSession) {
      const session = JSON.parse(checkSession);
      setIsAuthenticated(true);
      setUserRole(session.role);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsProcessing(true);
    try {
      const [invData, statData, orderData] = await Promise.all([
        fetchInventory(),
        fetchInventoryStats(),
        fetchOrders()
      ]);
      setInventory(invData);
      setStats(statData);
      setOrders(orderData);
    } catch (error) {
      console.error("Gagal memuat data:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput === ADMIN_CREDENTIALS.username && passwordInput === ADMIN_CREDENTIALS.password) {
      const session = { role: 'admin', timestamp: Date.now() };
      localStorage.setItem('stock_session', JSON.stringify(session));
      setIsAuthenticated(true);
      setUserRole('admin');
      setActiveView('dashboard');
    } else if (usernameInput === 'user') {
      const session = { role: 'customer', timestamp: Date.now() };
      localStorage.setItem('stock_session', JSON.stringify(session));
      setIsAuthenticated(true);
      setUserRole('customer');
      setActiveView('shop');
    } else {
      alert('Login Gagal! Coba username: admin / password: 123');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('stock_session');
    setIsAuthenticated(false);
    setUserRole(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  // --- Data Handlers ---
  const handleAddItem = async (formData: InventoryFormData) => {
    setIsProcessing(true);
    const newId = await addInventory(formData);
    if (newId) {
      await loadData();
      setActiveView('inventory');
    } else {
      alert("Gagal menambah barang");
    }
    setIsProcessing(false);
  };

  const handleUpdateItem = async (item: InventoryItem, field: keyof InventoryItem, value: any) => {
    // Optimistic Update
    const updatedItem = { ...item, [field]: value };
    setInventory(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    
    // Server Update
    await updateInventory(updatedItem);
    await loadData(); // Refresh untuk memastikan data sinkron
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Yakin hapus barang ini?')) {
      setIsProcessing(true);
      const success = await deleteInventory(id);
      if (success) await loadData();
      setIsProcessing(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setIsProcessing(true);
    const success = await updateOrderStatusService(orderId, status);
    if (success) await loadData();
    setIsProcessing(false);
  };

  // --- Tampilan Login ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <BarChart3 className="text-white w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Stock Master AI</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="•••"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-600/30"
            >
              Masuk
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Demo Admin: admin / 123</p>
            <p>Demo User: user / (bebas)</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Tampilan User Customer ---
  if (userRole === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm px-4 py-3 sticky top-0 z-30 flex justify-between items-center">
           <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ShoppingBag className="text-blue-600"/> Toko Online</h1>
           <button onClick={handleLogout} className="text-sm text-red-600 font-bold">Keluar</button>
        </nav>
        <div className="flex-1 overflow-auto">
           {activeView === 'shop' && <CustomerOrderView />} 
        </div>
        {/* Bottom Nav untuk Mobile Customer bisa ditambahkan di sini */}
      </div>
    );
  }

  // --- Tampilan Admin Dashboard ---
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Stok Barang', icon: ShoppingBag },
    { id: 'add-item', label: 'Tambah Barang', icon: PlusCircle },
    // MENU SCAN RESI DIHAPUS DARI SINI KARENA SUDAH ADA DI DALAM ORDERS
    { id: 'orders', label: 'Pesanan & Scan', icon: ClipboardList }, 
    { id: 'chat', label: 'Live Chat', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside 
        className={`bg-slate-900 text-white transition-all duration-300 flex flex-col fixed md:relative z-40 h-full
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <div className="bg-blue-600 p-1.5 rounded-lg"><BarChart3 size={20}/></div>
              <span>StockMaster</span>
            </div>
          ) : (
            <div className="mx-auto bg-blue-600 p-2 rounded-xl"><BarChart3 size={24}/></div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
                ${!isSidebarOpen && 'justify-center'}
              `}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon size={20} className={activeView === item.id ? 'animate-pulse' : ''} />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors
              ${!isSidebarOpen && 'justify-center'}
            `}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-bold text-sm">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header Mobile */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-800">Stock Master</span>
          <div className="w-8"></div> 
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 relative">
          {activeView === 'dashboard' && (
            <Dashboard stats={stats} />
          )}

          {activeView === 'inventory' && (
            <ShopView 
              items={inventory} 
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onRefresh={loadData}
            />
          )}

          {activeView === 'add-item' && (
            <ItemForm onSave={handleAddItem} onCancel={() => setActiveView('inventory')} />
          )}

          {activeView === 'orders' && (
            <OrderManagement 
              orders={orders} 
              onUpdateStatus={handleUpdateOrderStatus}
              onProcessReturn={() => {}} // Handle return logic internal
              onRefresh={loadData}
            />
          )}

          {activeView === 'chat' && (
            <ChatView />
          )}
        </div>
      </main>

      {/* Overlay untuk Mobile Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;