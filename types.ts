// FILE: src/types.ts

export interface InventoryItem {
  id: string;
  partNumber: string;
  name: string;
  brand: string;        
  application: string;  
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

export interface BarangMasuk {
  id?: string;
  tanggal: string;
  tempo: string;
  suplier: string;
  partNumber: string;
  name: string;
  brand: string;
  application: string;
  rak: string;
  stockAwal: number;
  qtyMasuk: number;
  hargaSatuan: number;
  hargaTotal: number;
}

export interface BarangKeluar {
  id?: string;
  tanggal: string;
  kodeToko: string;   
  tempo: string;     
  ecommerce: string;  
  customer: string;
  partNumber: string;
  name: string;
  brand: string;
  application: string;
  rak: string;
  stockAwal: number;
  qtyKeluar: number;
  hargaSatuan: number;
  hargaTotal: number;
  resi: string;
}

// Interface ini PENTING agar Dashboard lama tetap bisa baca data baru
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
  timestamp: number | null; // UBAH DI SINI: Izinkan null agar bisa menampilkan kosong
  reason: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  timestamp: number;
}

export interface CartItem extends InventoryItem {
  cartQuantity: number;
  customPrice?: number;
}

export interface ChatSession {
  customerId: string;
  customerName: string;
  messages: any[];
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