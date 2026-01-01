// FILE: src/components/quickInput/types.ts
export interface QuickInputRow {
    id: number;
    partNumber: string;
    namaBarang: string;
    hargaModal: number;
    hargaJual: number;
    quantity: number;
    operation: 'in' | 'out';
    via: string;
    customer: string;
    resiTempo: string;
    error?: string;
    isLoading?: boolean;
}