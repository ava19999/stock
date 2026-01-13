// FILE: src/services/supabaseService.mock.ts
// Mock implementation of Supabase service using localStorage
// This is a temporary implementation to replace Supabase integration

import { 
  InventoryItem, 
  InventoryFormData, 
  StockHistory, 
  BarangMasuk, 
  BarangKeluar, 
  Order, 
  ChatSession, 
  ReturRecord, 
  ScanResiLog,
  BaseBJW,
  Foto,
  BJWProduct
} from '../types';

// LocalStorage Keys
const STORAGE_KEYS = {
  INVENTORY: 'stock_inventory',
  BARANG_MASUK: 'stock_barang_masuk',
  BARANG_KELUAR: 'stock_barang_keluar',
  ORDERS: 'stock_orders',
  PHOTOS: 'stock_photos',
  PRICES: 'stock_prices',
  CHAT_SESSIONS: 'stock_chat_sessions',
  RETUR: 'stock_retur',
  SCAN_RESI: 'stock_scan_resi'
};

// Helper functions for localStorage
const getFromStorage = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error(`Error reading from localStorage key ${key}:`, e);
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to localStorage key ${key}:`, e);
  }
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

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

const normalizeKey = (key: string | null | undefined): string => {
  return key ? key.trim().toUpperCase() : '';
};

// Mock implementations

export const fetchInventoryPaginated = async (page: number, limit: number, search: string, filter: string = 'all', brand?: string, application?: string) => {
  const allItems = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  
  let filtered = allItems.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.application.toLowerCase().includes(search.toLowerCase());
    
    const matchesBrand = !brand || item.brand.toLowerCase().includes(brand.toLowerCase());
    const matchesApplication = !application || item.application.toLowerCase().includes(application.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'low' ? (item.quantity > 0 && item.quantity < 4) :
      filter === 'empty' ? item.quantity <= 0 : true;
    
    return matchesSearch && matchesBrand && matchesApplication && matchesFilter;
  });
  
  const from = (page - 1) * limit;
  const to = from + limit;
  const paginated = filtered.slice(from, to);
  
  return { data: paginated, count: filtered.length };
};

export const fetchInventoryAllFiltered = async (search: string, filter: string = 'all', brand?: string, application?: string): Promise<InventoryItem[]> => {
  const allItems = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  
  return allItems.filter(item => {
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.application.toLowerCase().includes(search.toLowerCase());
    
    const matchesBrand = !brand || item.brand.toLowerCase().includes(brand.toLowerCase());
    const matchesApplication = !application || item.application.toLowerCase().includes(application.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'low' ? (item.quantity > 0 && item.quantity < 4) :
      filter === 'empty' ? item.quantity <= 0 : true;
    
    return matchesSearch && matchesBrand && matchesApplication && matchesFilter;
  });
};

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
  const allItems = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  
  let filtered = allItems.filter(item => {
    if (item.quantity <= 0) return false;
    
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.application.toLowerCase().includes(search.toLowerCase());
    
    const matchesPartNumber = !partNumberSearch || item.partNumber.toLowerCase().includes(partNumberSearch.toLowerCase());
    const matchesName = !nameSearch || item.name.toLowerCase().includes(nameSearch.toLowerCase());
    const matchesBrand = !brandSearch || item.brand.toLowerCase().includes(brandSearch.toLowerCase());
    const matchesApplication = !applicationSearch || item.application.toLowerCase().includes(applicationSearch.toLowerCase());
    
    const matchesCategory = !cat || cat === 'All' || 
      item.brand.toLowerCase().includes(cat.toLowerCase()) ||
      item.application.toLowerCase().includes(cat.toLowerCase());
    
    return matchesSearch && matchesPartNumber && matchesName && matchesBrand && matchesApplication && matchesCategory;
  });
  
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  const from = (page - 1) * limit;
  const to = from + limit;
  const paginated = filtered.slice(from, to);
  
  return { data: paginated, count: filtered.length };
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  return getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
};

export const getItemById = async (id: string): Promise<InventoryItem | null> => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  return items.find(item => item.id === id) || null;
};

export const getItemByPartNumber = async (partNumber: string): Promise<InventoryItem | null> => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  return items.find(item => item.partNumber === partNumber) || null;
};

export const fetchInventoryStats = async () => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  
  let totalStock = 0;
  let totalAsset = 0;
  
  items.forEach(item => {
    totalStock += item.quantity;
    totalAsset += (item.quantity * (item.costPrice || 0));
  });
  
  return { 
    totalItems: items.length, 
    totalStock, 
    totalAsset 
  };
};

export const addInventory = async (item: InventoryFormData): Promise<string | null> => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  
  const newItem: InventoryItem = {
    id: generateId(),
    partNumber: item.partNumber,
    name: item.name,
    brand: item.brand,
    application: item.application,
    quantity: item.quantity,
    shelf: item.shelf,
    price: item.price,
    costPrice: item.costPrice,
    imageUrl: item.imageUrl,
    images: item.images || [],
    ecommerce: item.ecommerce,
    initialStock: item.initialStock,
    qtyIn: item.qtyIn,
    qtyOut: item.qtyOut,
    lastUpdated: Date.now()
  };
  
  items.push(newItem);
  saveToStorage(STORAGE_KEYS.INVENTORY, items);
  
  // Record initial stock as barang masuk if quantity > 0
  if (item.quantity > 0) {
    await addBarangMasuk({
      created_at: getWIBISOString(),
      tempo: '',
      keterangan: 'Stok Awal',
      ecommerce: 'Stok Awal',
      partNumber: item.partNumber,
      name: item.name,
      brand: item.brand,
      application: item.application,
      rak: item.shelf,
      stockAhir: item.quantity,
      qtyMasuk: item.quantity,
      hargaSatuan: item.costPrice || 0,
      hargaTotal: (item.costPrice || 0) * item.quantity
    });
  }
  
  return newItem.id;
};

export const updateInventory = async (item: InventoryItem, transaction?: { type: 'in' | 'out', qty: number, ecommerce: string, resiTempo: string, customer?: string, price?: number, isReturn?: boolean, store?: string }): Promise<InventoryItem | null> => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  const index = items.findIndex(i => i.id === item.id);
  
  if (index === -1) return null;
  
  let finalQty = item.quantity;
  
  if (transaction && transaction.qty > 0) {
    const txQty = Number(transaction.qty);
    if (transaction.type === 'in') {
      finalQty = items[index].quantity + txQty;
    } else {
      finalQty = items[index].quantity - txQty;
    }
  }
  
  const updatedItem: InventoryItem = {
    ...item,
    quantity: finalQty,
    lastUpdated: Date.now()
  };
  
  items[index] = updatedItem;
  saveToStorage(STORAGE_KEYS.INVENTORY, items);
  
  // Record transaction
  if (transaction && transaction.qty > 0) {
    const txQty = Number(transaction.qty);
    const sourceName = transaction.ecommerce || 'Manual Edit';
    const txPrice = transaction.price !== undefined ? transaction.price : (transaction.type === 'in' ? (item.costPrice || 0) : (item.price || 0));
    const txTotal = txPrice * txQty;
    
    if (transaction.type === 'in') {
      let ketText = 'Manual Restock';
      if (transaction.customer && transaction.customer.trim() !== '') ketText = transaction.customer;
      if (transaction.isReturn) {
        const custName = transaction.customer || 'Customer';
        ketText = `${custName} (RETUR)`;
      }
      await addBarangMasuk({
        created_at: getWIBISOString(),
        tempo: transaction.resiTempo || '-',
        keterangan: ketText,
        ecommerce: sourceName,
        partNumber: item.partNumber,
        name: item.name,
        brand: item.brand,
        application: item.application,
        rak: item.shelf,
        stockAhir: finalQty,
        qtyMasuk: txQty,
        hargaSatuan: txPrice,
        hargaTotal: txTotal,
        customer: transaction.customer
      });
    } else {
      let finalResi = transaction.resiTempo || '-';
      let finalTempo = transaction.store || '';
      if (finalResi.includes('/')) {
        const parts = finalResi.split('/');
        finalResi = parts[0].trim();
        if (parts.length > 1) finalTempo = parts[1].trim();
      }
      await addBarangKeluar({
        created_at: getWIBISOString(),
        kodeToko: 'MANUAL',
        tempo: finalTempo,
        ecommerce: sourceName,
        customer: transaction.customer || '',
        partNumber: item.partNumber,
        name: item.name,
        brand: item.brand,
        application: item.application,
        rak: item.shelf,
        stockAhir: finalQty,
        qtyKeluar: txQty,
        hargaSatuan: txPrice,
        hargaTotal: txTotal,
        resi: finalResi
      });
    }
  }
  
  return updatedItem;
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  const items = getFromStorage<InventoryItem>(STORAGE_KEYS.INVENTORY);
  const filtered = items.filter(item => item.id !== id);
  
  if (filtered.length === items.length) return false;
  
  saveToStorage(STORAGE_KEYS.INVENTORY, filtered);
  return true;
};

export const saveItemImages = async (partNumber: string, images: string[]) => {
  const photos = getFromStorage<any>(STORAGE_KEYS.PHOTOS);
  const index = photos.findIndex((p: any) => p.partNumber === partNumber);
  
  if (index >= 0) {
    photos[index].images = images;
  } else {
    photos.push({ partNumber, images });
  }
  
  saveToStorage(STORAGE_KEYS.PHOTOS, photos);
};

// History functions
export const fetchHistory = async (): Promise<StockHistory[]> => {
  const masuk = getFromStorage<any>(STORAGE_KEYS.BARANG_MASUK).slice(0, 100);
  const keluar = getFromStorage<any>(STORAGE_KEYS.BARANG_KELUAR).slice(0, 100);
  
  const history: StockHistory[] = [];
  
  masuk.forEach((m: any) => {
    const ket = m.keterangan || 'Restock';
    const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
    history.push({
      id: m.id,
      itemId: m.partNumber,
      partNumber: m.partNumber,
      name: m.name,
      type: 'in',
      quantity: Number(m.qtyMasuk),
      previousStock: Number(m.stockAhir) - Number(m.qtyMasuk),
      currentStock: Number(m.stockAhir),
      price: Number(m.hargaSatuan),
      totalPrice: Number(m.hargaTotal),
      timestamp: new Date(m.created_at).getTime(),
      reason: reasonText,
      resi: '-',
      tempo: m.tempo || '-',
      customer: m.customer || '-'
    });
  });
  
  keluar.forEach((k: any) => {
    history.push({
      id: k.id,
      itemId: k.partNumber,
      partNumber: k.partNumber,
      name: k.name,
      type: 'out',
      quantity: Number(k.qtyKeluar),
      previousStock: Number(k.stockAhir) + Number(k.qtyKeluar),
      currentStock: Number(k.stockAhir),
      price: Number(k.hargaSatuan),
      totalPrice: Number(k.hargaTotal),
      timestamp: new Date(k.created_at).getTime(),
      reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`,
      resi: k.resi || '-',
      tempo: k.tempo || '',
      customer: k.customer || '-'
    });
  });
  
  return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const fetchHistoryLogsPaginated = async (type: 'in' | 'out', page: number, limit: number, search: string) => {
  const storageKey = type === 'in' ? STORAGE_KEYS.BARANG_MASUK : STORAGE_KEYS.BARANG_KELUAR;
  const allData = getFromStorage<any>(storageKey);
  
  let filtered = allData.filter((item: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.partNumber?.toLowerCase().includes(searchLower) ||
      item.ecommerce?.toLowerCase().includes(searchLower) ||
      item.customer?.toLowerCase().includes(searchLower) ||
      item.keterangan?.toLowerCase().includes(searchLower) ||
      item.resi?.toLowerCase().includes(searchLower) ||
      item.tempo?.toLowerCase().includes(searchLower)
    );
  });
  
  const from = (page - 1) * limit;
  const to = from + limit;
  const paginated = filtered.slice(from, to);
  
  const mappedData: StockHistory[] = paginated.map((item: any) => {
    const qty = type === 'in' ? Number(item.qtyMasuk) : Number(item.qtyKeluar);
    const current = Number(item.stockAhir);
    const previous = type === 'in' ? (current - qty) : (current + qty);
    
    let reasonText = '';
    if (type === 'in') {
      const ket = item.keterangan || 'Restock';
      reasonText = `${ket} (Via: ${item.ecommerce || '-'})`;
    } else {
      reasonText = `${item.customer || ''} (Via: ${item.ecommerce || '-'}) (Resi: ${item.resi || '-'})`;
    }
    
    return {
      id: item.id,
      itemId: item.partNumber,
      partNumber: item.partNumber,
      name: item.name,
      type: type,
      quantity: qty,
      previousStock: previous,
      currentStock: current,
      price: Number(item.hargaSatuan),
      totalPrice: Number(item.hargaTotal),
      timestamp: new Date(item.created_at).getTime(),
      reason: reasonText,
      resi: item.resi || '-',
      tempo: item.tempo || '',
      customer: item.customer || '-'
    };
  });
  
  return { data: mappedData, count: filtered.length };
};

