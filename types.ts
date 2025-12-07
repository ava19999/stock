// FILE: src/types.ts
export interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  quantity: number;
  shelf: string;
  price: number;
  imageUrl: string;
  lastUpdated: number;
}

export type InventoryFormData = Omit<InventoryItem, 'id' | 'lastUpdated'>;

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

// --- TAMBAHAN BARU ---
export interface StockHistory {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  type: 'in' | 'out'; // 'in' = Masuk (Restock), 'out' = Keluar (Terjual/Koreksi)
  quantity: number;   // Jumlah perubahan (misal: 1, 5, 10)
  previousStock: number; // Stok sebelum berubah
  currentStock: number;  // Stok sesudah berubah
  timestamp: number;
  reason: string;     // Keterangan: "Restock Manual", "Order #...", "Barang Baru"
}
// ---------------------

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