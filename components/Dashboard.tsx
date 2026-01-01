// FILE: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { InventoryItem, Order, StockHistory } from '../types';
import { fetchInventoryPaginated, fetchInventoryStats } from '../services/supabaseService';
import { ItemForm } from './ItemForm';
import { DashboardStats } from './DashboardStats';
import { DashboardFilterBar } from './DashboardFilterBar';
import { InventoryList } from './InventoryList';
import { GlobalHistoryModal } from './GlobalHistoryModal';
import { ItemHistoryModal } from './ItemHistoryModal';

interface DashboardProps {
  items: InventoryItem[]; 
  orders: Order[];
  history: StockHistory[];
  refreshTrigger: number;
  onViewOrders: () => void;
  onAddNew: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  history, refreshTrigger, onDelete 
}) => {
  // --- STATE ---
  const [localItems, setLocalItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [debouncedBrand, setDebouncedBrand] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [debouncedApp, setDebouncedApp] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'empty'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Data States
  const [stats, setStats] = useState({ totalItems: 0, totalStock: 0, totalAsset: 0, todayIn: 0, todayOut: 0 });
  const [showHistoryDetail, setShowHistoryDetail] = useState<'in' | 'out' | null>(null);
  const [selectedItemHistory, setSelectedItemHistory] = useState<InventoryItem | null>(null);
  
  // Form States
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  // --- EFFECTS ---
  useEffect(() => {
    const timer = setTimeout(() => { 
        setDebouncedSearch(searchTerm); 
        setDebouncedBrand(brandSearch);
        setDebouncedApp(appSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, brandSearch, appSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    // @ts-ignore
    const { data, count } = await fetchInventoryPaginated(page, 50, debouncedSearch, filterType, debouncedBrand, debouncedApp);
    setLocalItems(data);
    setTotalPages(Math.ceil(count / 50));
    setLoading(false);
  }, [page, debouncedSearch, filterType, debouncedBrand, debouncedApp]);

  const loadStats = useCallback(async () => {
    const invStats = await fetchInventoryStats();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayIn = history
      .filter(h => h.type === 'in' && h.timestamp && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);
    const todayOut = history
      .filter(h => h.type === 'out' && h.timestamp && h.timestamp >= startOfDay.getTime())
      .reduce((acc, h) => acc + (Number(h.quantity) || 0), 0);

    setStats({ ...invStats, todayIn, todayOut });
  }, [history]);

  useEffect(() => { loadData(); }, [loadData, refreshTrigger]);
  useEffect(() => { loadStats(); }, [loadStats, refreshTrigger]);

  // --- HANDLERS ---
  const handleEditClick = (item: InventoryItem) => { setEditingItem(item); setShowItemForm(true); };
  const handleAddNewClick = () => { setEditingItem(undefined); setShowItemForm(true); };

  const handleFormSuccess = (updatedItem?: InventoryItem) => {
      if (updatedItem) {
          setLocalItems(currentItems => currentItems.map(item => item.id === updatedItem.id ? updatedItem : item));
          if (editingItem) {
             const diff = updatedItem.quantity - editingItem.quantity;
             setStats(prev => ({ ...prev, totalStock: prev.totalStock + diff }));
          }
          setShowItemForm(false);
      } else {
          setShowItemForm(false);
          loadData(); loadStats();
      }
  };

  // --- RENDER ---
  return (
    <div className="bg-gray-900 min-h-screen pb-24 font-sans text-gray-100">
      {showItemForm && ( 
        <ItemForm initialData={editingItem} onCancel={() => setShowItemForm(false)} onSuccess={handleFormSuccess} /> 
      )}

      {/* 1. STATS SECTION */}
      <DashboardStats stats={stats} onShowDetail={setShowHistoryDetail} />

      {/* 2. FILTER BAR */}
      <DashboardFilterBar 
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        brandSearch={brandSearch} setBrandSearch={setBrandSearch}
        appSearch={appSearch} setAppSearch={setAppSearch}
        filterType={filterType} setFilterType={setFilterType}
        viewMode={viewMode} setViewMode={setViewMode}
        onAddNew={handleAddNewClick}
      />

      {/* 3. INVENTORY LIST */}
      <div className="p-4">
        <InventoryList 
          loading={loading}
          items={localItems}
          viewMode={viewMode}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          onEdit={handleEditClick}
          onDelete={onDelete}
          onShowHistory={setSelectedItemHistory}
        />
      </div>

      {/* 4. MODALS */}
      {showHistoryDetail && (
        <GlobalHistoryModal type={showHistoryDetail} onClose={() => setShowHistoryDetail(null)} />
      )}

      {selectedItemHistory && (
        <ItemHistoryModal item={selectedItemHistory} onClose={() => setSelectedItemHistory(null)} />
      )}
    </div>
  );
};