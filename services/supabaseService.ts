// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { getTableName } from '../lib/databaseConfig';
import { 
  InventoryItem, 
  InventoryFormData, 
  StockHistory, 
  BarangMasuk, 
  BarangKeluar, 
  Order, 
  ChatSession, 
  ReturRecord, 
  ScanResiLog 
} from '../types';

// Helper function to get the current base table name
const getBaseTableName = () => getTableName('base');

// Cache Foto (Memori Sementara)
const photoCache: Record<string, string[]> = {};

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

const getWIBISOStringFromTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
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

const checkIsComplete = (data: { customer?: string | null, part_number?: string | null, nama_barang?: string | null, quantity?: number | null, harga_total?: number | null }): boolean => {
    const isCustomerValid = data.customer && data.customer !== '-' && data.customer.trim() !== '';
    const isPartNoValid = data.part_number && data.part_number !== '-' && data.part_number.trim() !== '';
    const isBarangValid = data.nama_barang && data.nama_barang !== '-' && data.nama_barang.trim() !== '';
    const isQtyValid = Number(data.quantity) > 0;
    return !!(isCustomerValid && isPartNoValid && isBarangValid && isQtyValid);
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
    images: item.image_url ? [item.image_url] : [],
    lastUpdated: item.date ? new Date(item.date).getTime() : (item.created_at ? new Date(item.created_at).getTime() : Date.now()),
    price: 0, kingFanoPrice: 0, costPrice: 0, initialStock: 0, qtyIn: 0, qtyOut: 0, ecommerce: ''
});

const chunkArray = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) { result.push(array.slice(i, i + size)); }
  return result;
};

const normalizeKey = (key: string | null | undefined): string => {
    return key ? key.trim().toUpperCase() : '';
};

// --- DATA FETCHING HELPERS ---

const fetchLatestCostPrices = async (partNumbers?: string[]) => {
    try {
        let query = supabase.from(getTableName('barang_masuk')).select('part_number, harga_satuan').order('created_at', { ascending: false, nullsFirst: false });
        if (partNumbers && partNumbers.length > 0) { query = query.in('part_number', partNumbers); }
        const { data, error } = await query;
        if (error || !data) return {};
        const priceMap: Record<string, number> = {};
        data.forEach((row: any) => {
            const key = normalizeKey(row.part_number);
            if (key && priceMap[key] === undefined) { priceMap[key] = Number(row.harga_satuan) || 0; }
        });
        return priceMap;
    } catch (e) { return {}; }
};

const fetchLatestSellingPrices = async (partNumbers?: string[]) => {
    try {
        let query = supabase.from(getTableName('list_harga_jual')).select('part_number, harga');
        if (partNumbers && partNumbers.length > 0) { query = query.in('part_number', partNumbers); }
        const { data, error } = await query;
        if (error || !data) return {};
        const priceMap: Record<string, number> = {};
        data.forEach((row: any) => {
            const key = normalizeKey(row.part_number);
            if (key && priceMap[key] === undefined) { priceMap[key] = Number(row.harga) || 0; }
        });
        return priceMap;
    } catch (e) { return {}; }
};

const fetchPhotos = async (partNumbers?: string[]) => {
    if (!partNumbers || partNumbers.length === 0) return {};
    const result: Record<string, string[]> = {};
    const missingPartNumbers: string[] = [];

    partNumbers.forEach(pn => {
        const key = normalizeKey(pn);
        if (photoCache[key]) { result[key] = photoCache[key]; } 
        else { missingPartNumbers.push(pn); }
    });

    if (missingPartNumbers.length === 0) return result;

    const batches = chunkArray(missingPartNumbers, 50);
    const fetchBatch = async (batch: string[]) => {
        try {
            const { data, error } = await supabase.from(getTableName('foto'))
                .select('part_number, foto_1, foto_2, foto_3, foto_4, foto_5, foto_6, foto_7, foto_8, foto_9, foto_10')
                .in('part_number', batch);
            if (error) return; 
            if (data) {
                data.forEach((row: any) => {
                    const key = normalizeKey(row.part_number);
                    if (key) {
                        const photos = [row.foto_1, row.foto_2, row.foto_3, row.foto_4, row.foto_5, row.foto_6, row.foto_7, row.foto_8, row.foto_9, row.foto_10];
                        const validPhotos = photos.filter(p => p && typeof p === 'string' && p.trim().length > 0);
                        if (validPhotos.length > 0) { photoCache[key] = validPhotos; result[key] = validPhotos; }
                    }
                });
            }
        } catch (e) { console.error(e); }
    };
    try { await Promise.all(batches.map(batch => fetchBatch(batch))); } catch (e) {}
    return result;
};

export const saveItemImages = async (partNumber: string, images: string[]) => {
    if (!partNumber) return;
    const key = normalizeKey(partNumber);
    photoCache[key] = images;
    const payload: any = { part_number: partNumber };
    for (let i = 0; i < 10; i++) { payload[`foto_${i+1}`] = images[i] || null; }
    try {
        const { data: existing } = await supabase.from(getTableName('foto')).select('id').eq('part_number', partNumber).maybeSingle();
        if (existing) { await supabase.from(getTableName('foto')).update(payload).eq('id', existing.id); } 
        else { await supabase.from(getTableName('foto')).insert([payload]); }
    } catch (e) { console.error(e); }
};

// --- CORE FUNCTIONS (DENGAN FIX UNTUK SHOP) ---

