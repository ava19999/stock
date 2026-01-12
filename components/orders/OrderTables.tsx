// FILE: src/components/orders/OrderTables.tsx
import React, { useState } from 'react';
import { Order, OrderStatus, ReturRecord, InventoryItem } from '../../types';
import { formatDate, getOrderDetails, getStatusColor, getStatusLabel } from '../../utils/orderHelpers';
import { formatRupiah, generateId } from '../../utils';
import { Store, Edit3, ClipboardList, ChevronLeft, ChevronRight, Plus, ShoppingCart, Trash2, X, Loader2 } from 'lucide-react';
import { getItemByPartNumber, updateInventory, saveOrder } from '../../services/supabaseService';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (p: number) => void;
    currentCount: number;
    totalItems: number;
    startIndex: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, currentCount, totalItems, startIndex }) => (
    <div className="px-4 py-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
        <div>Menampilkan {startIndex + 1}-{Math.min(startIndex + 100, totalItems)} dari {totalItems} data</div>
        <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16}/></button>
            <span className="font-bold text-gray-200">Halaman {currentPage}</span>
            <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-1 rounded hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16}/></button>
        </div>
    </div>
);

// --- OFFLINE ORDER FORM ---
const TEMPO_OPTIONS = ['CASH', '3 BLN', '2 BLN', '1 BLN', 'NADIR'];

interface OfflineOrderItem {
    id: string;
    tanggal: string;
    pelanggan: string;
    tempo: string;
    partNumber: string;
    keteranganBarang: string;
    brand: string;
    aplikasi: string;
    qtyStock: number;
    qtyKeluar: number;
    hargaSatuan: number;
    totalHarga: number;
}

interface OfflineOrderFormProps {
    items: InventoryItem[];
    onRefresh?: () => void;
}

