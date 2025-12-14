// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

const handleDbError = (op: string, err: any) => {
  console.error(`${op} Error:`, err);
};

// --- MAPPING UPDATED: No SKU, Yes Brand/App ---
const mapDbToInventoryItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
    // SKU dihapus dari mapping
    name: item.name,
    
    brand: item.brand || '',             
    application: item.application || '', 
    
    price: Number(item.price),
    kingFanoPrice: Number(item.king_fano_price || 0),
    costPrice: Number(item.cost_price),
    quantity: Number(item.quantity),
    initialStock: Number(item.initial_stock),
    qtyIn: Number(item.qty_in),
    qtyOut: Number(item.qty_out),
    shelf: item.shelf,
    imageUrl: item.image_url,
    ecommerce: item.ecommerce,
    lastUpdated: Number(item.last_updated)
});

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*').order('last_updated', { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map(mapDbToInventoryItem);
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapDbToInventoryItem(data);
};

export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all') => {
    let query = supabase.from('inventory').select('*', { count: 'exact' });
    if (search) {
        // Hapus SKU dari pencarian, tambahkan Brand & Application
        query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`);
    }
    if (filter === 'low') { query = query.gt('quantity', 0).lt('quantity', 4); } 
    else if (filter === 'empty') { query = query.or('quantity.lte.0,quantity.is.null'); }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.order('last_updated', { ascending: false }).range(from, to);
    if (error) { console.error("Error fetching inventory:", error); return { data: [], count: 0 }; }
    return { data: (data || []).map(mapDbToInventoryItem), count: count || 0 };
};

export const fetchInventoryStats = async () => {
    const { data, error } = await supabase.from('inventory').select('quantity, price');
    if (error) return { totalItems: 0, totalStock: 0, totalAsset: 0 };
    const all = data || [];
    return {
        totalItems: all.length,
        totalStock: all.reduce((a, b) => a + (b.quantity || 0), 0),
        totalAsset: all.reduce((a, b) => a + ((b.price || 0) * (b.quantity || 0)), 0)
    };
};

export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    let query = supabase.from('inventory').select('*', { count: 'exact' }).gt('quantity', 0).gt('price', 0);
    if (cat !== 'Semua') query = query.ilike('application', `%[${cat}]%`); // Ganti description -> application
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return { data: [], count: 0 };
    return { data: (data || []).map(mapDbToInventoryItem), count: count || 0 };
};

// --- INSERT TANPA SKU ---
export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  const { error } = await supabase.from('inventory').insert([{
    part_number: item.partNumber,
    // sku: item.sku,  <-- HAPUS
    name: item.name,
    
    brand: item.brand,
    application: item.application,

    price: item.price,
    king_fano_price: item.kingFanoPrice,
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
};

// --- UPDATE TANPA SKU ---
export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  const { error } = await supabase.from('inventory').update({
    // sku: item.sku, <-- HAPUS
    name: item.name,
    
    brand: item.brand,
    application: item.application,

    price: item.price,
    king_fano_price: item.kingFanoPrice,
    cost_price: item.costPrice,
    quantity: item.quantity,
    initial_stock: item.initialStock,
    qty_in: item.qtyIn,
    qty_out: item.qtyOut,
    shelf: item.shelf,
    image_url: item.imageUrl,
    ecommerce: item.ecommerce,
    last_updated: Date.now()
  }).eq('id', item.id);
  
  if (error) { handleDbError("Update Stok", error); return false; }
  return true;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang", error); return false; }
  return true;
};

// ... (Bagian Order, History, ChatSession tetap sama)
export const fetchOrders = async (): Promise<Order[]> => {
    const { data } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(100);
    return (data || []).map((o: any) => ({
        id: o.id, customerName: o.customer_name, items: o.items, totalAmount: Number(o.total_amount), status: o.status, timestamp: Number(o.timestamp)
    }));
};
export const saveOrder = async (order: Order): Promise<boolean> => {
    const { error } = await supabase.from('orders').insert([{
        id: order.id, customer_name: order.customerName, items: order.items, total_amount: order.totalAmount, status: order.status, timestamp: order.timestamp
    }]);
    if (error) { handleDbError("Simpan Order", error); return false; }
    return true;
};
export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => {
    const updateData: any = { status };
    if (timestamp) { updateData.timestamp = timestamp; }
    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    if (error) { handleDbError("Update Order", error); return false; }
    return true;
};
export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false }).limit(200);
    return (data || []).map((h: any) => ({
        id: h.id, itemId: h.item_id, partNumber: h.part_number, name: h.name, type: h.type, quantity: h.quantity, previousStock: h.previous_stock, currentStock: h.current_stock, price: h.price, totalPrice: h.total_price, timestamp: h.timestamp, reason: h.reason
    }));
};
export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    const { error } = await supabase.from('stock_history').insert([{
        id: h.id, item_id: h.itemId, part_number: h.partNumber, name: h.name, type: h.type, quantity: h.quantity, previous_stock: h.previousStock, current_stock: h.currentStock, price: h.price, total_price: h.totalPrice, timestamp: h.timestamp, reason: h.reason
    }]);
    if (error) { handleDbError("Simpan History", error); return false; }
    return true;
};
export const fetchChatSessions = async (): Promise<ChatSession[]> => {
    const { data } = await supabase.from('chat_sessions').select('*');
    return (data || []).map((c: any) => ({
        customerId: c.customer_id, customerName: c.customer_name, messages: c.messages, lastMessage: c.last_message, lastTimestamp: c.last_timestamp, unreadAdminCount: c.unread_admin_count, unreadUserCount: c.unread_user_count
    }));
};
export const saveChatSession = async (s: ChatSession): Promise<boolean> => {
    const { error } = await supabase.from('chat_sessions').upsert([{
        customer_id: s.customerId, customer_name: s.customerName, messages: s.messages, last_message: s.lastMessage, last_timestamp: s.lastTimestamp, unread_admin_count: s.unreadAdminCount, unread_user_count: s.unreadUserCount
    }]);
    return !error;
};