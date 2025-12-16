// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, StockHistory, BarangMasuk, BarangKeluar, Order, ChatSession } from '../types';

const TABLE_NAME = 'base'; // Tabel data barang master

const handleDbError = (op: string, err: any) => { console.error(`${op} Error:`, err); };

const parseTimestamp = (dateString: string | null | undefined): number | null => {
    if (!dateString) return null; 
    const time = new Date(dateString).getTime();
    return isNaN(time) ? null : time;
};

// --- HELPER: MAPPING ---
const mapBaseItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
    name: item.name,
    brand: item.brand || '',             
    application: item.application || '', 
    quantity: Number(item.quantity) || 0,
    shelf: item.shelf || '',
    imageUrl: item.image_url || '',
    // Prioritas: created_at, jika tidak ada baru date, lalu sekarang
    lastUpdated: item.created_at ? new Date(item.created_at).getTime() : (item.date ? new Date(item.date).getTime() : Date.now()),
    price: 0, 
    kingFanoPrice: 0,
    costPrice: 0, 
    initialStock: 0,
    qtyIn: 0,
    qtyOut: 0,
    ecommerce: ''
});

// --- HELPER: HARGA ---
const fetchLatestCostPrices = async (partNumbers?: string[]) => {
    let query = supabase.from('barang_masuk').select('part_number, harga_satuan').order('created_at', { ascending: false });
    if (partNumbers && partNumbers.length > 0) { query = query.in('part_number', partNumbers); }
    const { data, error } = await query;
    if (error || !data) return {};
    const priceMap: Record<string, number> = {};
    data.forEach((row: any) => {
        if (row.part_number && priceMap[row.part_number] === undefined) {
            priceMap[row.part_number] = Number(row.harga_satuan) || 0;
        }
    });
    return priceMap;
};

const fetchLatestSellingPrices = async (partNumbers?: string[]) => {
    let query = supabase.from('barang_keluar').select('part_number, harga_satuan').order('created_at', { ascending: false });
    if (partNumbers && partNumbers.length > 0) { query = query.in('part_number', partNumbers); }
    const { data, error } = await query;
    if (error || !data) return {};
    const priceMap: Record<string, number> = {};
    data.forEach((row: any) => {
        if (row.part_number && priceMap[row.part_number] === undefined) {
            priceMap[row.part_number] = Number(row.harga_satuan) || 0;
        }
    });
    return priceMap;
};

// --- INVENTORY FUNCTIONS ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data: baseData, error } = await supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  const costMap = await fetchLatestCostPrices();
  const sellMap = await fetchLatestSellingPrices();
  return (baseData || []).map((item) => {
      const mapped = mapBaseItem(item);
      if (costMap[item.part_number] !== undefined) mapped.costPrice = costMap[item.part_number];
      if (sellMap[item.part_number] !== undefined) mapped.price = sellMap[item.part_number];
      return mapped;
  });
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
  if (error || !data) return null;
  const mapped = mapBaseItem(data);
  const { data: costData } = await supabase.from('barang_masuk').select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false }).limit(1).single();
  if (costData) mapped.costPrice = Number(costData.harga_satuan) || 0;
  const { data: sellData } = await supabase.from('barang_keluar').select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false }).limit(1).single();
  if (sellData) mapped.price = Number(sellData.harga_satuan) || 0;
  return mapped;
};

export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all') => {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    if (search) { query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`); }
    if (filter === 'low') { query = query.gt('quantity', 0).lt('quantity', 4); } 
    else if (filter === 'empty') { query = query.or('quantity.lte.0,quantity.is.null'); }
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) { console.error("Error fetching inventory:", error); return { data: [], count: 0 }; }
    const baseItems = (data || []).map(mapBaseItem);
    if (baseItems.length > 0) {
        const partNumbers = baseItems.map(i => i.partNumber).filter(Boolean);
        const costMap = await fetchLatestCostPrices(partNumbers);
        const sellMap = await fetchLatestSellingPrices(partNumbers);
        baseItems.forEach(item => {
            if (costMap[item.partNumber] !== undefined) item.costPrice = costMap[item.partNumber];
            if (sellMap[item.partNumber] !== undefined) item.price = sellMap[item.partNumber];
        });
    }
    return { data: baseItems, count: count || 0 };
};

export const fetchInventoryStats = async () => {
    const { data: items } = await supabase.from(TABLE_NAME).select('part_number, quantity');
    const costMap = await fetchLatestCostPrices();
    const all = items || [];
    let totalStock = 0;
    let totalAsset = 0;
    all.forEach((item: any) => {
        const qty = Number(item.quantity) || 0;
        const cost = costMap[item.part_number] || 0;
        totalStock += qty;
        totalAsset += (qty * cost);
    });
    return { totalItems: all.length, totalStock, totalAsset };
};

