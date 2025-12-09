// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// Helper error
const handleDbError = (op: string, err: any) => {
  console.error(`${op} Error:`, err);
};

// Helper Mapping dari DB (snake_case) ke App (camelCase)
const mapDbToInventoryItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
    name: item.name,
    description: item.description,
    
    price: Number(item.price),
    kingFanoPrice: Number(item.king_fano_price || 0),
    costPrice: Number(item.cost_price),
    
    quantity: Number(item.quantity), // NULL akan jadi 0 di sini
    initialStock: Number(item.initial_stock),
    qtyIn: Number(item.qty_in),
    qtyOut: Number(item.qty_out),
    shelf: item.shelf,
    imageUrl: item.image_url,
    ecommerce: item.ecommerce,
    lastUpdated: Number(item.last_updated)
});

// --- INVENTORY ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*') // Ambil semua kolom (tanpa count biar ringan)
    .order('last_updated', { ascending: false });

  if (error) { console.error(error); return []; }
  return data.map(mapDbToInventoryItem);
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapDbToInventoryItem(data);
};

// [OPTIMALISASI & PERBAIKAN BUG NULL]
export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all') => {
    let query = supabase
        .from('inventory')
        .select('*', { count: 'exact' });

    // 1. Pencarian (Nama / No Part)
    if (search) {
        query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    }

    // 2. Filter Stok (DIPERBAIKI)
    if (filter === 'low') {
        // Stok Menipis: Lebih dari 0 TAPI kurang dari 4
        query = query.gt('quantity', 0).lt('quantity', 4);
    } else if (filter === 'empty') {
        // Stok Habis:
        // - lte.0  -> Kurang dari atau sama dengan 0 (cover 0 dan minus)
        // - is.null -> Data kosong (NULL) dianggap habis juga
        query = query.or('quantity.lte.0,quantity.is.null');
    }

    // 3. Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
        .order('last_updated', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching inventory paginated:", error);
        return { data: [], count: 0 };
    }

    const mappedData = (data || []).map(mapDbToInventoryItem);
    return { data: mappedData, count: count || 0 };
};

// [OPTIMALISASI STATISTIK]
export const fetchInventoryStats = async () => {
    // Hanya ambil kolom quantity dan price untuk statistik cepat
    const { data, error } = await supabase
        .from('inventory')
        .select('quantity, price');

    if (error) { console.error(error); return { totalItems: 0, totalStock: 0, totalAsset: 0 }; }

    const all = data || [];
    return {
        totalItems: all.length,
        totalStock: all.reduce((a, b) => a + (b.quantity || 0), 0),
        totalAsset: all.reduce((a, b) => a + ((b.price || 0) * (b.quantity || 0)), 0)
    };
};

// [OPTIMALISASI SHOP]
export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    let query = supabase
        .from('inventory')
        .select('*', { count: 'exact' })
        .gt('quantity', 0)   // Hanya yang ada stok
        .gt('price', 0);     // Hanya yang ada harga

    if (cat !== 'Semua') {
        query = query.ilike('description', `%[${cat}]%`);
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) { return { data: [], count: 0 }; }

    const mappedData = (data || []).map(mapDbToInventoryItem);
    return { data: mappedData, count: count || 0 };
};

// --- CRUD ---

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  const { error } = await supabase.from('inventory').insert([{
    part_number: item.partNumber,
    name: item.name,
    description: item.description,
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

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  const { error } = await supabase.from('inventory').update({
    name: item.name,
    description: item.description,
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

// --- ORDERS ---

export const fetchOrders = async (): Promise<Order[]> => {
    const { data } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(100);
    return (data || []).map((o: any) => ({
        id: o.id, 
        customerName: o.customer_name,
        items: o.items, 
        totalAmount: Number(o.total_amount),
        status: o.status, 
        timestamp: Number(o.timestamp)
    }));
};

export const saveOrder = async (order: Order): Promise<boolean> => {
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
    const { error } = await supabase.from('stock_history').insert([{
        id: h.id, 
        item_id: h.itemId, 
        part_number: h.partNumber, 
        name: h.name, 
        type: h.type,
        quantity: h.quantity, 
        previous_stock: h.previousStock, 
        current_stock: h.currentStock, 
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