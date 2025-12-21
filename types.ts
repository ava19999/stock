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
  stockAhir: number;
  qtyMasuk: number;
  hargaSatuan: number;
  hargaTotal: number;
  customer?: string; // TAMBAHAN BARU
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
  stockAhir: number;
  qtyKeluar: number;
  hargaSatuan: number;
  hargaTotal: number;
  resi: string;
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
  timestamp: number | null; 
  reason: string;
  resi?: string;
  tempo?: string;
  customer?: string; // TAMBAHAN BARU
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

export interface ReturRecord {
  id?: number;
  tanggal_pemesanan: string | null;
  resi: string | null;
  toko: string | null;
  ecommerce: string | null;
  customer: string | null;
  part_number: string | null;
  nama_barang: string | null;
  quantity: number;
  harga_satuan: number;
  harga_total: number;
  tanggal_retur: string;
  status: string;
  keterangan: string | null;
}

export interface ScanResiLog {
  id?: number;
  tanggal: string;      
  resi: string;         
  toko: string | null;  
  ecommerce: string;    
  customer: string | null;
  part_number: string | null;
  nama_barang: string | null;
  quantity: number | null;
  harga_satuan: number | null;
  harga_total: number | null;
  status: string | null;
}