// 1. Fetch Gudang (Pagination)
export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all', brand?: string, application?: string) => {
    let query = supabase.from(getBaseTableName()).select('*', { count: 'exact' });
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`);
    if (brand && brand.trim() !== '') query = query.ilike('brand', `%${brand}%`);
    if (application && application.trim() !== '') query = query.ilike('application', `%${application}%`);
    if (filter === 'low') query = query.gt('quantity', 0).lt('quantity', 4); 
    else if (filter === 'empty') query = query.or('quantity.lte.0,quantity.is.null');
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.order('date', { ascending: false, nullsFirst: false }).range(from, to);
    if (error) { console.error(error); return { data: [], count: 0 }; }
    
    const baseItems = (data || []).map(mapBaseItem);
    if (baseItems.length > 0) {
        try {
            const partNumbers = baseItems.map(i => i.partNumber).filter(Boolean);
            const [costMap, sellMap, photoMapResult] = await Promise.all([fetchLatestCostPrices(partNumbers), fetchLatestSellingPrices(partNumbers), fetchPhotos(partNumbers)]);
            const photoMap = photoMapResult || {};
            baseItems.forEach(item => {
                const key = normalizeKey(item.partNumber);
                if (costMap && costMap[key] !== undefined) item.costPrice = costMap[key];
                if (sellMap && sellMap[key] !== undefined) item.price = sellMap[key];
                if (photoMap && photoMap[key] && photoMap[key].length > 0) { item.images = photoMap[key]; item.imageUrl = photoMap[key][0]; }
            });
        } catch (e) {}
    }
    return { data: baseItems, count: count || 0 };
};

// Fetch all inventory with filters (no pagination) - for sorting
export const fetchInventoryAllFiltered = async (search: string, filter: string = 'all', brand?: string, application?: string): Promise<InventoryItem[]> => {
    let query = supabase.from(getBaseTableName()).select('*');
    if (search) query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,brand.ilike.%${search}%,application.ilike.%${search}%`);
    if (brand && brand.trim() !== '') query = query.ilike('brand', `%${brand}%`);
    if (application && application.trim() !== '') query = query.ilike('application', `%${application}%`);
    if (filter === 'low') query = query.gt('quantity', 0).lt('quantity', 4); 
    else if (filter === 'empty') query = query.or('quantity.lte.0,quantity.is.null');
    
    const { data, error } = await query.order('date', { ascending: false, nullsFirst: false });
    if (error) { console.error(error); return []; }
    
    const baseItems = (data || []).map(mapBaseItem);
    if (baseItems.length > 0) {
        try {
            const partNumbers = baseItems.map(i => i.partNumber).filter(Boolean);
            const [costMap, sellMap, photoMapResult] = await Promise.all([fetchLatestCostPrices(partNumbers), fetchLatestSellingPrices(partNumbers), fetchPhotos(partNumbers)]);
            const photoMap = photoMapResult || {};
            baseItems.forEach(item => {
                const key = normalizeKey(item.partNumber);
                if (costMap && costMap[key] !== undefined) item.costPrice = costMap[key];
                if (sellMap && sellMap[key] !== undefined) item.price = sellMap[key];
                if (photoMap && photoMap[key] && photoMap[key].length > 0) { item.images = photoMap[key]; item.imageUrl = photoMap[key][0]; }
            });
        } catch (e) {}
    }
    return baseItems;
};

// 2. Fetch Shop / Beranda (DENGAN FIX KATEGORI & ORDERING)
export const fetchShopItems = async (
    page: number, 
    limit: number, 
    search: string, 
    cat: string,
    partNumberSearch?: string,
    nameSearch?: string,
    brandSearch?: string,
    applicationSearch?: string
) => {
    // Ambil hanya barang yg ada stoknya
    let query = supabase.from(getBaseTableName()).select('*', { count: 'exact' }).gt('quantity', 0);
    
    // Filter Pencarian Umum (search all fields)
    if (search && search.trim() !== '') {
        const searchTerm = search.trim();
        query = query.or(`name.ilike.%${searchTerm}%,part_number.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,application.ilike.%${searchTerm}%`);
    }
    
    // Filter Individual Fields
    if (partNumberSearch && partNumberSearch.trim() !== '') {
        query = query.ilike('part_number', `%${partNumberSearch.trim()}%`);
    }
    if (nameSearch && nameSearch.trim() !== '') {
        query = query.ilike('name', `%${nameSearch.trim()}%`);
    }
    if (brandSearch && brandSearch.trim() !== '') {
        query = query.ilike('brand', `%${brandSearch.trim()}%`);
    }
    if (applicationSearch && applicationSearch.trim() !== '') {
        query = query.ilike('application', `%${applicationSearch.trim()}%`);
    }
    
    // Filter Kategori (Fix Logic) - Keep for backward compatibility
    if (cat && cat !== 'All' && cat.trim() !== '') {
        const categoryTerm = cat.trim();
        query = query.or(`brand.ilike.%${categoryTerm}%,application.ilike.%${categoryTerm}%`);
    }

    // Pagination & Sorting (PENTING: Sorting agar stabil)
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await query.order('name', { ascending: true }).range(from, to);
    
    if (error) { 
        console.error("Shop fetch failed:", error); 
        return { data: [], count: 0 }; 
    }
    
    const baseItems = (data || []).map(mapBaseItem);

    // Ambil Data Tambahan (Try-Catch agar tidak blank)
    if (baseItems.length > 0) {
        try {
            const partNumbers = baseItems.map(i => i.partNumber).filter(Boolean);
            const [sellMap, photoMapResult] = await Promise.all([
                 fetchLatestSellingPrices(partNumbers),
                 fetchPhotos(partNumbers)
            ]);
            const photoMap = photoMapResult || {};

            baseItems.forEach(item => {
                const key = normalizeKey(item.partNumber);
                if (sellMap && sellMap[key] !== undefined) item.price = sellMap[key];
                if (photoMap && photoMap[key] && photoMap[key].length > 0) {
                    item.images = photoMap[key];
                    item.imageUrl = photoMap[key][0];
                }
            });
        } catch (e) {
            console.error("Shop secondary fetch failed, using base data only", e);
        }
    }
    return { data: baseItems, count: count || 0 };
};

