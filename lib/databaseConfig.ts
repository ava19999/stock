// FILE: src/lib/databaseConfig.ts
import { StoreType } from '../types/store';

// Store-specific table name mapping
const TABLE_PREFIXES: Record<'mjm' | 'bjw', string> = {
  mjm: 'mjm',
  bjw: 'bjw',
};

// Current store context - will be set by the application
let currentStore: StoreType = null;

/**
 * Set the current store context for database operations
 * This should be called when user logs in or selects a store
 */
export const setDatabaseStore = (store: StoreType) => {
  currentStore = store;
};

/**
 * Get the current store context
 */
export const getDatabaseStore = (): StoreType => {
  return currentStore;
};

/**
 * Get the table name with appropriate prefix based on current store
 * @param baseTableName - The base table name without prefix
 * @returns The prefixed table name (e.g., 'base' -> 'base_mjm' or 'base_bjw')
 */
export const getTableName = (baseTableName: string): string => {
  if (!currentStore) {
    console.warn(`Database store not set! Using unprefixed table: ${baseTableName}`);
    return baseTableName;
  }

  const prefix = TABLE_PREFIXES[currentStore];
  
  // For the 'base' table, use base_mjm or base_bjw format
  if (baseTableName === 'base') {
    return `base_${prefix}`;
  }
  
  // For other tables, also add prefix: tablename_mjm or tablename_bjw
  return `${baseTableName}_${prefix}`;
};

/**
 * Get all table names for the current store
 */
export const getTableNames = () => {
  return {
    base: getTableName('base'),
    barang_masuk: getTableName('barang_masuk'),
    barang_keluar: getTableName('barang_keluar'),
    foto: getTableName('foto'),
    list_harga_jual: getTableName('list_harga_jual'),
    orders: getTableName('orders'),
    chat_sessions: getTableName('chat_sessions'),
    retur: getTableName('retur'),
    scan_resi: getTableName('scan_resi'),
  };
};
