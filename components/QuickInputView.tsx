// FILE: src/components/QuickInputView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { InventoryItem } from '../types';
import { updateInventory, getItemByPartNumber } from '../services/supabaseService';
import { createEmptyRow, checkIsRowComplete } from './quickInput/quickInputUtils';
import { QuickInputRow } from './quickInput/types';
import { QuickInputHeader } from './quickInput/QuickInputHeader';
import { QuickInputFooter } from './quickInput/QuickInputFooter';
import { QuickInputTable } from './quickInput/QuickInputTable';

interface QuickInputViewProps {
  items: InventoryItem[];
  onRefresh?: () => void;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const QuickInputView: React.FC<QuickInputViewProps> = ({ items, onRefresh, showToast }) => {
  // --- STATE ---
  const [rows, setRows] = useState<QuickInputRow[]>([]);
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('out');
  
  const itemsPerPage = 100;
  const COLUMNS_COUNT = 8; 
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (rows.length === 0) {
      const initialRows = Array.from({ length: 10 }).map((_, index) => ({
          ...createEmptyRow(index + 1),
          operation: activeTab,
          totalModal: 0 // Inisialisasi field totalModal
      }));
      setRows(initialRows);
      setTimeout(() => { inputRefs.current[0]?.focus(); }, 100);
    }
  }, []);

  // --- HANDLERS ---
  const handleTabChange = (tab: 'in' | 'out') => {
      setActiveTab(tab);
      setRows(prev => prev.map(row => ({ ...row, operation: tab })));
      setTimeout(() => { inputRefs.current[0]?.focus(); }, 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (suggestions.length > 0 && activeSearchIndex !== null) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
            return;
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                e.preventDefault();
                handleSelectItem(id, suggestions[highlightedIndex]);
                return;
            }
        }
    }
    const rowIndex = rows.findIndex(r => r.id === id);
    handleGridKeyDown(e, rowIndex * COLUMNS_COUNT + 0); 
  };

  const handleGridKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    let nextIndex = currentIndex;
    const totalInputs = rows.length * COLUMNS_COUNT;

    switch (e.key) {
        case 'ArrowRight':
            if ((e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
                e.preventDefault();
                nextIndex = currentIndex + 1;
            }
            break;
        case 'ArrowLeft':
            if ((e.target as HTMLInputElement).selectionStart === 0) {
                e.preventDefault();
                nextIndex = currentIndex - 1;
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            nextIndex = currentIndex - COLUMNS_COUNT;
            break;
        case 'ArrowDown':
            e.preventDefault();
            nextIndex = currentIndex + COLUMNS_COUNT;
            break;
        case 'Enter':
            e.preventDefault();
            nextIndex = currentIndex + 1;
            break;
        default:
            return;
    }

    if (nextIndex >= 0 && nextIndex < totalInputs) {
        const target = inputRefs.current[nextIndex];
        if (target) {
            target.focus();
            setTimeout(() => target.select(), 0); 
        }
    }
  };

  const handlePartNumberChange = (id: number, value: string) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, partNumber: value.toUpperCase() } : row));
    const rowIndex = rows.findIndex(r => r.id === id);
    if (value.length >= 2) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        const lowerVal = value.toLowerCase();
        const matches = items.filter(item => item.partNumber && item.partNumber.toLowerCase().includes(lowerVal)).slice(0, 10);
        setSuggestions(matches);
        setActiveSearchIndex(rowIndex);
        setHighlightedIndex(-1);
      }, 300);
    } else {
      setSuggestions([]);
      setActiveSearchIndex(null);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectItem = (id: number, item: InventoryItem) => {
    setRows(prev => prev.map(row => row.id === id ? {
        ...row, 
        partNumber: item.partNumber, 
        namaBarang: item.name, 
        hargaModal: item.costPrice || 0, 
        hargaJual: item.price || 0, 
        error: undefined,
        // Set Total Modal = Harga Satuan * 1 (karena default qty di row baru biasanya 0 atau 1)
        totalModal: (item.costPrice || 0) * (row.quantity || 1)
    } : row));
    setSuggestions([]);
    setActiveSearchIndex(null);
    setHighlightedIndex(-1);
    
    const rowIndex = rows.findIndex(r => r.id === id);
    const qtyInputIndex = (rowIndex * COLUMNS_COUNT) + 2;
    setTimeout(() => {
        inputRefs.current[qtyInputIndex]?.focus();
        inputRefs.current[qtyInputIndex]?.select();
    }, 50);
  };

  const addNewRow = () => {
    const maxId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) : 0;
    setRows(prev => [...prev, { ...createEmptyRow(maxId + 1), operation: activeTab, totalModal: 0 }]);
    const newTotalPages = Math.ceil((rows.length + 1) / itemsPerPage);
    if (newTotalPages > currentPage) setCurrentPage(newTotalPages);
    
    setTimeout(() => { 
        const newIndex = rows.length * COLUMNS_COUNT; 
        inputRefs.current[newIndex]?.focus(); 
    }, 100);
  };

  const removeRow = (id: number) => { setRows(prev => prev.filter(row => row.id !== id)); };

  // UPDATE: Mendukung partial updates (object) untuk update banyak field sekaligus
  const updateRow = (id: number, updates: Partial<QuickInputRow> | keyof QuickInputRow, value?: any) => {
    setRows(prev => prev.map(row => {
        if (row.id !== id) return row;
        
        if (typeof updates === 'string') {
            // Cara lama (single field)
            return { ...row, [updates]: value, error: undefined };
        } else {
            // Cara baru (multiple fields object)
            return { ...row, ...updates, error: undefined };
        }
    }));
  };

  const saveRow = async (row: QuickInputRow) => {
    if (!checkIsRowComplete(row)) { updateRow(row.id, 'error', 'Lengkapi semua kolom!'); return false; }
    updateRow(row.id, 'isLoading', true);

    try {
      const existingItem = await getItemByPartNumber(row.partNumber);
      if (!existingItem) {
        updateRow(row.id, 'error', `Item tidak ditemukan`);
        updateRow(row.id, 'isLoading', false);
        return false;
      }
      
      const transactionData = { type: row.operation, qty: row.quantity, ecommerce: row.via, resiTempo: row.resiTempo, customer: row.customer, price: row.operation === 'in' ? row.hargaModal : row.hargaJual };
      const updatedItem = await updateInventory({
        ...existingItem,
        name: row.namaBarang,
        quantity: row.operation === 'in' ? existingItem.quantity + row.quantity : Math.max(0, existingItem.quantity - row.quantity),
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
    const rowsToSave = rows.filter(row => checkIsRowComplete(row));
    if (rowsToSave.length === 0) {
        setIsSavingAll(false);
        if (showToast) showToast('Isi lengkap data sebelum menyimpan!', 'error');
        return;
    }
    const results = await Promise.all(rowsToSave.map(row => saveRow(row)));
    const successCount = results.filter(r => r).length;
    
    if (showToast && successCount > 0) showToast(`${successCount} item berhasil disimpan`, 'success');
    if (successCount > 0 && onRefresh) onRefresh();
    
    const remainingRows = rows.length - successCount;
    if (remainingRows === 0) {
       const initialRows = Array.from({ length: 10 }).map((_, index) => ({
           ...createEmptyRow(index + 1), 
           operation: activeTab,
           totalModal: 0 
       }));
       setRows(initialRows);
    }
    setIsSavingAll(false);
  };

  const validRowsCount = rows.filter(r => checkIsRowComplete(r)).length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = rows.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(rows.length / itemsPerPage);

  return (
    <div className="bg-gray-800 min-h-[80vh] flex flex-col overflow-hidden text-gray-100">
      <QuickInputHeader 
        onAddRow={addNewRow} 
        onSaveAll={saveAllRows} 
        isSaving={isSavingAll} 
        validCount={validRowsCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <QuickInputTable
        currentRows={currentRows}
        startIndex={startIndex}
        activeSearchIndex={activeSearchIndex}
        suggestions={suggestions}
        inputRefs={inputRefs}
        onPartNumberChange={handlePartNumberChange}
        onSelectItem={handleSelectItem}
        onUpdateRow={updateRow}
        onRemoveRow={removeRow}
        highlightedIndex={highlightedIndex}
        onSearchKeyDown={handleSearchKeyDown}
        onGridKeyDown={handleGridKeyDown}
      />

      <QuickInputFooter 
        totalRows={rows.length} 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
    </div>
  );
};