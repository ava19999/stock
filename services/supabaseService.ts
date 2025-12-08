// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// --- INVENTORY SERVICES (OPTIMIZED) ---

// 1. Fetch Ringan untuk Statistik (Hanya ambil angka, tanpa gambar/deskripsi)
export const fetchInventoryStats = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('price, quantity'); // Cuma ambil kolom penting

    if (error) return { totalItems: 0, totalStock: 0, totalAsset: 0 };

    const totalItems = data.length;
    const totalStock = data.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const totalAsset = data.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

    return { totalItems, totalStock, totalAsset };
  } catch {
    return { totalItems: 0, totalStock: 0, totalAsset: 0 };
  }
};

// 2. Fetch dengan Pagination & Search (Data Utama)
export const fetchInventoryPaginated = async (page: number = 1, limit: number = 50, search: string = '') => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' }) // Minta total jumlah data juga
      .order('last_updated', { ascending: false }) // Urutkan dari yang terbaru diedit
      .range(from, to);

    // Jika ada pencarian, filter di server (bukan di browser)
    if (search) {
      // Cari di nama ATAU part_number
      query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    }

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
      lastUpdated: item.last_updated
    }));

    return { data: mappedData, count: count || 0 };
  } catch (err) {
    console.error(err);
    return { data: [], count: 0 };
  }
};

// --- (Fungsi Add, Update, Delete TETAP SAMA seperti sebelumnya) ---
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
      last_updated: Date.now()
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
      last_updated: Date.now()
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
      .range(0, 100); // Batasi history awal 100 saja biar cepat

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
    const { data, error } = await supabase.from('chat_sessions').select('*').range(0, 100);
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

// Agar App.tsx tidak error karena fungsi lama hilang (backward compatibility)
export const fetchInventory = async (): Promise<InventoryItem[]> => {
    const res = await fetchInventoryPaginated(1, 50, '');
    return res.data;
};