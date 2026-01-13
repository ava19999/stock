/**
 * Script to clear all data from specific Supabase tables
 * 
 * This script empties the following tables:
 * - list_harga_jual
 * - inventory
 * - barang_masuk
 * - barang_keluar
 * 
 * Usage: tsx scripts/clearDatabase.ts
 * 
 * The script uses the Supabase configuration from lib/supabase.ts
 * You can override with environment variables if needed.
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const TABLES_TO_CLEAR = [
  'list_harga_jual',
  'inventory',
  'barang_masuk',
  'barang_keluar'
] as const;

// Get Supabase configuration from environment variables or use defaults from lib/supabase.ts
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doyyghsijggiibkcktuq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveXlnaHNpamdnaWlia2NrdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3MTE2MzcsImV4cCI6MjAyNTI4NzYzN30.sb_publishable_d0LbRl9l1zDIpMD5wbEu1g_Hkgw1Aab';

/**
 * Initialize Supabase client
 */
const initializeSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
  }
  
  console.log('🔧 Initializing Supabase client...');
  console.log(`   URL: ${SUPABASE_URL}`);
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
};

/**
 * Clear data from a specific table
 */
const clearTable = async (supabase: any, tableName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`\n📋 Clearing table: ${tableName}...`);
    
    // First, count the records to be deleted
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`   ❌ Error counting records in ${tableName}:`, countError.message);
      return { success: false, error: countError.message };
    }
    
    console.log(`   📊 Found ${count || 0} records to delete`);
    
    if (count === 0) {
      console.log(`   ✅ Table ${tableName} is already empty`);
      return { success: true };
    }
    
    // Delete all records from the table
    // Using a condition that matches all records reliably
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .not('id', 'is', null);
    
    if (deleteError) {
      console.error(`   ❌ Error deleting from ${tableName}:`, deleteError.message);
      return { success: false, error: deleteError.message };
    }
    
    // Verify the deletion
    const { count: afterCount, error: verifyError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (verifyError) {
      console.error(`   ⚠️  Warning: Could not verify deletion for ${tableName}`);
    } else {
      console.log(`   ✅ Successfully cleared ${count} records from ${tableName}`);
      console.log(`   📊 Remaining records: ${afterCount || 0}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`   ❌ Unexpected error clearing ${tableName}:`, error.message || error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Main function to clear all specified tables
 */
const clearDatabase = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🗑️  SUPABASE DATABASE CLEAR SCRIPT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n⚠️  WARNING: This will DELETE ALL DATA from the following tables:`);
  TABLES_TO_CLEAR.forEach(table => console.log(`   - ${table}`));
  console.log('\n');
  
  try {
    // Initialize Supabase client
    const supabase = initializeSupabase();
    console.log('✅ Supabase client initialized successfully\n');
    
    // Track results
    const results: { table: string; success: boolean; error?: string }[] = [];
    
    // Clear each table
    for (const tableName of TABLES_TO_CLEAR) {
      const result = await clearTable(supabase, tableName);
      results.push({ table: tableName, success: result.success, error: result.error });
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n✅ Successfully cleared: ${successCount} table(s)`);
    if (failCount > 0) {
      console.log(`❌ Failed to clear: ${failCount} table(s)`);
      console.log('\nFailed tables:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.table}: ${r.error || 'Unknown error'}`));
    }
    
    // Success confirmation
    if (failCount === 0) {
      console.log('\n🎉 All tables cleared successfully!');
      console.log('═══════════════════════════════════════════════════════════\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tables could not be cleared. Please review the errors above.');
      console.log('═══════════════════════════════════════════════════════════\n');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message || error);
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
};

// Run the script
clearDatabase();
