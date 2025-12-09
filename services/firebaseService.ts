// FILE: src/services/firebaseService.ts
import { db } from '../lib/firebase';
import { 
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, 
  query, orderBy, limit, where, getCountFromServer, startAt, endAt 
} from 'firebase/firestore';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

const COLL_INVENTORY = 'inventory';
const COLL_ORDERS = 'orders';
const COLL_HISTORY = 'stock_history';
const COLL_CHATS = 'chat_sessions';

// --- INVENTORY SERVICES (VERSI HEMAT KUOTA & SEARCH AKTIF) ---

export const fetchInventoryStats = async () => {
  try {
    const coll = collection(db, COLL_INVENTORY);
    
    // HANYA MENGHITUNG JUMLAH (Hemat biaya read)
    const snapshot = await getCountFromServer(coll);
    const totalItems = snapshot.data().count;

    // Total stok/aset diset 0 atau estimasi untuk menghemat kuota read harian
    // Jika ingin akurat, harus baca semua dokumen (berisiko kuota habis)
    return { totalItems, totalStock: 0, totalAsset: 0 }; 
  } catch (e) {
    console.error("Error stats:", e);
    return { totalItems: 0, totalStock: 0, totalAsset: 0 };
  }
};

export const fetchInventoryPaginated = async (page: number = 1, limitNum: number = 50, search: string = '') => {
  try {
    let q;
    const coll = collection(db, COLL_INVENTORY);

    if (search) {
      // --- LOGIKA PENCARIAN CANGGIH ---
      // Mencari nama barang yang DIAWALI kata kunci (misal: "ALT" -> "ALTERNATOR...")
      // Data di CSV Anda huruf besar, jadi kita paksa uppercase
      const searchUpper = search.toUpperCase();
      
      q = query(
        coll,
        orderBy('name'), 
        startAt(searchUpper), 
        endAt(searchUpper + '\uf8ff'),
        limit(limitNum)
      );
    } else {
      // --- LOGIKA PAGINATION BIASA ---
      // Mengambil data terbaru (tanpa search)
      // Note: Di Firestore asli, pagination butuh cursor (startAfter), 
      // tapi untuk versi simpel ini kita pakai Limit dulu.
      q = query(coll, orderBy('lastUpdated', 'desc'), limit(limitNum));
    }

    const snapshot = await getDocs(q);
    
    const mappedData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        partNumber: data.partNumber || '',
        name: data.name || 'Tanpa Nama',
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

    // Hitung total untuk info halaman
    let totalCount = 0;
    if (search) {
       totalCount = snapshot.size; // Jumlah hasil search
    } else {
       const countSnap = await getCountFromServer(coll);
       totalCount = countSnap.data().count;
    }
    
    return { data: mappedData, count: totalCount };
  } catch (err) {
    console.error("Error fetching inventory:", err);
    return { data: [], count: 0 };
  }
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
    // Membatasi fetch all hanya 100 item terakhir agar aplikasi ringan
    const res = await fetchInventoryPaginated(1, 100, '');
    return res.data;
};

// --- SHOP SERVICES ---

export const fetchShopItems = async (page: number = 1, limitNum: number = 20, search: string = '', category: string = 'Semua') => {
  try {
    let q;
    const coll = collection(db, COLL_INVENTORY);

    if (search) {
        const searchUpper = search.toUpperCase();
        // Search Nama Barang di Shop
        q = query(
            coll, 
            where('quantity', '>', 0), // Hanya yang ada stok
            orderBy('quantity'), // Diperlukan index komposit di Firestore (abaikan jika error, hapus ini)
            orderBy('name'), 
            startAt(searchUpper), 
            endAt(searchUpper + '\uf8ff'),
            limit(limitNum)
        );
        // Fallback jika index belum dibuat: Cari tanpa filter quantity di query
        // q = query(coll, orderBy('name'), startAt(searchUpper), endAt(searchUpper + '\uf8ff'), limit(limitNum));
    } else {
        // Tampilkan barang random/terbaru yang ada stoknya
        q = query(coll, where('quantity', '>', 0), orderBy('name'), limit(limitNum));
    }

    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            partNumber: data.partNumber,
            name: data.name,
            description: data.description,
            price: Number(data.price),
            quantity: Number(data.quantity),
            imageUrl: data.imageUrl,
            ecommerce: data.ecommerce,
            shelf: data.shelf,
            // ... mapping lengkap ...
        } as InventoryItem;
    });

    return { data: items, count: 1000 }; // Dummy count agar pagination aktif
  } catch (err) {
    console.log(err);
    return { data: [], count: 0 };
  }
};

// --- CRUD INVENTORY ---

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  try {
    // Gunakan partNumber sebagai ID agar tidak duplikat
    // Ganti karakter '/' dengan '-' agar valid sebagai ID URL
    const docId = item.partNumber ? item.partNumber.replace(/\//g, '-') : `item-${Date.now()}`;
    const docRef = doc(db, COLL_INVENTORY, docId);
    
    await setDoc(docRef, { ...item, lastUpdated: Date.now() });
    return true;
  } catch (e) { console.error(e); alert("Gagal Tambah: " + e); return false; }
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  try {
    const docRef = doc(db, COLL_INVENTORY, item.id);
    await updateDoc(docRef, { 
      name: item.name,
      description: item.description,
      price: item.price,
      costPrice: item.costPrice,
      quantity: item.quantity,
      initialStock: item.initialStock,
      qtyIn: item.qtyIn,
      qtyOut: item.qtyOut,
      shelf: item.shelf,
      imageUrl: item.imageUrl,
      ecommerce: item.ecommerce,
      lastUpdated: Date.now() 
    });
    return true;
  } catch (e) { alert("Gagal Update Stok: " + e); return false; }
};

export const deleteInventory = async (id: string): Promise<boolean> => {
  try { await deleteDoc(doc(db, COLL_INVENTORY, id)); return true; } catch { return false; }
};

// --- ORDERS & HISTORY ---

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, COLL_ORDERS), orderBy('timestamp', 'desc'), limit(50));
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

export const fetchHistory = async (): Promise<StockHistory[]> => {
  try {
    const q = query(collection(db, COLL_HISTORY), orderBy('timestamp', 'desc'), limit(50));
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
    const q = query(collection(db, COLL_CHATS), orderBy('lastTimestamp', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChatSession);
  } catch { return []; }
};

export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  try { await setDoc(doc(db, COLL_CHATS, session.customerId), session); return true; } catch { return false; }
};