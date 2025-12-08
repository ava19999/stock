// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// --- INVENTORY SERVICES (GUDANG / DASHBOARD) ---

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

export const fetchInventoryPaginated = async (page: number = 1, limit: number = 50, search: string = '') => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' })
      .order('last_updated', { ascending: false });

    if (search) {
      const terms = search.trim().split(/\s+/);
      terms.forEach(term => {
        query = query.or(`name.ilike.%${term}%,part_number.ilike.%${term}%,description.ilike.%${term}%`);
      });
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching inventory:', error.message);
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
      // Konversi String ISO dari DB balik ke Number (agar konsisten)
      lastUpdated: item.last_updated ? new Date(item.last_updated).getTime() : Date.now()
    }));

    return { data: mappedData, count: count || 0 };
  } catch (err) {
    console.error(err);
    return { data: [], count: 0 };
  }
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
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
      .gt('quantity', 0)
      .gt('price', 0)
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
      // Konversi balik ke Number
      lastUpdated: item.last_updated ? new Date(item.last_updated).getTime() : Date.now()
    }));

    return { data: mappedData, count: count || 0 };
  } catch (err) {
    return { data: [], count: 0 };
  }
};

// --- CRUD INVENTORY ---

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
      // Kirim sebagai ISO String
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
      // Kirim sebagai ISO String
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
      .range(0, 4999);

    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name || 'Guest',
      items: o.items || [],
      totalAmount: Number(o.total_amount) || 0,
      status: o.status,
      // Cek apakah timestamp string (ISO) atau number, konversi ke number
      timestamp: typeof o.timestamp === 'string' ? new Date(o.timestamp).getTime() : (o.timestamp || Date.now())
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
      // Pastikan formatnya sesuai dengan tipe kolom di DB Orders (jika masih bigint pakai number, jika sudah diubah pakai ISOString)
      // Asumsi: Tabel orders masih bigint, gunakan order.timestamp. 
      // JIKA tabel orders juga diubah ke timestamptz, ganti jadi: new Date(order.timestamp).toISOString()
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

// --- HISTORY SERVICES (INI YANG PENTING UNTUK RIWAYAT KELUAR) ---

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
      
      // Harga
      price: Number(h.price) || 0,
      totalPrice: Number(h.total_price) || 0,
      
      previousStock: Number(h.previous_stock) || 0,
      currentStock: Number(h.current_stock) || 0,
      
      // PERBAIKAN: Konversi String dari DB kembali ke Number untuk Aplikasi
      timestamp: h.timestamp ? new Date(h.timestamp).getTime() : Date.now(),
      
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
      
      // Harga
      price: history.price,
      total_price: history.totalPrice,
      
      previous_stock: history.previousStock,
      current_stock: history.currentStock,
      
      // PERBAIKAN: Ubah Number dari Aplikasi ke ISO String untuk Database
      timestamp: new Date(history.timestamp).toISOString(),
      
      reason: history.reason
    }]);
    
    if (error) console.error("Gagal simpan history:", error);
    return !error;
  } catch (e) { 
    console.error(e);
    return false; 
  }
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
      lastTimestamp: c.last_timestamp, // Sesuaikan jika chat juga menggunakan timestamp
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