// ... Fungsi Standar Lainnya (Tidak berubah logika, hanya disertakan agar file utuh) ...

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data: baseData, error } = await supabase.from(getBaseTableName()).select('*').order('date', { ascending: false, nullsFirst: false });
  if (error) { console.error(error); return []; }
  const baseItems = (baseData || []).map(mapBaseItem);
  const partNumbers = baseItems.map((item: any) => item.partNumber).filter(Boolean);
  try {
      const [costMap, sellMap, photoMapResult] = await Promise.all([fetchLatestCostPrices(partNumbers), fetchLatestSellingPrices(partNumbers), fetchPhotos(partNumbers)]);
      const photoMap = photoMapResult || {};
      baseItems.forEach((item) => {
          const key = normalizeKey(item.partNumber);
          if (costMap && costMap[key] !== undefined) item.costPrice = costMap[key];
          if (sellMap && sellMap[key] !== undefined) item.price = sellMap[key];
          if (photoMap && photoMap[key] && photoMap[key].length > 0) { item.images = photoMap[key]; item.imageUrl = photoMap[key][0]; }
      });
  } catch (e) {}
  return baseItems;
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from(getBaseTableName()).select('*').eq('id', id).single();
  if (error || !data) return null;
  const mapped = mapBaseItem(data);
  const key = normalizeKey(mapped.partNumber);
  try {
      const { data: costData } = await supabase.from(getTableName('barang_masuk')).select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      if (costData) mapped.costPrice = Number(costData.harga_satuan) || 0;
      const { data: sellData } = await supabase.from(getTableName('list_harga_jual')).select('harga').eq('part_number', mapped.partNumber).limit(1).maybeSingle();
      if (sellData) mapped.price = Number(sellData.harga) || 0;
      if (mapped.partNumber) {
          const photoMap = await fetchPhotos([mapped.partNumber]);
          if (photoMap && photoMap[key] && photoMap[key].length > 0) { mapped.images = photoMap[key]; mapped.imageUrl = photoMap[key][0]; }
      }
  } catch (e) {}
  return mapped;
};

