# 🍜 Sistem Manajemen Konsinyasi Seblak Kering

Aplikasi web manajemen konsinyasi berbasis **Google Apps Script + Google Sheets** untuk bisnis seblak kering. Digunakan oleh Owner dan Sales untuk mengelola stok, kunjungan toko, invoice, piutang, komisi, dan laporan secara real-time dari HP/laptop.

## Fitur Utama

| Fitur | Owner | Sales |
|---|---|---|
| Dashboard KPI | ✅ Omzet, target, pertumbuhan, piutang, stok gudang | ✅ Omzet bulan ini, toko aktif, piutang area, komisi |
| Manajemen Produk | ✅ CRUD, kategori, HPP, target display | ❌ |
| Manajemen Customer (Toko) | ✅ CRUD, assign sales, status | ✅ Lihat toko binaan |
| Manajemen Sales | ✅ CRUD, target, komisi rate | ❌ |
| Kunjungan Toko | ✅ Lihat riwayat semua sales | ✅ Check-in/out, catat sisa stok, foto sebelum/sesudah |
| Foto Display | ✅ Lightbox lihat foto + GPS | ✅ Kamera langsung via WebRTC + GPS otomatis |
| Invoice & Piutang | ✅ Buat invoice, aging piutang | ✅ Riwayat invoice & pembayaran |
| Pembayaran | ✅ Terima pembayaran cicil/lunas | ✅ Bayar via sales |
| Stok Gudang | ✅ Produksi, riwayat, expired | ❌ |
| Titipan | ✅ Titip awal & restock ke toko | ❌ |
| Komisi | ✅ Atur rate, cairkan komisi | ✅ Lihat komisi siap cair |
| Biaya Operasional | ✅ Catat & monitor biaya | ❌ |
| Peta & Pengingat | 🗺️ Map semua toko + overdue/warning | 🗺️ Map toko binaan + overdue/warning |
| Prediksi Stok Habis | ✅ Produk kritis per toko | ✅ Rekomendasi restock |
| Notifikasi | ✅ Notif sidebar | ✅ Notif |
| Mode Gelap | ✅ Dark mode toggle | ✅ Dark mode toggle |
| Setup Awal | ✅ Wizard setup owner, sales, kategori, produk, customer, stok awal | ❌ |

## Tech Stack

- **Frontend:** Vanilla JS, CSS3, Leaflet.js (peta), WebRTC (kamera) + fallback `<input capture>`
- **Backend:** Google Apps Script (GAS) — runtime V8
- **Database:** Google Sheets (15+ sheet)
- **Deployment:** Google Apps Script Web App (`ANYONE_ANONYMOUS` + `USER_DEPLOYING`)

## Struktur Proyek

```
apps-script/
├── index.html              # Aplikasi utama Owner (SPA)
├── views/
│   ├── index.html          # Halaman utama
│   ├── login.html          # Halaman login
│   ├── sales.html          # Aplikasi Sales (mobile-first SPA)
│   ├── visit.html          # Halaman kunjungan toko (Sales)
│   ├── payment.html        # Halaman pembayaran
│   ├── owner.html          # Halaman dashboard Owner
│   └── setup.html          # Halaman setup awal
├── css/
│   ├── main.html           # Design system utama
│   ├── sales.html          # CSS mobile-first Sales
│   └── owner.html          # CSS Owner
├── js/
│   ├── api.html            # Helper API call
│   ├── utils.html          # Utility functions
│   ├── dashboard-owner.html # Dashboard Owner
│   └── dashboard-sales.html # Dashboard Sales
├── components/
│   ├── bottomnav.html      # Bottom navigation Sales
│   ├── sidebar.html        # Sidebar
│   ├── modal.html          # Modal component
│   └── toast.html          # Toast notification
├── *.gs                    # Backend Google Apps Script files
└── appsscript.json         # GAS manifest
```

## Sheet Database (Google Sheets)

