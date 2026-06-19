# Seblak Management System

Aplikasi manajemen konsinyasi seblak kering — **Supabase + SPA**.

Migrasi dari Google Apps Script + Google Sheets ke Supabase (PostgreSQL + Auth + Hosting).

## Tech Stack

- **Frontend:** Vanilla JS SPA (single HTML), Leaflet.js (peta), WebRTC (kamera)
- **Backend:** Supabase (PostgreSQL) + Supabase Auth
- **Storage:** Supabase Storage (foto kunjungan, foto toko)
- **Hosting:** Cloudflare Pages (`supplier-seblak.pages.dev`)

## Struktur Proyek

```
├── apps-script/               # Source SPA (sebelum build)
│   ├── index.html             # HTML + CSS + JS utama (source)
│   ├── css/                   # Partial CSS (di-include)
│   ├── js/                    # Partial JS (di-include)
│   └── views/                 # Partial views (di-include)
├── frontend/                  # Supabase SPA
│   ├── index.html             # Output build (single file SPA)
│   ├── build.mjs              # Build script (inlines bridge + auth)
│   ├── supabase-bridge.js     # ~70+ action handlers Supabase
│   ├── auth.js                # Supabase Auth integration (login/logout/setup)
│   └── verify.mjs             # Verifikasi output build
├── Migration/                 # Script migrasi data dari GAS
├── backfill_stock.sql         # SQL backfill stok gudang
└── supabase-config.json       # Credentials (gitignored)
```

## Build

```bash
npm run build     # → frontend/index.html (inline bridge + auth)
npm run verify    # Cek hasil build
```

## Deploy (Cloudflare Pages)

```bash
npx wrangler pages deploy frontend --project-name supplier-seblak --branch main
```

Akses: https://supplier-seblak.pages.dev

### Prasyarat

- Akun Cloudflare (gratis)
- Domain supplier-seblak.pages.dev (otomatis dari Cloudflare)
- Semua route harus diarahkan ke `index.html` (SPA fallback) — diatur otomatis oleh Cloudflare Pages

## Fitur

### Role: SALES
| Fitur | Deskripsi |
|-------|-----------|
| Dashboard | Ringkasan omzet, target, piutang, visit reminder |
| Kunjungan | 3 step: pilih customer → catat stok (sisa fisik, rusak, retur, terjual auto-calc) → finalisasi + foto sesudah + payment |
| Check-in Camera | Wajib foto display sebelum catat stok, GPS auto-detect |
| Riwayat Kunjungan | Riwayat kunjungan sendiri dengan foto |
| Customer | CRUD customer (tambah foto toko, latitude/longitude) |
| Produk | Lihat daftar produk & harga |
| Invoice | Daftar tagihan, pembayaran, setor (VALID → MENUNGGU → DIKONFIRMASI) |
| Stok Sales | Stok konsinyasi di sales |
| Peta | Peta customer dengan Leaflet.js |
| Dark Mode | Toggle theme 🌙/☀️ |

### Role: OWNER / ADMIN
| Fitur | Deskripsi |
|-------|-----------|
| Dashboard | Ringkasan semua sales, omzet, piutang, aging piutang |
| Produk | CRUD produk + kategori |
| Customer | CRUD semua customer (filter by sales), foto toko, lat/lng |
| Sales | CRUD data sales + target |
| Kunjungan | Buat kunjungan untuk sales + lihat riwayat semua |
| Invoice | Invoice, piutang, aging piutang |
| Setor | Konfirmasi setoran sales (Terima → DIKONFIRMASI) |
| Stok | Stok gudang, produksi, konsinyasi, mutasi |
| Notifikasi | Notifikasi setoran masuk, auto-create saat sales setor |
| Laporan | Laporan kunjungan harian, pembayaran, dll |
| Peta | Peta semua customer |
| Setup Data | Manajemen akun, setting sistem |
| Log Aktivitas | Riwayat aktivitas pengguna |
| Dark Mode | Toggle theme 🌙/☀️ |

## Alur Penting

