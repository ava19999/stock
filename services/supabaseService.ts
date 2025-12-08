// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// --- INVENTORY SERVICES (GUDANG / DASHBOARD) ---

// 1. STATISTIK RINGAN (Hanya ambil angka, agar loading dashboard cepat)
export const fetchInventoryStats = async () => {
  try {
    const { data, error } = await supabase.from('inventory').select('price, quantity');
    if (error || !data) return { totalItems: 0, totalStock: 0, totalAsset: 0 };

    const totalItems = data.length;
    const totalStock = data.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const totalAsset = data.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

    return { totalItems, totalStock, totalAsset };
  } catch {
    return { totalItems: 0, totalStock: 0, totalAsset: 0 };
  }
};

// 2. FETCH DATA DENGAN PAGINATION (50 Item per halaman)
export const fetchInventoryPaginated = async (page: number = 1, limit: number = 50, search: string = '') => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .order('last_updated', { ascending: false });

    // PENCARIAN PINTAR (Smart Search)
    if (search) {
      const terms = search.trim().split(/\s+/);
      terms.forEach(term => {
        query = query.or(`name.ilike.%${term}%,part_number.ilike.%${term}%,description.ilike.%${term}%`);
      });
    }

    // BATASI HANYA 50 ITEM (Agar Enteng)
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching inventory:', error.message);
      return { data: [], count: 0 };
    }

    // Mapping Data
    const mappedData = (data || []).map((item: any) => ({
      id: item.id,
      partNumber: item.part_number || '',
      name: item.name || 'Tanpa Nama',
      description: item.description || '',
      price: Number(item.price) || 0,
      costPrice: Number(item.cost_price) || 0,
      quantity: Number(item.quantity) || 0,
      initialStock: Number(item.initial_stock) || 0,
      qtyIn: Number(item.qty_in) || 0,
      qtyOut: Number(item.qty_out) || 0,
      shelf: item.shelf || '',
      imageUrl: item.image_url || '',
      ecommerce: item.ecommerce || '',
      lastUpdated: item.last_updated
    }));

    return { data: mappedData, count: count || 0 };
  } catch (err) {
    console.error(err);
    return { data: [], count: 0 };
  }
};

// 3. FETCH SEMUA (Hanya untuk keperluan khusus/legacy, tidak dipakai di Dashboard utama)
export const fetchInventory = async (): Promise<InventoryItem[]> => {
    // Kita arahkan ke paginated page 1 agar tidak error jika ada komponen lain yang memanggil ini
    const res = await fetchInventoryPaginated(1, 50, '');
    return res.data;
};

// --- SHOP SERVICES (BERANDA / TOKO) ---

export const fetchShopItems = async (page: number = 1, limit: number = 20, search: string = '', category: string = 'Semua') => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .gt('quantity', 0)  // Hanya Stok > 0
      .gt('price', 0)     // Hanya Harga > 0
      .order('name', { ascending: true });

    if (category !== 'Semua') {
       query = query.ilike('description', `%[${category}]%`);
    }

    if (search) {
      const terms = search.trim().split(/\s+/);
      terms.forEach(term => {
        query = query.or(`name.ilike.%${term}%,part_number.ilike.%${term}%,description.ilike.%${term}%`);
      });
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      return { data: [], count: 0 };
    }

    const mappedData = (data || []).map((item: any) => ({
      id: item.id,
      partNumber: item.part_number || '',
      name: item.name || 'Tanpa Nama',
      description: item.description || '',
      price: Number(item.price) || 0,
      costPrice: Number(item.cost_price) || 0,
      quantity: Number(item.quantity) || 0,
      initialStock: Number(item.initial_stock) || 0,
      qtyIn: Number(item.qty_in) || 0,
      qtyOut: Number(item.qty_out) || 0,
      shelf: item.shelf || '',
      imageUrl: item.image_url || '',
      ecommerce: item.ecommerce || '',
      lastUpdated: item.last_updated
    }));

    return { data: mappedData, count: count || 0 };
  } catch (err) {
    return { data: [], count: 0 };
  }
};

