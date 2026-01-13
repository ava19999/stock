// FILE: src/components/quickInput/types.ts
export interface QuickInputRow {
    id: number;
    tanggal: string; // NEW: Date field
    tempo: string; // NEW: Payment terms (CASH, 3 BLN, 2 BLN, 1 BLN)
    customer: string;
    partNumber: string;
    namaBarang: string;
    brand?: string; // NEW: Brand info from item details
    aplikasi?: string; // NEW: Application info from item details
    qtySaatIni?: number; // NEW: Current quantity from item details
    qtyMasuk: number; // RENAMED from quantity
    totalHarga: number; // NEW: Total price for incoming quantity
    hargaSatuan: number; // RENAMED from hargaModal, calculated as totalHarga/qtyMasuk
    hargaJual: number;
    operation: 'in' | 'out';
    via: string;
    resiTempo: string;
    error?: string;
    isLoading?: boolean;
}