export const getItemByPartNumber = async (partNumber: string): Promise<InventoryItem | null> => {
  const { data, error } = await supabase.from(getBaseTableName()).select('*').eq('part_number', partNumber).limit(1).single();
  if (error || !data) return null;
  const mapped = mapBaseItem(data);
  const key = normalizeKey(mapped.partNumber);
  try {
      const { data: costData } = await supabase.from(getTableName('barang_masuk')).select('harga_satuan').eq('part_number', mapped.partNumber).order('created_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      if (costData) mapped.costPrice = Number(costData.harga_satuan) || 0;
      const { data: sellData } = await supabase.from(getTableName('list_harga_jual')).select('harga').eq('part_number', mapped.partNumber).limit(1).maybeSingle();
      if (sellData) mapped.price = Number(sellData.harga) || 0;
      if (mapped.partNumber) {
          const photoMap = await fetchPhotos([mapped.partNumber]);
          if (photoMap && photoMap[key] && photoMap[key].length > 0) { mapped.images = photoMap[key]; mapped.imageUrl = photoMap[key][0]; }
      }
  } catch (e) {}
  return mapped;
};

export const fetchInventoryStats = async () => {
    const { data: items } = await supabase.from(getBaseTableName()).select('part_number, quantity');
    const all = items || [];
    const partNumbers = all.map((i: any) => i.part_number).filter(Boolean);
    if (partNumbers.length === 0) return { totalItems: 0, totalStock: 0, totalAsset: 0 };
    try {
        const batches = chunkArray(partNumbers, 50);
        let costMap: Record<string, number> = {};
        const results = await Promise.all(batches.map(batch => fetchLatestCostPrices(batch)));
        results.forEach(res => { costMap = { ...costMap, ...res }; });
        let totalStock = 0; let totalAsset = 0;
        all.forEach((item: any) => {
            const key = normalizeKey(item.part_number);
            const qty = Number(item.quantity) || 0;
            const cost = costMap[key] || 0;
            totalStock += qty;
            totalAsset += (qty * cost);
        });
        return { totalItems: all.length, totalStock, totalAsset };
    } catch (e) {
        let totalStock = 0; all.forEach((item: any) => { totalStock += Number(item.quantity) || 0; });
        return { totalItems: all.length, totalStock, totalAsset: 0 };
    }
};

export const addInventory = async (item: InventoryFormData): Promise<string | null> => {
  const wibNow = getWIBISOString();
  const mainImage = (item.images && item.images.length > 0) ? item.images[0] : item.imageUrl;
  const { data, error } = await supabase.from(getBaseTableName()).insert([{
    part_number: item.partNumber, name: item.name, brand: item.brand, 
    application: item.application, quantity: item.quantity, shelf: item.shelf, 
    image_url: mainImage, date: wibNow 
  }]).select().single();
  if (error) { handleDbError("Tambah Barang ke Base", error); return null; }
  if (item.partNumber && item.images && item.images.length > 0) { await saveItemImages(item.partNumber, item.images); }
  else if (item.partNumber && item.imageUrl) { await saveItemImages(item.partNumber, [item.imageUrl]); }
  if (item.partNumber && item.price !== undefined) {
      try {
          const { data: existing } = await supabase.from(getTableName('list_harga_jual')).select('id').eq('part_number', item.partNumber).maybeSingle();
          if (existing) { await supabase.from(getTableName('list_harga_jual')).update({ harga: item.price, name: item.name }).eq('part_number', item.partNumber); } 
          else { await supabase.from(getTableName('list_harga_jual')).insert([{ part_number: item.partNumber, name: item.name, harga: item.price }]); }
      } catch (e) {}
  }
  if (item.quantity > 0 && data) {
      await addBarangMasuk({
          created_at: wibNow, tempo: '', keterangan: 'Stok Awal', ecommerce: 'Stok Awal', 
          partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
          rak: item.shelf, stockAhir: item.quantity, qtyMasuk: item.quantity,
          hargaSatuan: item.costPrice || 0, hargaTotal: (item.costPrice || 0) * item.quantity
      });
  }
  return data ? data.id : null;
};

export const updateInventory = async (item: InventoryItem, transaction?: { type: 'in' | 'out', qty: number, ecommerce: string, resiTempo: string, customer?: string, price?: number, isReturn?: boolean, store?: string }): Promise<InventoryItem | null> => {
  const { data: currentDbItem, error: fetchError } = await supabase.from(getBaseTableName()).select('quantity').eq('id', item.id).single();
  if (fetchError || !currentDbItem) { console.error("Gagal ambil stok terbaru:", fetchError); return null; }
  let finalQty = Number(currentDbItem.quantity);
  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      if (transaction.type === 'in') finalQty += txQty; else finalQty -= txQty;
  } else { finalQty = item.quantity; }
  const wibNow = getWIBISOString();
  const mainImage = (item.images && item.images.length > 0) ? item.images[0] : item.imageUrl;
  const { data: updatedData, error } = await supabase.from(getBaseTableName()).update({
    name: item.name, brand: item.brand, application: item.application,
    shelf: item.shelf, quantity: finalQty, 
    image_url: mainImage, 
    date: wibNow 
  }).eq('id', item.id).select();
  if (error || !updatedData || updatedData.length === 0) { handleDbError("Update Barang Base", error); return null; }
  if (item.partNumber && item.images && item.images.length > 0) { await saveItemImages(item.partNumber, item.images); }
  if (item.partNumber && item.price !== undefined && item.price > 0) {
      try {
          const { data: existing } = await supabase.from(getTableName('list_harga_jual')).select('id').eq('part_number', item.partNumber).limit(1).maybeSingle();
          if (existing) { await supabase.from(getTableName('list_harga_jual')).update({ harga: item.price, name: item.name }).eq('part_number', item.partNumber); }
          else { await supabase.from(getTableName('list_harga_jual')).insert([{ part_number: item.partNumber, name: item.name, harga: item.price }]); }
      } catch (e) {}
  }
  const baseUpdated = updatedData[0];
  if (transaction && transaction.qty > 0) {
      const txQty = Number(transaction.qty);
      const sourceName = transaction.ecommerce || 'Manual Edit';
      const txPrice = transaction.price !== undefined ? transaction.price : (transaction.type === 'in' ? (item.costPrice || 0) : (item.price || 0));
      const txTotal = txPrice * txQty;
      if (transaction.type === 'in') {
          let ketText = 'Manual Restock';
          if (transaction.customer && transaction.customer.trim() !== '') ketText = transaction.customer;
          if (transaction.isReturn) { const custName = transaction.customer || 'Customer'; ketText = `${custName} (RETUR)`; }
          await addBarangMasuk({
              created_at: wibNow, tempo: transaction.resiTempo || '-', keterangan: ketText, ecommerce: sourceName, 
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf, stockAhir: finalQty, qtyMasuk: txQty, hargaSatuan: txPrice, hargaTotal: txTotal, customer: transaction.customer 
          });
      } else {
          let finalResi = transaction.resiTempo || '-';
          let finalTempo = transaction.store || ''; 
          if (finalResi.includes('/')) { const parts = finalResi.split('/'); finalResi = parts[0].trim(); if (parts.length > 1) finalTempo = parts[1].trim(); }
          await addBarangKeluar({
              created_at: wibNow, kodeToko: 'MANUAL', tempo: finalTempo, ecommerce: sourceName, customer: transaction.customer || '', 
              partNumber: item.partNumber, name: item.name, brand: item.brand, application: item.application,
              rak: item.shelf, stockAhir: finalQty, qtyKeluar: txQty, hargaSatuan: txPrice, hargaTotal: txTotal, resi: finalResi 
          });
      }
  }
  return { ...item, quantity: finalQty, imageUrl: mainImage, name: baseUpdated.name, brand: baseUpdated.brand, application: baseUpdated.application, shelf: baseUpdated.shelf, lastUpdated: new Date(wibNow).getTime() };
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from(getBaseTableName()).delete().eq('id', id);
  if (error) { handleDbError("Hapus Barang Base", error); return false; }
  return true;
};

