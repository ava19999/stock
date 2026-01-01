// FILE: src/components/quickInput/QuickInputHeader.tsx
import React from 'react';
import { Package, Plus, Save, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface QuickInputHeaderProps {
    onAddRow: () => void;
    onSaveAll: () => void;
    isSaving: boolean;
    validCount: number;
    activeTab: 'in' | 'out'; // PROP BARU
    onTabChange: (tab: 'in' | 'out') => void; // PROP BARU
}

export const QuickInputHeader: React.FC<QuickInputHeaderProps> = ({ 
    onAddRow, onSaveAll, isSaving, validCount, activeTab, onTabChange 
}) => {
    return (
        <div className="px-4 py-3 bg-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-700">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Package className="text-green-400" size={20} />
                    <h2 className="text-lg font-bold text-gray-100 hidden sm:block">Input Cepat</h2>
                </div>
                
                {/* NAVIGASI TAB BARU */}
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button
                        onClick={() => onTabChange('out')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'out' 
                            ? 'bg-red-900/50 text-red-400 shadow-sm ring-1 ring-red-800' 
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                    >
                        <ArrowUpCircle size={14} /> Barang Keluar
                    </button>
                    <button
                        onClick={() => onTabChange('in')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
                            activeTab === 'in' 
                            ? 'bg-green-900/50 text-green-400 shadow-sm ring-1 ring-green-800' 
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                        }`}
                    >
                        <ArrowDownCircle size={14} /> Barang Masuk
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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