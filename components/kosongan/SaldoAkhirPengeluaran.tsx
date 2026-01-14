// FILE: src/components/kosongan/SaldoAkhirPengeluaran.tsx
import React from 'react';
import { TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

export const SaldoAkhirPengeluaran: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <TrendingDown className="text-red-500" size={32} />
          Saldo Akhir Pengeluaran
        </h1>
        <p className="text-gray-400 mt-2">Placeholder untuk menampilkan saldo akhir pengeluaran tanpa koneksi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-4 uppercase tracking-wider">Saldo Akhir MJM</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Saldo Awal:</span>
              <span className="text-gray-300 font-semibold">Rp 0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Pengeluaran:</span>
              <span className="text-red-400 font-semibold">- Rp 0</span>
            </div>
            <div className="border-t border-gray-700 pt-4 flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Saldo Akhir:</span>
              <span className="text-2xl font-bold text-emerald-500">Rp 0</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm mb-4 uppercase tracking-wider">Saldo Akhir BJW</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Saldo Awal:</span>
              <span className="text-gray-300 font-semibold">Rp 0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Pengeluaran:</span>
              <span className="text-red-400 font-semibold">- Rp 0</span>
            </div>
            <div className="border-t border-gray-700 pt-4 flex items-center justify-between">
              <span className="text-gray-300 font-semibold">Saldo Akhir:</span>
              <span className="text-2xl font-bold text-emerald-500">Rp 0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <DollarSign className="text-purple-500" size={24} />
          Ringkasan Total Gabungan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-500 text-sm mb-1">Total Saldo Awal</p>
            <p className="text-2xl font-bold text-gray-100">Rp 0</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-red-400">- Rp 0</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm mb-1">Total Saldo Akhir</p>
            <p className="text-3xl font-bold text-emerald-500">Rp 0</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <AlertCircle className="text-red-500" size={20} />
          Catatan Penting
        </h3>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Halaman ini menampilkan perhitungan saldo akhir setelah pengeluaran</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Formula: Saldo Akhir = Saldo Awal - Total Pengeluaran</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Data placeholder - belum terhubung ke database</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span>Siap untuk integrasi Supabase di masa depan</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
