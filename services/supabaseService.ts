// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// Helper error
const handleDbError = (op: string, err: any) => {
  console.error(`${op} Error:`, err);
  // Alert dihapus agar tidak mengganggu jika error kecil
};

// Fungsi pembersih kata kunci pencarian (Anti-Crash)
const cleanSearchTerm = (term: string) => {
    // Hapus karakter yang bisa merusak query Supabase (seperti koma, persen, kurung)
    return term.replace(/[%,()]/g, '').trim();
};

// --- INVENTORY ---

export const fetchInventoryPaginated = async (page: number, limit: number, search: string) => {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('inventory')
            .select('*', { count: 'exact' })
            .order('last_updated', { ascending: false });

        if (search) {
            const s = cleanSearchTerm(search);
            if (s) {
                // Mencari di nama atau part_number
                query = query.or(`name.ilike.%${s}%,part_number.ilike.%${s}%`);
            }
        }

        const { data, count, error } = await query.range(from, to);

        if (error) {
            console.error("Fetch Error:", error);
            return { data: [], count: 0 };
        }

        const mappedData = (data || []).map((item: any) => ({
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

        return { data: mappedData, count: count || 0 };
    } catch (e) {
        console.error("System Error:", e);
        return { data: [], count: 0 };
    }
};

export const fetchInventoryStats = async () => {
    // Ambil kolom kecil saja untuk hitung total biar cepat
    const { data, error } = await supabase
        .from('inventory')
        .select('quantity, price'); 

    if (error || !data) return { totalItems: 0, totalStock: 0, totalAsset: 0 };

    const totalItems = data.length;
    const totalStock = data.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
    const totalAsset = data.reduce((a, b) => a + ((Number(b.price) || 0) * (Number(b.quantity) || 0)), 0);

    return { totalItems, totalStock, totalAsset };
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  // Dipakai untuk fungsi internal, limit 100
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('last_updated', { ascending: false })
    .limit(100);

  if (error) return [];

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

// --- SHOP SERVICES ---

export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('inventory')
            .select('*', { count: 'exact' })
            .gt('quantity', 0) // Hanya stok ada
            .gt('price', 0)    // Hanya harga valid
            .order('name', { ascending: true });

        if (cat !== 'Semua') {
            query = query.ilike('description', `%${cat}%`);
        }
        
        if (search) {
            const s = cleanSearchTerm(search);
            if (s) {
                // Cari di Nama ATAU Part Number
                query = query.or(`name.ilike.%${s}%,part_number.ilike.%${s}%`);
            }
        }

        const { data, count, error } = await query.range(from, to);

        if (error) {
            console.error("Shop Fetch Error:", error);
            return { data: [], count: 0 };
        }

        const mappedData = data.map((item: any) => ({
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

        return { data: mappedData, count: count || 0 };
    } catch (e) {
        return { data: [], count: 0 };
    }
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
  if (error) return false;
  return true;
};

// --- ORDER SERVICES ---

export const fetchOrders = async (): Promise<Order[]> => {
    const { data } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(100);
    return (data || []).map((o: any) => ({
        id: o.id, customerName: o.customer_name, items: o.items, 
        totalAmount: o.total_amount, status: o.status, timestamp: o.timestamp
    }));
};

export const saveOrder = async (order: Order): Promise<boolean> => {
    const { error } = await supabase.from('orders').insert([{
        id: order.id, customer_name: order.customer_name, items: order.items,
        total_amount: order.total_amount, status: order.status, timestamp: order.timestamp
    }]);
    if (error) { handleDbError("Simpan Order", error); return false; }
    return true;
};

export const updateOrderStatusService = async (id: string, status: string): Promise<boolean> => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) return false;
    return true;
};

// --- HISTORY SERVICES ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false }).limit(200);
    return (data || []).map((h: any) => ({
        id: h.id, itemId: h.item_id, partNumber: h.part_number, name: h.name, type: h.type,
        quantity: h.quantity, previousStock: h.previous_stock, currentStock: h.current_stock,
        price: h.price, totalPrice: h.total_price, timestamp: h.timestamp, reason: h.reason
    }));
};

export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    const { error } = await supabase.from('stock_history').insert([{
        id: h.id, item_id: h.itemId, part_number: h.partNumber, name: h.name, type: h.type,
        quantity: h.quantity, previous_stock: h.previous_stock, current_stock: h.current_stock,
        price: h.price, total_price: h.total_price, timestamp: h.timestamp, reason: h.reason
    }));
    if (error) { handleDbError("Simpan History", error); return false; }
    return true;
};

// --- CHAT SERVICES ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
    const { data } = await supabase.from('chat_sessions').select('*');
    return (data || []).map((c: any) => ({
        customerId: c.customer_id, customerName: c.customer_name, messages: c.messages,
        lastMessage: c.last_message, lastTimestamp: c.last_timestamp,
        unreadAdminCount: c.unread_admin_count, unreadUserCount: c.unread_user_count
    }));
};

export const saveChatSession = async (s: ChatSession): Promise<boolean> => {
    const { error } = await supabase.from('chat_sessions').upsert([{
        customer_id: s.customerId, customer_name: s.customerName, messages: s.messages,
        last_message: s.lastMessage, last_timestamp: s.lastTimestamp,
        unread_admin_count: s.unreadAdminCount, unread_user_count: s.unreadUserCount
    }]);
    return !error;
};