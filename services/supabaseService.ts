// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// Helper error
const handleDbError = (op: string, err: any) => {
  console.error(`${op} Error:`, err);
  // alert(`Gagal ${op}: ${err.message}`); // Uncomment jika ingin popup error
};

// --- INVENTORY ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('last_updated', { ascending: false });

  if (error) { console.error(error); return []; }

  return data.map((item: any) => ({
    id: item.id,
    partNumber: item.part_number,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    costPrice: Number(item.cost_price),
    quantity: Number(item.quantity),
    initialStock: Number(item.initial_stock),
    qtyIn: Number(item.qty_in),
    qtyOut: Number(item.qty_out),
    shelf: item.shelf,
    imageUrl: item.image_url,
    ecommerce: item.ecommerce,
    lastUpdated: Number(item.last_updated)
  }));
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();
  if (error || !data) return null;
  return {
    id: data.id,
    partNumber: data.part_number,
    name: data.name,
    description: data.description,
    price: Number(data.price),
    costPrice: Number(data.cost_price),
    quantity: Number(data.quantity),
    initialStock: Number(data.initial_stock),
    qtyIn: Number(data.qty_in),
    qtyOut: Number(data.qty_out),
    shelf: data.shelf,
    imageUrl: data.image_url,
    ecommerce: data.ecommerce,
    lastUpdated: Number(data.last_updated)
  };
};

export const fetchInventoryPaginated = async (page: number, limit: number, search: string) => {
    const all = await fetchInventory();
    let filtered = all;
    if (search) {
        const s = search.toLowerCase();
        filtered = all.filter(i => 
            (i.name || '').toLowerCase().includes(s) || 
            (i.partNumber || '').toLowerCase().includes(s)
        );
    }
    const start = (page - 1) * limit;
    return { data: filtered.slice(start, start + limit), count: filtered.length };
};

export const fetchInventoryStats = async () => {
    const all = await fetchInventory();
    return {
        totalItems: all.length,
        totalStock: all.reduce((a, b) => a + (b.quantity || 0), 0),
        totalAsset: all.reduce((a, b) => a + ((b.price || 0) * (b.quantity || 0)), 0)
    };
};

export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    let all = await fetchInventory();
    all = all.filter(i => i.quantity > 0 && i.price > 0);
    
    if (cat !== 'Semua') all = all.filter(i => (i.description || '').includes(`[${cat}]`));
    if (search) {
        const s = search.toLowerCase();
        all = all.filter(i => (i.name || '').toLowerCase().includes(s) || (i.partNumber || '').toLowerCase().includes(s));
    }
    const start = (page - 1) * limit;
    return { data: all.slice(start, start + limit), count: all.length };
};

// --- CRUD ---

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
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
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
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
  }).eq('id', item.id);
  
  if (error) { handleDbError("Update Stok", error); return false; }
  return true;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang", error); return false; }
  return true;
};

// --- ORDERS ---

export const fetchOrders = async (): Promise<Order[]> => {
    const { data } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(100);
    // Mapping balik dari DB (snake_case) ke App (camelCase) saat ambil data
    return (data || []).map((o: any) => ({
        id: o.id, 
        customerName: o.customer_name,  // <-- Perhatikan ini
        items: o.items, 
        totalAmount: Number(o.total_amount), // <-- Perhatikan ini
        status: o.status, 
        timestamp: Number(o.timestamp)
    }));
};

export const saveOrder = async (order: Order): Promise<boolean> => {
    // [PERBAIKAN PENTING]: Mapping App (camelCase) -> DB (snake_case)
    const { error } = await supabase.from('orders').insert([{
        id: order.id, 
        customer_name: order.customerName, // Jangan salah ketik 'customerName'
        items: order.items,
        total_amount: order.totalAmount,   // Jangan salah ketik 'totalAmount'
        status: order.status, 
        timestamp: order.timestamp
    }]);
    
    if (error) { handleDbError("Simpan Order", error); return false; }
    return true;
};

export const updateOrderStatusService = async (id: string, status: string): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) { handleDbError("Update Order", error); return false; }
    return true;
};

// --- HISTORY ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false }).limit(200);
    return (data || []).map((h: any) => ({
        id: h.id, 
        itemId: h.item_id, 
        partNumber: h.part_number, 
        name: h.name, 
        type: h.type,
        quantity: h.quantity, 
        previousStock: h.previous_stock, 
        currentStock: h.current_stock,
        price: h.price, 
        totalPrice: h.total_price, 
        timestamp: h.timestamp, 
        reason: h.reason
    }));
};

export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    // Mapping App -> DB
    const { error } = await supabase.from('stock_history').insert([{
        id: h.id, 
        item_id: h.itemId, 
        part_number: h.partNumber, 
        name: h.name, 
        type: h.type,
        quantity: h.quantity, 
        previous_stock: h.previousStock, 
        current_stock: h.currentstock,
        price: h.price, 
        total_price: h.totalPrice, 
        timestamp: h.timestamp, 
        reason: h.reason
    }]);
    
    if (error) { handleDbError("Simpan History", error); return false; }
    return true;
};

// --- CHAT ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
    const { data } = await supabase.from('chat_sessions').select('*');
    return (data || []).map((c: any) => ({
        customerId: c.customer_id, 
        customerName: c.customer_name, 
        messages: c.messages,
        lastMessage: c.last_message, 
        lastTimestamp: c.last_timestamp,
        unreadAdminCount: c.unread_admin_count, 
        unreadUserCount: c.unread_user_count
    }));
};

export const saveChatSession = async (s: ChatSession): Promise<boolean> => {
    const { error } = await supabase.from('chat_sessions').upsert([{
        customer_id: s.customerId, 
        customer_name: s.customerName, 
        messages: s.messages,
        last_message: s.lastMessage, 
        last_timestamp: s.lastTimestamp,
        unread_admin_count: s.unreadAdminCount, 
        unread_user_count: s.unreadUserCount
    }]);
    return !error;
};