| # | Sheet | Fungsi |
|---|---|---|
| 01 | 01_USERS | Data user (Owner & Admin) |
| 02 | 02_SALES | Data sales (Sales Rep) |
| 03 | 04_CUSTOMERS | Data toko/customer |
| 04 | 05_KATEGORI_PRODUK | Kategori produk |
| 05 | 06_PRODUK | Data produk |
| 06 | 07_SETTING | Pengaturan global |
| 07 | 08_PRODUKSI | Riwayat produksi stok |
| 08 | 09_STOK_GUDANG | Stok produk di gudang |
| 09 | 10_STOK_KONSINYASI | Stok titipan di toko |
| 10 | 12_TITIP_HEADER | Header titipan/restock |
| 11 | 13_TITIP_DETAIL | Detail produk per titipan |
| 12 | 14_KUNJUNGAN_HEADER | Header kunjungan (check-in/out, GPS) |
| 13 | 15_KUNJUNGAN_DETAIL | Detail produk per kunjungan |
| 14 | 16_RETUR | Riwayat retur barang |
| 15 | 18_INVOICE_HEADER | Header invoice |
| 16 | 19_INVOICE_DETAIL | Detail produk per invoice |
| 17 | 20_PIUTANG | Piutang per invoice |
| 18 | 21_PEMBAYARAN | Riwayat pembayaran |
| 19 | 22_KOMISI | Komisi sales |
| 20 | 23_BIAYA_OPERASIONAL | Biaya operasional |
| 21 | 24_LOG_AKTIVITAS | Log aktivitas pengguna |
| 22 | 25_AUDIT_TRAIL | Audit trail perubahan data |
| 23 | 26_NOTIFIKASI | Notifikasi sistem |
| 24 | 34_SESSION | Sesi login aktif |

## Role & Akses

- **Owner** — Akses penuh: dashboard, produk, customer, sales, stok gudang, invoice, piutang, komisi, biaya, laporan, setup
- **Sales** — Akses terbatas: dashboard personal, toko binaan, kunjungan (check-in/out), foto, pembayaran, komisi, peta

## Setup

1. Copy project ke Google Apps Script editor
2. Buat Google Sheets dengan struktur sheet di atas
3. Set `SHEET_ID` di `Setup.gs` atau via UI Setup
4. Deploy sebagai Web App (execute as: User accessing)
5. Akses via browser — langsung muncul wizard setup awal

### Deploy dengan clasp

```bash
cd apps-script
clasp login
clasp push
clasp deploy
```

## Mobile Support

- **Sales app** dioptimasi untuk HP (bottom nav, touch target ≥44px)
- **Owner app** responsif untuk tablet/laptop (5 breakpoints: <480 / 480-767 / 768-991 / 992-1199 / ≥1200)
- **Kamera:** WebRTC `getUserMedia` langsung. Jika diblokir GAS sandbox iframe, fallback ke `<input capture="environment">` (kamera native HP)
- **GPS** dicapture otomatis saat check-in dan setiap foto
- **Mode offline:** Tidak didukung (butuh koneksi internet)

## Changelog

| Versi | Perubahan |
|---|---|
| **v77** | **CRITICAL REFACTOR**: Routing SPA fix (3 bug fixes — MutationObserver race, callback cache poison, early-return deadlock); `getCacheKey()` helper; Sidebar ERP layout (280px, offcanvas mobile); Full-width ERP layout; Responsive breakpoints overhaul; Owner Dashboard ERP refactor (KPI+Alert+Ranking+Forecast sections); Empty state system; Action toolbar pattern; KPI card system; Visual hierarchy (KPI→Alert→Toolbar→Table→Analytics); Dark mode sidebar; `console.log` routing debug; `.flex-between`/`.text-right`/`.text-center` utility classes |
| **v75** | Security+perf+UI: RBAC fix, cache invalidation after writes, negative stock check, commission dedup, batch setValues, responsive KPI grid, dark mode sales, bottom nav 44px, sidebar hover |
| **v74** | Fix dashboard reminder cache — `_pageCache['dashboard']` di-set setelah `loadSalesReminders()` selesai, restore staggered preload delays |
| **v73** | Fix produk code display (Stok Konsinyasi, restock, CSV, resume kunjungan); cache TTL 30s→300s; staggered preload restored; session cache; `_checkAlerts` 1x/session; loading bar |
| **v72** | Added Drive OAuth scope — fix `DriveApp.getFoldersByName` error saat upload foto |
| **v71** | Layout fix — topnav/tabbar full width, padding hanya di `.content` |
| **v70** | Responsive layout — 5 breakpoints, tabbar wrap, container padding per breakpoint |
| **v69–64** | Auto-refresh after CRUD, mobile-friendly (touch targets 44px, scroll tables, hapus user-scalable=no), camera fallback |
| **v58** | GPS tracking, PDF export, Komisi UI, Profile, Bulk Titip, Log Viewer, Foto Upload, Search, Skeleton, Cache, PWA, Piutang Reminder |
| **v50–57** | CRUD Sales, Biaya, Settings, User Management; filter sales; bug fix null safety & role filter |
| **v46–49** | Initial build — dashboard, produk, customer, kunjungan, invoice, stok, laporan |
