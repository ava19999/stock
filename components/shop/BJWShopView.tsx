// FILE: src/components/shop/BJWShopView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { BJWItem } from '../../types';
import { fetchBJWItemsPaginated, updateBJWItem, saveFoto, initializeBJWSampleData } from '../../services/supabaseService';
import { Package, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import { ShopFilterBar } from './ShopFilterBar';
import { ShopPagination } from './ShopPagination';

interface BJWShopViewProps {
  isAdmin: boolean;
}

export const BJWShopView: React.FC<BJWShopViewProps> = ({ isAdmin }) => {
  // State Data
  const [bjwItems, setBJWItems] = useState<BJWItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State Filter & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [partNumberSearch, setPartNumberSearch] = useState('');
  const [debouncedPartNumber, setDebouncedPartNumber] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [debouncedBrand, setDebouncedBrand] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [debouncedApplication, setDebouncedApplication] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BJWItem>>({});
  
  const limit = 50;

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchTerm);
      setDebouncedPartNumber(partNumberSearch);
      setDebouncedName(nameSearch);
      setDebouncedBrand(brandSearch);
      setDebouncedApplication(applicationSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, partNumberSearch, nameSearch, brandSearch, applicationSearch]);

  // Initialize sample data on first load
  useEffect(() => {
    initializeBJWSampleData();
  }, []);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data, count } = await fetchBJWItemsPaginated(
          page,
          limit,
          debouncedSearch,
          debouncedPartNumber,
          debouncedName,
          debouncedBrand,
          debouncedApplication
        );
        
        setBJWItems(data || []);
        const safeCount = count || 0;
        setTotalPages(safeCount > 0 ? Math.ceil(safeCount / limit) : 1);
      } catch (err) {
        console.error("Failed to load BJW items:", err);
        setBJWItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page, debouncedSearch, debouncedPartNumber, debouncedName, debouncedBrand, debouncedApplication]);

  // Edit handlers
  const handleEditClick = (item: BJWItem) => {
    setEditingItem(item.partNumber);
    setEditForm({
      name: item.name,
      brand: item.brand,
      application: item.application,
      shelf: item.shelf,
      photoUrl: item.photoUrl
    });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleSaveEdit = async (partNumber: string) => {
    try {
      await updateBJWItem(partNumber, editForm);
      
      // If photo was updated, save it to foto table
      if (editForm.photoUrl) {
        await saveFoto(partNumber, editForm.photoUrl);
      }
      
      // Reload data
      const { data } = await fetchBJWItemsPaginated(
        page,
        limit,
        debouncedSearch,
        debouncedPartNumber,
        debouncedName,
        debouncedBrand,
        debouncedApplication
      );
      setBJWItems(data || []);
      
      setEditingItem(null);
      setEditForm({});
    } catch (error) {
      console.error("Failed to save item:", error);
      alert("Gagal menyimpan perubahan");
    }
  };

  const handleFormChange = (field: keyof BJWItem, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading && bjwItems.length === 0) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-2xl p-3 h-80 animate-pulse">
              <div className="w-full aspect-square bg-gray-700 rounded-xl mb-3"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full pb-20 bg-gray-900 text-gray-100 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* FILTER BAR */}
        <div className="sticky top-0 z-10 bg-gray-900 px-4 py-2 border-b border-gray-800 shadow-md">
          <ShopFilterBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            partNumberSearch={partNumberSearch}
            setPartNumberSearch={setPartNumberSearch}
            nameSearch={nameSearch}
            setNameSearch={setNameSearch}
            brandSearch={brandSearch}
            setBrandSearch={setBrandSearch}
            applicationSearch={applicationSearch}
            setApplicationSearch={setApplicationSearch}
            isAdmin={isAdmin}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>

        {/* ITEMS LIST */}
        <div className="p-4 pb-24">
          {bjwItems.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Package size={48} className="mb-2 opacity-50"/>
              <p>Barang tidak ditemukan</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bjwItems.map((item) => (
                    <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all shadow-lg">
                      {editingItem === item.partNumber ? (
                        // EDIT MODE
                        <div className="p-4">
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Part Number</label>
                            <input
                              type="text"
                              value={item.partNumber}
                              disabled
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-300"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Name</label>
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => handleFormChange('name', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Brand</label>
                            <input
                              type="text"
                              value={editForm.brand || ''}
                              onChange={(e) => handleFormChange('brand', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Application</label>
                            <input
                              type="text"
                              value={editForm.application || ''}
                              onChange={(e) => handleFormChange('application', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Shelf (Rak)</label>
                            <input
                              type="text"
                              value={editForm.shelf || ''}
                              onChange={(e) => handleFormChange('shelf', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="mb-4">
                            <label className="text-xs text-gray-400 mb-1 block">Photo URL</label>
                            <input
                              type="text"
                              value={editForm.photoUrl || ''}
                              onChange={(e) => handleFormChange('photoUrl', e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(item.partNumber)}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                              <Save size={16} /> Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE
                        <>
                          {/* Photo */}
                          <div className="aspect-[4/3] relative bg-gray-700">
                            {item.photoUrl ? (
                              <img 
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {(e.target as HTMLImageElement).style.display='none'}}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <ImageIcon size={48} />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="p-4">
                            <div className="mb-2">
                              <span className="text-xs font-bold text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800 inline-block mb-2">
                                {item.partNumber}
                              </span>
                            </div>
                            
                            <h3 className="text-base font-bold text-gray-200 mb-2 min-h-[2.5em]">
                              {item.name}
                            </h3>
                            
                            <div className="space-y-1 text-sm mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">Brand:</span>
                                <span className="text-gray-300 font-semibold">{item.brand}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">Application:</span>
                                <span className="text-blue-400 text-xs">{item.application}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-20">Shelf:</span>
                                <span className="text-green-400 font-bold">{item.shelf}</span>
                              </div>
                            </div>
                            
                            {isAdmin && (
                              <button
                                onClick={() => handleEditClick(item)}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                              >
                                <Edit2 size={16} /> Edit
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // LIST VIEW
                <div className="flex flex-col gap-3">
                  {bjwItems.map((item) => (
                    <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4 hover:border-gray-600 transition-all shadow-sm">
                      {editingItem === item.partNumber ? (
                        // EDIT MODE - LIST
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Part Number</label>
                            <input type="text" value={item.partNumber} disabled className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-300" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Name</label>
                            <input type="text" value={editForm.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Brand</label>
                            <input type="text" value={editForm.brand || ''} onChange={(e) => handleFormChange('brand', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Application</label>
                            <input type="text" value={editForm.application || ''} onChange={(e) => handleFormChange('application', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Shelf</label>
                            <input type="text" value={editForm.shelf || ''} onChange={(e) => handleFormChange('shelf', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Photo URL</label>
                            <input type="text" value={editForm.photoUrl || ''} onChange={(e) => handleFormChange('photoUrl', e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:border-blue-500 focus:outline-none" />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <button onClick={() => handleSaveEdit(item.partNumber)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all flex items-center justify-center gap-2 text-sm font-bold">
                              <Save size={16} /> Save
                            </button>
                            <button onClick={handleCancelEdit} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-all flex items-center justify-center gap-2 text-sm font-bold">
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE - LIST
                        <>
                          <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <ImageIcon size={32} />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <span className="text-xs font-bold text-gray-400 font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800 inline-block">
                                {item.partNumber}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-gray-200 mb-2">{item.name}</h3>
                            <div className="flex flex-wrap gap-2 text-sm">
                              <span className="text-gray-500">Brand: <span className="text-gray-300 font-semibold">{item.brand}</span></span>
                              <span className="text-gray-500">App: <span className="text-blue-400">{item.application}</span></span>
                              <span className="text-gray-500">Shelf: <span className="text-green-400 font-bold">{item.shelf}</span></span>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <button onClick={() => handleEditClick(item)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all flex items-center gap-2 text-sm font-bold">
                              <Edit2 size={16} /> Edit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!loading && bjwItems.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <ShopPagination 
                    page={page}
                    totalPages={totalPages}
                    setPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
