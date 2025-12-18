// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { 
  InventoryItem, 
  InventoryFormData, 
  StockHistory, 
  BarangMasuk, 
  BarangKeluar, 
  Order, 
  ChatSession, 
  ReturRecord, 
  CartItem,
  ScanResiLog 
} from '../types';

const TABLE_NAME = 'base';

const handleDbError = (op: string, err: any) => { console.error(`${op} Error:`, err); };

// --- HELPER FUNCTIONS ---
const getWIBISOString = (): string => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (7 * 3600000));
    
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const pad3 = (n: number) => n < 10 ? '00' + n : (n < 100 ? '0' + n : n);
    
    return `${wibTime.getFullYear()}-${pad(wibTime.getMonth() + 1)}-${pad(wibTime.getDate())}T${pad(wibTime.getHours())}:${pad(wibTime.getMinutes())}:${pad(wibTime.getSeconds())}.${pad3(wibTime.getMilliseconds())}`;
};

const parseTimestamp = (dateString: string | null | undefined): number | null => {
    if (!dateString) return null; 
    const time = new Date(dateString).getTime();
    return isNaN(time) ? null : time;
};

const formatDisplayTempo = (tempo: string | null | undefined): string => {
    const val = tempo || '';
    if (val === 'AUTO' || val === 'APP') return ''; 
    return val;
};

const mapBaseItem = (item: any): InventoryItem => ({
    id: item.id,
    partNumber: item.part_number,
    name: item.name,
    brand: item.brand || '',             
    application: item.application || '', 
    quantity: Number(item.quantity) || 0,
    shelf: item.shelf || '',
    imageUrl: item.image_url || '',
    lastUpdated: item.date ? new Date(item.date).getTime() : (item.created_at ? new Date(item.created_at).getTime() : Date.now()),
    price: 0, kingFanoPrice: 0, costPrice: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, ecommerce: ''
});

// --- HELPER PRICES ---
const fetchLatestCostPrices = async (partNumbers?: string[]) => {
    let query = supabase.from('barang_masuk').select('part_number, harga_satuan').order('created_at', { ascending: false, nullsFirst: false });
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
    let query = supabase.from('barang_keluar').select('part_number, harga_satuan').order('created_at', { ascending: false, nullsFirst: false });
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

// --- CORE INVENTORY FUNCTIONS ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data: baseData, error } = await supabase.from(TABLE_NAME).select('*').order('date', { ascending: false, nullsFirst: false });
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
  const { data: costData } = await supabase.from('barang_masuk').select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false, nullsFirst: false }).limit(1).single();
  if (costData) mapped.costPrice = Number(costData.harga_satuan) || 0;
  const { data: sellData } = await supabase.from('barang_keluar').select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false, nullsFirst: false }).limit(1).single();
  if (sellData) mapped.price = Number(sellData.harga_satuan) || 0;
  return mapped;
};

export const getItemByPartNumber = async (partNumber: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('part_number', partNumber).limit(1).single();
  if (error || !data) return null;
  const mapped = mapBaseItem(data);
  return mapped;
};

