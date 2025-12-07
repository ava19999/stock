// FILE: src/types.ts
export interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  quantity: number; // Ini akan menampilkan STOK AHIR
  shelf: string;
  price: number;
  imageUrl: string;
  lastUpdated: number;
  
  // --- FIELD BARU UNTUK SINKRONISASI SHEET ---
  initialStock: number; // Kolom 'Stok' (Stok Awal)
  qtyIn: number;        // Kolom 'Masuk'
  qtyOut: number;       // Kolom 'Keluar'
}

export type InventoryFormData = Omit<InventoryItem, 'id' | 'lastUpdated' | 'initialStock' | 'qtyIn' | 'qtyOut'>;

export interface CartItem extends InventoryItem {
  cartQuantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  timestamp: number;
}

export interface StockHistory {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  type: 'in' | 'out';
  quantity: number;
  previousStock: number;
  currentStock: number;
  timestamp: number;
  reason: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: number;
  read: boolean;
}

export interface ChatSession {
  customerId: string;
  customerName: string;
  messages: Message[];
  lastMessage: string;
  lastTimestamp: number;
  unreadAdminCount: number;
  unreadUserCount: number;
}