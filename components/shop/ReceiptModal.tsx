// FILE: src/components/shop/ReceiptModal.tsx
import React, { useRef } from 'react';
import { CartItem } from '../../types';
import { formatRupiah } from '../../utils';
import { X, Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    customerName: string;
    tempo: string;
    note: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ 
    isOpen, onClose, cart, customerName, tempo, note 
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const cartTotal = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.price) * item.cartQuantity), 0);
    const currentDate = new Date().toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const generateImage = async () => {
        if (!receiptRef.current) return null;
        
        try {
            const canvas = await html2canvas(receiptRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
            });
            return canvas.toDataURL('image/jpeg', 0.95);
        } catch (error) {
            console.error('Error generating receipt image:', error);
            return null;
        }
    };

    const handleDownload = async () => {
        const imageData = await generateImage();
        if (!imageData) return;

        const link = document.createElement('a');
        link.download = `resi-${customerName.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
        link.href = imageData;
        link.click();
    };

    const handleShare = async () => {
        const imageData = await generateImage();
        if (!imageData) return;

        // Convert base64 to blob
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], `resi-${customerName}.jpg`, { type: 'image/jpeg' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'Resi Pesanan',
                    text: `Resi pesanan untuk ${customerName}`,
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback: copy to clipboard or open WhatsApp Web
            const whatsappText = encodeURIComponent(`Resi Pesanan\nCustomer: ${customerName}\nTotal: ${formatRupiah(cartTotal)}`);
            window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in zoom-in-95 border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="bg-gray-900 px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-100">Resi Pesanan</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20}/>
                    </button>
                </div>

                {/* Receipt Content */}
                <div ref={receiptRef} className="bg-white p-6">
                    {/* Header */}
                    <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">RESI PESANAN</h1>
                        <p className="text-sm text-gray-600">{currentDate}</p>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-600 font-semibold">Customer:</p>
                                <p className="text-gray-900 font-bold">{customerName}</p>
                            </div>
                            {tempo && (
                                <div>
                                    <p className="text-gray-600 font-semibold">Tempo:</p>
                                    <p className="text-gray-900 font-bold">{tempo}</p>
                                </div>
                            )}
                        </div>
                        {note && (
                            <div className="mt-3">
                                <p className="text-gray-600 font-semibold text-sm">Note:</p>
                                <p className="text-gray-900 text-sm">{note}</p>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="mb-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="text-left py-2 font-bold text-gray-900">Barang</th>
                                    <th className="text-center py-2 font-bold text-gray-900">Qty</th>
                                    <th className="text-right py-2 font-bold text-gray-900">Harga</th>
                                    <th className="text-right py-2 font-bold text-gray-900">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, index) => {
                                    const itemPrice = item.customPrice ?? item.price;
                                    const itemTotal = itemPrice * item.cartQuantity;
                                    return (
                                        <tr key={item.id} className="border-b border-gray-300">
                                            <td className="py-3">
                                                <p className="font-semibold text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-600">{item.partNumber}</p>
                                            </td>
                                            <td className="text-center font-bold text-gray-900">{item.cartQuantity}</td>
                                            <td className="text-right text-gray-900">{formatRupiah(itemPrice)}</td>
                                            <td className="text-right font-bold text-gray-900">{formatRupiah(itemTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Total */}
                    <div className="border-t-2 border-gray-800 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                            <span className="text-2xl font-bold text-gray-900">{formatRupiah(cartTotal)}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center text-xs text-gray-600 border-t border-gray-300 pt-4">
                        <p>Terima kasih atas pesanan Anda</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gray-900 border-t border-gray-700 grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleDownload}
                        className="py-3 px-4 bg-gray-700 text-gray-100 font-bold rounded-xl hover:bg-gray-600 flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Download
                    </button>
                    <button 
                        onClick={handleShare}
                        className="py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                        <Share2 size={18} />
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
};
