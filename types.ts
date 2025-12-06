export interface InventoryItem {
  id: string;
  partNumber: string; // No. Part
  name: string; // Nama Barang
  description: string; // Deskripsi
  price: number; // Harga
  quantity: number; // Jumlah Stok
  shelf: string; // Rak
  imageUrl: string; // Foto (Base64 or URL)
  lastUpdated: number;
}

export type InventoryFormData = Omit<InventoryItem, 'id' | 'lastUpdated'>;

export interface AIAnalysisResult {
  suggestedName?: string;
  suggestedDescription?: string;
  suggestedShelfCategory?: string;
}

export interface CartItem extends InventoryItem {
  cartQuantity: number;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  timestamp: number;
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
  customerName: string; // Bisa "Guest 123" atau nama input user
  messages: Message[];
  lastMessage: string;
  lastTimestamp: number;
  unreadAdminCount: number; // Pesan user yang belum dibaca admin
  unreadUserCount: number; // Pesan admin yang belum dibaca user
}