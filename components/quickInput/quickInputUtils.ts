// FILE: src/components/quickInput/quickInputUtils.ts
import { QuickInputRow } from './types';

export const createEmptyRow = (id: number): QuickInputRow => ({
    id,
    partNumber: '',
    namaBarang: '',
    hargaModal: 0,
    hargaJual: 0,
    quantity: 1,
    operation: 'out',
    via: '',
    customer: '',
    resiTempo: '',
});

export const checkIsRowComplete = (row: QuickInputRow) => {
    return (
        !!row.partNumber && 
        !!row.namaBarang && 
        row.quantity > 0 && 
        row.via.trim().length > 0 && 
        row.customer.trim().length > 0 && 
        row.resiTempo.trim().length > 0
    );
};