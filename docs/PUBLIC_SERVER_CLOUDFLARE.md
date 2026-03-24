# Public Server via Cloudflare Tunnel

Dokumen ini mengubah mode server jadi satu jalur publik: Supabase lokal di PC server + Cloudflare Tunnel.

Untuk test tanpa domain, pakai quick tunnel di dokumen ini:

- [Quick Tunnel Test](./QUICK_TUNNEL_TEST.md)

## 1. Prasyarat

- Docker Desktop aktif.
- Domain aktif di Cloudflare.
- `cloudflared` terpasang (sudah diinstall di PC ini).

## 2. Buat Tunnel di Cloudflare (sekali setup)

1. Buka Cloudflare Zero Trust.
2. Masuk `Networks` -> `Tunnels` -> `Create a tunnel`.
3. Pilih `Cloudflared`.
4. Tambah `Public Hostname`:
`subdomain`: contoh `supabase-gudang`
`domain`: domain kamu
`service`: `HTTP`
`URL`: `http://127.0.0.1:54321`
5. Setelah tunnel dibuat, buka tunnel itu lalu pilih `Add a replica`.
6. Copy command install/run `cloudflared` yang muncul, ambil string token `eyJ...` di command tersebut sebagai `CLOUDFLARE_TUNNEL_TOKEN`.

## 3. Siapkan env publik di repo

1. Copy template:

```bat
copy .env.public.example .env.public
```

2. Isi file `.env.public`:
- `PUBLIC_SUPABASE_URL` = hostname publik tunnel, contoh `https://supabase-gudang.example.com`
- `PUBLIC_SUPABASE_ANON_KEY` = nilai `Publishable` dari `npx supabase status`
- `CLOUDFLARE_TUNNEL_TOKEN` = token dari Cloudflare dashboard

## 4. Jalankan mode publik

```bat
npm run public:use-env
npm run public:start -- -RefreshEnv
npm run public:status
```

Penjelasan:
- `public:use-env` menulis `.env.local` agar frontend pakai URL publik.
- `public:start` menjalankan Supabase + cloudflared tunnel.
- `public:status` menampilkan status server dan tunnel.

Stop mode publik:

```bat
npm run public:stop -- -StopSupabase
```

## 5. Komputer lain agar database sama

Agar semua komputer baca DB yang sama:

1. Di setiap komputer client, set `.env.local` ke URL publik + anon key publik yang sama.
2. Jalankan ulang frontend (`npm run dev` atau build yang dipakai).

Selama semua client mengarah ke `PUBLIC_SUPABASE_URL` yang sama, databasenya sama.

## 6. Troubleshooting cepat

### Tunnel gagal start

- Cek token di `.env.public`.
- Cek log:
`type .runtime\\cloudflared.log`

### Server Supabase conflict container

- Jalankan:
`npm run public:start -- -ForceClean`
- Script sudah punya recovery cleanup otomatis.

### URL publik tidak bisa dibuka

- Cek di Cloudflare dashboard apakah tunnel status `Healthy`.
- Pastikan Docker Desktop aktif dan `npm run public:status` menunjukkan tunnel berjalan.
