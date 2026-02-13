-- Migration: Update stock online views to 7-day window
-- This updates both MJM and BJW stock online views to use the last 7 dates.

DROP VIEW IF EXISTS v_stock_online_mjm;

CREATE VIEW v_stock_online_mjm AS
SELECT
  i.part_number,
  i.name,
  i.brand,
  i.quantity AS stock,
  s.qty_keluar,
  s.tanggal,
  bm.customer AS supplier,
  bm.created_at AS supplier_date,
  bm.harga_satuan AS supplier_price
FROM base_mjm i
JOIN (
  SELECT part_number, SUM(qty_keluar) AS qty_keluar, created_at::date AS tanggal
  FROM barang_keluar_mjm
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY part_number, created_at::date
) s ON i.part_number = s.part_number
LEFT JOIN LATERAL (
  SELECT customer, created_at, harga_satuan
  FROM barang_masuk_mjm
  WHERE part_number = i.part_number AND customer IS NOT NULL AND customer <> '' AND customer <> '-'
  ORDER BY created_at DESC
  LIMIT 1
) bm ON TRUE
WHERE i.quantity BETWEEN 0 AND 2
ORDER BY s.tanggal DESC, i.part_number;

DROP VIEW IF EXISTS v_stock_online_bjw;

CREATE VIEW v_stock_online_bjw AS
SELECT
  i.part_number,
  i.name,
  i.brand,
  i.quantity AS stock,
  s.qty_keluar,
  s.tanggal,
  bm.customer AS supplier,
  bm.created_at AS supplier_date,
  bm.harga_satuan AS supplier_price
FROM base_bjw i
JOIN (
  SELECT part_number, SUM(qty_keluar) AS qty_keluar, created_at::date AS tanggal
  FROM barang_keluar_bjw
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY part_number, created_at::date
) s ON i.part_number = s.part_number
LEFT JOIN LATERAL (
  SELECT customer, created_at, harga_satuan
  FROM barang_masuk_bjw
  WHERE part_number = i.part_number AND customer IS NOT NULL AND customer <> '' AND customer <> '-'
  ORDER BY created_at DESC
  LIMIT 1
) bm ON TRUE
WHERE i.quantity BETWEEN 0 AND 2
ORDER BY s.tanggal DESC, i.part_number;

-- Usage:
-- SELECT * FROM v_stock_online_mjm;
-- SELECT * FROM v_stock_online_bjw;