export const fetchItemHistory = async (partNumber: string): Promise<StockHistory[]> => {
  const masuk = getFromStorage<any>(STORAGE_KEYS.BARANG_MASUK).filter((m: any) => m.partNumber === partNumber);
  const keluar = getFromStorage<any>(STORAGE_KEYS.BARANG_KELUAR).filter((k: any) => k.partNumber === partNumber);
  
  const history: StockHistory[] = [];
  
  masuk.forEach((m: any) => {
    const ket = m.keterangan || 'Restock';
    const reasonText = `${ket} (Via: ${m.ecommerce}) (${m.tempo || '-'})`;
    history.push({
      id: m.id,
      itemId: m.partNumber,
      partNumber: m.partNumber,
      name: m.name,
      type: 'in',
      quantity: Number(m.qtyMasuk),
      previousStock: Number(m.stockAhir) - Number(m.qtyMasuk),
      currentStock: Number(m.stockAhir),
      price: Number(m.hargaSatuan),
      totalPrice: Number(m.hargaTotal),
      timestamp: new Date(m.created_at).getTime(),
      reason: reasonText,
      resi: '-',
      tempo: m.tempo || '-',
      customer: m.customer || '-'
    });
  });
  
  keluar.forEach((k: any) => {
    history.push({
      id: k.id,
      itemId: k.partNumber,
      partNumber: k.partNumber,
      name: k.name,
      type: 'out',
      quantity: Number(k.qtyKeluar),
      previousStock: Number(k.stockAhir) + Number(k.qtyKeluar),
      currentStock: Number(k.stockAhir),
      price: Number(k.hargaSatuan),
      totalPrice: Number(k.hargaTotal),
      timestamp: new Date(k.created_at).getTime(),
      reason: `${k.customer || ''} (Via: ${k.ecommerce}) (Resi: ${k.resi})`,
      resi: k.resi || '-',
      tempo: k.tempo || '',
      customer: k.customer || '-'
    });
  });
  
  return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
};

