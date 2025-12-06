// FILE: src/components/ItemForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import { InventoryFormData, InventoryItem } from '../types';
import { analyzeInventoryImage, generateDescription } from '../services/geminiService';
import { compressImage } from '../utils'; // Import fungsi kompresi baru
import { Camera, Upload, Sparkles, X, Save, Loader2 } from 'lucide-react';

interface ItemFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormData) => void;
  onCancel: () => void;
}

export const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    partNumber: '',
    name: '',
    description: '',
    price: 0,
    quantity: 0,
    shelf: '',
    imageUrl: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        partNumber: initialData.partNumber,
        name: initialData.name,
        description: initialData.description,
        price: initialData.price,
        quantity: initialData.quantity,
        shelf: initialData.shelf,
        imageUrl: initialData.imageUrl,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let processedValue: string | number = value;

    // Logic khusus untuk Rak: Huruf Besar & Hapus Tanda Hubung
    if (name === 'shelf') {
        processedValue = value.toUpperCase().replace(/-/g, ' ');
    } else if (name === 'price' || name === 'quantity') {
        processedValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Baca file
    const reader = new FileReader();
    reader.onloadend = async () => {
      const originalBase64 = reader.result as string;

      // 1. Kompresi Gambar sebelum disimpan ke State
      try {
        const compressedBase64 = await compressImage(originalBase64);
        setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
        
        // 2. Kirim gambar yang sudah dikompres ke AI (lebih hemat data)
        if (process.env.API_KEY) {
          setIsAnalyzing(true);
          try {
            const analysis = await analyzeInventoryImage(compressedBase64);
            if (analysis.suggestedName || analysis.suggestedDescription) {
               setFormData(prev => ({
                 ...prev,
                 name: analysis.suggestedName || prev.name,
                 description: analysis.suggestedDescription || prev.description,
                 // Normalize suggested shelf as well
                 shelf: analysis.suggestedShelfCategory ? analysis.suggestedShelfCategory.toUpperCase().replace(/-/g, ' ') : prev.shelf
               }));
            }
          } catch (error) {
            console.error("AI Analysis failed", error);
          } finally {
            setIsAnalyzing(false);
          }
        }
      } catch (error) {
        console.error("Gagal memproses gambar", error);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) return;
    setIsGeneratingDesc(true);
    try {
      const desc = await generateDescription(formData.name, formData.partNumber);
      if (desc) {
        setFormData(prev => ({ ...prev, description: desc }));
      }
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-3xl mx-auto overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">
          {initialData ? 'Edit Barang' : 'Tambah Barang Baru'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Image Section */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-3">
             <label className="block text-sm font-medium text-gray-700 mb-1">Foto Barang</label>
             <div 
               className="relative aspect-square w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
               onClick={() => fileInputRef.current?.click()}
             >
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-xs text-gray-500">Klik untuk upload foto</p>
                  </div>
                )}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                    <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                    <span className="text-xs font-medium text-blue-600">AI Menganalisis...</span>
                  </div>
                )}
             </div>
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept="image/*"
               onChange={handleImageUpload}
             />
             <p className="text-xs text-gray-500 text-center">
               Upload foto untuk auto-isi data via AI
             </p>
          </div>

          <div className="w-full md:w-2/3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Part</label>
                <input
                  type="text"
                  name="partNumber"
                  required
                  value={formData.partNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Contoh: 15400-RAF-T01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Rak</label>
                <input
                  type="text"
                  name="shelf"
                  required
                  value={formData.shelf}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase"
                  placeholder="Contoh: RAK A01"
                />
                <p className="text-xs text-gray-400 mt-1">Format: HURUF BESAR (tanpa strip)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Contoh: Filter Oli Honda Jazz..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga (IDR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    required
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Stok</label>
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  required
                  value={formData.quantity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={!formData.name || isGeneratingDesc}
                  className="text-xs flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingDesc ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>}
                  Generate Deskripsi AI
                </button>
              </div>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                placeholder="Deskripsi detail barang..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors flex items-center"
          >
            <Save size={18} className="mr-2" />
            Simpan Data
          </button>
        </div>
      </form>
    </div>
  );
};