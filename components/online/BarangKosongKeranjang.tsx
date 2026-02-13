import React, { useEffect, useState } from 'react';
import { fetchOrderSupplier } from '../../services/supabaseService';

const BarangKosongKeranjang: React.FC<{ store: string | null }> = ({ store }) => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (store !== 'bjw') {
      setOrders([]);
      return;
    }
    fetchOrderSupplier(store).then(data => {
      console.log('DEBUG fetchOrderSupplier store:', store);
      console.log('DEBUG fetchOrderSupplier result:', data);
      setOrders(data);
      if (!data || data.length === 0) {
        // Coba fetch semua data tanpa filter store untuk debug
        fetchOrderSupplier('').then(allData => {
          console.log('DEBUG fetchOrderSupplier ALL:', allData);
        });
      }
    });
  }, [store]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-green-900/40 mt-4">
      <h3 className="text-green-300 font-bold mb-2 text-sm">Keranjang Order Supplier (DEBUG)</h3>
      <div className="text-xs text-yellow-300 mb-2">Store aktif: <b>{store || '-'}</b></div>
      {store !== 'bjw' && <div className="text-xs text-red-400 mb-2">Keranjang supplier hanya untuk BJW</div>}
      <div className="text-xs text-yellow-300 mb-2">(Cek console untuk hasil fetch ALL jika keranjang tetap kosong)</div>
      <pre className="bg-gray-800 text-green-200 text-xs p-2 rounded mb-4 max-h-40 overflow-auto">{JSON.stringify(orders, null, 2)}</pre>
      {orders.length === 0 && <div className="text-red-400 text-xs">Tidak ada data order_supplier untuk store: {store}</div>}
      {orders.map(order => (
        <div key={order.id} className="mb-3 border-b border-green-900/20 pb-2">
          <div className="text-xs font-semibold text-green-200">Supplier: {order.supplier}</div>
          <div className="text-xs text-gray-300">Tanggal: {order.created_at}</div>
          <ul className="ml-4 mt-1">
            <li className="text-xs text-gray-100">
              <span className="font-mono text-blue-300">{order.part_number}</span> - {order.name} <span className="text-green-400">x{order.qty}</span>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-green-900/40 mt-4">
      <h3 className="text-green-300 font-bold mb-2 text-sm">Keranjang Order Supplier</h3>
      {orders.map(order => (
        <div key={order.id} className="mb-3 border-b border-green-900/20 pb-2">
          <div className="text-xs font-semibold text-green-200">Supplier: {order.supplier}</div>
          <div className="text-xs text-gray-300">Tanggal: {order.created_at}</div>
          <ul className="ml-4 mt-1">
            <li className="text-xs text-gray-100">
              <span className="font-mono text-blue-300">{order.part_number}</span> - {order.name} <span className="text-green-400">x{order.qty}</span>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
};

export default BarangKosongKeranjang;
