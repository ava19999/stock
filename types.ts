// FILE: src/types.ts
export interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  quantity: number; 
  shelf: string;
  price: number;     // Harga Jual Saat Ini
  costPrice: number; // Harga Modal
  ecommerce: string;
  imageUrl: string;
  lastUpdated: number;
  
  // Field Stok untuk Kalkulasi
  initialStock: number;
  qtyIn: number;
  qtyOut: number;
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
  price: number;       // [BARU] Harga Satuan (Statis)
  totalPrice: number;  // [BARU] Total Harga (Statis)
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