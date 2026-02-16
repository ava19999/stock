


import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../services/supabaseClient';
import { Loader2, Package, Search, FileDown, ShoppingCart, ChevronDown, ChevronUp, Pencil, Trash2, CheckCircle2, Save, XCircle } from 'lucide-react';
import { fetchUniqueSuppliersFromBarangKosong } from '../../services/supplierService';
import { fetchLatestSuppliersForParts } from '../../services/lastSupplierService';
import { completeOrderSupplierRequest, fetchPendingOrderSupplier } from '../../services/supabaseService';


interface SupplierInfo {
  supplier: string;
  lastDate: string;
  lastPrice: number;
  lastPriceCash: number;
  lastPriceTempo: number;
  totalQtyPurchased: number;
  purchaseCount: number;
}

interface StockMoment {
  partNumber: string;
  name: string;
  brand: string;
  date: string;
  stock: number;
  stockMjm: number;
  stockBjw: number;
  qtyOut: number;
  supplier?: SupplierInfo;
  requestStock?: number; // kolom baru
}

interface BarangKosongCartItem {
  part_number: string;
  nama_barang: string;
  supplier: string;
  qty: number;
  price: number;
  tempo: string;
  brand: string;
  application: string;
}

interface RequestedStockRow {
  id: string;
  source: 'order_supplier' | 'kirim_barang';
  partNumber: string;
  name: string;
  brand: string;
  stock: number | null;
  qty: number;
  costPrice: number;
  supplier: string;
  requestDate: string;
  requestDateRaw: string;
  requestStore: 'mjm' | 'bjw';
  status: string;
  notes: string;
}

const LAST_N_DATES = 7;

const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastNDates = (count: number): string[] => {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(toLocalISODate(d));
  }
  return dates;
};