// ... History & Log Functions (Sisa Sama) ...
export const fetchHistory = async (): Promise<StockHistory[]> => {
    const { data: dataMasuk } = await supabase.from(getTableName('barang_masuk')).select('*').order('created_at', { ascending: false, nullsFirst: false }).limit(100);
    const { data: dataKeluar } = await supabase.from(getTableName('barang_keluar')).select('*').order('created_at', { ascending: false, nullsFirst: false }).limit(100);
    const history: StockHistory[] = [];
    (dataMasuk || []).forEach((m: any) => {
        const ket = m.keterangan || 'Restock';
        const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: Number(m.qty_masuk), previousStock: Number(m.stock_ahir) - Number(m.qty_masuk),
            currentStock: Number(m.stock_ahir), price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at || m.date), reason: reasonText, resi: '-', tempo: m.tempo || '-', customer: m.customer || '-' 
        });
    });
    (dataKeluar || []).forEach((k: any) => {
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: Number(k.qty_keluar), previousStock: Number(k.stock_ahir) + Number(k.qty_keluar),
            currentStock: Number(k.stock_ahir), price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at || k.date), reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, 
            resi: k.resi || '-', tempo: formatDisplayTempo(k.tempo), customer: k.customer || '-' 
        });
    });
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const fetchHistoryLogsPaginated = async (type: 'in' | 'out', page: number, limit: number, search: string) => {
    const table = type === 'in' ? getTableName('barang_masuk') : getTableName('barang_keluar');
    let query = supabase.from(table).select('*', { count: 'exact' });
    if (search) {
        if (type === 'in') query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,keterangan.ilike.%${search}%,tempo.ilike.%${search}%,customer.ilike.%${search}%`);
        else query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%,ecommerce.ilike.%${search}%,customer.ilike.%${search}%,resi.ilike.%${search}%,tempo.ilike.%${search}%`);
    }
    const from = (page - 1) * limit; const to = from + limit - 1;
    const { data, error, count } = await query.order('created_at', { ascending: false, nullsFirst: false }).range(from, to);
    if (error) { return { data: [], count: 0 }; }
    const mappedData: StockHistory[] = (data || []).map((item: any) => {
        const qty = type === 'in' ? Number(item.qty_masuk) : Number(item.qty_masuk || item.qty_keluar);
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
            timestamp: parseTimestamp(item.created_at || item.date), reason: reasonText, resi: item.resi || '-', tempo: displayTempo, customer: item.customer || '-' 
        };
    });
    return { data: mappedData, count: count || 0 };
};

