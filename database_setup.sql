-- ========================================
-- SQL Script untuk Setup Multi-Store Database
-- ========================================
-- 
-- Script ini akan membuat semua tabel yang diperlukan untuk
-- toko MJM dan BJW berdasarkan schema tabel yang sudah ada.
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste script ini
-- 3. Jalankan (Run)
--
-- ========================================

-- BAGIAN 1: Buat Tabel Base (Inventory Utama)
-- ========================================

-- Tabel base_mjm untuk toko MJM86
CREATE TABLE IF NOT EXISTS base_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    quantity INTEGER DEFAULT 0,
    shelf TEXT,
    image_url TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel base_bjw untuk toko BJW
CREATE TABLE IF NOT EXISTS base_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    quantity INTEGER DEFAULT 0,
    shelf TEXT,
    image_url TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 2: Barang Masuk (Incoming Stock)
-- ========================================

CREATE TABLE IF NOT EXISTS barang_masuk_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tempo TEXT,
    keterangan TEXT,
    ecommerce TEXT,
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    rak TEXT,
    stock_ahir INTEGER,
    qty_masuk INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    customer TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barang_masuk_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tempo TEXT,
    keterangan TEXT,
    ecommerce TEXT,
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    rak TEXT,
    stock_ahir INTEGER,
    qty_masuk INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    customer TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 3: Barang Keluar (Outgoing Stock)
-- ========================================

CREATE TABLE IF NOT EXISTS barang_keluar_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    kode_toko TEXT,
    tempo TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    rak TEXT,
    stock_ahir INTEGER,
    qty_keluar INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    resi TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barang_keluar_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    kode_toko TEXT,
    tempo TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    name TEXT,
    brand TEXT,
    application TEXT,
    rak TEXT,
    stock_ahir INTEGER,
    qty_keluar INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    resi TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 4: Orders (Pesanan)
-- ========================================

CREATE TABLE IF NOT EXISTS orders_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 5: Foto (Product Images)
-- ========================================

CREATE TABLE IF NOT EXISTS foto_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT UNIQUE,
    foto_1 TEXT,
    foto_2 TEXT,
    foto_3 TEXT,
    foto_4 TEXT,
    foto_5 TEXT,
    foto_6 TEXT,
    foto_7 TEXT,
    foto_8 TEXT,
    foto_9 TEXT,
    foto_10 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS foto_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT UNIQUE,
    foto_1 TEXT,
    foto_2 TEXT,
    foto_3 TEXT,
    foto_4 TEXT,
    foto_5 TEXT,
    foto_6 TEXT,
    foto_7 TEXT,
    foto_8 TEXT,
    foto_9 TEXT,
    foto_10 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 6: List Harga Jual (Selling Prices)
-- ========================================

CREATE TABLE IF NOT EXISTS list_harga_jual_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT UNIQUE,
    name TEXT,
    harga NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS list_harga_jual_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT UNIQUE,
    name TEXT,
    harga NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 7: Retur (Returns)
-- ========================================

CREATE TABLE IF NOT EXISTS retur_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_pemesanan TIMESTAMP WITH TIME ZONE,
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    tanggal_retur TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retur_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal_pemesanan TIMESTAMP WITH TIME ZONE,
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    tanggal_retur TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 8: Scan Resi (Shipment Tracking)
-- ========================================

CREATE TABLE IF NOT EXISTS scan_resi_mjm (
    id SERIAL PRIMARY KEY,
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_resi_bjw (
    id SERIAL PRIMARY KEY,
    tanggal TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resi TEXT,
    toko TEXT,
    ecommerce TEXT,
    customer TEXT,
    part_number TEXT,
    nama_barang TEXT,
    quantity INTEGER,
    harga_satuan NUMERIC,
    harga_total NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 9: Chat Sessions
-- ========================================

CREATE TABLE IF NOT EXISTS chat_sessions_mjm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT UNIQUE,
    customer_name TEXT,
    messages JSONB,
    last_message TEXT,
    last_timestamp BIGINT,
    unread_admin_count INTEGER DEFAULT 0,
    unread_user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions_bjw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT UNIQUE,
    customer_name TEXT,
    messages JSONB,
    last_message TEXT,
    last_timestamp BIGINT,
    unread_admin_count INTEGER DEFAULT 0,
    unread_user_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BAGIAN 10: Indexes untuk Performa
-- ========================================

-- Index untuk base_mjm
CREATE INDEX IF NOT EXISTS idx_base_mjm_part_number ON base_mjm(part_number);
CREATE INDEX IF NOT EXISTS idx_base_mjm_date ON base_mjm(date DESC);

-- Index untuk base_bjw
CREATE INDEX IF NOT EXISTS idx_base_bjw_part_number ON base_bjw(part_number);
CREATE INDEX IF NOT EXISTS idx_base_bjw_date ON base_bjw(date DESC);

-- Index untuk barang_masuk
CREATE INDEX IF NOT EXISTS idx_barang_masuk_mjm_part ON barang_masuk_mjm(part_number);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_mjm_date ON barang_masuk_mjm(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_bjw_part ON barang_masuk_bjw(part_number);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_bjw_date ON barang_masuk_bjw(created_at DESC);

-- Index untuk barang_keluar
CREATE INDEX IF NOT EXISTS idx_barang_keluar_mjm_part ON barang_keluar_mjm(part_number);
CREATE INDEX IF NOT EXISTS idx_barang_keluar_mjm_date ON barang_keluar_mjm(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barang_keluar_bjw_part ON barang_keluar_bjw(part_number);
CREATE INDEX IF NOT EXISTS idx_barang_keluar_bjw_date ON barang_keluar_bjw(created_at DESC);

-- Index untuk orders
CREATE INDEX IF NOT EXISTS idx_orders_mjm_resi ON orders_mjm(resi);
CREATE INDEX IF NOT EXISTS idx_orders_mjm_date ON orders_mjm(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_orders_bjw_resi ON orders_bjw(resi);
CREATE INDEX IF NOT EXISTS idx_orders_bjw_date ON orders_bjw(tanggal DESC);

-- Index untuk scan_resi
CREATE INDEX IF NOT EXISTS idx_scan_resi_mjm_resi ON scan_resi_mjm(resi);
CREATE INDEX IF NOT EXISTS idx_scan_resi_mjm_date ON scan_resi_mjm(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_scan_resi_bjw_resi ON scan_resi_bjw(resi);
CREATE INDEX IF NOT EXISTS idx_scan_resi_bjw_date ON scan_resi_bjw(tanggal DESC);

-- ========================================
-- SELESAI!
-- ========================================
-- 
-- Tabel-tabel sudah dibuat. Sekarang Anda bisa:
-- 1. Test aplikasi dengan memilih toko MJM atau BJW
-- 2. Cek browser console (F12) untuk melihat log
-- 3. Verifikasi data muncul dengan benar
--
-- ========================================