export const addBarangMasuk = async (data: any) => {
  const items = getFromStorage<any>(STORAGE_KEYS.BARANG_MASUK);
  
  items.push({
    id: generateId(),
    created_at: data.created_at || getWIBISOString(),
    tempo: data.tempo,
    ecommerce: data.ecommerce || 'Lainnya',
    keterangan: data.keterangan || 'Restock',
    partNumber: data.partNumber || data.part_number,
    name: data.name,
    brand: data.brand,
    application: data.application,
    rak: data.rak,
    stockAhir: data.stockAhir || data.stock_ahir,
    qtyMasuk: data.qtyMasuk || data.qty_masuk,
    hargaSatuan: data.hargaSatuan || data.harga_satuan,
    hargaTotal: data.hargaTotal || data.harga_total,
    customer: data.customer || '-'
  });
  
  saveToStorage(STORAGE_KEYS.BARANG_MASUK, items);
  return true;
};

export const addBarangKeluar = async (data: any) => {
  const items = getFromStorage<any>(STORAGE_KEYS.BARANG_KELUAR);
  
  items.push({
    id: generateId(),
    created_at: data.created_at || getWIBISOString(),
    kodeToko: data.kodeToko || data.kode_toko,
    tempo: data.tempo,
    ecommerce: data.ecommerce,
    customer: data.customer,
    partNumber: data.partNumber || data.part_number,
    name: data.name,
    brand: data.brand,
    application: data.application,
    rak: data.rak,
    stockAhir: data.stockAhir || data.stock_ahir,
    qtyKeluar: data.qtyKeluar || data.qty_keluar,
    hargaSatuan: data.hargaSatuan || data.harga_satuan,
    hargaTotal: data.hargaTotal || data.harga_total,
    resi: data.resi
  });
  
  saveToStorage(STORAGE_KEYS.BARANG_KELUAR, items);
  return true;
};