export const fetchShopItems = async (page: number, limit: number, search: string, cat: string) => {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' }).gt('quantity', 0);
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return { data: [], count: 0 };
    const baseItems = (data || []).map(mapBaseItem);
    if (baseItems.length > 0) {
        const partNumbers = baseItems.map(i => i.partNumber).filter(Boolean);
        const sellMap = await fetchLatestSellingPrices(partNumbers);
        baseItems.forEach(item => {
            if (sellMap[item.partNumber] !== undefined) item.price = sellMap[item.partNumber];
        });
    }
    return { data: baseItems, count: count || 0 };
};

export const addInventory = async (item: InventoryFormData): Promise<string | null> => {
  const { data, error } = await supabase.from(TABLE_NAME).insert([{
    part_number: item.partNumber, name: item.name, brand: item.brand, 
    application: item.application, quantity: item.quantity, shelf: item.shelf, 
    image_url: item.imageUrl, created_at: new Date().toISOString() 
  }]).select().single();
  
  if (error) { handleDbError("Tambah Barang ke Base", error); return null; }
  
  if (item.quantity > 0 && data) {
      await addBarangMasuk({
          tempo: 'AUTO', suplier: 'Stok Awal',
          partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
          rak: item.shelf, stockAhir: item.quantity, qtyMasuk: item.quantity,
          hargaSatuan: item.costPrice || 0, hargaTotal: (item.costPrice || 0) * item.quantity
      });
  }
  return data ? data.id : null;
};

// --- UPDATE INVENTORY (LOGIC PERBAIKAN) ---
export const updateInventory = async (
    item: InventoryItem, 
    transaction?: { type: 'in' | 'out', qty: number, ecommerce: string, resiTempo: string }
): Promise<boolean> => {
  
  // 1. Ambil stok TERBARU dari database untuk menghindari data stale
  const { data: currentDbItem, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('quantity')
      .eq('id', item.id)
      .single();

  if (fetchError || !currentDbItem) {
      console.error("Gagal mengambil data stok terbaru dari base:", fetchError);
      return false;
  }

  // Gunakan quantity dari database, bukan dari form state
  let finalQty = Number(currentDbItem.quantity);

  // 2. Hitung Final Quantity berdasarkan transaksi
  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      if (transaction.type === 'in') {
          finalQty += txQty;
      } else {
          finalQty -= txQty;
      }
  }

  // 3. Update BASE Table dengan nilai baru dan tanggal baru
  // Note: Gunakan created_at atau date tergantung struktur tabel base Anda. 
  // Jika tabel base pakai 'created_at' untuk sorting, kita tidak ubah itu. 
  // Tapi biasanya update pakai kolom 'date' atau sejenisnya. Di sini kita update field yang ada saja.
  const { data: updatedData, error } = await supabase.from(TABLE_NAME).update({
    name: item.name, brand: item.brand, application: item.application,
    shelf: item.shelf, 
    quantity: finalQty, // UPDATE STOK DI SINI
    image_url: item.imageUrl,
    // Kita update tanggal edit jika ada kolom 'date', jika tidak ada, Supabase mungkin handle updated_at
    // date: new Date().toISOString() 
  }).eq('id', item.id).select();

  if (error) { 
      handleDbError("Update Barang Base", error); 
      return false; 
  }
  
  if (!updatedData || updatedData.length === 0) {
      console.error("Update gagal: Tidak ada baris yang berubah.");
      return false;
  }

  // 4. Catat Riwayat Transaksi (Log)
  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      
      if (transaction.type === 'in') {
          await addBarangMasuk({
              tempo: transaction.resiTempo || '-', 
              suplier: transaction.ecommerce || 'Manual Edit',
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf,
              stockAhir: finalQty, 
              qtyMasuk: txQty,
              hargaSatuan: item.costPrice || 0, 
              hargaTotal: (item.costPrice || 0) * txQty
          });
      } else {
          await addBarangKeluar({
              kodeToko: 'MANUAL', tempo: 'AUTO',
              ecommerce: transaction.ecommerce || 'Manual Edit',
              customer: 'Adjustment',
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf,
              stockAhir: finalQty, 
              qtyKeluar: txQty,
              hargaSatuan: item.price || 0, 
              hargaTotal: (item.price || 0) * txQty,
              resi: transaction.resiTempo || '-'
          });
      }
  }

  return true;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang Base", error); return false; }
  return true;
};

