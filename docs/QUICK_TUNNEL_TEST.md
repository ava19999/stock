# Quick Tunnel (Tanpa Domain)

Mode ini untuk test cepat agar Supabase lokal bisa diakses publik tanpa domain Cloudflare.

## Prasyarat

- Docker Desktop jalan.
- `cloudflared` terpasang.

## Jalankan

```bat
npm run quick:start
```

Perintah ini akan:

- start Supabase lokal (jika belum jalan),
- start Cloudflare Quick Tunnel (`trycloudflare.com`),
- update `.env.local` ke URL quick + publishable key.

## Cek status

```bat
npm run quick:status
```

## Stop

Hanya stop tunnel:

```bat
npm run quick:stop
```

Stop tunnel + Supabase:

```bat
npm run quick:stop -- -StopSupabase
```

## Catatan penting

- URL quick tunnel **sementara** dan bisa berubah saat restart tunnel.
- Karena URL berubah, mode ini cocok untuk testing, bukan produksi permanen.
- Jika frontend di Vercel, env `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` harus diupdate tiap URL quick berubah, lalu redeploy.
