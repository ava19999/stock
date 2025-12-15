// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, StockHistory, BarangMasuk, BarangKeluar, Order, ChatSession } from '../types';

const TABLE_NAME = 'base'; // Menggunakan tabel 'base' sesuai CSV

const handleDbError = (op: string, err: any) => { console.error(`${op} Error:`, err); };

// --- MAPPING (Sesuaikan dengan CSV/Base) ---
const mapDbToInventoryItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
    name: item.name,
    brand: item.brand || '',             
    application: item.application || '', 
    
    // Field ini ada di CSV/Base
    quantity: Number(item.quantity) || 0,
    shelf: item.shelf || '',
    imageUrl: item.image_url || '',
    
    // Field tanggal dari CSV (biasanya string date), konversi ke timestamp number
    lastUpdated: item.date ? new Date(item.date).getTime() : Date.now(),

    // Field ini TIDAK ADA di tabel base (CSV), di-default ke 0/kosong agar app tidak crash
    price: 0, 
    kingFanoPrice: 0,
    costPrice: 0,
    initialStock: 0,
    qtyIn: 0,
    qtyOut: 0,
    ecommerce: ''
});

// --- INVENTORY FUNCTIONS (Base Table) ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  // Select dari tabel 'base'
  const { data, error } = await supabase.from(TABLE_NAME).select('*').order('date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map(mapDbToInventoryItem);
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapDbToInventoryItem(data);
};

export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all') => {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    
    if (search) {
        // Mencari berdasarkan kolom yang ada di tabel base
        query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`);
    }
    
    if (filter === 'low') { query = query.gt('quantity', 0).lt('quantity', 4); } 
    else if (filter === 'empty') { query = query.or('quantity.lte.0,quantity.is.null'); }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Mengurutkan berdasarkan 'date' (kolom di CSV)
    const { data, error, count } = await query.order('date', { ascending: false }).range(from, to);
    
    if (error) { console.error("Error fetching inventory:", error); return { data: [], count: 0 }; }
    return { data: (data || []).map(mapDbToInventoryItem), count: count || 0 };
};

export const fetchInventoryStats = async () => {
    // Karena tabel base tidak punya harga, kita hanya bisa menghitung total item dan total stok quantity
    const { data, error } = await supabase.from(TABLE_NAME).select('quantity');
    if (error) return { totalItems: 0, totalStock: 0, totalAsset: 0 };
    
    const all = data || [];
    return {
        totalItems: all.length,
        totalStock: all.reduce((a, b) => a + (b.quantity || 0), 0),
        totalAsset: 0 // Tidak bisa dihitung karena tidak ada kolom price di tabel base
    };
};

export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    // Hapus filter .gt('price', 0) karena kolom price tidak ada
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' }).gt('quantity', 0);
    
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query.range(from, to);
    if (error) return { data: [], count: 0 };
    return { data: (data || []).map(mapDbToInventoryItem), count: count || 0 };
};

export const addInventory = async (item: InventoryFormData): Promise<string | null> => {
  // Insert ke tabel 'base' dengan kolom yang sesuai CSV
  const { data, error } = await supabase.from(TABLE_NAME).insert([{
    part_number: item.partNumber, 
    name: item.name, 
    brand: item.brand, 
    application: item.application,
    quantity: item.quantity, 
    shelf: item.shelf, 
    image_url: item.imageUrl, 
    // Menggunakan kolom date
    date: new Date().toISOString() 
  }]).select().single();

  if (error) { handleDbError("Tambah Barang ke Base", error); return null; }
  return data ? data.id : null;
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  // Update tabel 'base'
  const { error } = await supabase.from(TABLE_NAME).update({
    name: item.name,
    brand: item.brand,
    application: item.application,
    shelf: item.shelf,
    quantity: item.quantity,
    image_url: item.imageUrl,
    date: new Date().toISOString()
  }).eq('id', item.id);

  if (error) { handleDbError("Update Barang Base", error); return false; }
  return true;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang Base", error); return false; }
  return true;
};

// --- HISTORY & TRANSAKSI ---

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
            timestamp: new Date(m.tanggal).getTime(),
            reason: `Restock (Via: ${m.ecommerce}) (${m.tempo})`
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

export const fetchHistoryLogsPaginated = async (
    type: 'in' | 'out',
    page: number,
    limit: number,
    search: string
) => {
    const table = type === 'in' ? 'barang_masuk' : 'barang_keluar';
    let query = supabase.from(table).select('*', { count: 'exact' });

    if (search) {
        if (type === 'in') {
            query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%`);
        } else {
            query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,customer.ilike.%${search}%,resi.ilike.%${search}%`);
        }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

    if (error) {
        console.error(`Error fetching ${table}:`, error);
        return { data: [], count: 0 };
    }

    const mappedData: StockHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        itemId: item.part_number,
        partNumber: item.part_number,
        name: item.name,
        type: type,
        quantity: type === 'in' ? Number(item.qty_masuk) : Number(item.qty_keluar),
        previousStock: Number(item.stock_awal),
        currentStock: type === 'in' ? Number(item.stock_awal) + Number(item.qty_masuk) : Number(item.stock_awal) - Number(item.qty_keluar),
        price: Number(item.harga_satuan),
        totalPrice: Number(item.harga_total),
        timestamp: new Date(item.tanggal).getTime(),
        reason: type === 'in' 
            ? `Restock (Via: ${item.ecommerce || '-'})` 
            : `${item.customer || 'Customer'} (Via: ${item.ecommerce || '-'}) (Resi: ${item.resi || '-'})`
    }));

    return { data: mappedData, count: count || 0 };
};

export const addBarangMasuk = async (data: BarangMasuk): Promise<boolean> => {
    const { error } = await supabase.from('barang_masuk').insert([{
        tanggal: data.tanggal,
        tempo: data.tempo,
        ecommerce: data.suplier || data.ecommerce || 'Lainnya',
        part_number: data.partNumber,
        name: data.name,
        brand: data.brand,
        application: data.application,
        rak: data.rak,
        stock_awal: data.stockAwal,
        qty_masuk: data.qtyMasuk,
        harga_satuan: data.hargaSatuan,
        harga_total: data.hargaTotal
    }]);
    if (error) { console.error("Gagal catat Barang Masuk:", error); return false; }
    return true;
};

export const addBarangKeluar = async (data: BarangKeluar): Promise<boolean> => {
    const { error } = await supabase.from('barang_keluar').insert([{
        tanggal: data.tanggal,
        kode_toko: data.kodeToko,
        tempo: data.tempo,
        ecommerce: data.ecommerce,
        customer: data.customer,
        part_number: data.partNumber,
        name: data.name,
        brand: data.brand,
        application: data.application,
        rak: data.rak,
        stock_awal: data.stockAwal,
        qty_keluar: data.qtyKeluar,
        harga_satuan: data.hargaSatuan,
        harga_total: data.hargaTotal,
        resi: data.resi
    }]);
    if (error) { console.error("Gagal catat Barang Keluar:", error); return false; }
    return true;
};

// --- LEGACY / OTHER FEATURES (ORDERS & CHAT) ---
// Ini yang sebelumnya hilang dan menyebabkan error

export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    // Adapter untuk mengarahkan fungsi lama ke tabel baru jika masih dipanggil
    const today = new Date().toISOString().split('T')[0];
    if (h.type === 'in') {
        return addBarangMasuk({
            tanggal: today, tempo: 'AUTO', ecommerce: 'SYSTEM', partNumber: h.partNumber, name: h.name,
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