// --- HISTORY & TRANSAKSI ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
    // FIX: Hanya select kolom yang valid. Hapus 'tanggal'.
    const { data: dataMasuk } = await supabase.from('barang_masuk')
        .select('*, stock_ahir, created_at') 
        .order('created_at', { ascending: false, nullsFirst: false }).limit(100);
        
    const { data: dataKeluar } = await supabase.from('barang_keluar')
        .select('*, stock_ahir, created_at') 
        .order('created_at', { ascending: false, nullsFirst: false }).limit(100);

    const history: StockHistory[] = [];

    (dataMasuk || []).forEach((m: any) => {
        const current = Number(m.stock_ahir);
        const qty = Number(m.qty_masuk);
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: qty, previousStock: current - qty, currentStock: current,
            price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at), // Gunakan created_at
            reason: `Restock (Via: ${m.ecommerce}) (${m.tempo})`, resi: '-', tempo: m.tempo || '-'
        });
    });

    (dataKeluar || []).forEach((k: any) => {
        const current = Number(k.stock_ahir);
        const qty = Number(k.qty_keluar);
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: qty, previousStock: current + qty, currentStock: current,
            price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at), // Gunakan created_at
            reason: `${k.customer} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, resi: k.resi || '-', tempo: k.tempo || '-'
        });
    });

    return history.sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return timeB - timeA;
    });
};

export const fetchHistoryLogsPaginated = async (type: 'in' | 'out', page: number, limit: number, search: string) => {
    const table = type === 'in' ? 'barang_masuk' : 'barang_keluar';
    // FIX: Hapus 'tanggal'
    let query = supabase.from(table).select('*, stock_ahir, created_at', { count: 'exact' });
    
    if (search) {
        if (type === 'in') query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%`);
        else query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,customer.ilike.%${search}%,resi.ilike.%${search}%`);
    }
    const from = (page - 1) * limit; const to = from + limit - 1;
    const { data, error, count } = await query.order('created_at', { ascending: false, nullsFirst: false }).range(from, to);

    if (error) { console.error(`Error fetching ${table}:`, error); return { data: [], count: 0 }; }

    const mappedData: StockHistory[] = (data || []).map((item: any) => {
        const qty = type === 'in' ? Number(item.qty_masuk) : Number(item.qty_keluar);
        const current = Number(item.stock_ahir); 
        const previous = type === 'in' ? (current - qty) : (current + qty);
        
        return {
            id: item.id, itemId: item.part_number, partNumber: item.part_number, name: item.name,
            type: type, quantity: qty, previousStock: previous, currentStock: current,
            price: Number(item.harga_satuan), totalPrice: Number(item.harga_total),
            timestamp: parseTimestamp(item.created_at), // Gunakan created_at
            reason: type === 'in' ? `Restock (Via: ${item.ecommerce || '-'})` : `${item.customer || 'Customer'} (Via: ${item.ecommerce || '-'}) (Resi: ${item.resi || '-'})`,
            resi: item.resi || '-', tempo: item.tempo || '-'
        };
    });
    return { data: mappedData, count: count || 0 };
};

export const fetchItemHistory = async (partNumber: string): Promise<StockHistory[]> => {
    // FIX: Hapus 'tanggal'
    const { data: dataMasuk } = await supabase.from('barang_masuk').select('*, stock_ahir, created_at').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const { data: dataKeluar } = await supabase.from('barang_keluar').select('*, stock_ahir, created_at').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const history: StockHistory[] = [];
    (dataMasuk || []).forEach((m: any) => {
        const current = Number(m.stock_ahir); const qty = Number(m.qty_masuk);
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: qty, previousStock: current - qty, currentStock: current,
            price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at),
            reason: `Restock (Via: ${m.ecommerce}) (${m.tempo})`, resi: '-', tempo: m.tempo || '-'
        });
    });
    (dataKeluar || []).forEach((k: any) => {
        const current = Number(k.stock_ahir); const qty = Number(k.qty_keluar);
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: qty, previousStock: current + qty, currentStock: current,
            price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at),
            reason: `${k.customer} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, resi: k.resi || '-', tempo: k.tempo || '-'
        });
    });
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const addBarangMasuk = async (data: BarangMasuk): Promise<boolean> => {
    // FIX: Masukkan created_at secara otomatis hari ini
    const { error } = await supabase.from('barang_masuk').insert([{
        created_at: new Date().toISOString(), // OTOMATIS TANGGAL HARI INI
        tempo: data.tempo, ecommerce: data.suplier || data.ecommerce || 'Lainnya',
        part_number: data.partNumber, name: data.name, brand: data.brand, application: data.application,
        rak: data.rak, stock_ahir: data.stockAhir, qty_masuk: data.qtyMasuk,
        harga_satuan: data.hargaSatuan, harga_total: data.hargaTotal
    }]);
    if (error) { console.error("Gagal catat Barang Masuk:", error); return false; }
    return true;
};

