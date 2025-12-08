// FILE: src/types.ts
export interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  quantity: number; // Stok Akhir (Calculated)
  shelf: string;
  price: number;    // Harga Jual
  costPrice: number; // Harga Modal
  ecommerce: string; // Link/Nama E-commerce
  imageUrl: string;
  lastUpdated: number;
  
  // Field Stok untuk Kalkulasi
  initialStock: number; // Stok Awal
  qtyIn: number;        // Penambahan
  qtyOut: number;       // Pengurangan
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

export interface StockHistory {
  id: string;
  itemId: string;
  partNumber: string;
  name: string;
  type: 'in' | 'out';
  quantity: number;
  previousStock: number;
  currentStock: number;
  price: number; // [BARU] Harga satuan saat transaksi terjadi
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

export interface AIAnalysisResult {
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedShelfCategory?: string;
}