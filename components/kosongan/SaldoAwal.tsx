// FILE: src/components/kosongan/SaldoAwal.tsx
import React from 'react';
import { Wallet, TrendingUp, Calendar } from 'lucide-react';

export const SaldoAwal: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <Wallet className="text-emerald-500" size={32} />
          Saldo Awal
        </h1>
        <p className="text-gray-400 mt-2">Placeholder untuk menampilkan data saldo awal secara statis</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-500/20 p-3 rounded-lg">
              <Wallet className="text-emerald-500" size={24} />
            </div>
            <Calendar className="text-gray-500" size={20} />
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Saldo Awal MJM</h3>
          <p className="text-3xl font-bold text-gray-100">Rp 0</p>
          <p className="text-xs text-gray-500 mt-2">Belum ada data</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Wallet className="text-blue-500" size={24} />
            </div>
            <Calendar className="text-gray-500" size={20} />
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Saldo Awal BJW</h3>
          <p className="text-3xl font-bold text-gray-100">Rp 0</p>
          <p className="text-xs text-gray-500 mt-2">Belum ada data</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <TrendingUp className="text-purple-500" size={24} />
            </div>
            <Calendar className="text-gray-500" size={20} />
          </div>
          <h3 className="text-gray-400 text-sm mb-2">Total Saldo Awal</h3>
          <p className="text-3xl font-bold text-gray-100">Rp 0</p>
          <p className="text-xs text-gray-500 mt-2">Gabungan MJM + BJW</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border border-emerald-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <TrendingUp className="text-emerald-500" size={20} />
          Informasi
        </h3>
        <ul className="space-y-2 text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>Halaman ini menampilkan saldo awal untuk setiap gudang (MJM dan BJW)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>Saat ini belum ada koneksi ke database atau API</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>Data yang ditampilkan adalah placeholder yang siap diisi dengan Supabase di masa depan</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">•</span>
            <span>UI dirancang responsif dan fleksibel untuk kemudahan integrasi</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
