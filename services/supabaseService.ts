// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// Helper error
const handleDbError = (op: string, err: any) => {
  console.error(`${op} Error:`, err);
  // alert(`Gagal ${op}: ${err.message}`); // Uncomment jika ingin popup error
};

// Fungsi pembersih kata kunci pencarian (Anti-Crash)
const cleanSearchTerm = (term: string) => {
    if (!term) return '';
    return term.replace(/[%,()]/g, '').trim();
};

// --- INVENTORY SERVICES ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  // Mengambil 100 data terbaru untuk init state (agar ringan)
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('last_updated', { ascending: false })
    .limit(100);

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
                // Pencarian Flexible (Nama ATAU Part Number)
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
    // Ambil sebagian kecil data untuk statistik cepat
    const { data, error } = await supabase
        .from('inventory')
        .select('quantity, price')
        .limit(10000); 

    if (error || !data) return { totalItems: 0, totalStock: 0, totalAsset: 0 };

    const totalItems = data.length;
    const totalStock = data.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
    const totalAsset = data.reduce((a, b) => a + ((Number(b.price) || 0) * (Number(b.quantity) || 0)), 0);

    return { totalItems, totalStock, totalAsset };
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

// --- CRUD INVENTORY ---

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

// --- ORDERS SERVICES ---

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
    if (error) return false;
    return true;
};

// --- HISTORY SERVICES (DIPERBAIKI UNTUK ANTI-CRASH & STOK NULL) ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false }).limit(200);
    
    return (data || []).map((h: any) => ({
        id: h.id, 
        itemId: h.item_id, 
        partNumber: h.part_number, 
        name: h.name, 
        type: h.type,
        quantity: Number(h.quantity),
        previousStock: Number(h.previous_stock),
        
        // PENTING: Jika null, biarkan null agar Dashboard bisa handle, atau set 0
        currentStock: h.current_stock !== null ? Number(h.current_stock) : undefined,
        
        price: Number(h.price), 
        totalPrice: Number(h.total_price), 
        
        // PENTING: Konversi ke Number agar tidak crash saat new Date()
        timestamp: Number(h.timestamp), 
        
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
        current_stock: h.currentStock, // Pastikan ini terkirim
        price: h.price, 
        total_price: h.totalPrice, 
        timestamp: h.timestamp, 
        reason: h.reason
    }]);
    
    if (error) { handleDbError("Simpan History", error); return false; }
    return true;
};

// --- CHAT SERVICES ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
    const { data } = await supabase.from('chat_sessions').select('*');
    return (data || []).map((c: any) => ({
        customerId: c.customer_id, 
        customerName: c.customer_name, 
        messages: c.messages,
        lastMessage: c.last_message, 
        lastTimestamp: Number(c.last_timestamp), // Pastikan Number
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