export const fetchItemHistory = async (partNumber: string): Promise<StockHistory[]> => {
    const { data: dataMasuk } = await supabase.from(getTableName('barang_masuk')).select('*').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const { data: dataKeluar } = await supabase.from(getTableName('barang_keluar')).select('*').eq('part_number', partNumber).order('created_at', { ascending: false, nullsFirst: false });
    const history: StockHistory[] = [];
    (dataMasuk || []).forEach((m: any) => {
        const ket = m.keterangan || 'Restock';
        const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
        history.push({
            id: m.id, itemId: m.part_number, partNumber: m.part_number, name: m.name,
            type: 'in', quantity: Number(m.qty_masuk), previousStock: Number(m.stock_ahir) - Number(m.qty_masuk),
            currentStock: Number(m.stock_ahir), price: Number(m.harga_satuan), totalPrice: Number(m.harga_total),
            timestamp: parseTimestamp(m.created_at || m.date), reason: reasonText, resi: '-', tempo: m.tempo || '-', customer: m.customer || '-' 
        });
    });
    (dataKeluar || []).forEach((k: any) => {
        history.push({
            id: k.id, itemId: k.part_number, partNumber: k.part_number, name: k.name,
            type: 'out', quantity: Number(k.qty_keluar), previousStock: Number(k.stock_ahir) + Number(k.qty_keluar),
            currentStock: Number(k.stock_ahir), price: Number(k.harga_satuan), totalPrice: Number(k.harga_total),
            timestamp: parseTimestamp(k.created_at || k.date), reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`, 
            resi: k.resi || '-', tempo: formatDisplayTempo(k.tempo), customer: k.customer || '-' 
        });
    });
    return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const addBarangMasuk = async (data: any) => { 
    const ecommerceVal = data.ecommerce || 'Lainnya';
    const keteranganVal = data.keterangan || 'Restock'; 
    const { error } = await supabase.from(getTableName('barang_masuk')).insert([{ 
        created_at: data.created_at || getWIBISOString(), tempo: data.tempo, ecommerce: ecommerceVal, keterangan: keteranganVal, 
        part_number: data.partNumber || data.part_number, name: data.name, brand: data.brand, application: data.application, rak: data.rak, 
        stock_ahir: data.stockAhir || data.stock_ahir, qty_masuk: data.qtyMasuk || data.qty_masuk, 
        harga_satuan: data.hargaSatuan || data.harga_satuan, harga_total: data.hargaTotal || data.harga_total, customer: data.customer || '-' 
    }]); 
    if(error) console.error("addBarangMasuk Error", error);
    return !error; 
};

export const addBarangKeluar = async (data: any) => { 
    const { error } = await supabase.from(getTableName('barang_keluar')).insert([{ 
        created_at: data.created_at || getWIBISOString(), kode_toko: data.kodeToko || data.kode_toko, tempo: data.tempo, ecommerce: data.ecommerce, customer: data.customer, 
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
            hargaSatuan: h.price, hargaTotal: h.totalPrice, customer: '-'
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

export const updateOrderData = async (orderId: string, newItems: any[], newTotal: number, newStatus: string): Promise<boolean> => {
    const { data: oldData } = await supabase.from(getTableName('orders')).select('*').eq('resi', orderId).limit(1).single();
    if (!oldData) return false;
    const { error: delError } = await supabase.from(getTableName('orders')).delete().eq('resi', orderId);
    if (delError) { console.error("Gagal hapus order lama:", delError); return false; }
    const rows = newItems.map((item: any) => ({
        tanggal: oldData.tanggal, resi: orderId, toko: oldData.toko, ecommerce: oldData.ecommerce,
        customer: oldData.customer, part_number: item.part_number, nama_barang: item.name,
        quantity: item.cartQuantity, harga_satuan: item.customPrice || item.price,
        harga_total: (item.customPrice || item.price) * item.cartQuantity, status: newStatus
    }));
    if (rows.length > 0) {
        const { error: insError } = await supabase.from(getTableName('orders')).insert(rows);
        if (insError) { console.error("Gagal insert order baru:", insError); return false; }
    }
    return true;
};

export const fetchOrders = async (): Promise<Order[]> => { 
    const { data } = await supabase.from(getTableName('orders')).select('*').order('tanggal', { ascending: false }).limit(300); 
    if (!data) return [];
    const groupedOrders: Record<string, Order> = {};
    data.forEach((row: any) => {
        const resi = row.resi || row.id || 'UNKNOWN';
        const groupKey = `${resi}_${row.status}`; 
        if (!groupedOrders[groupKey]) {
            const customerStr = row.customer || '-';
            const tokoStr = row.toko ? ` (Toko: ${row.toko})` : '';
            const viaStr = row.ecommerce ? ` (Via: ${row.ecommerce})` : '';
            const resiStr = row.resi ? ` (Resi: ${row.resi})` : '';
            const constructedCustomerName = `${customerStr}${tokoStr}${viaStr}${resiStr}`;
            groupedOrders[groupKey] = {
                id: resi, customerName: constructedCustomerName, items: [], totalAmount: 0, status: row.status as any,
                timestamp: row.tanggal ? new Date(row.tanggal).getTime() : Date.now(), keterangan: '' 
            };
        }
        groupedOrders[groupKey].items.push({
            id: row.part_number, partNumber: row.part_number, name: row.nama_barang, quantity: 0, 
            price: Number(row.harga_satuan), cartQuantity: Number(row.quantity), customPrice: Number(row.harga_satuan),
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
    const orderDate = getWIBISOStringFromTimestamp(order.timestamp); 
    const rows = order.items.map(item => ({
        tanggal: orderDate, resi: details.resi, toko: details.toko, ecommerce: details.ecommerce, customer: details.customer, 
        part_number: item.partNumber || '-', nama_barang: item.name, quantity: item.cartQuantity, 
        harga_satuan: item.customPrice || item.price, harga_total: (item.customPrice || item.price) * item.cartQuantity, status: order.status
    }));
    const { error } = await supabase.from(getTableName('orders')).insert(rows);
    if (error) { console.error("Gagal simpan order:", error); return false; }
    return true; 
};

export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => { 
    const updateData: any = { status }; 
    if (timestamp) updateData.tanggal = getWIBISOStringFromTimestamp(timestamp); 
    const { error } = await supabase.from(getTableName('orders')).update(updateData).eq('resi', id); 
    return !error; 
};

export const fetchChatSessions = async (): Promise<ChatSession[]> => { const { data } = await supabase.from(getTableName('chat_sessions')).select('*'); return (data || []).map((c: any) => ({ customerId: c.customer_id, customerName: c.customer_name, messages: c.messages, lastMessage: c.last_message, lastTimestamp: c.last_timestamp, unreadAdminCount: c.unread_admin_count, unreadUserCount: c.unread_user_count })); };
export const saveChatSession = async (s: ChatSession): Promise<boolean> => { const { error } = await supabase.from(getTableName('chat_sessions')).upsert([{ customer_id: s.customerId, customer_name: s.customerName, messages: s.messages, last_message: s.lastMessage, last_timestamp: s.lastTimestamp, unread_admin_count: s.unreadAdminCount, unread_user_count: s.unreadUserCount }]); return !error; };

export const addReturTransaction = async (data: ReturRecord): Promise<boolean> => {
    const { error } = await supabase.from(getTableName('retur')).insert([{
        tanggal_pemesanan: data.tanggal_pemesanan, resi: data.resi, toko: data.toko, ecommerce: data.ecommerce,
        customer: data.customer, part_number: data.part_number, nama_barang: data.nama_barang, quantity: data.quantity,
        harga_satuan: data.harga_satuan, harga_total: data.harga_total, tanggal_retur: data.tanggal_retur,
        status: data.status, keterangan: data.keterangan
    }]);
    if (error) { console.error("Gagal simpan ke tabel Retur:", error); return false; }
    return true;
};

export const fetchReturRecords = async (): Promise<ReturRecord[]> => {
    const { data, error } = await supabase.from(getTableName('retur')).select('*').order('tanggal_retur', { ascending: false });
    if (error) { console.error("Gagal ambil data retur:", error); return []; }
    return data || [];
};

export const updateReturKeterangan = async (resi: string, keterangan: string): Promise<boolean> => {
    const { error: returError } = await supabase.from(getTableName('retur')).update({ keterangan: keterangan }).eq('resi', resi); 
    if (returError) { console.error("Gagal update keterangan retur:", returError); return false; }
    return true;
};

export const fetchPriceHistoryBySource = async (partNumber: string) => { 
    const { data, error } = await supabase.from(getTableName('barang_masuk')).select('ecommerce, harga_satuan, created_at').eq('part_number', partNumber).order('created_at', { ascending: false }); 
    if (error || !data) return []; 
    const uniqueSources: Record<string, any> = {}; 
    data.forEach((item: any) => { 
        const sourceName = item.ecommerce || 'Unknown'; 
        if (!uniqueSources[sourceName]) { 
            uniqueSources[sourceName] = { 
                source: sourceName, price: Number(item.harga_satuan), 
                date: item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-' 
            }; 
        } 
    }); 
    return Object.values(uniqueSources); 
};

export const clearBarangKeluar = async (): Promise<boolean> => { 
    const { error } = await supabase.from(getTableName('barang_keluar')).delete().neq('id', 0); 
    if (error) { console.error("Gagal hapus barang keluar:", error); return false; } 
    return true; 
};

export const fetchScanResiLogs = async (): Promise<ScanResiLog[]> => {
    const { data, error } = await supabase.from(getTableName('scan_resi')).select('*').order('tanggal', { ascending: false }).limit(500); 
    if (error) { console.error("Gagal ambil log scan resi:", error); return []; }
    return data || [];
};

export const addScanResiLog = async (resi: string, ecommerce: string, toko: string): Promise<boolean> => {
    try {
        const { data: existingItems } = await supabase.from(getTableName('scan_resi')).select('*').eq('resi', resi);
        if (existingItems && existingItems.length > 0) {
            const updatePromises = existingItems.map(async (item) => {
                const isComplete = checkIsComplete({ customer: item.customer, part_number: item.part_number, nama_barang: item.nama_barang, quantity: item.quantity, harga_total: item.harga_total });
                const newStatus = isComplete ? 'Siap Kirim' : 'Pending';
                return supabase.from(getTableName('scan_resi')).update({ status: newStatus, tanggal: getWIBISOString() }).eq('id', item.id);
            });
            await Promise.all(updatePromises);
            return true;
        } else {
            const { error } = await supabase.from(getTableName('scan_resi')).insert([{
                tanggal: getWIBISOString(), resi: resi, ecommerce: ecommerce, toko: toko, status: 'Pending', 
            }]);
            return !error;
        }
    } catch (err) { console.error("Error scanning:", err); return false; }
};

export const importScanResiFromExcel = async (updates: any[]): Promise<{ success: boolean, skippedCount: number, updatedCount: number }> => {
    try {
        const resiList = updates.map(u => u.resi).filter(Boolean);
        if (resiList.length === 0) return { success: false, skippedCount: 0, updatedCount: 0 };
        const { data: existingData, error: checkError } = await supabase.from(getTableName('scan_resi')).select('*').in('resi', resiList);
        if (checkError) return { success: false, skippedCount: 0, updatedCount: 0 };

        const existingGrouped = new Map<string, any[]>();
        existingData?.forEach(item => {
            if (!existingGrouped.has(item.resi)) existingGrouped.set(item.resi, []);
            existingGrouped.get(item.resi)?.push(item);
        });

        const insertPayload: any[] = [];
        const updatePromises: any[] = [];
        const updatedIds = new Set<number>();

        updates.forEach(item => {
            const candidates = existingGrouped.get(item.resi) || [];
            
            const sameItemInDb = candidates.filter(c => (item.part_number && c.part_number === item.part_number) || (item.nama_barang && c.nama_barang === item.nama_barang));
            const isSplitItem = sameItemInDb.length > 1;

            let existing = candidates.find(c => !updatedIds.has(c.id) && ((item.part_number && c.part_number === item.part_number) || (item.nama_barang && c.nama_barang === item.nama_barang)));
            if (!existing && candidates.length === 1 && !updatedIds.has(candidates[0].id)) { existing = candidates[0]; }

            let statusToUse = 'Order Masuk';

            if (existing) {
                 if (existing.status === 'Pending') {
                     const mergedCheck = {
                        customer: item.customer && item.customer !== '-' ? item.customer : existing.customer,
                        part_number: item.part_number && item.part_number !== '-' ? item.part_number : existing.part_number,
                        nama_barang: item.nama_barang && item.nama_barang !== '-' ? item.nama_barang : existing.nama_barang,
                        quantity: item.quantity > 0 ? item.quantity : existing.quantity,
                        harga_total: 0 
                     };
                     if (checkIsComplete(mergedCheck)) {
                         statusToUse = 'Siap Kirim';
                     } else {
                         statusToUse = 'Pending';
                     }
                 } else {
                     statusToUse = existing.status;
                 }
            }

            if (existing) {
                updatedIds.add(existing.id); 
                const updateData: any = {
                    toko: item.toko, ecommerce: item.ecommerce, customer: item.customer, part_number: item.part_number,
                    nama_barang: item.nama_barang, quantity: item.quantity, status: statusToUse 
                };
                if (!isSplitItem) { updateData.harga_satuan = item.harga_satuan; updateData.harga_total = item.harga_total; }
                updatePromises.push(supabase.from(getTableName('scan_resi')).update(updateData).eq('id', existing.id));
            } else {
                insertPayload.push({
                    tanggal: getWIBISOString(), resi: item.resi, toko: item.toko, ecommerce: item.ecommerce,
                    customer: item.customer || '-', part_number: item.part_number || null, nama_barang: item.nama_barang || '-',
                    quantity: item.quantity || 0, harga_satuan: item.harga_satuan || 0, harga_total: item.harga_total || 0,
                    status: statusToUse 
                });
            }
        });

        if (insertPayload.length > 0) await supabase.from(getTableName('scan_resi')).insert(insertPayload);
        if (updatePromises.length > 0) await Promise.all(updatePromises);

        return { success: true, skippedCount: updates.length - insertPayload.length - updatePromises.length, updatedCount: updatePromises.length };
    } catch (error) { console.error("Error import excel:", error); return { success: false, skippedCount: 0, updatedCount: 0 }; }
};

export const updateScanResiLogField = async (id: number, field: string, value: any): Promise<boolean> => {
    const { data, error } = await supabase.from(getTableName('scan_resi')).update({ [field]: value }).eq('id', id).select().single();
    if (error) return false;

    if (data) {
        if (data.status === 'Order Masuk') return true; 
        if (data.status === 'Terjual') return true;

        if (data.status === 'Pending') {
            const isComplete = checkIsComplete({
                customer: data.customer, part_number: data.part_number, nama_barang: data.nama_barang,
                quantity: data.quantity, harga_total: data.harga_total
            });
            const newStatus = isComplete ? 'Siap Kirim' : 'Pending';
            if (data.status !== newStatus) {
                await supabase.from(getTableName('scan_resi')).update({ status: newStatus }).eq('id', id);
            }
        }
    }
    return true;
};

export const duplicateScanResiLog = async (id: number): Promise<boolean> => {
    try {
        const { data: sourceItem, error: fetchError } = await supabase.from(getTableName('scan_resi')).select('*').eq('id', id).single();
        if (fetchError || !sourceItem) return false;
        const { data: siblings } = await supabase.from(getTableName('scan_resi')).select('*').eq('resi', sourceItem.resi).eq('nama_barang', sourceItem.nama_barang); 
        if (!siblings) return false;
        const totalPoolPrice = siblings.reduce((sum, item) => sum + (Number(item.harga_total) || 0), 0);
        const totalQuantity = siblings.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const pricePerUnit = totalQuantity > 0 ? Math.floor(totalPoolPrice / totalQuantity) : 0;
        const updatePromises = siblings.map(item => supabase.from(getTableName('scan_resi')).update({ harga_satuan: pricePerUnit, harga_total: pricePerUnit * (Number(item.quantity) || 0) }).eq('id', item.id));
        await Promise.all(updatePromises);
        const { id: oldId, ...cleanItemData } = sourceItem;
        const { error: insertError } = await supabase.from(getTableName('scan_resi')).insert([{ ...cleanItemData, tanggal: getWIBISOString(), harga_satuan: pricePerUnit, harga_total: pricePerUnit * (Number(cleanItemData.quantity) || 0), status: 'Pending' }]);
        if (insertError) return false;
        return true;
    } catch (err) { console.error("Error duplicating:", err); return false; }
};

export const deleteScanResiLog = async (id: number): Promise<boolean> => {
    try { const { error } = await supabase.from(getTableName('scan_resi')).delete().eq('id', id); return !error; } catch (err) { console.error("Error deleting:", err); return false; }
};

export const processShipmentToOrders = async (selectedLogs: ScanResiLog[]): Promise<{ success: boolean; message?: string }> => {
    try {
        const partNumbersToCheck = selectedLogs.map(log => log.part_number).filter(pn => pn !== null && pn !== '') as string[];
        const uniquePartNumbers = [...new Set(partNumbersToCheck)];
        if (uniquePartNumbers.length > 0) {
            const { data: existingItems, error } = await supabase.from(getBaseTableName()).select('part_number').in('part_number', uniquePartNumbers);
            if (error) return { success: false, message: "Gagal memvalidasi Part Number di database." };
            const existingSet = new Set(existingItems?.map(item => item.part_number));
            const missingParts = uniquePartNumbers.filter(pn => !existingSet.has(pn));
            if (missingParts.length > 0) return { success: false, message: `GAGAL PROSES KIRIM!\n\nPart Number berikut tidak ditemukan:\n\n${missingParts.join(', ')}` };
        }
        for (const log of selectedLogs) {
            let realItemName = log.nama_barang;
            if (log.part_number) {
                const item = await getItemByPartNumber(log.part_number);
                if (item) {
                    realItemName = item.name;
                    await updateInventory(item, { type: 'out', qty: log.quantity, ecommerce: log.ecommerce, resiTempo: log.resi, customer: log.customer, price: log.harga_satuan, store: log.toko });
                }
            }
            const harga_total = (log.harga_satuan || 0) * (log.quantity || 0);
            const { error: insertError } = await supabase.from(getTableName('orders')).insert([{
                tanggal: getWIBISOString(), resi: log.resi, toko: log.toko, ecommerce: log.ecommerce, customer: log.customer,
                part_number: log.part_number, nama_barang: realItemName, quantity: log.quantity, harga_satuan: log.harga_satuan, harga_total: harga_total, status: 'processing' 
            }]);
            if (insertError) continue; 
            await supabase.from(getTableName('scan_resi')).update({ status: 'Terjual' }).eq('id', log.id);
        }
        return { success: true };
    } catch (error) { console.error("Error processing shipment:", error); return { success: false, message: "Terjadi kesalahan sistem." }; }
};