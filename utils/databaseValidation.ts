// Database Routing Validation Utility
// This file provides helper functions to validate database routing in the browser console

import { getDatabaseStore, getTableName, getTableNames } from '../lib/databaseConfig';

// Export functions to window for easy console access
declare global {
  interface Window {
    validateDatabaseRouting: () => void;
    showCurrentStore: () => void;
    showTableNames: () => void;
  }
}

/**
 * Validate that database routing is working correctly
 */
export const validateDatabaseRouting = () => {
  const currentStore = getDatabaseStore();
  
  console.log('=== Database Routing Validation ===');
  console.log('Current Store:', currentStore || 'NOT SET ❌');
  
  if (!currentStore) {
    console.error('ERROR: Store context is not set! Database routing will not work.');
    return;
  }
  
  console.log('✅ Store context is set correctly');
  
  const tables = getTableNames();
  console.log('\nTable Name Mappings:');
  Object.entries(tables).forEach(([base, actual]) => {
    console.log(`  ${base.padEnd(20)} -> ${actual}`);
  });
  
  // Validate that all tables have the correct suffix
  const expectedSuffix = `_${currentStore}`;
  let allCorrect = true;
  
  Object.entries(tables).forEach(([base, actual]) => {
    if (!actual.endsWith(expectedSuffix)) {
      console.error(`❌ ERROR: ${base} does not have expected suffix ${expectedSuffix}`);
      allCorrect = false;
    }
  });
  
  if (allCorrect) {
    console.log('\n✅ All table names have correct suffix');
  } else {
    console.error('\n❌ Some table names are incorrect');
  }
  
  console.log('\n=== Validation Complete ===');
};

/**
 * Show the current store context
 */
export const showCurrentStore = () => {
  const store = getDatabaseStore();
  console.log('Current Database Store:', store || 'NOT SET');
  
  if (store === 'mjm') {
    console.log('📍 MJM86 AUTOPART (Yellow Theme)');
  } else if (store === 'bjw') {
    console.log('📍 BJW AUTOPART (Red Theme)');
  } else {
    console.warn('⚠️  Store not set - database queries may fail');
  }
  
  return store;
};

/**
 * Show all table name mappings for current store
 */
export const showTableNames = () => {
  const store = getDatabaseStore();
  
  if (!store) {
    console.error('Store not set!');
    return;
  }
  
  const tables = getTableNames();
  console.table(tables);
  return tables;
};

// Attach functions to window for console access
if (typeof window !== 'undefined') {
  window.validateDatabaseRouting = validateDatabaseRouting;
  window.showCurrentStore = showCurrentStore;
  window.showTableNames = showTableNames;
}

// Also export for module usage
export { getDatabaseStore, getTableName, getTableNames };
