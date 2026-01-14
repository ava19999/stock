// FILE: src/components/kosongan/TabelTransaksi.tsx
import React from 'react';
import { Table, FileText, Download } from 'lucide-react';

export const TabelTransaksi: React.FC = () => {
  // Dummy table columns
  const columns = [
    'Tanggal',
    'Kode (in/out)',
    'Keterangan',
    'Jumlah',
    'Saldo Saat Ini',
    'Saldo Masuk/Keluar'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <Table className="text-blue-500" size={32} />
          Tabel Transaksi
        </h1>
        <p className="text-gray-400 mt-2">Placeholder tabel transaksi kosong tanpa koneksi database atau API</p>
      </div>

      {/* Action Bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Filter Toko:</label>
            <select className="bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Semua</option>
              <option>MJM</option>
              <option>BJW</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Jenis:</label>
            <select className="bg-gray-700 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Semua</option>
              <option>Masuk (IN)</option>
              <option>Keluar (OUT)</option>
            </select>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Download size={18} />
          Export Data
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
                      <FileText className="text-gray-500" size={48} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-300 mb-2">
                        Belum Ada Transaksi
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Tabel ini kosong dan siap untuk menerima data transaksi dari Supabase di masa depan.
                        Semua kolom telah disiapkan sesuai spesifikasi.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Struktur Kolom</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><span className="text-blue-400 font-semibold">Tanggal:</span> Tanggal transaksi</li>
            <li><span className="text-blue-400 font-semibold">Kode:</span> IN (masuk) atau OUT (keluar)</li>
            <li><span className="text-blue-400 font-semibold">Keterangan:</span> Deskripsi transaksi</li>
            <li><span className="text-blue-400 font-semibold">Jumlah:</span> Nilai transaksi</li>
            <li><span className="text-blue-400 font-semibold">Saldo Saat Ini:</span> Saldo terkini</li>
            <li><span className="text-blue-400 font-semibold">Saldo Masuk/Keluar:</span> Perubahan saldo</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-3">Fitur yang Disiapkan</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <span>Filter berdasarkan toko (MJM/BJW)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <span>Filter berdasarkan jenis transaksi (IN/OUT)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <span>Tombol export data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">✓</span>
              <span>Desain responsif untuk mobile dan desktop</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
