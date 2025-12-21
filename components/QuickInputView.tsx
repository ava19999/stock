// FILE: src/components/QuickInputView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem } from '../types';
import { updateInventory, getItemByPartNumber } from '../services/supabaseService';
import { formatRupiah } from '../utils';
import { Plus, Trash2, Save, Check, Loader2, AlertCircle, Package, ChevronLeft, ChevronRight, Edit2, Eye } from 'lucide-react';

interface QuickInputRow {
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

interface QuickInputViewProps {
  items: InventoryItem[];
  onRefresh?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const QuickInputView: React.FC<QuickInputViewProps> = ({ items, onRefresh, showToast }) => {
  const [rows, setRows] = useState<QuickInputRow[]>([]);
  
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (rows.length > 0) {
        const lastIndex = (rows.length - 1) * 6;
    }
  }, [rows.length]);

  const handlePartNumberChange = (id: number, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, partNumber: value.toUpperCase() } : row
    ));

    const rowIndex = rows.findIndex(r => r.id === id);
    
    if (value.length >= 2) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        const lowerVal = value.toLowerCase();
        const matches = items
          .filter(item => item.partNumber && item.partNumber.toLowerCase().includes(lowerVal))
          .slice(0, 10);
        
        setSuggestions(matches);
        setActiveSearchIndex(rowIndex);
      }, 300);
    } else {
      setSuggestions([]);
      setActiveSearchIndex(null);
    }
  };

  const handleSelectItem = (id: number, item: InventoryItem) => {
    setRows(prev => prev.map(row => 
      row.id === id ? {
        ...row,
        partNumber: item.partNumber,
        namaBarang: item.name,
        hargaModal: item.costPrice || 0,
        hargaJual: item.price || 0,
        error: undefined
      } : row
    ));
    setSuggestions([]);
    setActiveSearchIndex(null);
    
    const rowIndex = rows.findIndex(r => r.id === id);
    const qtyInput = inputRefs.current[(rowIndex * 6) + 2]; 
    qtyInput?.focus();
  };

  const addNewRow = () => {
    const newId = Math.max(0, ...rows.map(r => r.id)) + 1;
    setRows(prev => [...prev, {
      id: newId,
      partNumber: '',
      namaBarang: '',
      hargaModal: 0,
      hargaJual: 0,
      quantity: 1,
      operation: 'out',
      via: '',
      customer: '',
      resiTempo: ''
    }]);
    
    setTimeout(() => {
        const newIndex = rows.length; 
        inputRefs.current[newIndex * 6]?.focus();
    }, 100);
  };

  const removeRow = (id: number) => {
      setRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: number, field: keyof QuickInputRow, value: any) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value, error: undefined } : row
    ));
  };

  // --- FUNGSI CEK KELENGKAPAN DATA ---
  const checkIsRowComplete = (row: QuickInputRow) => {
      return (
          !!row.partNumber && 
          !!row.namaBarang && 
          row.quantity > 0 && 
          row.via.trim().length > 0 && 
          row.customer.trim().length > 0 && 
          row.resiTempo.trim().length > 0
      );
  };

  const saveRow = async (row: QuickInputRow) => {
    // Validasi ketat sebelum save
    if (!checkIsRowComplete(row)) {
      updateRow(row.id, 'error', 'Lengkapi semua kolom!');
      return false;
    }

    updateRow(row.id, 'isLoading', true);

    try {
      const existingItem = await getItemByPartNumber(row.partNumber);
      
      if (!existingItem) {
        updateRow(row.id, 'error', `Item tidak ditemukan`);
        updateRow(row.id, 'isLoading', false);
        return false;
      }

      const transactionData = {
        type: row.operation,
        qty: row.quantity,
        ecommerce: row.via,
        resiTempo: row.resiTempo,
        customer: row.customer,
        price: row.operation === 'in' ? row.hargaModal : row.hargaJual
      };

      const updatedItem = await updateInventory({
        ...existingItem,
        quantity: row.operation === 'in' 
          ? existingItem.quantity + row.quantity
          : Math.max(0, existingItem.quantity - row.quantity),
        costPrice: row.hargaModal || existingItem.costPrice,
        price: row.hargaJual || existingItem.price,
        lastUpdated: Date.now()
      }, transactionData);

      if (updatedItem) {
        setRows(prev => prev.filter(r => r.id !== row.id));
        if (showToast) showToast(`Item ${row.partNumber} updated`, 'success');
        return true;
      } else {
        updateRow(row.id, 'error', 'Gagal simpan');
        return false;
      }

    } catch (error: any) {
      console.error('Error saving row:', error);
      updateRow(row.id, 'error', 'Error');
      return false;
    } finally {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, isLoading: false } : r));
    }
  };

  const saveAllRows = async () => {
    setIsSavingAll(true);
    // Hanya simpan yang lengkap datanya
    const rowsToSave = rows.filter(row => checkIsRowComplete(row));
    
    if (rowsToSave.length === 0) {
        setIsSavingAll(false);
        if (showToast) showToast('Isi lengkap data sebelum menyimpan!', 'error');
        return;
    }

    const results = await Promise.all(rowsToSave.map(row => saveRow(row)));
    const successCount = results.filter(r => r).length;
    
    if (showToast && successCount > 0) {
      showToast(`${successCount} item berhasil disimpan`, 'success');
    }
    
    if (successCount > 0 && onRefresh) onRefresh();
    setIsSavingAll(false);
  };

  // Validasi tombol "Simpan Semua" menggunakan checkIsRowComplete
  const validRowsCount = rows.filter(r => checkIsRowComplete(r)).length;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  return (
    <div className="bg-gray-800 min-h-[80vh] flex flex-col overflow-hidden text-gray-100">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 flex justify-between items-center border-b border-gray-700">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Package className="text-green-400" size={20} /> Input Cepat
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addNewRow}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold rounded-lg flex items-center gap-2"
          >
            <Plus size={14} /> Baris Baru
          </button>
          <button
            onClick={saveAllRows}
            disabled={isSavingAll || validRowsCount === 0}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingAll ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan ({validRowsCount})
          </button>
        </div>
      </div>

      {/* Tabel Input */}
      <div className="flex-1 overflow-auto p-2">
        <div className="overflow-x-auto min-w-[1000px]">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 w-8 text-center">#</th>
                <th className="px-2 py-2 w-48">Part Number</th>
                <th className="px-2 py-2">Nama Barang</th>
                <th className="px-2 py-2 w-28 text-center">Tipe</th>
                <th className="px-2 py-2 w-16 text-right">Qty</th>
                <th className="px-2 py-2 w-28 text-right">Modal</th>
                <th className="px-2 py-2 w-28 text-right">Jual</th>
                <th className="px-2 py-2 w-24">Via</th>
                <th className="px-2 py-2 w-32">Customer</th>
                <th className="px-2 py-2 w-32">Resi/Tempo</th>
                <th className="px-2 py-2 w-16 text-center">Status</th>
                <th className="px-2 py-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {currentRows.map((row, index) => {
                  // LOGIKA CEKLIS: Harus SEMUA terisi
                  const isComplete = checkIsRowComplete(row);

                  return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-gray-700/20 border-b border-gray-700/50 ${
                      row.error ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 text-gray-500 font-mono text-center text-[10px]">
                      {startIndex + index + 1}
                    </td>

                    <td className="px-2 py-1.5 relative">
                      <div className="relative">
                        <input
                          ref={el => inputRefs.current[index * 6] = el}
                          type="text"
                          className={`w-full bg-transparent px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:text-blue-400 font-bold placeholder-gray-600 ${
                            row.error ? 'text-red-400' : ''
                          }`}
                          value={row.partNumber}
                          onChange={(e) => handlePartNumberChange(row.id, e.target.value)}
                          placeholder="Cari..."
                        />
                        {activeSearchIndex === index && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto border border-gray-600">
                            {suggestions.map((item, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                                onClick={() => handleSelectItem(row.id, item)}
                              >
                                <div className="font-bold text-orange-400 font-mono text-xs">
                                  {item.partNumber}
                                </div>
                                <div className="text-gray-400 text-[10px] truncate">
                                  {item.name}
                                </div>
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
                        className={`w-full bg-transparent px-1 py-1 text-[10px] font-bold focus:outline-none cursor-pointer ${
                          row.operation === 'in' ? 'text-green-400' : 'text-red-400'
                        }`}
                        value={row.operation}
                        onChange={(e) => updateRow(row.id, 'operation', e.target.value as 'in' | 'out')}
                      >
                        <option value="out" className="bg-gray-800 text-red-400">KELUAR</option>
                        <option value="in" className="bg-gray-800 text-green-400">MASUK</option>
                      </select>
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        ref={el => inputRefs.current[(index * 6) + 2] = el}
                        type="number"
                        min="0"
                        className={`w-full bg-transparent px-1 py-1 text-xs font-bold text-right font-mono focus:outline-none ${
                          row.operation === 'in' ? 'text-green-400' : 'text-red-400'
                        } ${row.error ? 'text-red-400' : ''}`}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-orange-300 focus:outline-none focus:text-orange-400 placeholder-gray-600"
                        value={row.hargaModal || ''}
                        onChange={(e) => updateRow(row.id, 'hargaModal', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="w-full bg-transparent px-1 py-1 text-xs font-mono text-right text-blue-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                        value={row.hargaJual || ''}
                        onChange={(e) => updateRow(row.id, 'hargaJual', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                        value={row.via}
                        onChange={(e) => updateRow(row.id, 'via', e.target.value)}
                        placeholder="Via"
                      />
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                        value={row.customer}
                        onChange={(e) => updateRow(row.id, 'customer', e.target.value)}
                        placeholder="Customer"
                      />
                    </td>

                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        className="w-full bg-transparent px-1 py-1 text-xs text-gray-300 focus:outline-none focus:text-blue-400 placeholder-gray-600"
                        value={row.resiTempo}
                        onChange={(e) => updateRow(row.id, 'resiTempo', e.target.value)}
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
                          // Tampilkan titik abu-abu jika belum semua kolom terisi
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" title="Belum Lengkap"></div>
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 hover:text-red-300 text-red-400 transition-colors opacity-50 hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="px-4 py-2 bg-gray-800 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700 sticky bottom-0">
            <div>{rows.length} Baris Data</div>
            <div className="flex items-center gap-2">
                <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
                >
                <ChevronLeft size={14} />
                </button>
                <span>Hal {currentPage}</span>
                <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
                >
                <ChevronRight size={14} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};