// FILE: src/components/common/ImageGalleryModal.tsx
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ImageGalleryModalProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ 
  images, isOpen, onClose, productName 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  // Filter gambar yang valid (tidak kosong)
  const validImages = images.filter(img => img && img.trim() !== '');

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* Close Button */}
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
        <X size={24} />
      </button>

      <div className="relative w-full max-w-4xl flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        
        {/* Main Image Container */}
        <div className="relative w-full aspect-video max-h-[80vh] bg-black/50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
            {validImages.length > 0 ? (
                <img 
                    src={validImages[currentIndex]} 
                    alt={`${productName} - ${currentIndex + 1}`} 
                    className="w-full h-full object-contain"
                    onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}}
                />
            ) : (
                <div className="flex flex-col items-center text-gray-500">
                    <ImageIcon size={48} />
                    <span className="mt-2 text-sm">Tidak ada foto tersedia</span>
                </div>
            )}

            {/* Navigation Arrows */}
            {validImages.length > 1 && (
                <>
                    <button onClick={handlePrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 md:p-3 rounded-full hover:bg-black/80 transition-all border border-white/10">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={handleNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 md:p-3 rounded-full hover:bg-black/80 transition-all border border-white/10">
                        <ChevronRight size={24} />
                    </button>
                </>
            )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center space-y-1">
            <h3 className="text-white font-bold text-lg">{productName}</h3>
            {validImages.length > 0 && (
                <p className="text-gray-400 text-sm">
                    Foto {currentIndex + 1} dari {validImages.length}
                </p>
            )}
        </div>

        {/* Thumbnails (Optional) */}
        {validImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto max-w-full px-2 py-1 scrollbar-hide">
                {validImages.map((img, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-12 h-12 md:w-16 md:h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-blue-500 opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="thumb" />
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};