const OfflineOrderForm: React.FC<OfflineOrderFormProps> = ({ items, onRefresh }) => {
    const [orderItems, setOrderItems] = useState<OfflineOrderItem[]>([]);
    const [currentItem, setCurrentItem] = useState<Partial<OfflineOrderItem>>({
        tanggal: new Date().toISOString().split('T')[0],
        pelanggan: '',
        tempo: 'CASH',
        partNumber: '',
        keteranganBarang: '',
        brand: '',
        aplikasi: '',
        qtyStock: 0,
        qtyKeluar: 0,
        hargaSatuan: 0,
        totalHarga: 0,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter items based on search term
    const filteredItems = items.filter(item => 
        item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle part number selection
    const handlePartSelect = (item: InventoryItem) => {
        setCurrentItem(prev => ({
            ...prev,
            partNumber: item.partNumber,
            keteranganBarang: item.name,
            brand: item.brand,
            aplikasi: item.application,
            qtyStock: item.quantity,
            hargaSatuan: item.price,
            totalHarga: (prev.qtyKeluar || 0) * item.price,
        }));
        setSearchTerm(item.partNumber);
        setIsPartDropdownOpen(false);
    };

    // Handle qty keluar change
    const handleQtyKeluarChange = (value: number) => {
        const qty = Math.max(0, value);
        if (qty > (currentItem.qtyStock || 0)) {
            setValidationError('Qty Barang Keluar tidak boleh melebihi Qty Stock!');
        } else {
            setValidationError('');
        }
        setCurrentItem(prev => ({
            ...prev,
            qtyKeluar: qty,
            totalHarga: qty * (prev.hargaSatuan || 0),
        }));
    };

    // Handle harga satuan change
    const handleHargaSatuanChange = (value: number) => {
        setCurrentItem(prev => ({
            ...prev,
            hargaSatuan: value,
            totalHarga: (prev.qtyKeluar || 0) * value,
        }));
    };

    // Add item to order list
    const handleAddToOrder = () => {
        if (!currentItem.pelanggan || !currentItem.partNumber || !currentItem.qtyKeluar) {
            setValidationError('Harap lengkapi semua field yang diperlukan!');
            return;
        }
        if ((currentItem.qtyKeluar || 0) > (currentItem.qtyStock || 0)) {
            setValidationError('Qty Barang Keluar tidak boleh melebihi Qty Stock!');
            return;
        }

        const newItem: OfflineOrderItem = {
            id: generateId(),
            tanggal: currentItem.tanggal || new Date().toISOString().split('T')[0],
            pelanggan: currentItem.pelanggan || '',
            tempo: currentItem.tempo || 'CASH',
            partNumber: currentItem.partNumber || '',
            keteranganBarang: currentItem.keteranganBarang || '',
            brand: currentItem.brand || '',
            aplikasi: currentItem.aplikasi || '',
            qtyStock: currentItem.qtyStock || 0,
            qtyKeluar: currentItem.qtyKeluar || 0,
            hargaSatuan: currentItem.hargaSatuan || 0,
            totalHarga: currentItem.totalHarga || 0,
        };

        setOrderItems(prev => [...prev, newItem]);
        // Reset current item but keep pelanggan, tempo, and tanggal
        setCurrentItem({
            tanggal: currentItem.tanggal,
            pelanggan: currentItem.pelanggan,
            tempo: currentItem.tempo,
            partNumber: '',
            keteranganBarang: '',
            brand: '',
            aplikasi: '',
            qtyStock: 0,
            qtyKeluar: 0,
            hargaSatuan: 0,
            totalHarga: 0,
        });
        setSearchTerm('');
        setValidationError('');
    };

    // Remove item from order list
    const handleRemoveItem = (id: string) => {
        setOrderItems(prev => prev.filter(item => item.id !== id));
    };

    // Process order to "Terjual" tab
    const handleProcessToSold = async () => {
        if (orderItems.length === 0) {
            setValidationError('Tidak ada item untuk diproses!');
            return;
        }

        setIsProcessing(true);
        setValidationError('');

        try {
            // Process each item: update inventory and add barang_keluar
            for (const orderItem of orderItems) {
                // Get the current inventory item
                const inventoryItem = await getItemByPartNumber(orderItem.partNumber);
                if (!inventoryItem) {
                    console.error(`Item not found: ${orderItem.partNumber}`);
                    continue;
                }

                // Update inventory with transaction (this will automatically call addBarangKeluar)
                await updateInventory(inventoryItem, {
                    type: 'out',
                    qty: orderItem.qtyKeluar,
                    ecommerce: 'OFFLINE',
                    resiTempo: orderItem.tempo,
                    customer: orderItem.pelanggan,
                    price: orderItem.hargaSatuan,
                });
            }

            // Create a single order record for tracking
            // Format customer name to include tempo for proper parsing
            const customerNameWithMeta = `${orderItems[0].pelanggan} (Toko: ${orderItems[0].tempo}) (Via: OFFLINE)`;
            
            const orderForSave: Order = {
                id: generateId(),
                customerName: customerNameWithMeta,
                items: orderItems.map(item => {
                    const inventoryItem = items.find(i => i.partNumber === item.partNumber);
                    return {
                        id: inventoryItem?.id || item.id,
                        partNumber: item.partNumber,
                        name: item.keteranganBarang,
                        brand: item.brand,
                        application: item.aplikasi,
                        quantity: item.qtyStock,
                        price: item.hargaSatuan,
                        cartQuantity: item.qtyKeluar,
                        customPrice: item.hargaSatuan,
                        shelf: inventoryItem?.shelf || '',
                        ecommerce: 'OFFLINE',
                        imageUrl: inventoryItem?.imageUrl || '',
                        lastUpdated: Date.now(),
                        initialStock: inventoryItem?.initialStock || 0,
                        qtyIn: inventoryItem?.qtyIn || 0,
                        qtyOut: inventoryItem?.qtyOut || 0,
                        costPrice: inventoryItem?.costPrice || 0,
                        kingFanoPrice: inventoryItem?.price || 0, // Use regular price for offline orders
                    };
                }),
                totalAmount: orderItems.reduce((sum, item) => sum + item.totalHarga, 0),
                status: 'processing', // Mark as 'processing' (Terjual)
                timestamp: Date.now(),
            };

            await saveOrder(orderForSave);

            // Clear the form and refresh
            setOrderItems([]);
            setCurrentItem({
                tanggal: new Date().toISOString().split('T')[0],
                pelanggan: '',
                tempo: 'CASH',
                partNumber: '',
                keteranganBarang: '',
                brand: '',
                aplikasi: '',
                qtyStock: 0,
                qtyKeluar: 0,
                hargaSatuan: 0,
                totalHarga: 0,
            });
            setSearchTerm('');
            
            if (onRefresh) onRefresh();
            console.log('Pesanan offline berhasil diproses ke tab Terjual!');
        } catch (error) {
            console.error('Error processing offline order:', error);
            setValidationError('Gagal memproses pesanan. Silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    const totalAllItems = orderItems.reduce((sum, item) => sum + item.totalHarga, 0);

    return (
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 mb-4">
                <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                    <Plus size={20} />
                    Form Penjualan Offline
                </h3>

                {/* Input Form */}
                <div className="grid grid-cols-12 gap-3 mb-4 text-xs">
                    {/* Row 1: Date, Customer, Tempo */}
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Tanggal</label>
                        <input
                            type="date"
                            value={currentItem.tanggal}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, tanggal: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-gray-400 mb-1 font-medium">Pelanggan *</label>
                        <input
                            type="text"
                            value={currentItem.pelanggan}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, pelanggan: e.target.value }))}
                            placeholder="Nama pelanggan"
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Tempo *</label>
                        <select
                            value={currentItem.tempo}
                            onChange={(e) => setCurrentItem(prev => ({ ...prev, tempo: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        >
                            {TEMPO_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Part Number with searchable dropdown */}
                    <div className="col-span-2 relative">
                        <label className="block text-gray-400 mb-1 font-medium">Part No *</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsPartDropdownOpen(true);
                            }}
                            onFocus={() => setIsPartDropdownOpen(true)}
                            placeholder="Cari Part No"
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                        {isPartDropdownOpen && filteredItems.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                                {filteredItems.slice(0, 50).map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handlePartSelect(item)}
                                        className="px-2 py-1.5 hover:bg-purple-600 cursor-pointer text-gray-200 border-b border-gray-600 last:border-b-0"
                                    >
                                        <div className="font-bold">{item.partNumber}</div>
                                        <div className="text-[10px] text-gray-400">{item.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Auto-filled fields */}
                    <div className="col-span-3">
                        <label className="block text-gray-400 mb-1 font-medium">Keterangan Barang</label>
                        <input
                            type="text"
                            value={currentItem.keteranganBarang}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-3 mb-4 text-xs">
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Brand</label>
                        <input
                            type="text"
                            value={currentItem.brand}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Aplikasi</label>
                        <input
                            type="text"
                            value={currentItem.aplikasi}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Qty Stock Saat Ini</label>
                        <input
                            type="number"
                            value={currentItem.qtyStock}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Qty Barang Keluar *</label>
                        <input
                            type="number"
                            value={currentItem.qtyKeluar}
                            onChange={(e) => handleQtyKeluarChange(Number(e.target.value))}
                            min="0"
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Harga Satuan</label>
                        <input
                            type="number"
                            value={currentItem.hargaSatuan}
                            onChange={(e) => handleHargaSatuanChange(Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-400 mb-1 font-medium">Total Harga</label>
                        <input
                            type="text"
                            value={formatRupiah(currentItem.totalHarga || 0)}
                            readOnly
                            className="w-full px-2 py-1.5 bg-gray-600 border border-gray-600 rounded text-gray-400 cursor-not-allowed font-bold"
                        />
                    </div>
                </div>

                {validationError && (
                    <div className="mb-4 p-2 bg-red-900/30 border border-red-800 rounded text-red-400 text-xs">
                        {validationError}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleAddToOrder}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Tambah ke Pesanan
                    </button>
                    {orderItems.length > 0 && (
                        <button
                            onClick={handleProcessToSold}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <ShoppingCart size={16} />
                                    Proses ke Terjual ({orderItems.length} items)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Order Items List */}
            {orderItems.length > 0 && (
                <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                        <h4 className="text-sm font-bold text-gray-200">Daftar Item Pesanan</h4>
                        <div className="text-sm font-bold text-purple-400">
                            Total: {formatRupiah(totalAllItems)}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                                <tr>
                                    <th className="px-3 py-2">Tanggal</th>
                                    <th className="px-3 py-2">Pelanggan</th>
                                    <th className="px-3 py-2">Tempo</th>
                                    <th className="px-3 py-2">Part No</th>
                                    <th className="px-3 py-2">Keterangan</th>
                                    <th className="px-3 py-2">Brand</th>
                                    <th className="px-3 py-2">Aplikasi</th>
                                    <th className="px-3 py-2 text-right">Qty Keluar</th>
                                    <th className="px-3 py-2 text-right">Harga</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                    <th className="px-3 py-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 text-xs">
                                {orderItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-700/50">
                                        <td className="px-3 py-2 text-gray-300">{item.tanggal}</td>
                                        <td className="px-3 py-2 text-gray-300 font-medium">{item.pelanggan}</td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded text-[9px] font-bold border border-amber-800">
                                                {item.tempo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 font-mono text-gray-400">{item.partNumber}</td>
                                        <td className="px-3 py-2 text-gray-300">{item.keteranganBarang}</td>
                                        <td className="px-3 py-2 text-gray-400">{item.brand}</td>
                                        <td className="px-3 py-2 text-gray-400">{item.aplikasi}</td>
                                        <td className="px-3 py-2 text-right font-bold text-orange-400">{item.qtyKeluar}</td>
                                        <td className="px-3 py-2 text-right text-gray-400 font-mono">{formatRupiah(item.hargaSatuan)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-200 font-mono">{formatRupiah(item.totalHarga)}</td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-1 hover:bg-red-900/30 rounded text-red-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- TABEL PESANAN (BARU / TERJUAL) ---
interface OrderListViewProps {
    orders: Order[];
    items?: InventoryItem[];
    onUpdateStatus: (id: string, status: OrderStatus) => void;
    openReturnModal: (order: Order) => void;
    page: number;
    setPage: (p: number) => void;
    onRefresh?: () => void;
    activeTab?: string;
}

export const OrderListView: React.FC<OrderListViewProps> = ({ orders, items = [], onUpdateStatus, openReturnModal, page, setPage, onRefresh, activeTab }) => {
    const itemsPerPage = 100;
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const currentOrders = orders.slice(startIndex, startIndex + itemsPerPage);

    // If this is the pending (offline) tab, show the OfflineOrderForm instead
    if (activeTab === 'pending') {
        return <OfflineOrderForm items={items} onRefresh={onRefresh} />;
    }

    if (orders.length === 0) return <div className="p-8 text-center text-gray-500"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>Belum ada data pesanan</p></div>;

    return (
        <div className="flex-1 overflow-x-auto p-2 bg-gray-900">
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden min-w-[1000px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                        <tr><th className="px-3 py-2 w-28">Tanggal</th><th className="px-3 py-2 w-32">Resi / Toko</th><th className="px-3 py-2 w-24">Via</th><th className="px-3 py-2 w-32">Pelanggan</th><th className="px-3 py-2 w-28">Part No.</th><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right w-16">Qty</th><th className="px-3 py-2 text-right w-24">Satuan</th><th className="px-3 py-2 text-right w-24">Total</th><th className="px-3 py-2 text-center w-24">Status</th><th className="px-3 py-2 text-center w-32">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-xs">
                        {currentOrders.map(order => {
                            if(!order) return null;
                            const {cleanName, resiText, ecommerce, shopName} = getOrderDetails(order);
                            const isResi = !resiText.startsWith('#');
                            const dt = formatDate(order.timestamp);
                            const items = Array.isArray(order.items) ? order.items : [];
                            
                            return items.map((item, index) => {
                                const dealPrice = item.customPrice ?? item.price ?? 0;
                                const dealTotal = dealPrice * (item.cartQuantity || 0);
                                const hasCustomPrice = item.customPrice !== undefined && item.customPrice !== item.price;
                                return (
                                    <tr key={`${order.id}-${index}`} className="hover:bg-blue-900/10 transition-colors group">
                                        {index===0 && (<>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className="font-bold text-gray-200">{dt.date}</div><div className="text-[9px] text-gray-500 font-mono">{dt.time}</div></td>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 font-mono text-[10px] bg-gray-800 group-hover:bg-blue-900/10"><div className="flex flex-col gap-1"><span className={`px-1.5 py-0.5 rounded w-fit font-bold border ${isResi ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'text-gray-500 bg-gray-700 border-gray-600'}`}>{resiText}</span>{shopName!=='-' && <div className="flex items-center gap-1 text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded w-fit border border-gray-600"><Store size={8}/><span className="uppercase truncate max-w-[80px]">{shopName}</span></div>}</div></td>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 bg-gray-800 group-hover:bg-blue-900/10">{ecommerce!=='-'?<div className="px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-800 w-fit text-[9px] font-bold">{ecommerce}</div>:<span className="text-gray-600">-</span>}</td>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top border-r border-gray-700 font-medium text-gray-200 bg-gray-800 group-hover:bg-blue-900/10 truncate max-w-[120px]" title={cleanName}>{cleanName}</td>
                                        </>)}
                                        <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{item.partNumber||'-'}</td>
                                        <td className="px-3 py-2 align-top text-gray-300 font-medium truncate max-w-[180px]" title={item.name}>{item.name}</td>
                                        <td className="px-3 py-2 align-top text-right font-bold text-gray-300">{item.cartQuantity||0}</td>
                                        <td className="px-3 py-2 align-top text-right text-gray-500 font-mono text-[10px]"><div className={hasCustomPrice?"text-orange-400 font-bold":""}>{formatRupiah(dealPrice)}</div></td>
                                        <td className="px-3 py-2 align-top text-right font-bold text-gray-200 font-mono text-[10px]">{formatRupiah(dealTotal)}</td>
                                        {index===0 && (<>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase mb-1 shadow-sm ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</div><div className="text-[10px] font-extrabold text-purple-400">{formatRupiah(order.totalAmount||0)}</div></td>
                                            <td rowSpan={items.length} className="px-3 py-2 align-top text-center border-l border-gray-700 bg-gray-800 group-hover:bg-blue-900/10"><div className="flex flex-col gap-1 items-center">{order.status==='pending' && (<><button onClick={()=>onUpdateStatus(order.id, 'processing')} className="w-full py-1 bg-purple-700 text-white text-[9px] font-bold rounded hover:bg-purple-600 shadow-sm flex items-center justify-center gap-1">Proses</button><button onClick={()=>onUpdateStatus(order.id, 'cancelled')} className="w-full py-1 bg-gray-700 border border-gray-600 text-gray-400 text-[9px] font-bold rounded hover:bg-red-900/30 hover:text-red-400">Tolak</button></>)}{order.status==='processing' && (<button onClick={()=>openReturnModal(order)} className="w-full py-1 bg-orange-900/30 border border-orange-800 text-orange-400 text-[9px] font-bold rounded hover:bg-orange-800 flex items-center justify-center gap-1">Retur</button>)}</div></td>
                                        </>)}
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} currentCount={currentOrders.length} totalItems={orders.length} startIndex={startIndex} />
        </div>
    );
};

// --- TABEL HISTORY RETUR ---
interface ReturnHistoryViewProps {
    returRecords: ReturRecord[];
    openNoteModal: (retur: ReturRecord) => void;
    page: number;
    setPage: (p: number) => void;
}

export const ReturnHistoryView: React.FC<ReturnHistoryViewProps> = ({ returRecords, openNoteModal, page, setPage }) => {
    const itemsPerPage = 100;
    const totalPages = Math.ceil(returRecords.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const currentReturs = returRecords.slice(startIndex, startIndex + itemsPerPage);

    if (returRecords.length === 0) return <div className="p-8 text-center text-gray-500"><ClipboardList size={32} className="opacity-20 mx-auto mb-2" /><p>Belum ada data retur</p></div>;

    return (
        <div className="flex-1 overflow-x-auto p-2 bg-gray-900">
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden min-w-[1000px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-700">
                        <tr><th className="px-3 py-2 w-28">Tanggal</th><th className="px-3 py-2 w-32">Resi / Toko</th><th className="px-3 py-2 w-24">Via</th><th className="px-3 py-2 w-32">Pelanggan</th><th className="px-3 py-2 w-28">Part No.</th><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right w-16">Qty</th><th className="px-3 py-2 text-right w-24">Satuan</th><th className="px-3 py-2 text-right w-24">Total</th><th className="px-3 py-2 w-24 bg-red-900/20 text-red-400 border-l border-red-800">Tgl Retur</th><th className="px-3 py-2 text-center w-24 bg-red-900/20 text-red-400">Status</th><th className="px-3 py-2 text-center w-32">Ket</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-xs">
                        {currentReturs.map(retur => {
                            const dtOrder = formatDate(retur.tanggal_pemesanan||'');
                            const dtRetur = formatDate(retur.tanggal_retur);
                            return (
                                <tr key={`retur-${retur.id}`} className="hover:bg-red-900/10 transition-colors">
                                    <td className="px-3 py-2 align-top border-r border-gray-700"><div className="font-bold text-gray-200">{dtOrder.date}</div><div className="text-[9px] text-gray-500 font-mono">{dtOrder.time}</div></td>
                                    <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-400"><div className="flex flex-col gap-1"><span className="font-bold text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-800 w-fit">{retur.resi || '-'}</span>{retur.toko && <span className="uppercase text-gray-400 bg-gray-700 px-1 py-0.5 rounded w-fit">{retur.toko}</span>}</div></td>
                                    <td className="px-3 py-2 align-top">{retur.ecommerce ? <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 text-[9px] font-bold rounded border border-orange-800">{retur.ecommerce}</span> : '-'}</td>
                                    <td className="px-3 py-2 align-top font-medium text-gray-200 truncate max-w-[120px]" title={retur.customer}>{retur.customer||'Guest'}</td>
                                    <td className="px-3 py-2 align-top font-mono text-[10px] text-gray-500">{retur.part_number||'-'}</td>
                                    <td className="px-3 py-2 align-top text-gray-300 font-medium truncate max-w-[200px]" title={retur.nama_barang}>{retur.nama_barang}</td>
                                    <td className="px-3 py-2 align-top text-right font-bold text-red-400">-{retur.quantity}</td>
                                    <td className="px-3 py-2 align-top text-right font-mono text-[10px] text-gray-500">{formatRupiah(retur.harga_satuan)}</td>
                                    <td className="px-3 py-2 align-top text-right font-mono text-[10px] font-bold text-gray-300">{formatRupiah(retur.harga_total)}</td>
                                    <td className="px-3 py-2 align-top border-l border-red-800 bg-red-900/10"><div className="font-bold text-red-400 text-[10px]">{dtRetur.date}</div><div className="text-[9px] text-red-300/70 font-mono">{dtRetur.time}</div></td>
                                    <td className="px-3 py-2 align-top text-center bg-red-900/10"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${retur.status==='Full Retur'?'bg-red-900/30 text-red-400 border-red-800':'bg-orange-900/30 text-orange-400 border-orange-800'}`}>{retur.status||'Retur'}</span></td>
                                    <td className="px-3 py-2 align-top"><div className="flex items-start justify-between gap-1 group/edit"><div className="text-[10px] text-gray-500 italic truncate max-w-[100px]">{retur.keterangan||'-'}</div><button onClick={()=>openNoteModal(retur)} className="text-blue-400 hover:bg-blue-900/50 p-1 rounded opacity-0 group-hover/edit:opacity-100"><Edit3 size={12}/></button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} currentCount={currentReturs.length} totalItems={returRecords.length} startIndex={startIndex} />
        </div>
    );
};