// --- CRUD INVENTORY (ADD, UPDATE, DELETE) ---

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  try {
    const { error } = await supabase.from('inventory').insert([{
      part_number: item.partNumber,
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.costPrice,
      quantity: item.quantity,
      initial_stock: item.initialStock,
      qty_in: item.qtyIn,
      qty_out: item.qtyOut,
      shelf: item.shelf,
      image_url: item.imageUrl,
      ecommerce: item.ecommerce,
      last_updated: new Date().toISOString()
    }]);
    return !error;
  } catch { return false; }
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  try {
    const { error } = await supabase.from('inventory').update({
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.costPrice,
      quantity: item.quantity,
      initial_stock: item.initialStock,
      qty_in: item.qtyIn,
      qty_out: item.qtyOut,
      shelf: item.shelf,
      image_url: item.imageUrl,
      ecommerce: item.ecommerce,
      last_updated: new Date().toISOString()
    }).eq('part_number', item.partNumber);
    return !error;
  } catch { return false; }
};

export const deleteInventory = async (partNumber: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('inventory').delete().eq('part_number', partNumber);
    return !error;
  } catch { return false; }
};

// --- ORDER SERVICES ---

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(0, 4999); // Ambil 5000 pesanan terakhir (cukup aman untuk history)

    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name || 'Guest',
      items: o.items || [],
      totalAmount: Number(o.total_amount) || 0,
      status: o.status,
      timestamp: o.timestamp
    }));
  } catch { return []; }
};

export const saveOrder = async (order: Order): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').insert([{
      id: order.id,
      customer_name: order.customerName,
      items: order.items,
      total_amount: order.totalAmount,
      status: order.status,
      timestamp: order.timestamp
    }]);
    return !error;
  } catch { return false; }
};

export const updateOrderStatusService = async (orderId: string, status: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    return !error;
  } catch { return false; }
};

// --- HISTORY SERVICES ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(0, 4999);

    if (error || !data) return [];
    
    return data.map((h: any) => ({
      id: h.id,
      itemId: h.item_id,
      partNumber: h.part_number,
      name: h.name,
      type: h.type,
      quantity: Number(h.quantity) || 0,
      previousStock: Number(h.previous_stock) || 0,
      currentStock: Number(h.current_stock) || 0,
      timestamp: h.timestamp,
      reason: h.reason || ''
    }));
  } catch { return []; }
};

export const addHistoryLog = async (history: StockHistory): Promise<boolean> => {
  try {
    const { error } = await supabase.from('stock_history').insert([{
      id: history.id,
      item_id: history.itemId,
      part_number: history.partNumber,
      name: history.name,
      type: history.type,
      quantity: history.quantity,
      previous_stock: history.previousStock,
      current_stock: history.currentStock,
      timestamp: history.timestamp,
      reason: history.reason
    }]);
    return !error;
  } catch { return false; }
};

// --- CHAT SERVICES ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const { data, error } = await supabase.from('chat_sessions').select('*').range(0, 1999);
    if (error || !data) return [];
    return data.map((c: any) => ({
      customerId: c.customer_id,
      customerName: c.customer_name || 'Guest',
      messages: c.messages || [],
      lastMessage: c.last_message || '',
      lastTimestamp: c.last_timestamp,
      unreadAdminCount: c.unread_admin_count || 0,
      unreadUserCount: c.unread_user_count || 0
    }));
  } catch { return []; }
};

export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  try {
    const { error } = await supabase.from('chat_sessions').upsert([{
      customer_id: session.customerId,
      customer_name: session.customerName,
      messages: session.messages,
      last_message: session.lastMessage,
      last_timestamp: session.lastTimestamp,
      unread_admin_count: session.unreadAdminCount,
      unread_user_count: session.unreadUserCount
    }]);
    return !error;
  } catch { return false; }
};