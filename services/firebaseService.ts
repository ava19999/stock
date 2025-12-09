// FILE: src/services/firebaseService.ts
import { db } from '../lib/firebase';
import { 
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, 
  query, orderBy, limit
} from 'firebase/firestore';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

const COLL_INVENTORY = 'inventory';
const COLL_ORDERS = 'orders';
const COLL_HISTORY = 'stock_history';
const COLL_CHATS = 'chat_sessions';

// --- INVENTORY ---
export const fetchInventoryStats = async () => {
  try {
    const q = query(collection(db, COLL_INVENTORY));
    const snapshot = await getDocs(q);
    let totalItems = 0, totalStock = 0, totalAsset = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      totalItems++;
      totalStock += Number(data.quantity) || 0;
      totalAsset += (Number(data.price) || 0) * (Number(data.quantity) || 0);
    });
    return { totalItems, totalStock, totalAsset };
  } catch { return { totalItems: 0, totalStock: 0, totalAsset: 0 }; }
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    const q = query(collection(db, COLL_INVENTORY), orderBy('lastUpdated', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        partNumber: data.partNumber || '',
        name: data.name || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        costPrice: Number(data.costPrice) || 0,
        quantity: Number(data.quantity) || 0,
        initialStock: Number(data.initialStock) || 0,
        qtyIn: Number(data.qtyIn) || 0,
        qtyOut: Number(data.qtyOut) || 0,
        shelf: data.shelf || '',
        imageUrl: data.imageUrl || '',
        ecommerce: data.ecommerce || '',
        lastUpdated: Number(data.lastUpdated) || Date.now()
      } as InventoryItem;
    });
  } catch (err) { console.error(err); return []; }
};

// Fungsi kompatibilitas untuk Dashboard
export const fetchInventoryPaginated = async (page: number = 1, limitNum: number = 50, search: string = '') => {
    const allData = await fetchInventory();
    let filtered = allData;
    if (search) {
        const lower = search.toLowerCase();
        filtered = allData.filter(i => 
            i.name.toLowerCase().includes(lower) || 
            i.partNumber.toLowerCase().includes(lower) ||
            i.description.toLowerCase().includes(lower)
        );
    }
    const start = (page - 1) * limitNum;
    const paginatedData = filtered.slice(start, start + limitNum);
    return { data: paginatedData, count: filtered.length };
};

// --- SHOP ---
export const fetchShopItems = async (page: number = 1, limitNum: number = 20, search: string = '', category: string = 'Semua') => {
  try {
    const allData = await fetchInventory();
    let items = allData.filter(i => i.quantity > 0 && i.price > 0);
    if (category !== 'Semua') items = items.filter(i => i.description.includes(`[${category}]`));
    if (search) {
        const lower = search.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(lower) || i.partNumber.toLowerCase().includes(lower));
    }
    const start = (page - 1) * limitNum;
    return { data: items.slice(start, start + limitNum), count: items.length };
  } catch { return { data: [], count: 0 }; }
};

// --- CRUD ---
export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  try {
    // Gunakan partNumber sebagai ID dokumen agar unik
    const docId = item.partNumber ? item.partNumber.replace(/\//g, '-') : `item-${Date.now()}`;
    await setDoc(doc(db, COLL_INVENTORY, docId), { ...item, lastUpdated: Date.now() });
    return true;
  } catch (e) { alert("Gagal Tambah: " + e); return false; }
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  try {
    // Update langsung ke ID dokumen
    await updateDoc(doc(db, COLL_INVENTORY, item.id), { 
      name: item.name, description: item.description, price: item.price,
      costPrice: item.costPrice, quantity: item.quantity, initialStock: item.initialStock,
      qtyIn: item.qtyIn, qtyOut: item.qtyOut, shelf: item.shelf, imageUrl: item.imageUrl,
      ecommerce: item.ecommerce, lastUpdated: Date.now() 
    });
    return true;
  } catch (e) { alert("Gagal Update Stok: " + e); return false; }
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  try { await deleteDoc(doc(db, COLL_INVENTORY, id)); return true; } catch { return false; }
};

// --- ORDERS ---
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, COLL_ORDERS), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
  } catch { return []; }
};

export const saveOrder = async (order: Order): Promise<boolean> => {
  try { await setDoc(doc(db, COLL_ORDERS, order.id), order); return true; } catch { return false; }
};

export const updateOrderStatusService = async (orderId: string, status: string): Promise<boolean> => {
  try { await updateDoc(doc(db, COLL_ORDERS, orderId), { status }); return true; } catch { return false; }
};

// --- HISTORY ---
export const fetchHistory = async (): Promise<StockHistory[]> => {
  try {
    const q = query(collection(db, COLL_HISTORY), orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockHistory));
  } catch { return []; }
};

export const addHistoryLog = async (history: StockHistory): Promise<boolean> => {
  try { await setDoc(doc(db, COLL_HISTORY, history.id), history); return true; } catch { return false; }
};

// --- CHAT ---
export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const q = query(collection(db, COLL_CHATS), orderBy('lastTimestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChatSession);
  } catch { return []; }
};

export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  try { await setDoc(doc(db, COLL_CHATS, session.customerId), session); return true; } catch { return false; }
};