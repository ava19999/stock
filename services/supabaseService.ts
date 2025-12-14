// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, BarangMasuk, BarangKeluar, ChatSession, StockHistory } from '../types';

const handleDbError = (op: string, err: any) => { console.error(`${op} Error:`, err); };

const mapDbToInventoryItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
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
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return { data: [], count: 0 };
    return { data: (data || []).map(mapDbToInventoryItem), count: count || 0 };
};

// --- GABUNGKAN HISTORY DARI 2 TABEL ---
export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data: dataMasuk } = await supabase.from('barang_masuk').select('*').order('created_at', { ascending: false }).limit(100);
    const { data: dataKeluar } = await supabase.from('barang_keluar').select('*').order('created_at', { ascending: false }).limit(100);

    const history: StockHistory[] = [];

    (dataMasuk || []).forEach((m: any) => {
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: Number(m.qty_masuk), previousStock: Number(m.stock_awal),
            currentStock: Number(m.stock_awal) + Number(m.qty_masuk),
            price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: new Date(m.tanggal).getTime(), // String Date -> Timestamp Number
            reason: `Restock: ${m.suplier} (${m.tempo})`
        });
    });

    (dataKeluar || []).forEach((k: any) => {
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: Number(k.qty_keluar), previousStock: Number(k.stock_awal),
            currentStock: Number(k.stock_awal) - Number(k.qty_keluar),
            price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: new Date(k.tanggal).getTime(),
            reason: `${k.customer} (Via: ${k.ecommerce}) (Resi: ${k.resi})`
        });
    });

    return history.sort((a, b) => b.timestamp - a.timestamp);
};

export const addInventory = async (item: InventoryFormData): Promise<string | null> => {
  const { data, error } = await supabase.from('inventory').insert([{
    part_number: item.partNumber, name: item.name, brand: item.brand, application: item.application,
    price: item.price, king_fano_price: item.kingFanoPrice, cost_price: item.costPrice,
    quantity: item.quantity, initial_stock: item.initialStock, qty_in: item.qtyIn, qty_out: item.qtyOut,
    shelf: item.shelf, image_url: item.imageUrl, ecommerce: item.ecommerce, last_updated: Date.now()
  }]).select().single();
  if (error) { handleDbError("Tambah Barang", error); return null; }
  return data ? data.id : null;
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  const { error } = await supabase.from('inventory').update({
    name: item.name, brand: item.brand, application: item.application,
    price: item.price, king_fano_price: item.kingFanoPrice, cost_price: item.costPrice,
    quantity: item.quantity, initial_stock: item.initialStock, qty_in: item.qtyIn, qty_out: item.qtyOut,
    shelf: item.shelf, image_url: item.imageUrl, ecommerce: item.ecommerce, last_updated: Date.now()
  }).eq('id', item.id);
  if (error) { handleDbError("Update Stok", error); return false; }
  return true;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang", error); return false; }
  return true;
};

// --- FUNGSI SIMPAN BARANG MASUK ---
export const addBarangMasuk = async (data: BarangMasuk): Promise<boolean> => {
  const { error } = await supabase.from('barang_masuk').insert([{
    tanggal: data.tanggal, tempo: data.tempo, suplier: data.suplier, part_number: data.partNumber,
    name: data.name, brand: data.brand, application: data.application, rak: data.rak,
    stock_awal: data.stockAwal, qty_masuk: data.qtyMasuk, harga_satuan: data.hargaSatuan, harga_total: data.hargaTotal
  }]);
  if (error) { console.error("Gagal catat Barang Masuk:", error); return false; }
  return true;
};

// --- FUNGSI SIMPAN BARANG KELUAR ---
export const addBarangKeluar = async (data: BarangKeluar): Promise<boolean> => {
  const { error } = await supabase.from('barang_keluar').insert([{
    tanggal: data.tanggal, kode_toko: data.kodeToko, tempo: data.tempo, ecommerce: data.ecommerce,
    customer: data.customer, part_number: data.partNumber, name: data.name, brand: data.brand,
    application: data.application, rak: data.rak, stock_awal: data.stockAwal, qty_keluar: data.qtyKeluar,
    harga_satuan: data.hargaSatuan, harga_total: data.hargaTotal, resi: data.resi
  }]);
  if (error) { console.error("Gagal catat Barang Keluar:", error); return false; }
  return true;
};

// Fungsi fallback untuk kompatibilitas
export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    const today = new Date().toISOString().split('T')[0];
    if (h.type === 'in') {
        return addBarangMasuk({
            tanggal: today, tempo: 'AUTO', suplier: 'SYSTEM', partNumber: h.partNumber, name: h.name,
            brand: '-', application: '-', rak: '-', stockAwal: h.previousStock, qtyMasuk: h.quantity,
            hargaSatuan: h.price, hargaTotal: h.totalPrice
        });
    } else {
        return addBarangKeluar({
            tanggal: today, kodeToko: 'SYS', tempo: 'AUTO', ecommerce: 'SYSTEM', customer: 'AUTO-LOG',
            partNumber: h.partNumber, name: h.name, brand: '-', application: '-', rak: '-',
            stockAwal: h.previousStock, qtyKeluar: h.quantity, hargaSatuan: h.price, hargaTotal: h.totalPrice, resi: '-'
        });
    }
};

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
    return !error;
};
export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => {
    const updateData: any = { status };
    if (timestamp) { updateData.timestamp = timestamp; }
    const { error } = await supabase.from('orders').update(updateData).eq('id', id);
    return !error;
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