export const addBarangKeluar = async (data: BarangKeluar): Promise<boolean> => {
    // FIX: Masukkan created_at secara otomatis hari ini
    const { error } = await supabase.from('barang_keluar').insert([{
        created_at: new Date().toISOString(), // OTOMATIS TANGGAL HARI INI
        kode_toko: data.kodeToko, tempo: data.tempo, ecommerce: data.ecommerce,
        customer: data.customer, part_number: data.partNumber, name: data.name, brand: data.brand,
        application: data.application, rak: data.rak, stock_ahir: data.stockAhir, qty_keluar: data.qtyKeluar,
        harga_satuan: data.hargaSatuan, harga_total: data.hargaTotal, resi: data.resi
    }]);
    if (error) { console.error("Gagal catat Barang Keluar:", error); return false; }
    return true;
};

export const addHistoryLog = async (h: StockHistory): Promise<boolean> => {
    if (h.type === 'in') {
        const finalStock = h.previousStock + h.quantity; 
        return addBarangMasuk({
            tanggal: '', // Ignore
            tempo: 'AUTO', ecommerce: 'SYSTEM', partNumber: h.partNumber, name: h.name,
            brand: '-', application: '-', rak: '-', stockAhir: finalStock, qtyMasuk: h.quantity,
            hargaSatuan: h.price, hargaTotal: h.totalPrice
        });
    } else {
        const finalStock = h.previousStock - h.quantity;
        return addBarangKeluar({
            tanggal: '', // Ignore
            kodeToko: 'SYS', tempo: 'AUTO', ecommerce: 'SYSTEM', customer: 'AUTO-LOG',
            partNumber: h.partNumber, name: h.name, brand: '-', application: '-', rak: '-',
            stockAhir: finalStock, qtyKeluar: h.quantity, hargaSatuan: h.price, hargaTotal: h.totalPrice, resi: '-'
        });
    }
};

// ... (sisanya tetap sama)
export const fetchOrders = async (): Promise<Order[]> => { const { data } = await supabase.from('orders').select('*').order('timestamp', { ascending: false }).limit(100); return (data || []).map((o: any) => ({ id: o.id, customerName: o.customer_name, items: o.items, totalAmount: Number(o.total_amount), status: o.status, timestamp: Number(o.timestamp) })); };
export const saveOrder = async (order: Order): Promise<boolean> => { const { error } = await supabase.from('orders').insert([{ id: order.id, customer_name: order.customerName, items: order.items, total_amount: order.totalAmount, status: order.status, timestamp: order.timestamp }]); return !error; };
export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => { const updateData: any = { status }; if (timestamp) { updateData.timestamp = timestamp; } const { error } = await supabase.from('orders').update(updateData).eq('id', id); return !error; };
export const fetchChatSessions = async (): Promise<ChatSession[]> => { const { data } = await supabase.from('chat_sessions').select('*'); return (data || []).map((c: any) => ({ customerId: c.customer_id, customerName: c.customer_name, messages: c.messages, lastMessage: c.last_message, lastTimestamp: c.last_timestamp, unreadAdminCount: c.unread_admin_count, unreadUserCount: c.unread_user_count })); };
export const saveChatSession = async (s: ChatSession): Promise<boolean> => { const { error } = await supabase.from('chat_sessions').upsert([{ customer_id: s.customerId, customer_name: s.customerName, messages: s.messages, last_message: s.lastMessage, last_timestamp: s.lastTimestamp, unread_admin_count: s.unreadAdminCount, unread_user_count: s.unreadUserCount }]); return !error; };
export const fetchPriceHistoryBySource = async (partNumber: string) => { const { data, error } = await supabase.from('barang_masuk').select('ecommerce, harga_satuan, created_at').eq('part_number', partNumber).order('created_at', { ascending: false }); if (error || !data) return []; const uniqueSources: Record<string, any> = {}; data.forEach((item: any) => { const sourceName = item.ecommerce || 'Unknown'; if (!uniqueSources[sourceName]) { uniqueSources[sourceName] = { source: sourceName, price: Number(item.harga_satuan), date: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-' }; } }); return Object.values(uniqueSources); };
export const clearBarangKeluar = async (): Promise<boolean> => { const { error } = await supabase.from('barang_keluar').delete().neq('id', 0); if (error) { console.error("Gagal hapus barang keluar:", error); return false; } return true; };