export const addHistoryLog = async (h: StockHistory) => {
  const now = getWIBISOString();
  
  if (h.type === 'in') {
    return addBarangMasuk({
      created_at: now,
      tempo: '',
      keterangan: 'System Log',
      ecommerce: 'SYSTEM',
      partNumber: h.partNumber,
      name: h.name,
      brand: '-',
      application: '-',
      rak: '-',
      stockAhir: h.previousStock + h.quantity,
      qtyMasuk: h.quantity,
      hargaSatuan: h.price,
      hargaTotal: h.totalPrice,
      customer: '-'
    });
  } else {
    return addBarangKeluar({
      created_at: now,
      kodeToko: 'SYS',
      tempo: '',
      ecommerce: 'SYSTEM',
      customer: '',
      partNumber: h.partNumber,
      name: h.name,
      brand: '-',
      application: '-',
      rak: '-',
      stockAhir: h.previousStock - h.quantity,
      qtyKeluar: h.quantity,
      hargaSatuan: h.price,
      hargaTotal: h.totalPrice,
      resi: '-'
    });
  }
};

// Order functions
export const fetchOrders = async (): Promise<Order[]> => {
  return getFromStorage<Order>(STORAGE_KEYS.ORDERS);
};

export const saveOrder = async (order: Order): Promise<boolean> => {
  const orders = getFromStorage<Order>(STORAGE_KEYS.ORDERS);
  orders.push(order);
  saveToStorage(STORAGE_KEYS.ORDERS, orders);
  return true;
};

