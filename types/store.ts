// FILE: src/types/store.ts

export type StoreType = 'mjm' | 'bjw' | 'kosongan' | null;
export type UserRole = 'admin' | 'guest' | null;

export interface StoreTheme {
  primary: string;
  secondary: string;
  accent: string;
  hover: string;
  gradient: string;
  glow: string;
}

export interface StoreConfig {
  id: StoreType;
  name: string;
  fullName: string;
  subtitle: string;
  logo: string;
  theme: StoreTheme;
  adminPassword: string; // NOTE: In production, move passwords to environment variables or use a secure auth service
}

export interface AuthState {
  selectedStore: StoreType;
  userRole: UserRole;
  userName: string;
}

export const STORE_CONFIGS: Record<'mjm' | 'bjw' | 'kosongan', StoreConfig> = {
  mjm: {
    id: 'mjm',
    name: 'MJM86',
    fullName: 'MJM86 AUTOPART',
    subtitle: 'Suku Cadang Mobil',
    logo: '/assets/mjm-logo.png',
    theme: {
      primary: 'yellow-400',
      secondary: 'cyan-400',
      accent: 'yellow-500',
      hover: 'yellow-300',
      gradient: 'from-yellow-600/20 to-cyan-600/20',
      glow: 'shadow-yellow-500/50',
    },
    adminPassword: 'mjm123',
  },
  bjw: {
    id: 'bjw',
    name: 'BJW',
    fullName: 'BJW AUTOPART',
    subtitle: 'Sukucadang Mobil',
    logo: '/assets/bjw-logo.png',
    theme: {
      primary: 'red-500',
      secondary: 'gray-300',
      accent: 'red-600',
      hover: 'red-400',
      gradient: 'from-red-600/20 to-gray-600/20',
      glow: 'shadow-red-500/50',
    },
    adminPassword: 'bjw123',
  },
  kosongan: {
    id: 'kosongan',
    name: 'GUDANG',
    fullName: 'GUDANG MJM-BJW KOSONGAN',
    subtitle: 'Keuangan dan Barang Kosong',
    logo: '/assets/kosongan-logo.png',
    theme: {
      primary: 'emerald-500',
      secondary: 'blue-400',
      accent: 'emerald-600',
      hover: 'emerald-400',
      gradient: 'from-emerald-600/20 to-blue-600/20',
      glow: 'shadow-emerald-500/50',
    },
    adminPassword: 'kosongan123',
  },
};
