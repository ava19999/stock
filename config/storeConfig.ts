// FILE: src/config/storeConfig.ts
export type StoreId = 'mjm' | 'bjw';

export interface StoreConfig {
  id: StoreId;
  name: string;
  fullName: string;
  subtitle: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const STORE_CONFIG: Record<StoreId, StoreConfig> = {
  mjm: {
    id: 'mjm',
    name: 'MJM86',
    fullName: 'MJM86 AUTOPART',
    subtitle: 'Suku Cadang Mobil',
    logo: '/assets/mjm-logo.png',
    colors: {
      primary: 'yellow-400',
      secondary: 'cyan-400',
      accent: 'yellow-500',
    }
  },
  bjw: {
    id: 'bjw',
    name: 'BJW',
    fullName: 'BJW AUTOPART', 
    subtitle: 'Sukucadang Mobil',
    logo: '/assets/bjw-logo.png',
    colors: {
      primary: 'red-500',
      secondary: 'blue-500',
      accent: 'red-600',
    }
  }
};

export const getStoreConfig = (storeId: StoreId | null): StoreConfig => {
  return storeId && STORE_CONFIG[storeId] ? STORE_CONFIG[storeId] : STORE_CONFIG.bjw;
};
