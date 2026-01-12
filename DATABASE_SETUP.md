# Database Setup Guide

## Struktur Database untuk Multi-Store

Aplikasi ini mendukung dua toko: **MJM86** dan **BJW**. Setiap toko memiliki tabel database terpisah untuk data transaksi, namun **berbagi tabel foto dan harga** untuk efisiensi.

### Tabel yang Diperlukan

#### Tabel TERPISAH Per Toko

**Untuk Toko MJM (mjm):**
- `base_mjm` - Tabel inventory utama
- `barang_masuk_mjm` - Log barang masuk
- `barang_keluar_mjm` - Log barang keluar
- `orders_mjm` - Pesanan pelanggan
- `retur_mjm` - Log retur
- `scan_resi_mjm` - Log scan resi

**Untuk Toko BJW (bjw):**
- `base_bjw` - Tabel inventory utama
- `barang_masuk_bjw` - Log barang masuk
- `barang_keluar_bjw` - Log barang keluar
- `orders_bjw` - Pesanan pelanggan
- `retur_bjw` - Log retur
- `scan_resi_bjw` - Log scan resi

#### Tabel SHARED (Digunakan Bersama)

Tabel berikut digunakan oleh **KEDUA toko**:
- `foto` - Foto produk (shared)
- `list_harga_jual` - Daftar harga jual (shared)
- `chat_sessions` - Sesi chat pelanggan (shared)

**Total: 15 tabel** (6 untuk MJM + 6 untuk BJW + 3 shared)

### Cara Membuat Tabel

#### Opsi 1: Duplikasi Tabel yang Ada
Jika Anda sudah memiliki tabel `base`, `barang_masuk`, dll:

1. Masuk ke Supabase Dashboard
2. Buka Table Editor
3. Untuk setiap tabel, lakukan duplikasi:
   - Klik tabel yang ingin diduplikasi
   - Pilih "Duplicate table"
   - Beri nama baru dengan suffix `_mjm` atau `_bjw`

#### Opsi 2: SQL Script
Jalankan script SQL berikut di Supabase SQL Editor:

```sql
-- Duplikasi tabel base menjadi base_mjm dan base_bjw
CREATE TABLE base_mjm (LIKE base INCLUDING ALL);
CREATE TABLE base_bjw (LIKE base INCLUDING ALL);

-- Duplikasi tabel barang_masuk
CREATE TABLE barang_masuk_mjm (LIKE barang_masuk INCLUDING ALL);
CREATE TABLE barang_masuk_bjw (LIKE barang_masuk INCLUDING ALL);

-- Duplikasi tabel barang_keluar
CREATE TABLE barang_keluar_mjm (LIKE barang_keluar INCLUDING ALL);
CREATE TABLE barang_keluar_bjw (LIKE barang_keluar INCLUDING ALL);

-- Duplikasi tabel orders
CREATE TABLE orders_mjm (LIKE orders INCLUDING ALL);
CREATE TABLE orders_bjw (LIKE orders INCLUDING ALL);

-- Duplikasi tabel foto
CREATE TABLE foto_mjm (LIKE foto INCLUDING ALL);
CREATE TABLE foto_bjw (LIKE foto INCLUDING ALL);

-- Duplikasi tabel list_harga_jual
CREATE TABLE list_harga_jual_mjm (LIKE list_harga_jual INCLUDING ALL);
CREATE TABLE list_harga_jual_bjw (LIKE list_harga_jual INCLUDING ALL);

-- Duplikasi tabel retur
CREATE TABLE retur_mjm (LIKE retur INCLUDING ALL);
CREATE TABLE retur_bjw (LIKE retur INCLUDING ALL);

-- Duplikasi tabel scan_resi
CREATE TABLE scan_resi_mjm (LIKE scan_resi INCLUDING ALL);
CREATE TABLE scan_resi_bjw (LIKE scan_resi INCLUDING ALL);

-- Duplikasi tabel chat_sessions
CREATE TABLE chat_sessions_mjm (LIKE chat_sessions INCLUDING ALL);
CREATE TABLE chat_sessions_bjw (LIKE chat_sessions INCLUDING ALL);
```

#### Opsi 3: Migrasi Data dari Tabel Lama
Jika Anda ingin memigrasikan data dari tabel lama ke tabel baru:

```sql
-- Contoh: Migrasi data dari base ke base_mjm
INSERT INTO base_mjm SELECT * FROM base;

-- Ulangi untuk tabel lain sesuai kebutuhan
INSERT INTO barang_masuk_mjm SELECT * FROM barang_masuk;
INSERT INTO barang_keluar_mjm SELECT * FROM barang_keluar;
-- dst...
```

### Verifikasi Setup

Setelah membuat tabel, verifikasi bahwa:

1. Semua tabel sudah dibuat dengan benar
2. Schema tabel sesuai dengan tabel aslinya
3. Policies (RLS) sudah dikonfigurasi jika diperlukan

### Testing

1. Pilih toko MJM di aplikasi
2. Cek browser console (F12) untuk melihat log:
   - `[STORE SERVICE] Database service switched to store: mjm`
   - `[DEBUG] getTableName() called - CURRENT_STORE: mjm, returning: base_mjm`
   - `[FETCH INVENTORY] Querying table: base_mjm`

3. Ulangi untuk toko BJW

### Troubleshooting

**Error: relation "base_mjm" does not exist**
- Pastikan tabel sudah dibuat di Supabase
- Cek nama tabel, harus persis `base_mjm` atau `base_bjw` (huruf kecil)

**Data tidak muncul**
- Cek apakah tabel memiliki data
- Periksa RLS policies di Supabase
- Lihat browser console untuk error detail

**Store tidak ter-switch**
- Refresh halaman setelah memilih store
- Cek localStorage di browser untuk memastikan store tersimpan
- Lihat console log untuk konfirmasi store switch
