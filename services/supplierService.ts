// services/supplierService.ts
// Ambil daftar supplier unik dari tabel barang kosong (untuk StockOnlineView)
import { supabase } from './supabaseClient';

// Ambil supplier unik dari field customer pada barang_masuk_mjm/bjw
export async function fetchUniqueSuppliersFromBarangKosong(store: string): Promise<string[]> {
  let tables = ['barang_masuk_mjm'];
  if (store === 'bjw') tables.push('barang_masuk_bjw');
  let all: string[] = [];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('customer')
      .neq('customer', null);
    if (!error && data) {
      all = all.concat((data as any[]).map(row => row.customer).filter(Boolean));
    }
  }
  const unique = Array.from(new Set(all))
    .filter(s => s && !/UNKNOWN|TANPA SUPPLIER/i.test(s))
    .sort((a, b) => a.localeCompare(b));
  return unique;
}
