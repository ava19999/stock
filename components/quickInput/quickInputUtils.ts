// FILE: src/components/quickInput/quickInputUtils.ts
import { QuickInputRow } from './types';

export const createEmptyRow = (id: number): QuickInputRow => ({
    id,
    partNumber: '',
    namaBarang: '',
    hargaModal: 0,
    hargaJual: 0,
    quantity: 0, 
    operation: 'out',
    via: '',
    customer: '',
    resiTempo: '',
});

export const checkIsRowComplete = (row: QuickInputRow) => {
    // Definisi "Harus Diisi":
    // - Part Number & Nama Barang (String tidak kosong)
    // - Quantity (Harus > 0) -> Wajib diisi agar masuk log transaksi
    // - Harga Modal (Harus > 0) -> Wajib diisi
    // - Via (String tidak kosong)
    // - Resi/Tempo (String tidak kosong)
    
    // Definisi "Boleh Kosong":
    // - Harga Jual (Boleh 0)
    // - Customer (Boleh string kosong)

    return (
        !!row.partNumber && 
        !!row.namaBarang && 
        row.quantity > 0 &&   // PERUBAHAN: Qty Wajib > 0
        row.hargaModal > 0 && // Harga Modal Wajib > 0
        row.via.trim().length > 0 && 
        row.resiTempo.trim().length > 0
    );
};