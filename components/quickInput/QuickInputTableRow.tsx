// FILE: src/components/quickInput/QuickInputTableRow.tsx
import React, { useEffect, useRef } from 'react';
import { QuickInputRow } from './types';
import { InventoryItem } from '../../types';
import { checkIsRowComplete } from './quickInputUtils';
import { Loader2, AlertCircle, Check, Trash2 } from 'lucide-react';

interface QuickInputTableRowProps {
    row: QuickInputRow;
    index: number;
    globalIndex: number;
    activeSearchIndex: number | null;
    suggestions: InventoryItem[];
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onPartNumberChange: (id: number, val: string) => void;
    onSelectItem: (id: number, item: InventoryItem) => void;
    onUpdateRow: (id: number, field: keyof QuickInputRow, value: any) => void;
    onRemoveRow: (id: number) => void;
    highlightedIndex: number;
    onSearchKeyDown: (e: React.KeyboardEvent, id: number) => void;
    onGridKeyDown: (e: React.KeyboardEvent, globalRefIndex: number) => void;
}

export const QuickInputTableRow: React.FC<QuickInputTableRowProps> = ({
    row, index, globalIndex, activeSearchIndex, suggestions, inputRefs,
    onPartNumberChange, onSelectItem, onUpdateRow, onRemoveRow, highlightedIndex, onSearchKeyDown, onGridKeyDown
}) => {
    const isComplete = checkIsRowComplete(row);
    const activeItemRef = useRef<HTMLDivElement>(null);

    // Konstanta jumlah kolom untuk perhitungan index ref
    const COLS = 8;
    const baseRefIndex = globalIndex * COLS;

    // Helper untuk menangani input angka (mencegah huruf masuk)
    const handleNumberChange = (field: keyof QuickInputRow, value: string) => {
        // Hanya ambil angka
        const cleanValue = value.replace(/[^0-9]/g, '');
        // Konversi ke number (jika kosong jadi 0)
        const numValue = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
        onUpdateRow(row.id, field, numValue);
    };

    useEffect(() => {
        if (activeSearchIndex === index && activeItemRef.current) {
            activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [highlightedIndex, activeSearchIndex, index]);

    return (
        <tr className={`hover:bg-gray-700/20 border-b border-gray-700/50 ${row.error ? 'bg-red-900/10' : ''}`}>
            <td className="px-2 py-1.5 text-gray-500 font-mono text-center text-[10px]">
                {globalIndex + 1}
            </td>

            {/* KOLOM 0: Part Number */}
            <td className="px-2 py-1.5 relative">
                <div className="relative">
                    <input
                        ref={el => { inputRefs.current[baseRefIndex + 0] = el; }}
                        type="text"
                        className={`w-full bg-transparent px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:text-blue-400 font-bold placeholder-gray-600 ${row.error ? 'text-red-400' : ''}`}
                        value={row.partNumber}
                        onChange={(e) => onPartNumberChange(row.id, e.target.value)}
                        onKeyDown={(e) => onSearchKeyDown(e, row.id)} // Khusus PartNumber punya handler sendiri
                        placeholder="Cari..."
                        autoComplete="off"
                    />
                    {activeSearchIndex === index && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto border border-gray-600">
                            {suggestions.map((item, idx) => (
                                <div
                                    key={idx}
                                    ref={idx === highlightedIndex ? activeItemRef : null}
                                    className={`px-3 py-2 cursor-pointer border-b border-gray-700 last:border-0 transition-colors ${
                                        idx === highlightedIndex 
                                        ? 'bg-gray-700 border-l-2 border-orange-400' 
                                        : 'hover:bg-gray-700'
                                    }`}
                                    onClick={() => onSelectItem(row.id, item)}
                                >
                                    <div className="font-bold text-orange-400 font-mono text-xs">{item.partNumber}</div>
                                    <div className="text-gray-400 text-[10px] truncate">{item.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </td>

            {/* KOLOM 1: Nama Barang */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 1] = el; }}
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 font-medium focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.namaBarang}
                    onChange={(e) => onUpdateRow(row.id, 'namaBarang', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 1)}
                    placeholder="Nama Barang"
                />
            </td>

            {/* KOLOM 2: Quantity */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 2] = el; }}
                    type="text"
                    inputMode="numeric"
                    // Menggunakan || '' agar jika 0 tampil kosong (seperti kolom lain)
                    className={`w-full bg-transparent px-1 py-1 text-xs font-bold text-right font-mono focus:outline-none ${row.operation === 'in' ? 'text-green-400' : 'text-red-400'} ${row.error ? 'text-red-400' : ''}`}
                    value={row.quantity || ''}
                    onChange={(e) => handleNumberChange('quantity', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 2)}
                    placeholder="0"
                />
            </td>

            {/* KOLOM 3: Harga Modal */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 3] = el; }}
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-orange-300 focus:outline-none focus:text-orange-400 placeholder-gray-600"
                    value={row.hargaModal || ''}
                    onChange={(e) => handleNumberChange('hargaModal', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 3)}
                    placeholder="0"
                />
            </td>

            {/* KOLOM 4: Harga Jual */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 4] = el; }}
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-blue-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.hargaJual || ''}
                    onChange={(e) => handleNumberChange('hargaJual', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 4)}
                    placeholder="0"
                />
            </td>

            {/* KOLOM 5: Via */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 5] = el; }}
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.via}
                    onChange={(e) => onUpdateRow(row.id, 'via', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 5)}
                    placeholder="Via"
                />
            </td>

            {/* KOLOM 6: Customer */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 6] = el; }}
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.customer}
                    onChange={(e) => onUpdateRow(row.id, 'customer', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 6)}
                    placeholder="Customer"
                />
            </td>

            {/* KOLOM 7: Resi/Tempo */}
            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[baseRefIndex + 7] = el; }}
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.resiTempo}
                    onChange={(e) => onUpdateRow(row.id, 'resiTempo', e.target.value)}
                    onKeyDown={(e) => onGridKeyDown(e, baseRefIndex + 7)}
                    placeholder="Ket..."
                />
            </td>

            <td className="px-2 py-1.5 text-center">
                <div className="flex items-center justify-center">
                    {row.isLoading ? (
                        <Loader2 size={12} className="animate-spin text-blue-400" />
                    ) : row.error ? (
                        <div className="relative group">
                            <AlertCircle size={12} className="text-red-400 cursor-help" />
                            <div className="absolute right-full top-0 mr-2 w-32 p-1.5 bg-red-900 text-red-100 text-[9px] rounded shadow-lg z-50 hidden group-hover:block">
                                {row.error}
                            </div>
                        </div>
                    ) : isComplete ? (
                        <Check size={12} className="text-green-400" />
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700" title="Belum Lengkap"></div>
                    )}
                </div>
            </td>

            <td className="px-2 py-1.5 text-center">
                <button
                    onClick={() => onRemoveRow(row.id)}
                    className="p-1 hover:text-red-300 text-red-400 transition-colors opacity-50 hover:opacity-100"
                >
                    <Trash2 size={12} />
                </button>
            </td>
        </tr>
    );
};