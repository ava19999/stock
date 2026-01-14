// FILE: src/components/kosongan/KosonganView.tsx
import React from 'react';
import { Wallet, TrendingDown, Table, Package } from 'lucide-react';
import { ActiveView } from '../../types/ui';
import { SaldoAwal } from './SaldoAwal';
import { SaldoAkhirPengeluaran } from './SaldoAkhirPengeluaran';
import { TabelTransaksi } from './TabelTransaksi';
import { BarangKosong } from './BarangKosong';

interface KosonganViewProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

export const KosonganView: React.FC<KosonganViewProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    {
      id: 'saldo_awal' as ActiveView,
      label: 'Saldo Awal',
      icon: Wallet,
      color: 'emerald',
      description: 'Saldo awal gudang'
    },
    {
      id: 'saldo_akhir' as ActiveView,
      label: 'Saldo Akhir Pengeluaran',
      icon: TrendingDown,
      color: 'red',
      description: 'Saldo akhir setelah pengeluaran'
    },
    {
      id: 'transaksi' as ActiveView,
      label: 'Tabel Transaksi',
      icon: Table,
      color: 'blue',
      description: 'Riwayat transaksi lengkap'
    },
    {
      id: 'barang_kosong' as ActiveView,
      label: 'Barang Kosong',
      icon: Package,
      color: 'orange',
      description: 'Data barang kosong'
    }
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'saldo_awal':
        return <SaldoAwal />;
      case 'saldo_akhir':
        return <SaldoAkhirPengeluaran />;
      case 'transaksi':
        return <TabelTransaksi />;
      case 'barang_kosong':
        return <BarangKosong />;
      default:
        return <SaldoAwal />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Side Navigation - Desktop */}
      <div className="hidden md:flex">
        <div className="w-72 bg-gray-800 border-r border-gray-700 min-h-screen fixed left-0 top-[65px] bottom-0 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-100 mb-2">Keuangan dan Barang Kosong</h2>
            <p className="text-xs text-gray-500 mb-6">Menu utama manajemen</p>
            
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`
                      w-full flex items-start gap-3 p-4 rounded-xl transition-all text-left
                      ${isActive 
                        ? `bg-${item.color}-900/30 border-2 border-${item.color}-500/50 shadow-lg shadow-${item.color}-500/20` 
                        : 'bg-gray-700/50 border-2 border-transparent hover:bg-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg mt-0.5
                      ${isActive ? `bg-${item.color}-500/20` : 'bg-gray-600/50'}
                    `}>
                      <Icon 
                        size={20} 
                        className={isActive ? `text-${item.color}-400` : 'text-gray-400'} 
                      />
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold text-sm ${isActive ? 'text-gray-100' : 'text-gray-300'}`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="ml-72 flex-1">
          {renderContent()}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {/* Top Menu Bar */}
        <div className="bg-gray-800 border-b border-gray-700 sticky top-[65px] z-40 overflow-x-auto">
          <div className="flex gap-2 p-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-all flex-shrink-0
                    ${isActive 
                      ? `bg-${item.color}-900/30 border border-${item.color}-500/50 text-${item.color}-400` 
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="pb-20">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