export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all') => {
    let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
    if (search) { query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`); }
    if (filter === 'low') { query = query.gt('quantity', 0).lt('quantity', 4); } 
    else if (filter === 'empty') { query = query.or('quantity.lte.0,quantity.is.null'); }
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.order('date', { ascending: false, nullsFirst: false }).range(from, to);
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
    let totalStock = 0; let totalAsset = 0;
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
  const wibNow = getWIBISOString();
  const { data, error } = await supabase.from(TABLE_NAME).insert([{
    part_number: item.partNumber, name: item.name, brand: item.brand, 
    application: item.application, quantity: item.quantity, shelf: item.shelf, 
    image_url: item.imageUrl, 
    date: wibNow 
  }]).select().single();
  
  if (error) { handleDbError("Tambah Barang ke Base", error); return null; }
  
  if (item.quantity > 0 && data) {
      await addBarangMasuk({
          created_at: wibNow,
          tempo: '', 
          keterangan: 'Stok Awal', 
          ecommerce: 'Stok Awal', 
          partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
          rak: item.shelf, stockAhir: item.quantity, qtyMasuk: item.quantity,
          hargaSatuan: item.costPrice || 0, hargaTotal: (item.costPrice || 0) * item.quantity
      });
  }
  return data ? data.id : null;
};

// --- UPDATE INVENTORY ---
export const updateInventory = async (
    item: InventoryItem, 
    transaction?: { type: 'in' | 'out', qty: number, ecommerce: string, resiTempo: string, customer?: string, price?: number, isReturn?: boolean }
): Promise<InventoryItem | null> => {
  
  const { data: currentDbItem, error: fetchError } = await supabase
      .from(TABLE_NAME).select('quantity').eq('id', item.id).single();

  if (fetchError || !currentDbItem) {
      console.error("Gagal ambil stok terbaru:", fetchError);
      return null;
  }

  let finalQty = Number(currentDbItem.quantity);

  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      if (transaction.type === 'in') finalQty += txQty;
      else finalQty -= txQty;
  } else {
      finalQty = item.quantity;
  }

  const wibNow = getWIBISOString();
  const { data: updatedData, error } = await supabase.from(TABLE_NAME).update({
    name: item.name, brand: item.brand, application: item.application,
    shelf: item.shelf, quantity: finalQty, image_url: item.imageUrl,
    date: wibNow 
  }).eq('id', item.id).select();

  if (error || !updatedData || updatedData.length === 0) { 
      handleDbError("Update Barang Base", error); 
      return null; 
  }
  
  const baseUpdated = updatedData[0];

  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      const sourceName = transaction.ecommerce || 'Manual Edit';
      
      const txPrice = transaction.price !== undefined 
          ? transaction.price 
          : (transaction.type === 'in' ? (item.costPrice || 0) : (item.price || 0));
      const txTotal = txPrice * txQty;

      if (transaction.type === 'in') {
          let ketText = 'Manual Restock';
          if (transaction.isReturn) {
              const custName = transaction.customer || 'Customer';
              ketText = `${custName} (RETUR)`; 
          }

          await addBarangMasuk({
              created_at: wibNow,
              tempo: transaction.resiTempo || '-', 
              keterangan: ketText, 
              ecommerce: sourceName, 
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf, stockAhir: finalQty, qtyMasuk: txQty,
              hargaSatuan: txPrice, hargaTotal: txTotal
          });
      } else {
          await addBarangKeluar({
              created_at: wibNow,
              kodeToko: 'MANUAL', 
              tempo: '', 
              ecommerce: sourceName,
              customer: transaction.customer || '', 
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf, stockAhir: finalQty, qtyKeluar: txQty,
              hargaSatuan: txPrice, hargaTotal: txTotal,
              resi: transaction.resiTempo || '-'
          });
      }
  }

  return {
      ...item,
      quantity: finalQty,
      name: baseUpdated.name,
      brand: baseUpdated.brand,
      application: baseUpdated.application,
      shelf: baseUpdated.shelf,
      imageUrl: baseUpdated.image_url,
      lastUpdated: new Date(wibNow).getTime()
  };
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang Base", error); return false; }
  return true;
};

// --- HISTORY & TRANSAKSI ---
export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data: dataMasuk } = await supabase.from('barang_masuk').select('*').order('created_at', { ascending: false, nullsFirst: false }).limit(100);
    const { data: dataKeluar } = await supabase.from('barang_keluar').select('*').order('created_at', { ascending: false, nullsFirst: false }).limit(100);
    const history: StockHistory[] = [];
    (dataMasuk || []).forEach((m: any) => {
        const ket = m.keterangan || 'Restock';
        const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: Number(m.qty_masuk), previousStock: Number(m.stock_ahir) - Number(m.qty_masuk),
            currentStock: Number(m.stock_ahir), price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at || m.date), reason: reasonText, resi: '-', tempo: m.tempo || '-'
        });
    });
    (dataKeluar || []).forEach((k: any) => {
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: Number(k.qty_keluar), previousStock: Number(k.stock_ahir) + Number(k.qty_keluar),
            currentStock: Number(k.stock_ahir), price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at || k.date), reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, resi: k.resi || '-', tempo: formatDisplayTempo(k.tempo) 
        });
    });
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const fetchHistoryLogsPaginated = async (type: 'in' | 'out', page: number, limit: number, search: string) => {
    const table = type === 'in' ? 'barang_masuk' : 'barang_keluar';
    let query = supabase.from(table).select('*', { count: 'exact' });
    if (search) {
        if (type === 'in') {
            query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,keterangan.ilike.%${search}%,tempo.ilike.%${search}%`);
        }
        else {
            query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,customer.ilike.%${search}%,resi.ilike.%${search}%,tempo.ilike.%${search}%`);
        }
    }
    const from = (page - 1) * limit; const to = from + limit - 1;
    const { data, error, count } = await query.order('created_at', { ascending: false, nullsFirst: false }).range(from, to);
    if (error) { return { data: [], count: 0 }; }
    const mappedData: StockHistory[] = (data || []).map((item: any) => {
        const qty = type === 'in' ? Number(item.qty_masuk) : Number(item.qty_keluar);
        const current = Number(item.stock_ahir); 
        const previous = type === 'in' ? (current - qty) : (current + qty);
        let reasonText = '';
        let displayTempo = formatDisplayTempo(item.tempo);
        if (type === 'in') {
            displayTempo = item.tempo || '-';
            const ket = item.keterangan || 'Restock';
            reasonText = `${ket} (Via: ${item.ecommerce || '-'})`;
        } else {
            reasonText = `${item.customer || ''} (Via: ${item.ecommerce || '-'}) (Resi: ${item.resi || '-'})`;
        }
        return {
            id: item.id, itemId: item.part_number, partNumber: item.part_number, name: item.name,
            type: type, quantity: qty, previousStock: previous, currentStock: current,
            price: Number(item.harga_satuan), totalPrice: Number(item.harga_total),
            timestamp: parseTimestamp(item.created_at || item.date), 
            reason: reasonText, resi: item.resi || '-', tempo: displayTempo
        };
    });
    return { data: mappedData, count: count || 0 };
};

export const fetchItemHistory = async (partNumber: string): Promise<StockHistory[]> => {
    const { data: dataMasuk } = await supabase.from('barang_masuk').select('*').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const { data: dataKeluar } = await supabase.from('barang_keluar').select('*').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const history: StockHistory[] = [];
    (dataMasuk || []).forEach((m: any) => {
        const ket = m.keterangan || 'Restock';
        const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: Number(m.qty_masuk), previousStock: Number(m.stock_ahir) - Number(m.qty_masuk),
            currentStock: Number(m.stock_ahir), price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at || m.date), reason: reasonText, resi: '-', tempo: m.tempo || '-'
        });
    });
    (dataKeluar || []).forEach((k: any) => {
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: Number(k.qty_keluar), previousStock: Number(k.stock_ahir) + Number(k.qty_keluar),
            currentStock: Number(k.stock_ahir), price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at || k.date), reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, resi: k.resi || '-', tempo: formatDisplayTempo(k.tempo) 
        });
    });
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

// --- INSERT FUNCTIONS (EXPORTED PROPERLY) ---

export const addBarangMasuk = async (data: any) => { 
    const ecommerceVal = data.ecommerce || 'Lainnya';
    const keteranganVal = data.keterangan || 'Restock'; 
    const { error } = await supabase.from('barang_masuk').insert([{ 
        created_at: data.created_at || getWIBISOString(), 
        tempo: data.tempo, ecommerce: ecommerceVal, keterangan: keteranganVal, 
        part_number: data.partNumber || data.part_number, name: data.name, brand: data.brand, application: data.application, rak: data.rak, 
        stock_ahir: data.stockAhir || data.stock_ahir, qty_masuk: data.qtyMasuk || data.qty_masuk, 
        harga_satuan: data.hargaSatuan || data.harga_satuan, harga_total: data.hargaTotal || data.harga_total 
    }]); 
    if(error) console.error("addBarangMasuk Error", error);
    return !error; 
};

export const addBarangKeluar = async (data: any) => { 
    const { error } = await supabase.from('barang_keluar').insert([{ 
        created_at: data.created_at || getWIBISOString(), 
        kode_toko: data.kodeToko || data.kode_toko, tempo: data.tempo, ecommerce: data.ecommerce, customer: data.customer, 
        part_number: data.partNumber || data.part_number, name: data.name, brand: data.brand, application: data.application, rak: data.rak, 
        stock_ahir: data.stockAhir || data.stock_ahir, qty_keluar: data.qtyKeluar || data.qty_keluar, 
        harga_satuan: data.hargaSatuan || data.harga_satuan, harga_total: data.hargaTotal || data.harga_total, resi: data.resi 
    }]); 
    if(error) console.error("addBarangKeluar Error", error);
    return !error; 
};

export const addHistoryLog = async (h: StockHistory) => { 
    const now = getWIBISOString(); 
    if (h.type === 'in') {
        return addBarangMasuk({ 
            created_at: now, tempo: '', keterangan: 'System Log', ecommerce: 'SYSTEM', 
            partNumber: h.partNumber, name: h.name, brand: '-', application: '-', rak: '-', 
            stockAhir: h.previousStock + h.quantity, qtyMasuk: h.quantity, 
            hargaSatuan: h.price, hargaTotal: h.totalPrice 
        }); 
    } else {
        return addBarangKeluar({ 
            created_at: now, kodeToko: 'SYS', tempo: '', ecommerce: 'SYSTEM', customer: '', 
            partNumber: h.partNumber, name: h.name, brand: '-', application: '-', rak: '-', 
            stockAhir: h.previousStock - h.quantity, qtyKeluar: h.quantity, 
            hargaSatuan: h.price, hargaTotal: h.totalPrice, resi: '-' 
        }); 
    }
};

// --- FUNGSI UPDATE ORDER ---

export const updateOrderData = async (orderId: string, newItems: any[], newTotal: number, newStatus: string): Promise<boolean> => {
    const { data: oldData } = await supabase.from('orders').select('*').eq('resi', orderId).limit(1).single();
    if (!oldData) return false;

    const { error: delError } = await supabase.from('orders').delete().eq('resi', orderId);
    if (delError) { console.error("Gagal hapus order lama:", delError); return false; }

    const rows = newItems.map((item: any) => ({
        tanggal: oldData.tanggal, resi: orderId, toko: oldData.toko, ecommerce: oldData.ecommerce,
        customer: oldData.customer, part_number: item.partNumber, nama_barang: item.name,
        quantity: item.cartQuantity, harga_satuan: item.customPrice || item.price,
        harga_total: (item.customPrice || item.price) * item.cartQuantity, status: newStatus
    }));

    if (rows.length > 0) {
        const { error: insError } = await supabase.from('orders').insert(rows);
        if (insError) { console.error("Gagal insert order baru:", insError); return false; }
    }
    return true;
};

// --- FUNGSI UTAMA ORDERS (GROUPING FIX) ---

export const fetchOrders = async (): Promise<Order[]> => { 
    // Mengambil data dari tabel 'orders'
    const { data } = await supabase.from('orders').select('*').order('tanggal', { ascending: false }).limit(300); 
    if (!data) return [];

    // Grouping berdasarkan RESI DAN STATUS
    // Agar "Processing" dan "Cancelled" (Retur) terpisah meskipun resinya sama
    const groupedOrders: Record<string, Order> = {};

    data.forEach((row: any) => {
        const resi = row.resi || row.id || 'UNKNOWN';
        // UNIQUE KEY: Gabungan Resi + Status
        const groupKey = `${resi}_${row.status}`; 
        
        if (!groupedOrders[groupKey]) {
            const customerStr = row.customer || '-';
            const tokoStr = row.toko ? ` (Toko: ${row.toko})` : '';
            const viaStr = row.ecommerce ? ` (Via: ${row.ecommerce})` : '';
            const resiStr = row.resi ? ` (Resi: ${row.resi})` : '';
            const constructedCustomerName = `${customerStr}${tokoStr}${viaStr}${resiStr}`;

            groupedOrders[groupKey] = {
                // ID di frontend menggunakan Resi, tapi jika ada split, kita gunakan resi asli
                // karena updateOrderStatusService menggunakan .eq('resi', id)
                id: resi, 
                customerName: constructedCustomerName,
                items: [],
                totalAmount: 0,
                status: row.status as any,
                timestamp: row.tanggal ? new Date(row.tanggal).getTime() : Date.now(),
                keterangan: '' 
            };
        }

        groupedOrders[groupKey].items.push({
            id: row.part_number, 
            partNumber: row.part_number,
            name: row.nama_barang,
            quantity: 0, 
            price: Number(row.harga_satuan),
            cartQuantity: Number(row.quantity),
            customPrice: Number(row.harga_satuan),
            brand: '', application: '', shelf: '', ecommerce: '', imageUrl: '', lastUpdated: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, costPrice: 0, kingFanoPrice: 0
        });

        groupedOrders[groupKey].totalAmount += Number(row.harga_total);
    });

    return Object.values(groupedOrders);
};

export const saveOrder = async (order: Order): Promise<boolean> => { 
    const parseDetails = (name: string) => {
        let cleanName = name;
        let toko = '-'; let ecommerce = '-'; let resi = order.id; 
        const resiMatch = name.match(/\(Resi: (.*?)\)/); if (resiMatch) { resi = resiMatch[1]; cleanName = cleanName.replace(/\(Resi:.*?\)/, ''); }
        const tokoMatch = name.match(/\(Toko: (.*?)\)/); if (tokoMatch) { toko = tokoMatch[1]; cleanName = cleanName.replace(/\(Toko:.*?\)/, ''); }
        const viaMatch = name.match(/\(Via: (.*?)\)/); if (viaMatch) { ecommerce = viaMatch[1]; cleanName = cleanName.replace(/\(Via:.*?\)/, ''); }
        return { customer: cleanName.replace(/\(RETUR\)/i, '').trim(), toko: (toko !== '-' && toko) ? toko : null, ecommerce: (ecommerce !== '-' && ecommerce) ? ecommerce : null, resi: resi };
    };

    const details = parseDetails(order.customerName);
    const orderDate = new Date(order.timestamp).toISOString().split('T')[0];

    const rows = order.items.map(item => ({
        tanggal: orderDate, 
        resi: details.resi, 
        toko: details.toko, 
        ecommerce: details.ecommerce, 
        customer: details.customer, 
        part_number: item.partNumber || '-', 
        nama_barang: item.name, 
        quantity: item.cartQuantity,
        harga_satuan: item.customPrice || item.price, 
        harga_total: (item.customPrice || item.price) * item.cartQuantity, 
        status: order.status
    }));

    const { error } = await supabase.from('orders').insert(rows);
    if (error) { console.error("Gagal simpan order:", error); return false; }
    return true; 
};

export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => { 
    const updateData: any = { status }; 
    if (timestamp) { updateData.tanggal = new Date(timestamp).toISOString().split('T')[0]; } 
    const { error } = await supabase.from('orders').update(updateData).eq('resi', id); 
    return !error; 
};

export const fetchChatSessions = async (): Promise<ChatSession[]> => { const { data } = await supabase.from('chat_sessions').select('*'); return (data || []).map((c: any) => ({ customerId: c.customer_id, customerName: c.customer_name, messages: c.messages, lastMessage: c.last_message, lastTimestamp: c.last_timestamp, unreadAdminCount: c.unread_admin_count, unreadUserCount: c.unread_user_count })); };
export const saveChatSession = async (s: ChatSession): Promise<boolean> => { const { error } = await supabase.from('chat_sessions').upsert([{ customer_id: s.customerId, customer_name: s.customerName, messages: s.messages, last_message: s.lastMessage, last_timestamp: s.lastTimestamp, unread_admin_count: s.unreadAdminCount, unread_user_count: s.unreadUserCount }]); return !error; };

// --- MISC ---
export const addReturTransaction = async (data: ReturRecord): Promise<boolean> => {
    const { error } = await supabase.from('retur').insert([{
        tanggal_pemesanan: data.tanggal_pemesanan, resi: data.resi, toko: data.toko, ecommerce: data.ecommerce,
        customer: data.customer, part_number: data.part_number, nama_barang: data.nama_barang, quantity: data.quantity,
        harga_satuan: data.harga_satuan, harga_total: data.harga_total, tanggal_retur: data.tanggal_retur,
        status: data.status, keterangan: data.keterangan
    }]);
    if (error) { console.error("Gagal simpan ke tabel Retur:", error); return false; }
    return true;
};

export const fetchReturRecords = async (): Promise<ReturRecord[]> => {
    const { data, error } = await supabase.from('retur').select('*').order('tanggal_retur', { ascending: false });
    if (error) { console.error("Gagal ambil data retur:", error); return []; }
    return data || [];
};

export const updateReturKeterangan = async (resi: string, keterangan: string): Promise<boolean> => {
    const { error: returError } = await supabase.from('retur').update({ keterangan: keterangan }).eq('resi', resi); 
    if (returError) { console.error("Gagal update keterangan retur:", returError); return false; }
    return true;
};

export const fetchPriceHistoryBySource = async (partNumber: string) => { const { data, error } = await supabase.from('barang_masuk').select('ecommerce, harga_satuan, created_at').eq('part_number', partNumber).order('created_at', { ascending: false }); if (error || !data) return []; const uniqueSources: Record<string, any> = {}; data.forEach((item: any) => { const sourceName = item.ecommerce || 'Unknown'; if (!uniqueSources[sourceName]) { uniqueSources[sourceName] = { source: sourceName, price: Number(item.harga_satuan), date: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-' }; } }); return Object.values(uniqueSources); };
export const clearBarangKeluar = async (): Promise<boolean> => { const { error } = await supabase.from('barang_keluar').delete().neq('id', 0); if (error) { console.error("Gagal hapus barang keluar:", error); return false; } return true; };

// --- FUNGSI SCAN RESI LOG ---

export const fetchScanResiLogs = async (): Promise<ScanResiLog[]> => {
    const { data, error } = await supabase
        .from('scan_resi')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(100);

    if (error) {
        console.error("Gagal ambil log scan resi:", error);
        return [];
    }
    return data || [];
};

export const addScanResiLog = async (resi: string, ecommerce: string, toko: string): Promise<boolean> => {
    const { error } = await supabase.from('scan_resi').insert([{
        tanggal: new Date().toISOString(),
        resi: resi,
        ecommerce: ecommerce,
        toko: toko,
        status: 'Pending', // Status Awal
    }]);

    if (error) {
        console.error("Gagal simpan log resi:", error);
        return false;
    }
    return true;
};

// --- FUNGSI BARU: UPDATE DARI EXCEL & PROSES KIRIM ---

// 1. Update Massal dari Excel (Matching by Resi)
export const updateScanResiFromExcel = async (updates: any[]): Promise<boolean> => {
    // Karena Supabase tidak support update batch berbeda-beda value per row dengan mudah,
    // Kita gunakan Promise.all untuk update per row (aman untuk jumlah ratusan/harian)
    try {
        const promises = updates.map(async (item) => {
            // Logic Status: Jika data lengkap -> Siap Kirim
            let newStatus = 'Pending';
            if (item.customer && item.part_number && item.nama_barang && item.quantity && item.harga_total) {
                newStatus = 'Siap Kirim';
            }

            return supabase
                .from('scan_resi')
                .update({
                    customer: item.customer,
                    part_number: item.part_number,
                    nama_barang: item.nama_barang,
                    quantity: item.quantity,
                    harga_satuan: item.harga_satuan,
                    harga_total: item.harga_total,
                    status: newStatus // Update status otomatis
                })
                .eq('resi', item.resi);
        });

        await Promise.all(promises);
        return true;
    } catch (error) {
        console.error("Gagal update batch excel:", error);
        return false;
    }
};

// 2. Fungsi Update Single Field (BARU - Sesuai request View)
export const updateScanResiLogField = async (id: number, field: string, value: any): Promise<boolean> => {
    // 1. Update Field Target
    const { data, error } = await supabase
        .from('scan_resi')
        .update({ [field]: value })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error(`Gagal update field ${field}:`, error);
        return false;
    }

    // 2. Auto-Update Status (Sinkronisasi dengan Logika UI)
    // Jika Part Number, Nama Barang, dan Qty terisi, ubah status jadi "Siap Kirim"
    if (data) {
        const isComplete = data.part_number && data.nama_barang && data.quantity;
        const newStatus = isComplete ? 'Siap Kirim' : 'Pending';

        // Hanya update jika status berubah dan belum "Terjual"
        if (data.status !== newStatus && data.status !== 'Terjual') {
            await supabase
                .from('scan_resi')
                .update({ status: newStatus })
                .eq('id', id);
        }
    }

    return true;
};

// 3. Proses Kirim (Pindah ke Orders + Update Status)
// UPDATE: Return type diubah menjadi object { success, message } untuk handle validasi
export const processShipmentToOrders = async (selectedLogs: ScanResiLog[]): Promise<{ success: boolean; message?: string }> => {
    try {
        // --- 1. VALIDASI: Cek Apakah Part Number Ada di Base ---
        const partNumbersToCheck = selectedLogs
            .map(log => log.part_number)
            .filter(pn => pn !== null && pn !== '') as string[];
        
        // Hapus duplikat agar query lebih efisien
        const uniquePartNumbers = [...new Set(partNumbersToCheck)];

        if (uniquePartNumbers.length > 0) {
            // Ambil daftar part_number yang valid dari database
            const { data: existingItems, error } = await supabase
                .from(TABLE_NAME) // Tabel 'base'
                .select('part_number')
                .in('part_number', uniquePartNumbers);
            
            if (error) {
                console.error("Error validating parts:", error);
                return { success: false, message: "Gagal memvalidasi Part Number di database." };
            }

            // Bandingkan part number yang di-scan dengan yang ada di database
            const existingSet = new Set(existingItems?.map(item => item.part_number));
            const missingParts = uniquePartNumbers.filter(pn => !existingSet.has(pn));

            // JIKA ADA YANG HILANG -> STOP PROSES & RETURN ERROR
            if (missingParts.length > 0) {
                return { 
                    success: false, 
                    message: `GAGAL PROSES KIRIM!\n\nPart Number berikut tidak ditemukan di database Base Inventory:\n\n${missingParts.join(', ')}\n\nSilakan daftarkan barang tersebut terlebih dahulu di menu Inventory/Shop sebelum diproses.` 
                };
            }
        }

        // --- 2. PROSES UPDATE (Jika Validasi Lolos) ---
        for (const log of selectedLogs) {
            // A. Cari Nama Barang Asli di Base Inventory berdasarkan Part Number
            // (Agar nama di laporan konsisten dengan nama di database, bukan nama dari label resi)
            let realItemName = log.nama_barang;
            
            if (log.part_number) {
                const { data: baseItem } = await supabase
                    .from(TABLE_NAME)
                    .select('name')
                    .eq('part_number', log.part_number)
                    .single();
                
                if (baseItem) {
                    realItemName = baseItem.name;
                }
            }

            // B. Masukkan ke tabel 'orders' (Manajemen Pesanan - Tab Terjual)
            const { error: insertError } = await supabase.from('orders').insert([{
                tanggal: new Date().toISOString(),
                resi: log.resi,
                toko: log.toko,
                ecommerce: log.ecommerce,
                customer: log.customer,
                part_number: log.part_number,
                nama_barang: realItemName, 
                quantity: log.quantity,
                harga_satuan: log.harga_satuan,
                harga_total: log.harga_total,
                status: 'completed' // Masuk ke Terjual
            }]);

            if (insertError) {
                console.error(`Gagal insert order ${log.resi}:`, insertError);
                // Lanjutkan loop agar resi lain yang valid tetap terproses
                continue; 
            }

            // C. Update status di tabel 'scan_resi' menjadi 'Terjual'
            await supabase
                .from('scan_resi')
                .update({ status: 'Terjual' })
                .eq('id', log.id);
        }

        return { success: true };

    } catch (error) {
        console.error("Error processing shipment:", error);
        return { success: false, message: "Terjadi kesalahan sistem saat memproses data." };
    }
};