// FILE: services/kirimBarangService.ts
import { supabase } from './supabaseClient';
import { getWIBDate } from '../utils/timezone';

// ====================================
// TYPES
// ====================================
export interface KirimBarangItem {
  id: string;
  created_at: string;
  updated_at: string;
  from_store: 'mjm' | 'bjw';
  to_store: 'mjm' | 'bjw';
  part_number: string;
  nama_barang: string;
  brand: string | null;
  application: string | null;
  quantity: number;
  status: 'pending' | 'approved' | 'sent' | 'received' | 'rejected';
  catatan: string | null;
  catatan_reject: string | null;
  requested_by: string | null;
  approved_by: string | null;
  sent_by: string | null;
  received_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  rejected_at: string | null;
}

export interface CreateKirimBarangRequest {
  from_store: 'mjm' | 'bjw';
  to_store: 'mjm' | 'bjw';
  part_number: string;
  nama_barang: string;
  brand?: string;
  application?: string;
  quantity: number;
  catatan?: string;
  requested_by: string;
}

export interface StockItem {
  part_number: string;
  name: string;
  brand: string;
  application: string;
  quantity: number;
  shelf: string;
}

const parseHargaModalFromCatatan = (catatan: string | null | undefined): number => {
  const text = (catatan || '').trim();
  if (!text) return 0;
  const match = text.match(/harga\s*modal\s*:\s*([0-9.,]+)/i);
  if (!match || !match[1]) return 0;
  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const parseSupplierFromCatatan = (catatan: string | null | undefined): string => {
  const text = (catatan || '').trim();
  if (!text) return '';
  const match = text.match(/supplier\s*:\s*([^|]+)/i);
  return match && match[1] ? match[1].trim() : '';
};

const getDestinationTables = (store: 'mjm' | 'bjw') => {
  if (store === 'bjw') {
    return { baseTable: 'base_bjw', barangMasukTable: 'barang_masuk_bjw' };
  }
  return { baseTable: 'base_mjm', barangMasukTable: 'barang_masuk_mjm' };
};

const buildMirrorSupplierName = (fromStore: string | null | undefined): string => {
  const safeStore = String(fromStore || '').trim().toUpperCase() || 'MJM';
  return `BARANG MASUK ${safeStore}`;
};

const getKirimBarangMirrorMarker = (transferId: string): string => `[KIRIM_BARANG_ID:${transferId}]`;

const buildMirrorNotes = (transfer: {
  id: string;
  from_store: string;
  to_store: string;
  catatan?: string | null;
}): string => {
  const marker = getKirimBarangMirrorMarker(transfer.id);
  const route = `KIRIM BARANG ${String(transfer.from_store || '').toUpperCase()} -> ${String(transfer.to_store || '').toUpperCase()}`;
  const catatan = (transfer.catatan || '').trim();
  return catatan ? `${marker} ${route} | ${catatan}` : `${marker} ${route}`;
};

const fetchMirrorRowsByTransferId = async (transferId: string) => {
  const marker = getKirimBarangMirrorMarker(transferId);
  const { data, error } = await supabase
    .from('order_supplier')
    .select('id')
    .ilike('notes', `%${marker}%`)
    .order('id', { ascending: true });
  if (error) return { success: false as const, error: error.message, rows: [] as Array<{ id: number }> };
  return { success: true as const, rows: (data || []) as Array<{ id: number }> };
};

const upsertMirrorOrderSupplierFromTransfer = async (
  transfer: {
    id: string;
    from_store: 'mjm' | 'bjw';
    to_store: 'mjm' | 'bjw';
    part_number: string;
    nama_barang: string;
    quantity: number;
    catatan?: string | null;
  },
  status: 'PENDING' | 'ORDERED'
): Promise<{ success: boolean; error?: string }> => {
  const safePartNumber = (transfer.part_number || '').trim();
  const safeQty = Math.max(0, Math.floor(Number(transfer.quantity || 0)));
  if (!safePartNumber || safeQty <= 0) {
    return { success: false, error: 'Data transfer tidak valid untuk sinkron order_supplier.' };
  }

  const supplier = buildMirrorSupplierName(transfer.from_store);
  const notes = buildMirrorNotes(transfer);
  const hargaModal = parseHargaModalFromCatatan(transfer.catatan);

  const mirrorRows = await fetchMirrorRowsByTransferId(transfer.id);
  if (!mirrorRows.success) {
    return { success: false, error: mirrorRows.error || 'Gagal membaca mirror order_supplier.' };
  }

  if (mirrorRows.rows.length === 0) {
    const { error: insertError } = await supabase
      .from('order_supplier')
      .insert({
        store: transfer.to_store,
        supplier,
        part_number: safePartNumber,
        name: transfer.nama_barang || safePartNumber,
        qty: safeQty,
        price: hargaModal,
        status,
        notes
      });
    if (insertError) {
      return { success: false, error: insertError.message };
    }
    return { success: true };
  }

  const primaryId = Number(mirrorRows.rows[0].id);
  const { error: updateError } = await supabase
    .from('order_supplier')
    .update({
      store: transfer.to_store,
      supplier,
      part_number: safePartNumber,
      name: transfer.nama_barang || safePartNumber,
      qty: safeQty,
      price: hargaModal,
      status,
      notes
    })
    .eq('id', primaryId);
  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const duplicateIds = mirrorRows.rows
    .slice(1)
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0);
  if (duplicateIds.length > 0) {
    const { error: dupDeleteError } = await supabase
      .from('order_supplier')
      .delete()
      .in('id', duplicateIds);
    if (dupDeleteError) {
      return { success: false, error: dupDeleteError.message };
    }
  }

  return { success: true };
};

