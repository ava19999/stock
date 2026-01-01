// FILE: src/components/quickInput/QuickInputTableRow.tsx
import React from 'react';
import { QuickInputRow } from './types';
import { InventoryItem } from '../../types';
import { checkIsRowComplete } from './quickInputUtils';
import { Loader2, AlertCircle, Check, Trash2 } from 'lucide-react';

interface QuickInputTableRowProps {
    row: QuickInputRow;
    index: number;         // Index lokal (0-99) untuk styling/logic
    globalIndex: number;   // Index global untuk refs
    activeSearchIndex: number | null;
    suggestions: InventoryItem[];
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onPartNumberChange: (id: number, val: string) => void;
    onSelectItem: (id: number, item: InventoryItem) => void;
    onUpdateRow: (id: number, field: keyof QuickInputRow, value: any) => void;
    onRemoveRow: (id: number) => void;
}

export const QuickInputTableRow: React.FC<QuickInputTableRowProps> = ({
    row, index, globalIndex, activeSearchIndex, suggestions, inputRefs,
    onPartNumberChange, onSelectItem, onUpdateRow, onRemoveRow
}) => {
    const isComplete = checkIsRowComplete(row);

    return (
        <tr className={`hover:bg-gray-700/20 border-b border-gray-700/50 ${row.error ? 'bg-red-900/10' : ''}`}>
            <td className="px-2 py-1.5 text-gray-500 font-mono text-center text-[10px]">
                {globalIndex + 1}
            </td>

            <td className="px-2 py-1.5 relative">
                <div className="relative">
                    <input
                        ref={el => { inputRefs.current[globalIndex * 6] = el; }}
                        type="text"
                        className={`w-full bg-transparent px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:text-blue-400 font-bold placeholder-gray-600 ${row.error ? 'text-red-400' : ''}`}
                        value={row.partNumber}
                        onChange={(e) => onPartNumberChange(row.id, e.target.value)}
                        placeholder="Cari..."
                    />
                    {activeSearchIndex === index && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto border border-gray-600">
                            {suggestions.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
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

            <td className="px-2 py-1.5">
                <div className="text-gray-300 font-medium text-xs max-w-[200px] truncate">
                    {row.namaBarang || '-'}
                </div>
            </td>

            <td className="px-2 py-1.5 text-center">
                <select
                    className={`w-full bg-transparent px-1 py-1 text-[10px] font-bold focus:outline-none cursor-pointer ${row.operation === 'in' ? 'text-green-400' : 'text-red-400'}`}
                    value={row.operation}
                    onChange={(e) => onUpdateRow(row.id, 'operation', e.target.value as 'in' | 'out')}
                >
                    <option value="out" className="bg-gray-800 text-red-400">KELUAR</option>
                    <option value="in" className="bg-gray-800 text-green-400">MASUK</option>
                </select>
            </td>

            <td className="px-2 py-1.5">
                <input
                    ref={el => { inputRefs.current[(globalIndex * 6) + 2] = el; }}
                    type="number"
                    min="0"
                    className={`w-full bg-transparent px-1 py-1 text-xs font-bold text-right font-mono focus:outline-none ${row.operation === 'in' ? 'text-green-400' : 'text-red-400'} ${row.error ? 'text-red-400' : ''}`}
                    value={row.quantity}
                    onChange={(e) => onUpdateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                />
            </td>

            <td className="px-2 py-1.5">
                <input
                    type="number"
                    className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-orange-300 focus:outline-none focus:text-orange-400 placeholder-gray-600"
                    value={row.hargaModal || ''}
                    onChange={(e) => onUpdateRow(row.id, 'hargaModal', parseInt(e.target.value) || 0)}
                    placeholder="0"
                />
            </td>

            <td className="px-2 py-1.5">
                <input
                    type="number"
                    className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-blue-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.hargaJual || ''}
                    onChange={(e) => onUpdateRow(row.id, 'hargaJual', parseInt(e.target.value) || 0)}
                    placeholder="0"
                />
            </td>

            <td className="px-2 py-1.5">
                <input
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.via}
                    onChange={(e) => onUpdateRow(row.id, 'via', e.target.value)}
                    placeholder="Via"
                />
            </td>

            <td className="px-2 py-1.5">
                <input
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.customer}
                    onChange={(e) => onUpdateRow(row.id, 'customer', e.target.value)}
                    placeholder="Customer"
                />
            </td>

            <td className="px-2 py-1.5">
                <input
                    type="text"
                    className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                    value={row.resiTempo}
                    onChange={(e) => onUpdateRow(row.id, 'resiTempo', e.target.value)}
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