### Kunjungan (SALES)
1. Pilih customer (filter belum dikunjungi >30 hari)
2. Check-in Camera 📸 (wajib, GPS auto) — auto lanjut step 2
3. Catat Stok: sisa fisik, rusak, retur → terjual auto-calculate
4. Foto Sesudah 📸 (wajib sebelum finalisasi)
5. Finalisasi: pilih metode bayar (opsional) → buat invoice + receivable

### Setor Pembayaran (3-state)
1. Sales memilih pembayaran VALID → klik Setor → status jadi **MENUNGGU**
2. Auto-create notifikasi untuk semua OWNER
3. Owner lihat di Invoice → Setor → klik **Terima** → status jadi **DIKONFIRMASI**

### Notifikasi
- Auto-create saat sales melakukan setor (tipe: SETORAN)
- Badge untuk owner: unread + pending setoran
- Klik notifikasi → langsung ke halaman Invoice → Setor
- Auto-refresh setiap 10 detik

## Arsitektur

### Bridge Pattern
`supabase-bridge.js` berisi ~70+ action handlers yang menggantikan `google.script.run`:
- Setiap action adalah async function di `bridge._actions`
- Dipanggil dari frontend via `api(actionName, params, callback)`
- Field mapping: GAS Indonesian → Supabase English (via `mapFields` + `customerMap`, `salesMap`, dll)

### Session & Auth
- Login via Supabase Auth (`signInWithPassword`)
- Session di-restore otomatis via `getSession()` + fallback `setSession()` dari token di sessionStorage
- `enterApp()` proactive restore session sebelum API calls
- SALES role auto-filter semua query dengan `.eq('sales_id', profile.sales_id)`

### Build Pipeline
1. `build.mjs` baca `apps-script/index.html`
2. Resolve includes (`<?!= include(...) ?>`)
3. Replace `google.script.run` → `bridge._routeAction`
4. Inject Supabase JS SDK + `supabase-bridge.js` + `auth.js` di `<head>`
5. Output: `frontend/index.html`

### Mobile Back Navigation
- `_navStack` array track riwayat navigasi tab
- `popstate` event listener intercept tombol back HP
- Modal → tutup modal. Ada riwayat → balik tab sebelumnya. Dashboard → "Tekan sekali lagi untuk keluar"

### Dark Mode
- Toggle di topnav (SALES) dan erp-topbar (OWNER)
- State persist di localStorage(`darkMode`)
- CSS variables + `.dark` selectors untuk semua komponen

## Catatan Penting

- File statis murni — deploy ke hosting manapun yang support SPA fallback
- Koneksi ke Supabase via anon key (aman untuk client-side karena RLS)
- Supabase anon key: `sb_publishable_nf3b87N70ut3fPWwDeeBUQ_XvJ15S0Q`
- Service role key hanya untuk admin operations (create/delete user)
- GAS lama masih berjalan di `script.google.com` sampai cutover selesai
- `payments` table pakai column: `id`, `receivable_id`, `customer_id`, `sales_id`, `invoice_id`, `amount`, `remaining_after`, `method`, `proof_url`, `payment_date`, `status` (VALID/MENUNGGU/DIKONFIRMASI), `bank_account_id`, `created_by`, `created_at`, `updated_at`
- Foto kunjungan disimpan sebagai JSON array di `visits.photos`
- Foto toko customer disimpan di Supabase Storage bucket `customer-photos`

## Changelog

### [Unreleased]
- Tambah field foto toko + latitude/longitude di form customer (semua role)
- Mode navigasi back untuk mobile (popstate handler, double-tap exit)
- Inisialisasi storage bucket `customer-photos` otomatis

### Sebelumnya
- Fitur setor 3-state: VALID → MENUNGGU → DIKONFIRMASI
- Auto-notifikasi setoran untuk OWNER
- Konfirmasi setoran oleh OWNER (Terima)
- Auto-refresh daftar setor (10 detik)
- Perbaikan session auth (fallback `setSession`)
- Perbaikan notif system (mapping id, markNotifRead)
- Owner notif badge (unread + pending setoran)
- Proactive session restore di `enterApp`
- Check-in camera wajib sebelum catat stok
- Step 3 payment collection saat kunjungan
- Laporan kunjungan harian
- Perbaikan getVisitReminders (dari visits table)
- Perbaikan filter SALES role di semua query