const removeMirrorOrderSupplierByTransferId = async (
  transferId: string
): Promise<{ success: boolean; error?: string }> => {
  const mirrorRows = await fetchMirrorRowsByTransferId(transferId);
  if (!mirrorRows.success) {
    return { success: false, error: mirrorRows.error || 'Gagal membaca mirror order_supplier.' };
  }
  if (mirrorRows.rows.length === 0) return { success: true };

  const ids = mirrorRows.rows
    .map(row => Number(row.id))
    .filter(id => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return { success: true };

  const { error } = await supabase
    .from('order_supplier')
    .delete()
    .in('id', ids);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// ====================================
// FETCH FUNCTIONS
// ====================================

// Get stock from both stores for comparison
export const fetchBothStoreStock = async (partNumber?: string): Promise<{
  mjm: StockItem[];
  bjw: StockItem[];
}> => {
  try {
    let mjmQuery = supabase
      .from('base_mjm')
      .select('part_number, name, brand, application, quantity, shelf')
      .order('part_number');

    let bjwQuery = supabase
      .from('base_bjw')
      .select('part_number, name, brand, application, quantity, shelf')
      .order('part_number');

    if (partNumber) {
      mjmQuery = mjmQuery.ilike('part_number', `%${partNumber}%`);
      bjwQuery = bjwQuery.ilike('part_number', `%${partNumber}%`);
    }

    const [mjmResult, bjwResult] = await Promise.all([mjmQuery, bjwQuery]);

    return {
      mjm: (mjmResult.data || []).map(item => ({
        part_number: item.part_number || '',
        name: item.name || '',
        brand: item.brand || '',
        application: item.application || '',
        quantity: item.quantity || 0,
        shelf: item.shelf || ''
      })),
      bjw: (bjwResult.data || []).map(item => ({
        part_number: item.part_number || '',
        name: item.name || '',
        brand: item.brand || '',
        application: item.application || '',
        quantity: item.quantity || 0,
        shelf: item.shelf || ''
      }))
    };
  } catch (error) {
    console.error('fetchBothStoreStock Error:', error);
    return { mjm: [], bjw: [] };
  }
};

// Get all transfer requests
export const fetchKirimBarang = async (
  store: 'mjm' | 'bjw' | null,
  filter?: 'all' | 'incoming' | 'outgoing' | 'pending' | 'completed'
): Promise<KirimBarangItem[]> => {
  try {
    let query = supabase
      .from('kirim_barang')
      .select('*')
      .order('created_at', { ascending: false });

    if (store && filter === 'incoming') {
      query = query.eq('to_store', store);
    } else if (store && filter === 'outgoing') {
      query = query.eq('from_store', store);
    } else if (filter === 'pending') {
      query = query.in('status', ['pending', 'approved', 'sent']);
    } else if (filter === 'completed') {
      query = query.in('status', ['received', 'rejected']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('fetchKirimBarang Error:', error);
      return [];
    }

    return (data || []) as KirimBarangItem[];
  } catch (error) {
    console.error('fetchKirimBarang Exception:', error);
    return [];
  }
};

// ====================================
// CREATE REQUEST
// ====================================
export const createKirimBarangRequest = async (
  request: CreateKirimBarangRequest
): Promise<{ success: boolean; error?: string; id?: string }> => {
  try {
    const { data: createdRow, error } = await supabase
      .from('kirim_barang')
      .insert({
        from_store: request.from_store,
        to_store: request.to_store,
        part_number: request.part_number,
        nama_barang: request.nama_barang,
        brand: request.brand || null,
        application: request.application || null,
        quantity: request.quantity,
        catatan: request.catatan || null,
        requested_by: request.requested_by,
        status: 'pending'
      })
      .select('*')
      .single();

    if (error || !createdRow) {
      console.error('createKirimBarangRequest Error:', error);
      return { success: false, error: error?.message || 'Gagal membuat request kirim barang' };
    }

    const mirrorResult = await upsertMirrorOrderSupplierFromTransfer({
      id: createdRow.id,
      from_store: createdRow.from_store,
      to_store: createdRow.to_store,
      part_number: createdRow.part_number,
      nama_barang: createdRow.nama_barang,
      quantity: createdRow.quantity,
      catatan: createdRow.catatan
    }, 'PENDING');

    if (!mirrorResult.success) {
      await supabase
        .from('kirim_barang')
        .delete()
        .eq('id', createdRow.id);
      return {
        success: false,
        error: mirrorResult.error || 'Gagal sinkron ke order_supplier'
      };
    }

    return { success: true, id: createdRow.id };
  } catch (error: any) {
    console.error('createKirimBarangRequest Exception:', error);
    return { success: false, error: error.message };
  }
};

// ====================================
// UPDATE STATUS FUNCTIONS
// ====================================

// Approve a request
export const approveKirimBarang = async (
  id: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('kirim_barang')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('approveKirimBarang Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('approveKirimBarang Exception:', error);
    return { success: false, error: error.message };
  }
};

// Mark as sent and update stock (decrease from source store)
export const sendKirimBarang = async (
  id: string,
  sentBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First get the transfer details
    const { data: transfer, error: fetchError } = await supabase
      .from('kirim_barang')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    // Get source table
    const sourceTable = transfer.from_store === 'mjm' ? 'base_mjm' : 'base_bjw';

    // Get current stock
    const { data: sourceItem, error: sourceError } = await supabase
      .from(sourceTable)
      .select('quantity')
      .eq('part_number', transfer.part_number)
      .single();

    if (sourceError || !sourceItem) {
      return { success: false, error: 'Item not found in source store' };
    }

    if (sourceItem.quantity < transfer.quantity) {
      return { success: false, error: `Stok tidak cukup. Tersedia: ${sourceItem.quantity}` };
    }

    // Decrease stock from source
    const newSourceQty = sourceItem.quantity - transfer.quantity;
    const { error: updateSourceError } = await supabase
      .from(sourceTable)
      .update({ quantity: newSourceQty })
      .eq('part_number', transfer.part_number);

    if (updateSourceError) {
      return { success: false, error: 'Failed to update source stock' };
    }

    // Update transfer status
    const { error: updateError } = await supabase
      .from('kirim_barang')
      .update({
        status: 'sent',
        sent_by: sentBy,
        sent_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('sendKirimBarang Update Error:', updateError);
      return { success: false, error: updateError.message };
    }

    const mirrorResult = await upsertMirrorOrderSupplierFromTransfer({
      id: transfer.id,
      from_store: transfer.from_store,
      to_store: transfer.to_store,
      part_number: transfer.part_number,
      nama_barang: transfer.nama_barang,
      quantity: transfer.quantity,
      catatan: transfer.catatan
    }, 'ORDERED');
    if (!mirrorResult.success) {
      console.error('sendKirimBarang mirror sync error:', mirrorResult.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('sendKirimBarang Exception:', error);
    return { success: false, error: error.message };
  }
};

// Mark as received and update stock (increase in destination store)
export const receiveKirimBarang = async (
  id: string,
  receivedBy: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First get the transfer details
    const { data: transfer, error: fetchError } = await supabase
      .from('kirim_barang')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    const destinationStore: 'mjm' | 'bjw' = transfer.to_store === 'bjw' ? 'bjw' : 'mjm';
    const { baseTable: destTable, barangMasukTable } = getDestinationTables(destinationStore);
    const completedAt = getWIBDate().toISOString();
    const safeQty = Math.max(0, Math.floor(Number(transfer.quantity || 0)));
    if (safeQty <= 0) {
      return { success: false, error: 'Qty transfer tidak valid' };
    }
    const safePartNumber = (transfer.part_number || '').trim();
    if (!safePartNumber) {
      return { success: false, error: 'Part number transfer kosong' };
    }

    // Get current stock in destination (or create if not exists)
    const { data: destItem, error: destError } = await supabase
      .from(destTable)
      .select('*')
      .eq('part_number', safePartNumber)
      .single();

    if (destError && destError.code !== 'PGRST116') {
      // PGRST116 = not found, which is okay
      return { success: false, error: 'Error checking destination stock' };
    }

    const previousQty = Number(destItem?.quantity || 0);
    const hadExistingItem = Boolean(destItem);
    let finalQty = safeQty;
    const finalPartNumber = destItem?.part_number || safePartNumber;
    const finalName = destItem?.name || transfer.nama_barang || safePartNumber;
    const finalBrand = destItem?.brand || transfer.brand || '';
    const finalApplication = destItem?.application || transfer.application || '';
    const finalShelf = destItem?.shelf || '-';

    if (destItem) {
      // Item exists, increase quantity
      finalQty = previousQty + safeQty;
      const { error: updateDestError } = await supabase
        .from(destTable)
        .update({ quantity: finalQty })
        .eq('part_number', finalPartNumber);

      if (updateDestError) {
        return { success: false, error: 'Failed to update destination stock' };
      }
    } else {
      // Item doesn't exist, create new entry
      finalQty = safeQty;
      const { error: insertError } = await supabase.from(destTable).insert({
        part_number: finalPartNumber,
        name: finalName,
        brand: finalBrand,
        application: finalApplication,
        quantity: finalQty,
        shelf: finalShelf,
        created_at: completedAt
      });

      if (insertError) {
        return { success: false, error: 'Failed to create item in destination' };
      }
    }

    const hargaSatuan = parseHargaModalFromCatatan(transfer.catatan);
    const supplierFromCatatan = parseSupplierFromCatatan(transfer.catatan);
    const customerLabel = supplierFromCatatan || `BARANG MASUK ${String(transfer.from_store || '').toUpperCase()}`;
    const ecommerceLabel = '-';
    const tempoLabel = 'CASH';

    const { data: logInsertRows, error: logError } = await supabase
      .from(barangMasukTable)
      .insert([{
        part_number: finalPartNumber,
        nama_barang: finalName,
        brand: finalBrand,
        application: finalApplication,
        rak: finalShelf,
        qty_masuk: safeQty,
        stok_akhir: finalQty,
        harga_satuan: hargaSatuan,
        harga_total: hargaSatuan * safeQty,
        customer: customerLabel,
        tempo: tempoLabel,
        ecommerce: ecommerceLabel,
        created_at: completedAt
      }])
      .select('id');

    if (logError) {
      // Best effort rollback stock jika log barang_masuk gagal.
      if (hadExistingItem) {
        await supabase
          .from(destTable)
          .update({ quantity: previousQty })
          .eq('part_number', finalPartNumber);
      } else {
        await supabase
          .from(destTable)
          .delete()
          .eq('part_number', finalPartNumber);
      }
      return { success: false, error: `Gagal simpan log barang masuk: ${logError.message}` };
    }

    const insertedLogId = logInsertRows && logInsertRows.length > 0
      ? Number((logInsertRows[0] as any).id || 0)
      : 0;

    // Update transfer status
    const { error: updateError } = await supabase
      .from('kirim_barang')
      .update({
        status: 'received',
        received_by: receivedBy,
        received_at: completedAt
      })
      .eq('id', id);

    if (updateError) {
      console.error('receiveKirimBarang Update Error:', updateError);
      // Best effort rollback ketika status gagal diupdate.
      if (hadExistingItem) {
        await supabase
          .from(destTable)
          .update({ quantity: previousQty })
          .eq('part_number', finalPartNumber);
      } else {
        await supabase
          .from(destTable)
          .delete()
          .eq('part_number', finalPartNumber);
      }

      if (insertedLogId > 0) {
        await supabase
          .from(barangMasukTable)
          .delete()
          .eq('id', insertedLogId);
      }

      return { success: false, error: updateError.message };
    }

    const removeMirrorResult = await removeMirrorOrderSupplierByTransferId(String(id || ''));
    if (!removeMirrorResult.success) {
      console.error('receiveKirimBarang remove mirror error:', removeMirrorResult.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('receiveKirimBarang Exception:', error);
    return { success: false, error: error.message };
  }
};

// Reject a request
export const rejectKirimBarang = async (
  id: string,
  rejectedBy: string,
  catatanReject: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if it was already sent (need to return stock)
    const { data: transfer, error: fetchError } = await supabase
      .from('kirim_barang')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !transfer) {
      return { success: false, error: 'Transfer not found' };
    }

    // If status is 'sent', we need to return stock to source
    if (transfer.status === 'sent') {
      const sourceTable = transfer.from_store === 'mjm' ? 'base_mjm' : 'base_bjw';
      const { data: sourceItem, error: sourceError } = await supabase
        .from(sourceTable)
        .select('quantity')
        .eq('part_number', transfer.part_number)
        .single();

      if (!sourceError && sourceItem) {
        const newQty = (sourceItem.quantity || 0) + transfer.quantity;
        await supabase
          .from(sourceTable)
          .update({ quantity: newQty })
          .eq('part_number', transfer.part_number);
      }
    }

    const { error } = await supabase
      .from('kirim_barang')
      .update({
        status: 'rejected',
        catatan_reject: catatanReject,
        rejected_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('rejectKirimBarang Error:', error);
      return { success: false, error: error.message };
    }

    const removeMirrorResult = await removeMirrorOrderSupplierByTransferId(String(id || ''));
    if (!removeMirrorResult.success) {
      console.error('rejectKirimBarang remove mirror error:', removeMirrorResult.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('rejectKirimBarang Exception:', error);
    return { success: false, error: error.message };
  }
};

// Delete a request (only pending)
export const deleteKirimBarang = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('kirim_barang')
      .delete()
      .eq('id', id)
      .eq('status', 'pending'); // Only allow deleting pending requests

    if (error) {
      console.error('deleteKirimBarang Error:', error);
      return { success: false, error: error.message };
    }

    const removeMirrorResult = await removeMirrorOrderSupplierByTransferId(String(id || ''));
    if (!removeMirrorResult.success) {
      console.error('deleteKirimBarang remove mirror error:', removeMirrorResult.error);
    }

    return { success: true };
  } catch (error: any) {
    console.error('deleteKirimBarang Exception:', error);
    return { success: false, error: error.message };
  }
};

// Get stock comparison for a specific part number
export const getStockComparison = async (
  partNumber: string
): Promise<{ mjm: number; bjw: number }> => {
  try {
    const [mjmResult, bjwResult] = await Promise.all([
      supabase
        .from('base_mjm')
        .select('quantity')
        .eq('part_number', partNumber)
        .single(),
      supabase
        .from('base_bjw')
        .select('quantity')
        .eq('part_number', partNumber)
        .single()
    ]);

    return {
      mjm: mjmResult.data?.quantity || 0,
      bjw: bjwResult.data?.quantity || 0
    };
  } catch (error) {
    console.error('getStockComparison Error:', error);
    return { mjm: 0, bjw: 0 };
  }
};

// Search items from both stores
export const searchItemsBothStores = async (
  query: string
): Promise<{
  mjm: StockItem[];
  bjw: StockItem[];
}> => {
  if (!query || query.length < 2) return { mjm: [], bjw: [] };

  try {
    const searchPattern = `%${query}%`;

    const [mjmResult, bjwResult] = await Promise.all([
      supabase
        .from('base_mjm')
        .select('part_number, name, brand, application, quantity, shelf')
        .or(`part_number.ilike.${searchPattern},name.ilike.${searchPattern}`)
        .order('part_number')
        .limit(50),
      supabase
        .from('base_bjw')
        .select('part_number, name, brand, application, quantity, shelf')
        .or(`part_number.ilike.${searchPattern},name.ilike.${searchPattern}`)
        .order('part_number')
        .limit(50)
    ]);

    return {
      mjm: (mjmResult.data || []).map(item => ({
        part_number: item.part_number || '',
        name: item.name || '',
        brand: item.brand || '',
        application: item.application || '',
        quantity: item.quantity || 0,
        shelf: item.shelf || ''
      })),
      bjw: (bjwResult.data || []).map(item => ({
        part_number: item.part_number || '',
        name: item.name || '',
        brand: item.brand || '',
        application: item.application || '',
        quantity: item.quantity || 0,
        shelf: item.shelf || ''
      }))
    };
  } catch (error) {
    console.error('searchItemsBothStores Error:', error);
    return { mjm: [], bjw: [] };
  }
};
