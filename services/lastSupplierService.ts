// services/lastSupplierService.ts
// Mendapatkan supplier terakhir (terbaru) untuk setiap part number dari barang masuk MJM & BJW
import { supabase } from './supabaseClient';

export async function fetchLatestSuppliersForParts(): Promise<Record<string, {supplier: string, date: string}>> {
  // Ambil data barang masuk dari kedua tabel
  const tables = ['barang_masuk_mjm', 'barang_masuk_bjw'];
  let all: Array<{part_number: string, customer: string, created_at: string}> = [];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('part_number, customer, created_at')
      .neq('customer', null)
      .neq('part_number', null);
    if (!error && data) {
      all = all.concat(data as any[]);
    }
  }
  // Filter hanya barang masuk (bukan retur): diasumsikan tidak ada field khusus retur, jika ada, tambahkan filter di sini
  // Group by part_number, ambil supplier dengan created_at paling akhir
  const latest: Record<string, {supplier: string, date: string}> = {};
  for (const row of all) {
    if (!row.part_number || !row.customer) continue;
    const prev = latest[row.part_number];
    if (!prev || new Date(row.created_at) > new Date(prev.date)) {
      latest[row.part_number] = { supplier: row.customer, date: row.created_at };
    }
  }
  return latest;
}
