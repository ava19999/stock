// FILE: src/components/kosongan/BarangKosong.tsx
import React from 'react';
import { Package, ShoppingBag, Archive } from 'lucide-react';

export const BarangKosong: React.FC = () => {
  // Dummy table columns for barang
  const columns = [
    'Kode Barang',
    'Nama Barang',
    'Kategori',
    'Stok',
    'Satuan',
    'Harga',
    'Lokasi'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <Package className="text-orange-500" size={32} />
          Barang Kosong
        </h1>
        <p className="text-gray-400 mt-2">Placeholder menu untuk tabel barang (dummy)</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-orange-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-500/20 p-3 rounded-lg">
              <Package className="text-orange-500" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Total Barang</h3>
          <p className="text-3xl font-bold text-gray-100">0</p>
          <p className="text-xs text-gray-500 mt-2">Item terdaftar</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-green-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <ShoppingBag className="text-green-500" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Barang Tersedia</h3>
          <p className="text-3xl font-bold text-gray-100">0</p>
          <p className="text-xs text-gray-500 mt-2">Stok > 0</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500/20 p-3 rounded-lg">
              <Archive className="text-red-500" size={24} />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Barang Habis</h3>
          <p className="text-3xl font-bold text-gray-100">0</p>
          <p className="text-xs text-gray-500 mt-2">Stok = 0</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Cari barang..."
            className="bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
          />
          <select className="bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option>Semua Kategori</option>
            <option>Elektronik</option>
            <option>Furniture</option>
            <option>Alat Tulis</option>
          </select>
        </div>
        <button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Package size={18} />
          Tambah Barang
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Empty State */}
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-gray-700/50 p-6 rounded-full">
                      <Package className="text-gray-500" size={48} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">
                        Belum Ada Data Barang
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Tabel ini adalah placeholder untuk data barang.
                        Siap diintegrasikan dengan database di masa depan.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-gradient-to-br from-orange-900/20 to-yellow-900/20 border border-orange-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Persiapan untuk Masa Depan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Struktur tabel sudah disiapkan untuk data barang lengkap</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Fitur pencarian dan filter kategori sudah tersedia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Tombol tambah barang untuk input data baru</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Statistik overview untuk monitoring cepat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Desain responsif untuk semua perangkat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">•</span>
              <span>Siap untuk integrasi Supabase</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
