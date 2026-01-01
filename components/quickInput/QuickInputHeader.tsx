// FILE: src/components/quickInput/QuickInputHeader.tsx
import React from 'react';
import { Package, Plus, Save, Loader2 } from 'lucide-react';

interface QuickInputHeaderProps {
    onAddRow: () => void;
    onSaveAll: () => void;
    isSaving: boolean;
    validCount: number;
}

export const QuickInputHeader: React.FC<QuickInputHeaderProps> = ({ onAddRow, onSaveAll, isSaving, validCount }) => {
    return (
        <div className="px-4 py-3 bg-gray-800 flex justify-between items-center border-b border-gray-700">
            <div>
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Package className="text-green-400" size={20} /> Input Cepat
                </h2>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onAddRow}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold rounded-lg flex items-center gap-2"
                >
                    <Plus size={14} /> Tambah Baris
                </button>
                <button
                    onClick={onSaveAll}
                    disabled={isSaving || validCount === 0}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan ({validCount})
                </button>
            </div>
        </div>
    );
};