export const updateOrderStatusService = async (id: string, status: string, timestamp?: number): Promise<boolean> => {
  const orders = getFromStorage<Order>(STORAGE_KEYS.ORDERS);
  const index = orders.findIndex(o => o.id === id);
  
  if (index === -1) return false;
  
  orders[index].status = status as any;
  if (timestamp) {
    orders[index].timestamp = timestamp;
  }
  
  saveToStorage(STORAGE_KEYS.ORDERS, orders);
  return true;
};

export const updateOrderData = async (orderId: string, newItems: any[], newTotal: number, newStatus: string): Promise<boolean> => {
  const orders = getFromStorage<Order>(STORAGE_KEYS.ORDERS);
  const index = orders.findIndex(o => o.id === orderId);
  
  if (index === -1) return false;
  
  orders[index].items = newItems;
  orders[index].totalAmount = newTotal;
  orders[index].status = newStatus as any;
  
  saveToStorage(STORAGE_KEYS.ORDERS, orders);
  return true;
};

// Chat functions
export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  return getFromStorage<ChatSession>(STORAGE_KEYS.CHAT_SESSIONS);
};

export const saveChatSession = async (s: ChatSession): Promise<boolean> => {
  const sessions = getFromStorage<ChatSession>(STORAGE_KEYS.CHAT_SESSIONS);
  const index = sessions.findIndex(session => session.customerId === s.customerId);
  
  if (index >= 0) {
    sessions[index] = s;
  } else {
    sessions.push(s);
  }
  
  saveToStorage(STORAGE_KEYS.CHAT_SESSIONS, sessions);
  return true;
};

// Retur functions
export const addReturTransaction = async (data: ReturRecord): Promise<boolean> => {
  const returs = getFromStorage<ReturRecord>(STORAGE_KEYS.RETUR);
  returs.push({ ...data, id: parseInt(generateId().split('-')[0]) });
  saveToStorage(STORAGE_KEYS.RETUR, returs);
  return true;
};

export const fetchReturRecords = async (): Promise<ReturRecord[]> => {
  return getFromStorage<ReturRecord>(STORAGE_KEYS.RETUR);
};

export const updateReturKeterangan = async (resi: string, keterangan: string): Promise<boolean> => {
  const returs = getFromStorage<ReturRecord>(STORAGE_KEYS.RETUR);
  const updated = returs.map(r => r.resi === resi ? { ...r, keterangan } : r);
  saveToStorage(STORAGE_KEYS.RETUR, updated);
  return true;
};

// Price history
export const fetchPriceHistoryBySource = async (partNumber: string) => {
  const barangMasuk = getFromStorage<any>(STORAGE_KEYS.BARANG_MASUK);
  const filtered = barangMasuk.filter((item: any) => item.partNumber === partNumber);
  
  const uniqueSources: Record<string, any> = {};
  
  filtered.forEach((item: any) => {
    const sourceName = item.ecommerce || 'Unknown';
    if (!uniqueSources[sourceName]) {
      uniqueSources[sourceName] = {
        source: sourceName,
        price: Number(item.hargaSatuan),
        date: new Date(item.created_at).toLocaleDateString('id-ID')
      };
    }
  });
  
  return Object.values(uniqueSources);
};