const mergeItemsToBarangKosongCart = (
  store: string,
  supplier: string,
  items: Array<{ partNumber: string; name: string; qty: number; price?: number }>
) => {
  const storageKey = `barangKosongCart_${store || 'mjm'}`;
  let existingCart: BarangKosongCartItem[] = [];

  try {
    existingCart = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch {
    existingCart = [];
  }

  const mergedCart = [...existingCart];
  items.forEach(item => {
    const partNumber = (item.partNumber || '').trim();
    const qty = Number(item.qty || 0);
    if (!partNumber || qty <= 0) return;

    const existingIdx = mergedCart.findIndex(
      cartItem => cartItem.part_number === partNumber && cartItem.supplier === supplier
    );

    if (existingIdx >= 0) {
      mergedCart[existingIdx] = {
        ...mergedCart[existingIdx],
        qty: Number(mergedCart[existingIdx].qty || 0) + qty,
        price: Number(item.price || mergedCart[existingIdx].price || 0)
      };
      return;
    }

    mergedCart.push({
      part_number: partNumber,
      nama_barang: item.name,
      supplier,
      qty,
      price: Number(item.price || 0),
      tempo: 'CASH',
      brand: '',
      application: ''
    });
  });

  localStorage.setItem(storageKey, JSON.stringify(mergedCart));
  window.dispatchEvent(new CustomEvent('barangKosongCartUpdated', { detail: { store } }));
};

const normalizeSupplierName = (value: string): string => {
  return (value || '').trim().toUpperCase().replace(/\s+/g, ' ');
};

const normalizePartNumber = (value: string): string => {
  return (value || '').trim().toUpperCase().replace(/\s+/g, ' ');
};

const buildRequestedStockKey = (store: 'mjm' | 'bjw', partNumber: string): string => {
  return `${store}::${normalizePartNumber(partNumber)}`;
};

const formatIDR = (value: number): string => {
  const safe = Math.max(0, Math.floor(Number(value || 0)));
  return `Rp ${safe.toLocaleString('id-ID')}`;
};

const makeSupplierPriceKey = (partNumber: string, supplier: string): string => {
  return `${(partNumber || '').trim().toUpperCase()}__${normalizeSupplierName(supplier)}`;
};

const getSupplierLookupCandidates = (supplier: string): string[] => {
  const normalized = normalizeSupplierName(supplier);
  if (!normalized) return [];
  const parts = normalized
    .split('/')
    .map(part => normalizeSupplierName(part))
    .filter(Boolean);
  return Array.from(new Set([normalized, ...parts]));
};

const extractCostPriceFromCatatan = (catatan: string | null | undefined): number => {
  const text = (catatan || '').trim();
  if (!text) return 0;
  const match = text.match(/harga\s*modal\s*:\s*([0-9.,]+)/i);
  if (!match || !match[1]) return 0;
  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const upsertCostPriceInCatatan = (catatan: string | null | undefined, supplier: string, costPrice: number): string => {
  const safePrice = Math.max(0, Math.floor(Number(costPrice || 0)));
  let text = (catatan || '').trim();

  if (!text) {
    text = 'Request dari Stock Online';
  }
  if (!/supplier\s*:/i.test(text) && supplier) {
    text += ` | Supplier: ${supplier}`;
  }
  if (/harga\s*modal\s*:/i.test(text)) {
    return text.replace(/harga\s*modal\s*:\s*[0-9.,]+/i, `Harga Modal: ${safePrice}`);
  }
  return `${text} | Harga Modal: ${safePrice}`;
};

const isKirimBarangSupplier = (supplierName: string): boolean => {
  const normalized = normalizeSupplierName(supplierName);
  if (!normalized) return false;
  if (normalized === 'MJM') return true;
  if (normalized.includes('IMPORTIR MJM')) return true;
  if (normalized.includes('BARANG MASUK MJM')) return true;
  return false;
};

const resolveKirimBarangRoute = (
  selectedStore: string | null | undefined,
  supplierName: string
): { from_store: 'mjm'; to_store: 'mjm' | 'bjw' } | null => {
  if (!isKirimBarangSupplier(supplierName)) return null;

  const requesterStore: 'mjm' | 'bjw' = selectedStore === 'bjw' ? 'bjw' : 'mjm';
  const sourceStore: 'mjm' = 'mjm';

  // Kalau requester sama dengan source store, jangan lewat modul kirim barang.
  if (requesterStore === sourceStore) return null;

  return {
    from_store: sourceStore,
    to_store: requesterStore
  };
};

const extractSupplierFromCatatan = (catatan: string | null | undefined): string => {
  const text = (catatan || '').trim();
  if (!text) return 'MJM / IMPORTIR MJM';
  const match = text.match(/supplier\s*:\s*([^|]+)/i);
  if (match && match[1]) return match[1].trim();
  return 'MJM / IMPORTIR MJM';
};

const canEditOrDeleteKirimBarang = (status: string): boolean => {
  const normalized = (status || '').toLowerCase();
  return normalized === 'pending' || normalized === 'approved';
};

const canMutateOrderSupplier = (status: string): boolean => {
  const normalized = (status || '').toLowerCase();
  return normalized === 'pending' || normalized === 'ordered';
};


const StockOnlineView: React.FC = () => {
  const { selectedStore, userName } = useStore();
  const [loading, setLoading] = useState(true);
  const [moments, setMoments] = useState<StockMoment[]>([]);
  const [search, setSearch] = useState('');
  // State untuk edit kolom request stok & supplier
  const [editData, setEditData] = useState<Record<string, {requestStock: number, supplier: string, editingSupplier?: boolean}>>({});
  const [orderLoading, setOrderLoading] = useState<string | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [latestSupplierMap, setLatestSupplierMap] = useState<Record<string, {supplier: string, date: string}>>({});
  const [supplierPriceLookup, setSupplierPriceLookup] = useState<Record<string, number>>({});
  const [collapsedByDate, setCollapsedByDate] = useState<Record<string, boolean>>({});
  const [requestedOrderSupplierRowsRaw, setRequestedOrderSupplierRowsRaw] = useState<any[]>([]);
  const [requestedKirimBarangRowsRaw, setRequestedKirimBarangRowsRaw] = useState<any[]>([]);
  const [requestedCurrentStockMap, setRequestedCurrentStockMap] = useState<Record<string, number>>({});
  const [requestedRowEditState, setRequestedRowEditState] = useState<Record<string, { editing: boolean; qty: number; costPrice: number }>>({});
  const [requestedRowActionLoading, setRequestedRowActionLoading] = useState<string | null>(null);
  const emitBarangKosongCartSync = React.useCallback(() => {
    const targetStore = selectedStore || 'mjm';
    window.dispatchEvent(new CustomEvent('barangKosongCartUpdated', { detail: { store: targetStore } }));
  }, [selectedStore]);
  const loadRequestedRows = React.useCallback(async () => {
    const targetStore = selectedStore || 'mjm';
    const [orderSupplierRows, kirimBarangResult] = await Promise.all([
      fetchPendingOrderSupplier(targetStore, undefined, { statuses: ['PENDING', 'ORDERED'] }),
      supabase
        .from('kirim_barang')
        .select('id, part_number, nama_barang, brand, quantity, status, from_store, to_store, created_at, catatan')
        .eq('to_store', targetStore)
        .in('status', ['pending', 'approved', 'sent'])
        .order('created_at', { ascending: false })
    ]);

    setRequestedOrderSupplierRowsRaw(orderSupplierRows || []);
    if (kirimBarangResult.error) {
      console.error('loadRequestedRows kirim_barang error:', kirimBarangResult.error);
      setRequestedKirimBarangRowsRaw([]);
    } else {
      setRequestedKirimBarangRowsRaw(kirimBarangResult.data || []);
    }
  }, [selectedStore]);

  useEffect(() => {
    loadRequestedRows();
  }, [loadRequestedRows, orderLoading]);

  useEffect(() => {
    const handleCartUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ store?: string }>;
      const targetStore = selectedStore || 'mjm';
      if (customEvent.detail?.store && customEvent.detail.store !== targetStore) return;
      loadRequestedRows();
    };
    window.addEventListener('barangKosongCartUpdated', handleCartUpdate as EventListener);
    return () => {
      window.removeEventListener('barangKosongCartUpdated', handleCartUpdate as EventListener);
    };
  }, [loadRequestedRows, selectedStore]);
  // Refs untuk navigasi antar input
  const supplierRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const requestStockRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch supplier dari barang kosong
  useEffect(() => {
    fetchUniqueSuppliersFromBarangKosong(selectedStore || 'mjm').then(setSupplierOptions);
    fetchLatestSuppliersForParts().then(setLatestSupplierMap);
  }, [selectedStore]);



  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Pilih view sesuai toko
      const viewName = selectedStore === 'mjm' ? 'v_stock_online_mjm' : 'v_stock_online_bjw';
      const { data, error } = await supabase
        .from(viewName)
        .select('*');
      if (error) {
        setMoments([]);
        setLoading(false);
        return;
      }

      const partNumbers = Array.from(
        new Set(
          (data || [])
            .map(row => (row.part_number || '').trim())
            .filter(Boolean)
        )
      );

      const stockMjmMap: Record<string, number> = {};
      const stockBjwMap: Record<string, number> = {};

      const chunkSize = 200;
      for (let i = 0; i < partNumbers.length; i += chunkSize) {
        const chunk = partNumbers.slice(i, i + chunkSize);
        const [mjmResult, bjwResult] = await Promise.all([
          supabase.from('base_mjm').select('part_number, quantity').in('part_number', chunk),
          supabase.from('base_bjw').select('part_number, quantity').in('part_number', chunk)
        ]);

        if (mjmResult.error) {
          console.error('loadData base_mjm error:', mjmResult.error);
        } else {
          (mjmResult.data || []).forEach((row: any) => {
            stockMjmMap[normalizePartNumber(row.part_number || '')] = Number(row.quantity || 0);
          });
        }

        if (bjwResult.error) {
          console.error('loadData base_bjw error:', bjwResult.error);
        } else {
          (bjwResult.data || []).forEach((row: any) => {
            stockBjwMap[normalizePartNumber(row.part_number || '')] = Number(row.quantity || 0);
          });
        }
      }

      // Group by tanggal
      const momentsArr: StockMoment[] = (data || []).map(row => {
        const latest = latestSupplierMap[row.part_number];
        const partNumber = row.part_number || '';
        const normalizedPartNumber = normalizePartNumber(partNumber);
        const stockMjm = Number(stockMjmMap[normalizedPartNumber] ?? 0);
        const stockBjw = Number(stockBjwMap[normalizedPartNumber] ?? 0);
        const selectedStoreStock = selectedStore === 'bjw'
          ? Number(stockBjwMap[normalizedPartNumber] ?? row.stock ?? 0)
          : Number(stockMjmMap[normalizedPartNumber] ?? row.stock ?? 0);
        return {
          partNumber,
          name: row.name,
          brand: row.brand,
          date: row.tanggal,
          stock: selectedStoreStock,
          stockMjm,
          stockBjw,
          qtyOut: row.qty_keluar,
          supplier: {
            supplier: latest?.supplier || row.supplier || 'IMPORTIR MJM',
            lastDate: latest?.date || row.supplier_date || '-',
            lastPrice: row.supplier_price || 0,
            lastPriceCash: row.supplier_price || 0,
            lastPriceTempo: row.supplier_price || 0,
            totalQtyPurchased: 0,
            purchaseCount: 0,
          }
        };
      });
      setMoments(momentsArr);
      setLoading(false);
    };
    loadData();
  }, [selectedStore]); // Dependensi selectedStore agar view berubah sesuai toko

  const supplierPricePartNumbers = React.useMemo(() => {
    const set = new Set<string>();
    moments.forEach(item => {
      const partNumber = (item.partNumber || '').trim();
      if (partNumber) set.add(partNumber);
    });
    requestedOrderSupplierRowsRaw.forEach((row: any) => {
      const partNumber = (row.part_number || '').trim();
      if (partNumber) set.add(partNumber);
    });
    requestedKirimBarangRowsRaw.forEach((row: any) => {
      const partNumber = (row.part_number || '').trim();
      if (partNumber) set.add(partNumber);
    });
    return Array.from(set);
  }, [moments, requestedKirimBarangRowsRaw, requestedOrderSupplierRowsRaw]);

  useEffect(() => {
    let isMounted = true;
    const loadSupplierPrices = async () => {
      const sourceTables = ['barang_masuk_mjm', 'barang_masuk_bjw'];

      if (supplierPricePartNumbers.length === 0) {
        if (isMounted) setSupplierPriceLookup({});
        return;
      }

      const chunkSize = 200;
      const nextLookupWithTs: Record<string, { price: number; ts: number }> = {};

      for (const sourceTable of sourceTables) {
        for (let i = 0; i < supplierPricePartNumbers.length; i += chunkSize) {
          const chunk = supplierPricePartNumbers.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from(sourceTable)
            .select('part_number, customer, harga_satuan, created_at')
            .in('part_number', chunk)
            .not('customer', 'is', null)
            .not('customer', 'eq', '')
            .not('customer', 'eq', '-')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('loadSupplierPrices Error:', error);
            continue;
          }

          (data || []).forEach((row: any) => {
            const partNumber = (row.part_number || '').trim();
            const supplier = (row.customer || '').trim();
            if (!partNumber || !supplier) return;
            const key = makeSupplierPriceKey(partNumber, supplier);
            const price = Math.max(0, Math.floor(Number(row.harga_satuan || 0)));
            const ts = new Date(row.created_at || 0).getTime();
            const safeTs = Number.isFinite(ts) ? ts : 0;
            const prev = nextLookupWithTs[key];
            if (!prev || safeTs > prev.ts) {
              nextLookupWithTs[key] = { price, ts: safeTs };
            }
          });
        }
      }

      const nextLookup: Record<string, number> = {};
      Object.entries(nextLookupWithTs).forEach(([key, value]) => {
        nextLookup[key] = value.price;
      });

      if (isMounted) {
        setSupplierPriceLookup(nextLookup);
      }
    };

    loadSupplierPrices();
    return () => {
      isMounted = false;
    };
  }, [selectedStore, supplierPricePartNumbers]);

  const resolveSupplierCostPrice = React.useCallback((
    partNumber: string,
    supplier: string,
    fallbackPrice?: number
  ): number => {
    const candidates = getSupplierLookupCandidates(supplier);
    for (const candidate of candidates) {
      const key = makeSupplierPriceKey(partNumber, candidate);
      const price = supplierPriceLookup[key];
      if (price != null) return Math.max(0, Math.floor(Number(price || 0)));
    }
    return Math.max(0, Math.floor(Number(fallbackPrice || 0)));
  }, [supplierPriceLookup]);


  const requestedRowsForStockOnline = React.useMemo(
    () =>
      [
        ...requestedOrderSupplierRowsRaw
          .filter(row =>
            String(row.notes || '').toUpperCase().includes('REQUEST DARI STOCK ONLINE') &&
            !String(row.notes || '').toUpperCase().includes('[KIRIM_BARANG_ID:')
          )
          .map(row => ({
            source: 'order_supplier' as const,
            id: String(row.id || ''),
            part_number: row.part_number,
            name: row.name,
            brand: row.brand,
            qty: row.qty,
            cost_price: Number(row.price || 0),
            supplier: row.supplier,
            created_at: row.created_at,
            status: String(row.status || 'PENDING').toLowerCase(),
            request_store: row.store === 'bjw' ? 'bjw' : 'mjm',
            notes: row.notes || ''
          })),
        ...requestedKirimBarangRowsRaw.map(row => ({
          source: 'kirim_barang' as const,
          id: row.id,
          part_number: row.part_number,
          name: row.nama_barang,
          brand: row.brand,
          qty: row.quantity,
          cost_price: extractCostPriceFromCatatan(row.catatan),
          supplier: extractSupplierFromCatatan(row.catatan),
          created_at: row.created_at,
          status: String(row.status || 'pending').toLowerCase(),
          request_store: row.to_store === 'bjw' ? 'bjw' : 'mjm',
          notes: row.catatan || ''
        }))
      ],
    [requestedKirimBarangRowsRaw, requestedOrderSupplierRowsRaw]
  );

  const requestedPartNumbersByStore = React.useMemo(() => {
    const partNumbers = {
      mjm: new Set<string>(),
      bjw: new Set<string>()
    };

    requestedRowsForStockOnline.forEach(row => {
      const partNumber = (row.part_number || '').trim();
      if (!partNumber) return;
      const store: 'mjm' | 'bjw' = row.request_store === 'bjw' ? 'bjw' : 'mjm';
      partNumbers[store].add(partNumber);
    });

    return {
      mjm: Array.from(partNumbers.mjm),
      bjw: Array.from(partNumbers.bjw)
    };
  }, [requestedRowsForStockOnline]);

  useEffect(() => {
    let isMounted = true;

    const loadRequestedCurrentStock = async () => {
      const nextStockMap: Record<string, number> = {};
      const chunkSize = 200;

      const fetchStoreStock = async (store: 'mjm' | 'bjw', partNumbers: string[]) => {
        if (partNumbers.length === 0) return;
        const table = store === 'bjw' ? 'base_bjw' : 'base_mjm';

        for (let i = 0; i < partNumbers.length; i += chunkSize) {
          const chunk = partNumbers.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from(table)
            .select('part_number, quantity')
            .in('part_number', chunk);

          if (error) {
            console.error(`loadRequestedCurrentStock ${table} error:`, error);
            continue;
          }

          (data || []).forEach((row: any) => {
            const key = buildRequestedStockKey(store, row.part_number || '');
            nextStockMap[key] = Number(row.quantity || 0);
          });
        }
      };

      await Promise.all([
        fetchStoreStock('mjm', requestedPartNumbersByStore.mjm),
        fetchStoreStock('bjw', requestedPartNumbersByStore.bjw)
      ]);

      // Part number yang tidak ada di base dianggap 0 agar tampilan tidak '-'.
      requestedRowsForStockOnline.forEach(row => {
        const partNumber = (row.part_number || '').trim();
        if (!partNumber) return;
        const store: 'mjm' | 'bjw' = row.request_store === 'bjw' ? 'bjw' : 'mjm';
        const key = buildRequestedStockKey(store, partNumber);
        if (!Object.prototype.hasOwnProperty.call(nextStockMap, key)) {
          nextStockMap[key] = 0;
        }
      });

      if (isMounted) {
        setRequestedCurrentStockMap(nextStockMap);
      }
    };

    loadRequestedCurrentStock();

    return () => {
      isMounted = false;
    };
  }, [requestedPartNumbersByStore, requestedRowsForStockOnline]);

  const latestMomentByPart = React.useMemo(() => {
    const map: Record<string, StockMoment> = {};
    const sortedMoments = [...moments].sort((a, b) => b.date.localeCompare(a.date));
    sortedMoments.forEach(moment => {
      const normalizedPartNumber = normalizePartNumber(moment.partNumber || '');
      if (!normalizedPartNumber) return;
      if (!map[normalizedPartNumber]) map[normalizedPartNumber] = moment;
    });
    return map;
  }, [moments]);

  const requestedStockRows: RequestedStockRow[] = React.useMemo(
    () =>
      requestedRowsForStockOnline
        .map(row => {
          const partNumber = (row.part_number || '').trim();
          const normalizedPartNumber = normalizePartNumber(partNumber);
          const latestMoment = latestMomentByPart[normalizedPartNumber];
          const requestStore: 'mjm' | 'bjw' = row.request_store === 'bjw' ? 'bjw' : 'mjm';
          const stockKey = buildRequestedStockKey(requestStore, partNumber);
          const hasStockInBase = Object.prototype.hasOwnProperty.call(requestedCurrentStockMap, stockKey);
          const stockFromBase = hasStockInBase ? Number(requestedCurrentStockMap[stockKey] || 0) : null;
          const requestDateRaw = row.created_at || '';
          const fallbackPriceFromLatestMoment = Number(latestMoment?.supplier?.lastPrice || 0);
          const resolvedCostPrice = resolveSupplierCostPrice(
            partNumber,
            row.supplier || latestMoment?.supplier?.supplier || '',
            Number(row.cost_price || fallbackPriceFromLatestMoment)
          );
          return {
            source: row.source,
            id: String(row.id || ''),
            partNumber,
            name: latestMoment?.name || row.name || '-',
            brand: latestMoment?.brand || row.brand || '-',
            stock: stockFromBase ?? (typeof latestMoment?.stock === 'number' ? latestMoment.stock : 0),
            qty: Number(row.qty || 0),
            costPrice: resolvedCostPrice,
            supplier: row.supplier || '-',
            requestDate: requestDateRaw ? requestDateRaw.slice(0, 10) : '-',
            requestDateRaw,
            requestStore,
            status: String(row.status || '').toLowerCase(),
            notes: String(row.notes || '')
          };
        })
        .filter(row => row.id !== '' && row.partNumber !== '')
        .sort((a, b) => new Date(b.requestDateRaw).getTime() - new Date(a.requestDateRaw).getTime()),
    [latestMomentByPart, requestedCurrentStockMap, requestedRowsForStockOnline, resolveSupplierCostPrice]
  );

  const requestedPartNumbers = React.useMemo(() => {
    const partSet = new Set<string>();
    requestedStockRows.forEach(row => {
      if (row.partNumber) partSet.add(row.partNumber);
    });
    return partSet;
  }, [requestedStockRows]);

  const getRequestedRowKey = React.useCallback((row: RequestedStockRow) => {
    return `${row.source}:${row.id}`;
  }, []);

  useEffect(() => {
    setRequestedRowEditState(prev => {
      const activeKeys = new Set(requestedStockRows.map(getRequestedRowKey));
      const next: Record<string, { editing: boolean; qty: number; costPrice: number }> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (activeKeys.has(key)) next[key] = value;
      });
      return next;
    });
  }, [getRequestedRowKey, requestedStockRows]);

  const handleDeleteRequestedRow = React.useCallback(async (row: RequestedStockRow) => {
    const rowKey = getRequestedRowKey(row);
    const actionKey = `${rowKey}:delete`;
    const canMutate = row.source === 'order_supplier'
      ? canMutateOrderSupplier(row.status)
      : canEditOrDeleteKirimBarang(row.status);
    if (!canMutate) {
      alert('Item dengan status ini tidak bisa dihapus dari tabel Sudah Request.');
      return;
    }

    const confirmed = confirm(`Hapus request ${row.partNumber} dari daftar Sudah Request?`);
    if (!confirmed) return;

    setRequestedRowActionLoading(actionKey);
    try {
      if (row.source === 'order_supplier') {
        const orderId = Number(row.id);
        if (!Number.isFinite(orderId)) throw new Error('ID order_supplier tidak valid.');
        const { error } = await supabase
          .from('order_supplier')
          .delete()
          .eq('id', orderId)
          .in('status', ['PENDING', 'ORDERED']);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kirim_barang')
          .delete()
          .eq('id', row.id)
          .in('status', ['pending', 'approved']);
        if (error) throw error;
      }
      await loadRequestedRows();
      emitBarangKosongCartSync();
    } catch (error: any) {
      console.error('handleDeleteRequestedRow Error:', error);
      alert(`Gagal hapus item: ${error?.message || 'Unknown error'}`);
    } finally {
      setRequestedRowActionLoading(null);
    }
  }, [emitBarangKosongCartSync, getRequestedRowKey, loadRequestedRows]);

  const handleStartEditRequestedRow = React.useCallback((row: RequestedStockRow) => {
    const rowKey = getRequestedRowKey(row);
    setRequestedRowEditState(prev => ({
      ...prev,
      [rowKey]: {
        editing: true,
        qty: Math.max(1, Math.floor(Number(row.qty || 0))),
        costPrice: Math.max(0, Math.floor(Number(row.costPrice || 0)))
      }
    }));
  }, [getRequestedRowKey]);

  const handleCancelEditRequestedRow = React.useCallback((row: RequestedStockRow) => {
    const rowKey = getRequestedRowKey(row);
    setRequestedRowEditState(prev => ({
      ...prev,
      [rowKey]: {
        editing: false,
        qty: Math.max(1, Math.floor(Number(row.qty || 0))),
        costPrice: Math.max(0, Math.floor(Number(row.costPrice || 0)))
      }
    }));
  }, [getRequestedRowKey]);

  const handleSaveRequestedRowQty = React.useCallback(async (row: RequestedStockRow) => {
    const rowKey = getRequestedRowKey(row);
    const actionKey = `${rowKey}:save`;
    const editState = requestedRowEditState[rowKey];
    const nextQty = Math.max(0, Math.floor(Number(editState?.qty || 0)));
    const nextCostPrice = Math.max(0, Math.floor(Number(editState?.costPrice || 0)));
    const canMutate = row.source === 'order_supplier'
      ? canMutateOrderSupplier(row.status)
      : canEditOrDeleteKirimBarang(row.status);

    if (!canMutate) {
      alert('Item dengan status ini tidak bisa diedit qty/harga modal.');
      return;
    }

    if (nextQty <= 0) {
      alert('Qty harus lebih dari 0. Gunakan tombol hapus jika ingin menghapus item.');
      return;
    }

    setRequestedRowActionLoading(actionKey);
    try {
      if (row.source === 'order_supplier') {
        const orderId = Number(row.id);
        if (!Number.isFinite(orderId)) throw new Error('ID order_supplier tidak valid.');
        const { error } = await supabase
          .from('order_supplier')
          .update({ qty: nextQty, price: nextCostPrice })
          .eq('id', orderId)
          .in('status', ['PENDING', 'ORDERED']);
        if (error) throw error;
      } else {
        const updatedCatatan = upsertCostPriceInCatatan(row.notes, row.supplier, nextCostPrice);
        const { error } = await supabase
          .from('kirim_barang')
          .update({ quantity: nextQty, catatan: updatedCatatan })
          .eq('id', row.id)
          .in('status', ['pending', 'approved']);
        if (error) throw error;
      }

      setRequestedRowEditState(prev => ({
        ...prev,
        [rowKey]: { editing: false, qty: nextQty, costPrice: nextCostPrice }
      }));
      await loadRequestedRows();
      emitBarangKosongCartSync();
    } catch (error: any) {
      console.error('handleSaveRequestedRowQty Error:', error);
      alert(`Gagal update qty: ${error?.message || 'Unknown error'}`);
    } finally {
      setRequestedRowActionLoading(null);
    }
  }, [emitBarangKosongCartSync, getRequestedRowKey, loadRequestedRows, requestedRowEditState]);

  const handleCompleteRequestedRow = React.useCallback(async (row: RequestedStockRow) => {
    const rowKey = getRequestedRowKey(row);
    const actionKey = `${rowKey}:done`;
    const editState = requestedRowEditState[rowKey];
    if (editState?.editing) {
      alert('Simpan dulu perubahan qty sebelum menekan Selesai.');
      return;
    }

    const confirmed = confirm(
      `Tandai selesai request ${row.partNumber} (qty ${row.qty})?\nStok akan ditambahkan ke base ${row.requestStore.toUpperCase()}.`
    );
    if (!confirmed) return;

    setRequestedRowActionLoading(actionKey);
    try {
      let successMsg = 'Request selesai. Stok base toko peminta sudah ditambahkan.';
      if (row.source === 'order_supplier') {
        const orderId = Number(row.id);
        if (!Number.isFinite(orderId)) throw new Error('ID order_supplier tidak valid.');

        const completeResult = await completeOrderSupplierRequest({
          orderId,
          store: row.requestStore,
          partNumber: row.partNumber,
          name: row.name,
          brand: row.brand,
          qty: row.qty,
          costPrice: row.costPrice,
          supplier: row.supplier,
          completedBy: userName || 'system'
        });
        if (!completeResult.success) {
          throw new Error(completeResult.msg || 'Gagal menyelesaikan request supplier.');
        }
        successMsg = completeResult.msg || successMsg;
      } else {
        const { receiveKirimBarang } = await import('../../services/kirimBarangService');
        const result = await receiveKirimBarang(row.id, userName || 'system');
        if (!result.success) throw new Error(result.error || 'Gagal menyelesaikan kirim barang.');
      }

      await loadRequestedRows();
      emitBarangKosongCartSync();
      alert(successMsg);
    } catch (error: any) {
      console.error('handleCompleteRequestedRow Error:', error);
      alert(`Gagal menyelesaikan request: ${error?.message || 'Unknown error'}`);
    } finally {
      setRequestedRowActionLoading(null);
    }
  }, [emitBarangKosongCartSync, getRequestedRowKey, loadRequestedRows, requestedRowEditState, userName]);

  const latestDates = React.useMemo(() => getLastNDates(LAST_N_DATES), []);

  const latestDateSet = React.useMemo(() => new Set(latestDates), [latestDates]);

  useEffect(() => {
    setCollapsedByDate(prev => {
      const next: Record<string, boolean> = {};
      latestDates.forEach(date => {
        next[date] = prev[date] ?? false;
      });
      return next;
    });
  }, [latestDates]);

  // Filter by search + hide items already requested (moved to side table) + keep only latest N dates
  const searchLower = search.trim().toLowerCase();
  const momentsByDate: Record<string, StockMoment[]> = {};
  latestDates.forEach(date => {
    momentsByDate[date] = [];
  });
  moments.forEach(m => {
    if (!latestDateSet.has(m.date)) return;
    if (requestedPartNumbers.has(m.partNumber)) return;
    if (
      !searchLower ||
      m.partNumber.toLowerCase().includes(searchLower) ||
      m.name.toLowerCase().includes(searchLower) ||
      m.brand.toLowerCase().includes(searchLower)
    ) {
      momentsByDate[m.date].push(m);
    }
  });

  const sortedDates = latestDates;
  const hasRequestedRows = requestedStockRows.length > 0;
  const primaryStockLabel = 'Stok MJM';
  const compareStockLabel = 'Stok BJW';

  return (
    <div className="p-6 text-gray-100 min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-green-950">
      <h2 className="text-2xl font-extrabold mb-6 flex items-center gap-3 tracking-tight">
        <Package size={28} className="text-green-400 drop-shadow" />
        <span>Stock Online <span className="text-green-300">7 Hari Terakhir</span> <span className="text-xs font-normal text-gray-400">(Stok 2, 1, 0)</span></span>
      </h2>
      <div className="mb-6 flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari part number, nama, brand..."
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-100 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500 text-xs shadow"
        />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-green-400 mr-3" size={24} />
          <span className="text-base font-semibold tracking-wide">Memuat stock online...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4 items-start">
          <div className="space-y-10">
            {sortedDates.map(date => (
            <section key={date} className="bg-gradient-to-br from-gray-900 via-gray-950 to-green-950 rounded-2xl border border-green-900/40 shadow-2xl p-4">
              <div className="mb-3 flex items-center gap-3 justify-between flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-300 drop-shadow">{date}</span>
                  <span className="text-xs bg-green-900/60 text-green-200 px-2 py-0.5 rounded-full font-semibold shadow">{momentsByDate[date].length} barang</span>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <button
                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-white rounded shadow transition-all"
                    title={collapsedByDate[date] ? 'Buka tabel tanggal ini' : 'Minimize tabel tanggal ini'}
                    onClick={() => {
                      setCollapsedByDate(prev => ({
                        ...prev,
                        [date]: !prev[date]
                      }));
                    }}
                  >
                    {collapsedByDate[date] ? (
                      <><ChevronDown size={14} /> Buka</>
                    ) : (
                      <><ChevronUp size={14} /> Minimize</>
                    )}
                  </button>
                  <button className="flex items-center gap-1 px-2 py-1 bg-green-700 hover:bg-green-800 text-xs text-white rounded shadow transition-all" title="Export Excel">
                    <FileDown size={14} /> Export
                  </button>
                  <button
                    className="flex items-center gap-1 px-2 py-1 bg-blue-700 hover:bg-blue-800 text-xs text-white rounded shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Order Request"
                    disabled={orderLoading === date || momentsByDate[date].length === 0}
                    onClick={async () => {
                      setOrderLoading(date);
                      try {
                        // Ambil semua barang di tanggal ini, hanya yang requestStock > 0
                        const items = momentsByDate[date].map((m, idx) => {
                          const rowKey = m.partNumber + m.date + idx;
                          const rowEdit = editData[rowKey] || {
                            requestStock: typeof m.requestStock === 'number' ? m.requestStock : 0,
                            supplier: m.supplier?.supplier || supplierOptions[0] || '',
                          };
                          const resolvedCostPrice = resolveSupplierCostPrice(
                            m.partNumber,
                            rowEdit.supplier,
                            Number(m.supplier?.lastPrice || 0)
                          );
                          return {
                            ...m,
                            requestStock: rowEdit.requestStock,
                            supplier: rowEdit.supplier,
                            lastPrice: resolvedCostPrice
                          };
                        }).filter(item => item.requestStock > 0);

                        // Group items by supplier (case-insensitive key, keep original supplier name)
                        const supplierGroups: Record<string, { supplier: string; items: typeof items }> = {};
                        for (const item of items) {
                          const supplierRaw = (item.supplier || '').trim();
                          if (!supplierRaw) continue;
                          const supplierKey = normalizeSupplierName(supplierRaw);
                          if (!supplierGroups[supplierKey]) {
                            supplierGroups[supplierKey] = { supplier: supplierRaw, items: [] };
                          }
                          supplierGroups[supplierKey].items.push(item);
                        }

                        let successCount = 0;
                        const { saveOrderSupplier } = await import('../../services/supabaseService');

                        // MJM/IMPORTIR MJM: Kirim ke kirimBarang, lainnya ke keranjang barang kosong + order_supplier
                        for (const supplierKey of Object.keys(supplierGroups)) {
                          const supplierGroup = supplierGroups[supplierKey];
                          const supplierName = supplierGroup.supplier;
                          const groupItems = supplierGroup.items;
                          const kirimBarangRoute = resolveKirimBarangRoute(selectedStore, supplierName);

                          if (kirimBarangRoute) {
                            const { createKirimBarangRequest } = await import('../../services/kirimBarangService');
                            for (const item of groupItems) {
                              await createKirimBarangRequest({
                                from_store: kirimBarangRoute.from_store,
                                to_store: kirimBarangRoute.to_store,
                                part_number: item.partNumber,
                                nama_barang: item.name,
                                brand: item.brand,
                                application: '',
                                quantity: item.requestStock || 1,
                                catatan: `Request dari Stock Online ${date} | Supplier: ${supplierName} | Harga Modal: ${Math.max(0, Math.floor(Number(item.lastPrice || 0)))}`,
                                requested_by: 'system'
                              });
                              successCount++;
                            }
                            continue;
                          }

                          const orderItems = groupItems.map(item => ({
                            partNumber: item.partNumber,
                            name: item.name,
                            qty: item.requestStock || 1,
                            price: item.lastPrice || 0
                          }));
                          const targetStore = selectedStore || 'mjm';
                          const ok = await saveOrderSupplier(
                            targetStore,
                            supplierName,
                            orderItems,
                            `Request dari Stock Online ${date}`
                          );
                          if (ok) {
                            mergeItemsToBarangKosongCart(targetStore, supplierName, orderItems);
                            successCount += orderItems.length;
                          }
                        }

                        if (successCount > 0) {
                          alert('Barang berhasil dimasukkan ke keranjang/request sesuai supplier!');
                        } else {
                          alert('Tidak ada barang yang diisi request stok!');
                        }
                      } catch (error) {
                        console.error('Order Request Error:', error);
                        alert('Gagal memproses order request. Silakan coba lagi.');
                      } finally {
                        setOrderLoading(null);
                      }
                    }}
                  >
                    {orderLoading === date ? (
                      <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={14} /> Loading...</span>
                    ) : (
                      <><ShoppingCart size={14} /> Order Request</>
                    )}
                  </button>
                </div>
              </div>
              {collapsedByDate[date] ? (
                <div className="border border-green-900/30 rounded-lg bg-gray-900/40 px-3 py-4 text-center text-xs text-gray-400">
                  Tabel tanggal {date} sedang di-minimize.
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-transparent text-gray-100 text-xs font-normal border border-green-900/40 rounded-xl shadow-xl" style={{borderCollapse:'collapse', fontSize:'12px'}}>
                  <thead className="bg-green-900/80 text-green-100 sticky top-0 z-10 shadow">
                    <tr>
                      <th className="px-3 py-2 border border-green-800 text-left font-bold tracking-wide">Part Number</th>
                      <th className="px-3 py-2 border border-green-800 text-left font-bold tracking-wide">Nama Barang</th>
                      <th className="px-3 py-2 border border-green-800 text-left font-bold tracking-wide">Brand</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">{primaryStockLabel}</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">{compareStockLabel}</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">Qty Keluar</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">Supplier Terakhir</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">Harga Modal</th>
                      <th className="px-3 py-2 border border-green-800 text-center font-bold tracking-wide">Request Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momentsByDate[date].map((m, idx) => {
                      const rowKey = m.partNumber + m.date + idx;
                      const rowEdit = editData[rowKey] || {
                        requestStock: typeof m.requestStock === 'number' ? m.requestStock : 0,
                        supplier: m.supplier?.supplier || supplierOptions[0] || '',
                        editingSupplier: false,
                      };
                      const rowCostPrice = resolveSupplierCostPrice(
                        m.partNumber,
                        rowEdit.supplier,
                        Number(m.supplier?.lastPrice || 0)
                      );
                      const primaryStock = Number(m.stockMjm ?? m.stock ?? 0);
                      const compareStock = Number(m.stockBjw ?? 0);
                      return (
                        <tr
                          key={rowKey}
                          className={`transition-colors ${idx % 2 === 0 ? 'bg-gray-900/70' : 'bg-gray-800/60'} hover:bg-green-900/20 border border-green-900/30`}
                        >
	                          <td className="px-3 py-2 font-mono text-blue-300 border border-green-900/20 font-bold whitespace-nowrap">
	                            {m.partNumber}
	                          </td>
                          <td className="px-3 py-2 border border-green-900/20">{m.name}</td>
                          <td className="px-3 py-2 border border-green-900/20">{m.brand}</td>
                          <td className={`px-3 py-2 text-center font-extrabold border border-green-900/20 ${primaryStock === 0 ? 'text-red-400' : primaryStock <= 2 ? 'text-yellow-300' : 'text-green-300'}`}>{primaryStock}</td>
                          <td className={`px-3 py-2 text-center font-bold border border-green-900/20 ${compareStock === 0 ? 'text-red-400' : compareStock <= 2 ? 'text-yellow-300' : 'text-blue-300'}`}>{compareStock}</td>
                          <td className="px-3 py-2 text-center text-green-300 border border-green-900/20 font-bold">{m.qtyOut}</td>
                          <td className="px-3 py-2 text-center border border-green-900/20">
                            {rowEdit.editingSupplier ? (
                              <div className="relative">
                                <input
                                  ref={el => { supplierRefs.current[rowKey] = el; }}
                                  className="bg-gray-800 text-cyan-300 text-xs rounded px-2 py-1 border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-32"
                                  list={`supplier-list-${rowKey}`}
                                  value={rowEdit.supplier}
                                  autoFocus
                                  onBlur={e => {
                                    setEditData(prev => ({
                                      ...prev,
                                      [rowKey]: { ...rowEdit, editingSupplier: false }
                                    }));
                                    setMoments(prev => prev.map(m => {
                                      if ((m.partNumber + m.date + idx) === rowKey) {
                                        return {
                                          ...m,
                                          supplier: {
                                            ...m.supplier,
                                            supplier: e.target.value
                                          }
                                        };
                                      }
                                      return m;
                                    }));
                                  }}
                                  onChange={e => setEditData(prev => ({
                                    ...prev,
                                    [rowKey]: { ...rowEdit, supplier: e.target.value }
                                  }))}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
                                      e.preventDefault();
                                      setEditData(prev => ({
                                        ...prev,
                                        [rowKey]: { ...rowEdit, editingSupplier: false }
                                      }));
                                      setMoments(prev => prev.map(m => {
                                        if ((m.partNumber + m.date + idx) === rowKey) {
                                          return {
                                            ...m,
                                            supplier: {
                                              ...m.supplier,
                                              supplier: (e.target as HTMLInputElement).value
                                            }
                                          };
                                        }
                                        return m;
                                      }));
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      setEditData(prev => ({
                                        ...prev,
                                        [rowKey]: { ...rowEdit, editingSupplier: false }
                                      }));
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      const nextRow = momentsByDate[date][idx + 1];
                                      if (nextRow) {
                                        setEditData(prev => ({
                                          ...prev,
                                          [(nextRow.partNumber + nextRow.date + (idx + 1))]: {
                                            ...editData[(nextRow.partNumber + nextRow.date + (idx + 1))] || {
                                              requestStock: typeof nextRow.requestStock === 'number' ? nextRow.requestStock : 0,
                                              supplier: nextRow.supplier?.supplier || supplierOptions[0] || '',
                                            },
                                            editingSupplier: true
                                          },
                                          [rowKey]: { ...rowEdit, editingSupplier: false }
                                        }));
                                        setTimeout(() => {
                                          supplierRefs.current[nextRow.partNumber + nextRow.date + (idx + 1)]?.focus();
                                        }, 10);
                                      }
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      const prevRow = momentsByDate[date][idx - 1];
                                      if (prevRow) {
                                        setEditData(prev => ({
                                          ...prev,
                                          [(prevRow.partNumber + prevRow.date + (idx - 1))]: {
                                            ...editData[(prevRow.partNumber + prevRow.date + (idx - 1))] || {
                                              requestStock: typeof prevRow.requestStock === 'number' ? prevRow.requestStock : 0,
                                              supplier: prevRow.supplier?.supplier || supplierOptions[0] || '',
                                            },
                                            editingSupplier: true
                                          },
                                          [rowKey]: { ...rowEdit, editingSupplier: false }
                                        }));
                                        setTimeout(() => {
                                          supplierRefs.current[prevRow.partNumber + prevRow.date + (idx - 1)]?.focus();
                                        }, 10);
                                      }
                                    } else if (e.key === 'ArrowRight') {
                                      e.preventDefault();
                                      setEditData(prev => ({
                                        ...prev,
                                        [rowKey]: { ...rowEdit, editingSupplier: false }
                                      }));
                                      setTimeout(() => {
                                        requestStockRefs.current[rowKey]?.focus();
                                      }, 10);
                                    }
                                  }}
                                  placeholder="Cari supplier..."
                                />
                                <datalist id={`supplier-list-${rowKey}`}>
                                  {supplierOptions.map(opt => (
                                    <option key={opt} value={opt} />
                                  ))}
                                </datalist>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer inline-block px-2 py-1 rounded hover:bg-cyan-900/30 text-cyan-300 text-xs border border-transparent hover:border-cyan-700"
                                title="Klik untuk ganti supplier"
                                onClick={() => setEditData(prev => ({
                                  ...prev,
                                  [rowKey]: { ...rowEdit, editingSupplier: true }
                                }))}
                              >
                                {m.supplier?.supplier || supplierOptions[0] || '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right border border-green-900/20 text-emerald-300 font-semibold whitespace-nowrap">
                            {formatIDR(rowCostPrice)}
                          </td>
                          <td className="px-3 py-2 text-center border border-green-900/20">
                            <input
                              ref={el => { requestStockRefs.current[rowKey] = el; }}
                              type="number"
                              min={0}
                              className="w-16 bg-gray-800 text-green-300 text-xs rounded px-2 py-1 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                              value={rowEdit.requestStock}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setEditData(prev => ({
                                  ...prev,
                                  [rowKey]: { ...rowEdit, requestStock: val }
                                }));
                              }}
                              onKeyDown={e => {
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const prevRow = momentsByDate[date][idx - 1];
                                  if (prevRow) {
                                    setTimeout(() => {
                                      requestStockRefs.current[prevRow.partNumber + prevRow.date + (idx - 1)]?.focus();
                                    }, 10);
                                  }
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const nextRow = momentsByDate[date][idx + 1];
                                  if (nextRow) {
                                    setTimeout(() => {
                                      requestStockRefs.current[nextRow.partNumber + nextRow.date + (idx + 1)]?.focus();
                                    }, 10);
                                  }
                                } else if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  setEditData(prev => ({
                                    ...prev,
                                    [rowKey]: { ...rowEdit, editingSupplier: true }
                                  }));
                                  setTimeout(() => {
                                    supplierRefs.current[rowKey]?.focus();
                                  }, 10);
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
	                  </tbody>
	                </table>
	              </div>
              )}
		            </section>
		            ))}
	        </div>
          <section className="bg-gradient-to-br from-gray-900 via-gray-950 to-blue-950 rounded-2xl border border-blue-900/40 shadow-2xl p-4 xl:sticky xl:top-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-blue-300">Sudah Request</h3>
              <span className="text-xs bg-blue-900/60 text-blue-200 px-2 py-0.5 rounded-full font-semibold">
                {requestedStockRows.length} barang
              </span>
            </div>
            {requestedStockRows.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-6 border border-blue-900/30 rounded-lg bg-gray-900/40">
                Belum ada item yang di-order request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-transparent text-gray-100 text-xs font-normal border border-blue-900/40 rounded-xl shadow-xl" style={{ borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead className="bg-blue-900/80 text-blue-100 sticky top-0 z-10 shadow">
                    <tr>
                      <th className="px-2 py-2 border border-blue-800 text-left font-bold tracking-wide">Part Number</th>
                      <th className="px-2 py-2 border border-blue-800 text-left font-bold tracking-wide">Nama Barang</th>
                      <th className="px-2 py-2 border border-blue-800 text-left font-bold tracking-wide">Brand</th>
                      <th className="px-2 py-2 border border-blue-800 text-center font-bold tracking-wide">Stok Saat Ini</th>
                      <th className="px-2 py-2 border border-blue-800 text-center font-bold tracking-wide">Qty Request</th>
                      <th className="px-2 py-2 border border-blue-800 text-center font-bold tracking-wide">Harga Modal</th>
                      <th className="px-2 py-2 border border-blue-800 text-left font-bold tracking-wide">Supplier</th>
                      <th className="px-2 py-2 border border-blue-800 text-center font-bold tracking-wide">Tanggal Request</th>
                      <th className="px-2 py-2 border border-blue-800 text-center font-bold tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestedStockRows.map((row, idx) => {
                      const rowKey = getRequestedRowKey(row);
                      const editState = requestedRowEditState[rowKey] || {
                        editing: false,
                        qty: Math.max(1, Math.floor(Number(row.qty || 0))),
                        costPrice: Math.max(0, Math.floor(Number(row.costPrice || 0)))
                      };
                      const isEditing = editState.editing;
                      const canMutate = row.source === 'order_supplier'
                        ? canMutateOrderSupplier(row.status)
                        : canEditOrDeleteKirimBarang(row.status);
                      const isSaving = requestedRowActionLoading === `${rowKey}:save`;
                      const isDeleting = requestedRowActionLoading === `${rowKey}:delete`;
                      const isCompleting = requestedRowActionLoading === `${rowKey}:done`;

                      return (
                        <tr
                          key={`${rowKey}-${row.partNumber}-${idx}`}
                          className={`transition-colors ${idx % 2 === 0 ? 'bg-gray-900/70' : 'bg-gray-800/60'} hover:bg-blue-900/20 border border-blue-900/30`}
                        >
                          <td className="px-2 py-2 font-mono text-blue-300 border border-blue-900/20 font-bold whitespace-nowrap">{row.partNumber}</td>
                          <td className="px-2 py-2 border border-blue-900/20">{row.name}</td>
                          <td className="px-2 py-2 border border-blue-900/20">{row.brand}</td>
                          <td className="px-2 py-2 text-center border border-blue-900/20 font-bold">
                            {typeof row.stock === 'number' ? row.stock : '-'}
                          </td>
                          <td className="px-2 py-2 text-center border border-blue-900/20 text-green-300 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                value={editState.qty}
                                className="w-16 bg-gray-800 text-green-300 text-xs rounded px-2 py-1 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                                onChange={e => {
                                  const nextQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setRequestedRowEditState(prev => ({
                                    ...prev,
                                    [rowKey]: { ...editState, qty: nextQty }
                                  }));
                                }}
                              />
                            ) : (
                              row.qty
                            )}
                          </td>
                          <td className="px-2 py-2 text-center border border-blue-900/20 text-emerald-300 font-semibold">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editState.costPrice}
                                className="w-24 bg-gray-800 text-emerald-300 text-xs rounded px-2 py-1 border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                                onChange={e => {
                                  const nextPrice = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setRequestedRowEditState(prev => ({
                                    ...prev,
                                    [rowKey]: { ...editState, costPrice: nextPrice }
                                  }));
                                }}
                              />
                            ) : (
                              formatIDR(row.costPrice)
                            )}
                          </td>
                          <td className="px-2 py-2 border border-blue-900/20 text-cyan-300">{row.supplier}</td>
                          <td className="px-2 py-2 text-center border border-blue-900/20 text-gray-300">{row.requestDate}</td>
                          <td className="px-2 py-2 border border-blue-900/20">
                            <div className="flex items-center justify-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    className="p-1 rounded bg-green-700/80 hover:bg-green-700 text-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Simpan qty dan harga modal"
                                    onClick={() => handleSaveRequestedRowQty(row)}
                                    disabled={isSaving || isDeleting || isCompleting}
                                  >
                                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                  </button>
                                  <button
                                    className="p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Batal edit"
                                    onClick={() => handleCancelEditRequestedRow(row)}
                                    disabled={isSaving || isDeleting || isCompleting}
                                  >
                                    <XCircle size={13} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="p-1 rounded bg-blue-700/80 hover:bg-blue-700 text-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={canMutate ? 'Edit qty & harga modal' : 'Qty/harga modal tidak bisa diedit pada status ini'}
                                  onClick={() => handleStartEditRequestedRow(row)}
                                  disabled={!canMutate || isSaving || isDeleting || isCompleting}
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                              <button
                                className="p-1 rounded bg-red-700/80 hover:bg-red-700 text-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={canMutate ? 'Hapus item request' : 'Item ini tidak bisa dihapus pada status ini'}
                                onClick={() => handleDeleteRequestedRow(row)}
                                disabled={!canMutate || isSaving || isDeleting || isCompleting}
                              >
                                {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                              </button>
                              <button
                                className="p-1 rounded bg-emerald-700/80 hover:bg-emerald-700 text-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={`Selesai: tambah stok ke base ${row.requestStore.toUpperCase()}`}
                                onClick={() => handleCompleteRequestedRow(row)}
                                disabled={isSaving || isDeleting || isCompleting}
                              >
                                {isCompleting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
	      )}
	    </div>
	  );
};

export default StockOnlineView;
