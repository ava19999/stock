// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// Helper: Tampilkan alert jika error database agar ketahuan penyebabnya
const handleDbError = (operation: string, error: any) => {
  console.error(`${operation} Error:`, error);
  alert(`Gagal ${operation}! Pesan Database: ${error.message || JSON.stringify(error)}`);
};

// --- INVENTORY SERVICES ---

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
    let query = supabase.from('inventory').select('*', { count: 'exact' }).order('last_updated', { ascending: false });
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
      lastUpdated: Number(item.last_updated) || Date.now()
    }));
    return { data: mappedData, count: count || 0 };
  } catch (err) {
    console.error(err);
    return { data: [], count: 0 };
  }
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
    const res = await fetchInventoryPaginated(1, 2000, '');
    return res.data;
};

// --- SHOP SERVICES ---

export const fetchShopItems = async (page: number = 1, limit: number = 20, search: string = '', category: string = 'Semua') => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let query = supabase.from('inventory').select('*', { count: 'exact' }).gt('quantity', 0).gt('price', 0).order('name', { ascending: true });
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
    if (error) return { data: [], count: 0 };
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
      lastUpdated: Number(item.last_updated) || Date.now()
    }));
    return { data: mappedData, count: count || 0 };
  } catch (err) {
    return { data: [], count: 0 };
  }
};

// --- CRUD INVENTORY (UPDATED) ---

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
    if (error) { handleDbError("Tambah Barang", error); return false; }
    return true;
  } catch (e) { console.error(e); return false; }
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  try {
    // KITA UPDATE SEMUA KOLOM
    // JIKA ADA KOLOM YANG TIDAK ADA DI DB (MISAL cost_price), INI AKAN ERROR (BAGUS, SUPAYA KETAHUAN)
    const { data, error } = await supabase.from('inventory').update({
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
    })
    .eq('id', item.id) // Kunci update ID
    .select(); // Minta balikan data untuk konfirmasi

    if (error) { 
        handleDbError("Update Stok Barang", error); 
        return false; 
    }
    
    // DETEKSI SILENT FAIL: Sukses query tapi 0 baris terupdate
    if (!data || data.length === 0) {
        console.warn("Update sukses 0 row. ID tidak ditemukan:", item.id);
        alert(`GAGAL UPDATE STOK! Server menolak update untuk barang: ${item.name}. (Kemungkinan ID tidak cocok atau RLS aktif)`);
        return false;
    }
    return true;
  } catch (e) { console.error(e); return false; }
};

export const deleteInventory = async (partNumber: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('inventory').delete().eq('part_number', partNumber);
    if (error) { handleDbError("Hapus Barang", error); return false; }
    return true;
  } catch { return false; }
};

// --- ORDER SERVICES ---

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).range(0, 4999);
    if (error || !data) return [];
    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name || 'Guest',
      items: o.items || [], 
      totalAmount: Number(o.total_amount) || 0,
      status: o.status,
      timestamp: Number(o.timestamp)
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
    if (error) { handleDbError("Simpan Order", error); return false; }
    return true;
  } catch { return false; }
};

export const updateOrderStatusService = async (orderId: string, status: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) { handleDbError("Update Status Order", error); return false; }
    return true;
  } catch { return false; }
};

// --- HISTORY SERVICES ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
  try {
    const { data, error } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false }).range(0, 4999);
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
      price: Number(h.price) || 0, 
      totalPrice: Number(h.total_price) || 0,
      timestamp: Number(h.timestamp),
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
      price: history.price, 
      total_price: history.totalPrice,
      timestamp: history.timestamp,
      reason: history.reason
    }]);
    
    if (error) { 
        handleDbError("Simpan Riwayat", error); 
        return false; 
    }
    return true;
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
    if (error) { console.error("Chat Error:", error); return false; }
    return true;
  } catch { return false; }
};