export const clearBarangKeluar = async (): Promise<boolean> => {
  saveToStorage(STORAGE_KEYS.BARANG_KELUAR, []);
  return true;
};

// Scan Resi functions
export const fetchScanResiLogs = async (): Promise<ScanResiLog[]> => {
  return getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI).slice(0, 500);
};

export const addScanResiLog = async (resi: string, ecommerce: string, toko: string): Promise<boolean> => {
  const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
  const existingItems = logs.filter((log: any) => log.resi === resi);
  
  if (existingItems.length > 0) {
    const updated = logs.map((log: any) => {
      if (log.resi === resi) {
        const isComplete = log.customer && log.part_number && log.nama_barang && log.quantity > 0;
        return { ...log, status: isComplete ? 'Siap Kirim' : 'Pending', tanggal: getWIBISOString() };
      }
      return log;
    });
    saveToStorage(STORAGE_KEYS.SCAN_RESI, updated);
  } else {
    logs.push({
      id: parseInt(generateId().split('-')[0]),
      tanggal: getWIBISOString(),
      resi,
      ecommerce,
      toko,
      customer: '',
      part_number: null,
      nama_barang: '',
      quantity: 0,
      harga_satuan: 0,
      harga_total: 0,
      status: 'Pending'
    });
    saveToStorage(STORAGE_KEYS.SCAN_RESI, logs);
  }
  
  return true;
};

export const importScanResiFromExcel = async (updates: any[]): Promise<{ success: boolean, skippedCount: number, updatedCount: number }> => {
  const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
  let updatedCount = 0;
  let skippedCount = 0;
  
  updates.forEach(update => {
    const existingIndex = logs.findIndex((log: any) => log.resi === update.resi);
    
    if (existingIndex >= 0) {
      logs[existingIndex] = { ...logs[existingIndex], ...update };
      updatedCount++;
    } else {
      logs.push({
        id: parseInt(generateId().split('-')[0]),
        tanggal: getWIBISOString(),
        ...update,
        status: update.status || 'Order Masuk'
      } as any);
      skippedCount++;
    }
  });
  
  saveToStorage(STORAGE_KEYS.SCAN_RESI, logs);
  return { success: true, skippedCount, updatedCount };
};

export const updateScanResiLogField = async (id: number, field: string, value: any): Promise<boolean> => {
  const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
  const index = logs.findIndex((log: any) => log.id === id);
  
  if (index === -1) return false;
  
  logs[index] = { ...logs[index], [field]: value };
  
  // Check if complete
  const log = logs[index];
  if (log.status === 'Pending') {
    const isComplete = log.customer && log.part_number && log.nama_barang && log.quantity > 0;
    logs[index].status = isComplete ? 'Siap Kirim' : 'Pending';
  }
  
  saveToStorage(STORAGE_KEYS.SCAN_RESI, logs);
  return true;
};

export const duplicateScanResiLog = async (id: number): Promise<boolean> => {
  const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
  const sourceLog = logs.find((log: any) => log.id === id);
  
  if (!sourceLog) return false;
  
  const newLog = { ...sourceLog, id: parseInt(generateId().split('-')[0]), status: 'Pending', tanggal: getWIBISOString() };
  logs.push(newLog as any);
  saveToStorage(STORAGE_KEYS.SCAN_RESI, logs);
  return true;
};

export const deleteScanResiLog = async (id: number): Promise<boolean> => {
  const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
  const filtered = logs.filter((log: any) => log.id !== id);
  saveToStorage(STORAGE_KEYS.SCAN_RESI, filtered);
  return true;
};

