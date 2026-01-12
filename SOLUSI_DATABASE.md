# 🔧 Penyelesaian Masalah: Data base_mjm dan base_bjw Tidak Terbaca

## 📋 Ringkasan Masalah

Aplikasi saat ini **sudah dikonfigurasi** untuk menggunakan tabel database terpisah untuk setiap toko:
- Toko **MJM86** → menggunakan tabel `base_mjm`, `barang_masuk_mjm`, dll.
- Toko **BJW** → menggunakan tabel `base_bjw`, `barang_masuk_bjw`, dll.

**NAMUN**, tabel-tabel tersebut **belum dibuat** di database Supabase Anda.

## ⚠️ Error Yang Mungkin Muncul

Jika tabel belum dibuat, Anda akan melihat error di browser console (tekan F12):
```
relation "base_mjm" does not exist
relation "base_bjw" does not exist
```

## ✅ SOLUSI: Buat Tabel Database

### Cara 1: Menggunakan SQL Script (TERCEPAT)

1. **Buka Supabase Dashboard**
   - Login ke https://supabase.com
   - Pilih project Anda

2. **Buka SQL Editor**
   - Di sidebar kiri, klik "SQL Editor"
   - Klik "New query"

3. **Copy-Paste Script SQL**
   - Buka file `database_setup.sql` 
   - Copy seluruh isinya
   - Paste di SQL Editor

4. **Jalankan Script**
   - Klik tombol "Run" atau tekan Ctrl+Enter
   - Tunggu hingga selesai (sekitar 5-10 detik)
   - Jika sukses, akan muncul pesan "Success. No rows returned"

5. **Verifikasi**
   - Buka "Table Editor" di sidebar
   - Pastikan tabel berikut muncul:
     - `base_mjm` dan `base_bjw`
     - `barang_masuk_mjm` dan `barang_masuk_bjw`
     - `barang_keluar_mjm` dan `barang_keluar_bjw`
     - dll. (total 18 tabel)

### Cara 2: Duplikasi Manual (Jika Sudah Ada Data)

Jika Anda sudah punya data di tabel lama (`base`, `barang_masuk`, dll) dan ingin memindahkannya:

1. **Buka Table Editor** di Supabase
2. **Untuk setiap tabel:**
   - Klik nama tabel (contoh: `base`)
   - Klik tombol "..." (menu)
   - Pilih "Duplicate table"
   - Beri nama `base_mjm`
   - Ulangi dan buat `base_bjw`

3. **Atau gunakan SQL untuk copy data:**
   ```sql
   -- Copy data dari tabel lama ke tabel baru
   INSERT INTO base_mjm SELECT * FROM base;
   INSERT INTO base_bjw SELECT * FROM base;
   
   -- Ulangi untuk tabel lain
   INSERT INTO barang_masuk_mjm SELECT * FROM barang_masuk;
   INSERT INTO barang_masuk_bjw SELECT * FROM barang_masuk;
   -- dst...
   ```

## 🧪 Testing & Verifikasi

### 1. Test di Browser

1. **Buka aplikasi** di browser
2. **Pilih toko** (MJM atau BJW)
3. **Buka Developer Console** (tekan F12)
4. **Cari log berikut:**
   ```
   [STORE SERVICE] Database service switched to store: mjm
   [STORE SERVICE] Current table names:
     - Base: base_mjm
     - Barang Masuk: barang_masuk_mjm
     - Barang Keluar: barang_keluar_mjm
     - Orders: orders_mjm
   ```

5. **Cek log query:**
   ```
   [FETCH INVENTORY] Querying table: base_mjm, page: 1, limit: 50
   [FETCH INVENTORY SUCCESS] Table: base_mjm, Found 10 items, Total count: 100
   ```

### 2. Test Data Tampil

1. **Login sebagai admin**
2. **Ke halaman Gudang/Inventory**
3. **Pastikan data muncul**
4. **Ke halaman Beranda/Shop**
5. **Pastikan produk muncul**

### 3. Test Perpindahan Toko

1. **Pilih toko MJM** → data MJM harus muncul
2. **Logout**
3. **Pilih toko BJW** → data BJW harus muncul
4. **Data kedua toko harus TERPISAH**

## 📊 Struktur Tabel yang Dibutuhkan

### Untuk Setiap Toko (MJM & BJW):

| Tabel | Fungsi | Contoh untuk MJM |
|-------|--------|------------------|
| Base | Inventory utama | `base_mjm` |
| Barang Masuk | Log stok masuk | `barang_masuk_mjm` |
| Barang Keluar | Log stok keluar | `barang_keluar_mjm` |
| Orders | Pesanan customer | `orders_mjm` |
| Foto | Gambar produk | `foto_mjm` |
| List Harga Jual | Daftar harga | `list_harga_jual_mjm` |
| Retur | Log retur | `retur_mjm` |
| Scan Resi | Tracking pengiriman | `scan_resi_mjm` |
| Chat Sessions | Chat pelanggan | `chat_sessions_mjm` |

**Total: 18 tabel** (9 untuk MJM + 9 untuk BJW)

## 🔍 Troubleshooting

### Error: "relation does not exist"
**Penyebab:** Tabel belum dibuat di Supabase  
**Solusi:** Jalankan `database_setup.sql`

### Data tidak muncul setelah buat tabel
**Penyebab:** Tabel kosong, belum ada data  
**Solusi:** 
- Tambah data manual via Supabase Table Editor, atau
- Copy data dari tabel lama (lihat Cara 2 di atas)

### Store tidak switch
**Penyebab:** Cache browser  
**Solusi:** 
- Refresh halaman (F5)
- Clear localStorage: Buka Console, ketik `localStorage.clear()`, Enter
- Login ulang

### Log menunjukkan table: "base" (bukan base_mjm/base_bjw)
**Penyebab:** Store context tidak ter-set  
**Solusi:**
- Pastikan Anda sudah **pilih toko** di halaman awal
- Logout dan login ulang
- Cek localStorage: `localStorage.getItem('stockmaster_auth_state')`

## 📝 File Penting

- **`database_setup.sql`** - Script SQL untuk buat semua tabel
- **`DATABASE_SETUP.md`** - Dokumentasi lengkap setup database
- **`services/supabaseService.ts`** - Kode yang handle dynamic table names
- **`App.tsx`** - Kode yang set current store

## 🎯 Status Implementasi

✅ Kode aplikasi sudah diupdate untuk multi-store  
✅ Dynamic table names sudah diimplementasi  
✅ Logging sudah ditambahkan untuk debugging  
✅ Dokumentasi sudah dibuat  
⚠️ **DIPERLUKAN: Buat tabel di Supabase menggunakan `database_setup.sql`**

## 💡 Catatan Penting

1. **Tabel HARUS dibuat** agar aplikasi berfungsi
2. **Nama tabel harus persis** (huruf kecil, dengan underscore)
3. **Setiap toko punya data terpisah** - tidak sharing
4. **Backup data lama** sebelum migrasi (jika ada)

## 📞 Dukungan

Jika masih ada masalah:
1. Cek browser console untuk error detail
2. Pastikan semua tabel sudah dibuat
3. Verifikasi nama tabel di Supabase Table Editor
4. Test dengan data dummy terlebih dahulu

---

**Selamat menggunakan sistem multi-store! 🚀**
