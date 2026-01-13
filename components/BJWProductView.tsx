// FILE: src/components/BJWProductView.tsx
import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { BJWProduct } from '../types';
import { 
  fetchBJWProducts, 
  updateBJWProduct, 
  updateBJWPhotos, 
  deleteBJWPhoto 
} from '../services/supabaseService';

interface BJWProductViewProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BJWProductView: React.FC<BJWProductViewProps> = ({ onShowToast }) => {
  const [products, setProducts] = useState<BJWProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<BJWProduct>>({});
  const [photoEditing, setPhotoEditing] = useState<{ partNumber: string; photoKey: string } | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchBJWProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading BJW products:', error);
      onShowToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (product: BJWProduct) => {
    setEditingProduct(product.part_number);
    setEditedData({
      name: product.name,
      application: product.application,
      shelf: product.shelf,
      brand: product.brand
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditedData({});
  };

  const handleSaveEdit = async (partNumber: string) => {
    if (!editedData) return;

    setLoading(true);
    try {
      const success = await updateBJWProduct(partNumber, editedData);
      if (success) {
        onShowToast('Product updated successfully!');
        setEditingProduct(null);
        setEditedData({});
        await loadProducts();
      } else {
        onShowToast('Failed to update product', 'error');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      onShowToast('Failed to update product', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoEdit = (partNumber: string, photoKey: string, currentUrl?: string) => {
    setPhotoEditing({ partNumber, photoKey });
    setNewPhotoUrl(currentUrl || '');
  };

  const handlePhotoSave = async () => {
    if (!photoEditing) return;

    setLoading(true);
    try {
      const success = await updateBJWPhotos(photoEditing.partNumber, {
        [photoEditing.photoKey]: newPhotoUrl
      });

      if (success) {
        onShowToast('Photo updated successfully!');
        setPhotoEditing(null);
        setNewPhotoUrl('');
        await loadProducts();
      } else {
        onShowToast('Failed to update photo', 'error');
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      onShowToast('Failed to update photo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoDelete = async (partNumber: string, photoKey: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setLoading(true);
    try {
      const success = await deleteBJWPhoto(partNumber, photoKey);
      if (success) {
        onShowToast('Photo deleted successfully!');
        await loadProducts();
      } else {
        onShowToast('Failed to delete photo', 'error');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      onShowToast('Failed to delete photo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoSlot = (product: BJWProduct, photoIndex: number) => {
    const photoKey = `foto_${photoIndex}` as keyof typeof product.photos;
    const photoUrl = product.photos?.[photoKey] as string | undefined;
    const isEditing = photoEditing?.partNumber === product.part_number && photoEditing?.photoKey === photoKey;

    return (
      <div key={photoKey} className="relative group border border-gray-700 rounded-lg overflow-hidden bg-gray-800 h-32">
        {photoUrl ? (
          <>
            <img 
              src={photoUrl} 
              alt={`Photo ${photoIndex}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handlePhotoEdit(product.part_number, photoKey, photoUrl)}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handlePhotoDelete(product.part_number, photoKey)}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full text-white"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => handlePhotoEdit(product.part_number, photoKey)}
            className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-750 transition-colors"
          >
            <Plus size={24} />
            <span className="text-xs mt-1">Add Photo</span>
          </button>
        )}
      </div>
    );
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">BJW Product Management</h2>
        <button
          onClick={loadProducts}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>No products found</p>
          <p className="text-sm mt-2">Add products to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((product) => (
            <div 
              key={product.part_number} 
              className="bg-gray-800 rounded-lg p-6 border border-gray-700"
            >
              {/* Product Info Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    {product.part_number}
                  </h3>
                  {editingProduct === product.part_number ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(product.part_number)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
                        disabled={loading}
                      >
                        <Save size={18} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEdit(product)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                    {editingProduct === product.part_number ? (
                      <input
                        type="text"
                        value={editedData.name || ''}
                        onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="Product name"
                      />
                    ) : (
                      <p className="text-white">{product.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Application</label>
                    {editingProduct === product.part_number ? (
                      <input
                        type="text"
                        value={editedData.application || ''}
                        onChange={(e) => setEditedData({ ...editedData, application: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="Vehicle compatibility"
                      />
                    ) : (
                      <p className="text-white">{product.application}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Shelf</label>
                    {editingProduct === product.part_number ? (
                      <input
                        type="text"
                        value={editedData.shelf || ''}
                        onChange={(e) => setEditedData({ ...editedData, shelf: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="Storage location"
                      />
                    ) : (
                      <p className="text-white">{product.shelf}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Brand</label>
                    {editingProduct === product.part_number ? (
                      <input
                        type="text"
                        value={editedData.brand || ''}
                        onChange={(e) => setEditedData({ ...editedData, brand: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="Vehicle brand"
                      />
                    ) : (
                      <p className="text-white">{product.brand}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Photos Section */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Photos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((index) => 
                    renderPhotoSlot(product, index)
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Edit Modal */}
      {photoEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Edit Photo - {photoEditing.photoKey.replace('_', ' ')}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Photo URL</label>
              <input
                type="text"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter image URL"
              />
            </div>

            {newPhotoUrl && (
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Preview</label>
                <img 
                  src={newPhotoUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg border border-gray-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="gray">Invalid URL</text></svg>';
                  }}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handlePhotoSave}
                disabled={loading || !newPhotoUrl.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setPhotoEditing(null);
                  setNewPhotoUrl('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