export const processShipmentToOrders = async (selectedLogs: ScanResiLog[]): Promise<{ success: boolean; message?: string }> => {
  try {
    for (const log of selectedLogs) {
      if (log.part_number) {
        const item = await getItemByPartNumber(log.part_number);
        if (item) {
          await updateInventory(item, {
            type: 'out',
            qty: log.quantity,
            ecommerce: log.ecommerce,
            resiTempo: log.resi,
            customer: log.customer,
            price: log.harga_satuan,
            store: log.toko
          });
        }
      }
      
      // Update scan resi status
      const logs = getFromStorage<ScanResiLog>(STORAGE_KEYS.SCAN_RESI);
      const index = logs.findIndex((l: any) => l.id === log.id);
      if (index >= 0) {
        logs[index].status = 'Terjual';
        saveToStorage(STORAGE_KEYS.SCAN_RESI, logs);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error processing shipment:", error);
    return { success: false, message: "Terjadi kesalahan sistem." };
  }
};

// BJW Store specific functions
const BJW_STORAGE_KEYS = {
  BASE_BJW: 'stock_base_bjw',
  FOTO: 'stock_foto'
};

export const fetchBJWProducts = async (): Promise<any[]> => {
  try {
    const baseItems = getFromStorage<any>(BJW_STORAGE_KEYS.BASE_BJW);
    const fotos = getFromStorage<any>(BJW_STORAGE_KEYS.FOTO);
    
    // Map base items with their photos
    return baseItems.map(item => {
      const photo = fotos.find((f: any) => f.part_number === item.part_number);
      return {
        ...item,
        photos: photo || null
      };
    });
  } catch (error) {
    console.error("Error fetching BJW products:", error);
    return [];
  }
};

export const fetchBJWProductByPartNumber = async (partNumber: string): Promise<any | null> => {
  try {
    const baseItems = getFromStorage<any>(BJW_STORAGE_KEYS.BASE_BJW);
    const fotos = getFromStorage<any>(BJW_STORAGE_KEYS.FOTO);
    
    const item = baseItems.find((i: any) => i.part_number === partNumber);
    if (!item) return null;
    
    const photo = fotos.find((f: any) => f.part_number === partNumber);
    return {
      ...item,
      photos: photo || null
    };
  } catch (error) {
    console.error("Error fetching BJW product:", error);
    return null;
  }
};

export const updateBJWProduct = async (partNumber: string, updates: Partial<any>): Promise<boolean> => {
  try {
    const baseItems = getFromStorage<any>(BJW_STORAGE_KEYS.BASE_BJW);
    const index = baseItems.findIndex((i: any) => i.part_number === partNumber);
    
    if (index === -1) return false;
    
    baseItems[index] = {
      ...baseItems[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    saveToStorage(BJW_STORAGE_KEYS.BASE_BJW, baseItems);
    return true;
  } catch (error) {
    console.error("Error updating BJW product:", error);
    return false;
  }
};

export const updateBJWPhotos = async (partNumber: string, photoUpdates: Record<string, string>): Promise<boolean> => {
  try {
    const fotos = getFromStorage<any>(BJW_STORAGE_KEYS.FOTO);
    const index = fotos.findIndex((f: any) => f.part_number === partNumber);
    
    if (index === -1) {
      // Create new foto entry
      fotos.push({
        id: generateId(),
        part_number: partNumber,
        ...photoUpdates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      // Update existing foto entry
      fotos[index] = {
        ...fotos[index],
        ...photoUpdates,
        updated_at: new Date().toISOString()
      };
    }
    
    saveToStorage(BJW_STORAGE_KEYS.FOTO, fotos);
    return true;
  } catch (error) {
    console.error("Error updating BJW photos:", error);
    return false;
  }
};

export const deleteBJWPhoto = async (partNumber: string, photoKey: string): Promise<boolean> => {
  try {
    const fotos = getFromStorage<any>(BJW_STORAGE_KEYS.FOTO);
    const index = fotos.findIndex((f: any) => f.part_number === partNumber);
    
    if (index === -1) return false;
    
    // Set the photo field to null or empty string
    fotos[index] = {
      ...fotos[index],
      [photoKey]: null,
      updated_at: new Date().toISOString()
    };
    
    saveToStorage(BJW_STORAGE_KEYS.FOTO, fotos);
    return true;
  } catch (error) {
    console.error("Error deleting BJW photo:", error);
    return false;
  }
};

export const addBJWProduct = async (product: any): Promise<string | null> => {
  try {
    const baseItems = getFromStorage<any>(BJW_STORAGE_KEYS.BASE_BJW);
    
    // Check if product already exists
    const exists = baseItems.some((i: any) => i.part_number === product.part_number);
    if (exists) {
      console.error("Product with this part number already exists");
      return null;
    }
    
    const newProduct = {
      id: generateId(),
      part_number: product.part_number,
      name: product.name,
      application: product.application || '',
      shelf: product.shelf || '',
      brand: product.brand || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    baseItems.push(newProduct);
    saveToStorage(BJW_STORAGE_KEYS.BASE_BJW, baseItems);
    
    return newProduct.id;
  } catch (error) {
    console.error("Error adding BJW product:", error);
    return null;
  }
};
