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
  const [rows, setRows] = useState<QuickInputRow[]>([
    {
      id: 1,
      partNumber: '',
      namaBarang: '',
      hargaModal: 0,
      hargaJual: 0,
      quantity: 1,
      operation: 'out',
      via: '',
      customer: '',
      resiTempo: ''
    }
  ]);
  
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus pertama
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, []);

  // Handle Part Number input dengan autocomplete
  const handlePartNumberChange = (id: number, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, partNumber: value.toUpperCase() } : row
    ));

    // Cari item
    const rowIndex = rows.findIndex(r => r.id === id);
    if (value.length >= 2) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        const matches = items
          .filter(item => 
            item.partNumber?.toLowerCase().includes(value.toLowerCase()) ||
            item.name?.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 5);
        
        setSuggestions(matches);
        setActiveSearchIndex(rowIndex);
      }, 300);
    } else {
      setSuggestions([]);
      setActiveSearchIndex(null);
    }
  };

  // Pilih item dari autocomplete
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
    
    // Focus ke kolom quantity
    const rowIndex = rows.findIndex(r => r.id === id);
    const nextInput = inputRefs.current[(rowIndex * 6) + 2];
    nextInput?.focus();
  };

  // Tambah baris baru
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
  };

  // Hapus baris
  const removeRow = (id: number) => {
    if (rows.length === 1) {
      setRows([{
        id: 1,
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
    } else {
      setRows(prev => prev.filter(row => row.id !== id));
    }
  };

  // Update nilai baris
  const updateRow = (id: number, field: keyof QuickInputRow, value: any) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value, error: undefined } : row
    ));
  };

  // Simpan satu baris
  const saveRow = async (row: QuickInputRow) => {
    if (!row.partNumber.trim()) {
      updateRow(row.id, 'error', 'Part Number wajib diisi');
      return false;
    }

    if (row.quantity <= 0) {
      updateRow(row.id, 'error', 'Quantity harus lebih dari 0');
      return false;
    }

    updateRow(row.id, 'isLoading', true);

    try {
      const existingItem = await getItemByPartNumber(row.partNumber);
      
      if (!existingItem) {
        updateRow(row.id, 'error', `Item ${row.partNumber} tidak ditemukan`);
        updateRow(row.id, 'isLoading', false);
        return false;
      }

      let resi = '';
      let tempo = '';
      if (row.resiTempo) {
        const parts = row.resiTempo.split('/').map(p => p.trim());
        resi = parts[0] || '';
        tempo = parts.slice(1).join(' / ') || '';
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
        updateRow(row.id, 'error', undefined);
        if (showToast) showToast(`Item ${row.partNumber} berhasil diupdate`, 'success');
        return true;
      } else {
        updateRow(row.id, 'error', 'Gagal menyimpan ke database');
        return false;
      }

    } catch (error: any) {
      console.error('Error saving row:', error);
      updateRow(row.id, 'error', error.message || 'Gagal menyimpan');
      return false;
    } finally {
      updateRow(row.id, 'isLoading', false);
    }
  };

  // Simpan semua baris
  const saveAllRows = async () => {
    setIsSavingAll(true);
    const results = await Promise.all(rows.map(row => saveRow(row)));
    
    const successCount = results.filter(r => r).length;
    const failCount = results.filter(r => !r).length;
    
    if (showToast) {
      if (failCount === 0) {
        showToast(`Semua ${successCount} item berhasil disimpan`, 'success');
      } else {
        showToast(`${successCount} berhasil, ${failCount} gagal`, failCount > 0 ? 'error' : 'success');
      }
    }
    
    if (failCount === 0) {
      if (onRefresh) onRefresh();
      setTimeout(() => {
        setRows([{
          id: 1,
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
      }, 1000);
    }
    
    setIsSavingAll(false);
  };

  // Validasi baris yang terisi
  const filledRows = rows.filter(row => row.partNumber.trim() && row.quantity > 0);
  
  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  return (
    <div className="bg-gray-800 min-h-[80vh] flex flex-col overflow-hidden text-gray-100">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <Package className="text-green-400" size={20} /> Input Cepat Barang
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Input massal barang masuk/keluar. Sistem otomatis sync dengan database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addNewRow}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-bold rounded-lg flex items-center gap-2"
          >
            <Plus size={14} /> Tambah Baris
          </button>
          <button
            onClick={saveAllRows}
            disabled={isSavingAll || filledRows.length === 0}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Simpan Semua ({filledRows.length})
          </button>
        </div>
      </div>

      {/* Tabel Input - TANPA BORDER SAMA SEKALI */}
      <div className="flex-1 overflow-auto p-2">
        <div className="overflow-x-auto min-w-[1000px]">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 w-10 text-center">#</th>
                <th className="px-3 py-2 w-32">Part Number</th>
                <th className="px-3 py-2">Nama Barang</th>
                <th className="px-3 py-2 w-24 text-center">Tipe</th>
                <th className="px-3 py-2 w-20 text-right">Qty</th>
                <th className="px-3 py-2 w-32 text-right">Harga Modal</th>
                <th className="px-3 py-2 w-32 text-right">Harga Jual</th>
                <th className="px-3 py-2 w-24">Via</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Resi/Tempo</th>
                <th className="px-3 py-2 w-24 text-center">Status</th>
                <th className="px-3 py-2 w-10 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-500">
                    <Package size={32} className="opacity-20 mx-auto mb-2" />
                    <p>Belum ada data input</p>
                  </td>
                </tr>
              ) : (
                currentRows.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-gray-700/20 ${
                      row.error ? 'bg-red-900/10' : ''
                    }`}
                  >
                    {/* Nomor */}
                    <td className="px-3 py-2 text-gray-500 font-mono text-center">
                      {startIndex + index + 1}
                    </td>

                    {/* Part Number dengan Autocomplete */}
                    <td className="px-3 py-2 relative">
                      <div className="relative">
                        <input
                          ref={el => inputRefs.current[index * 6] = el}
                          type="text"
                          className={`w-full bg-transparent px-2 py-1.5 text-sm font-mono text-gray-200 focus:outline-none focus:text-blue-400 ${
                            row.error ? 'text-red-400' : ''
                          }`}
                          value={row.partNumber}
                          onChange={(e) => handlePartNumberChange(row.id, e.target.value)}
                          placeholder="PN-XXXX"
                        />
                        {activeSearchIndex === index && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                            {suggestions.map((item, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-2 hover:bg-gray-700 cursor-pointer"
                                onClick={() => handleSelectItem(row.id, item)}
                              >
                                <div className="font-bold text-orange-400 font-mono text-sm">
                                  {item.partNumber}
                                </div>
                                <div className="text-gray-400 text-xs truncate">
                                  {item.name}
                                </div>
                                <div className="text-gray-500 text-[10px] mt-1">
                                  Stok: {item.quantity} | Rp{item.price?.toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Nama Barang */}
                    <td className="px-3 py-2">
                      <div className="text-gray-300 font-medium text-sm truncate max-w-[200px]">
                        {row.namaBarang || '-'}
                      </div>
                    </td>

                    {/* Tipe Operasi */}
                    <td className="px-3 py-2 text-center">
                      <select
                        className={`w-full bg-transparent px-2 py-1.5 text-xs focus:outline-none ${
                          row.operation === 'in' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'
                        }`}
                        value={row.operation}
                        onChange={(e) => updateRow(row.id, 'operation', e.target.value as 'in' | 'out')}
                      >
                        <option value="out" className="text-red-400">KELUAR</option>
                        <option value="in" className="text-green-400">MASUK</option>
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2">
                      <input
                        ref={el => inputRefs.current[(index * 6) + 2] = el}
                        type="number"
                        min="0"
                        step="1"
                        className={`w-full bg-transparent px-2 py-1.5 text-sm font-bold text-right font-mono focus:outline-none ${
                          row.operation === 'in' ? 'text-green-400' : 'text-red-400'
                        } ${row.error ? 'text-red-400' : ''}`}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </td>

                    {/* Harga Modal */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[10px]">Rp</span>
                        <input
                          type="number"
                          className="w-full bg-transparent px-2 py-1.5 text-sm font-mono text-right text-orange-300 focus:outline-none focus:text-orange-400"
                          value={row.hargaModal}
                          onChange={(e) => updateRow(row.id, 'hargaModal', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>

                    {/* Harga Jual */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[10px]">Rp</span>
                        <input
                          type="number"
                          className="w-full bg-transparent px-2 py-1.5 text-sm font-mono text-right text-blue-300 focus:outline-none focus:text-blue-400"
                          value={row.hargaJual}
                          onChange={(e) => updateRow(row.id, 'hargaJual', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>

                    {/* Via */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:text-blue-400"
                        value={row.via}
                        onChange={(e) => updateRow(row.id, 'via', e.target.value)}
                        placeholder="Shopee/Tokopedia"
                      />
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:text-blue-400"
                        value={row.customer}
                        onChange={(e) => updateRow(row.id, 'customer', e.target.value)}
                        placeholder="Nama customer"
                      />
                    </td>

                    {/* Resi/Tempo */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:text-blue-400"
                        value={row.resiTempo}
                        onChange={(e) => updateRow(row.id, 'resiTempo', e.target.value)}
                        placeholder="RESI123 / 30 hari"
                        title="Format: RESI / TEMPO"
                      />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center">
                        {row.isLoading ? (
                          <Loader2 size={14} className="animate-spin text-blue-400" />
                        ) : row.error ? (
                          <div className="relative group">
                            <AlertCircle size={14} className="text-red-400 cursor-help" />
                            <div className="absolute left-full top-0 ml-2 w-48 p-2 bg-red-900 text-red-100 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              {row.error}
                            </div>
                          </div>
                        ) : row.partNumber ? (
                          <div className="flex flex-col items-center">
                            <Check size={14} className="text-green-400" />
                            <span className="text-[9px] text-green-400 mt-0.5">Siap</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                            <span className="text-[9px] text-gray-500 mt-0.5">Kosong</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 hover:text-red-300 text-red-400 transition-colors"
                        title="Hapus baris"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer dengan Pagination */}
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">
            Menampilkan <span className="font-bold text-gray-200">{startIndex + 1}</span> - <span className="font-bold text-gray-200">{Math.min(startIndex + itemsPerPage, rows.length)}</span> dari <span className="font-bold text-gray-200">{rows.length}</span> baris
          </span>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-400/30 rounded"></div>
              <span className="text-gray-400 text-[10px]">Stok Masuk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400/30 rounded"></div>
              <span className="text-gray-400 text-[10px]">Stok Keluar</span>
            </div>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 hover:bg-gray-700/50 rounded text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-gray-200">
              Halaman {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-gray-700/50 rounded text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button
            onClick={saveAllRows}
            disabled={isSavingAll || filledRows.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingAll ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Simpan Semua Data
          </button>
        </div>
      </div>
    </div>
  );
};