// FILE: src/types.ts

export interface InventoryItem {
  id: string;
  partNumber: string;
  sku?: string;          // <--- KOLOM BARU (SKU Induk)
  name: string;
  description: string;
  quantity: number; 
  shelf: string;
  
  price: number;           
  kingFanoPrice: number;   
  
  costPrice: number;       
  ecommerce: string;
  imageUrl: string;
  lastUpdated: number;
  
  initialStock: number;
  qtyIn: number;
  qtyOut: number;
}

export type InventoryFormData = Omit<InventoryItem, 'id' | 'lastUpdated'>;

// ... interface lainnya tetap sama
export interface CartItem extends InventoryItem {
  cartQuantity: number;
  customPrice?: number;
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
  price: number;       
  totalPrice: number;  
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