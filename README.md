# Seblak Management System

Aplikasi manajemen konsinyasi seblak kering — **Supabase + SPA**.

Migrasi dari Google Apps Script + Google Sheets ke Supabase (PostgreSQL + Auth + Hosting).

## Tech Stack

- **Frontend:** Vanilla JS SPA (single HTML), Leaflet.js (peta), WebRTC (kamera)
- **Backend:** Supabase (PostgreSQL) + Supabase Auth
- **Hosting:** Netlify / Firebase Hosting (statis)

## Struktur Proyek

```
├── apps-script/           # Source GAS (legacy, masih jalan)
├── frontend/              # Supabase SPA
│   ├── index.html         # Output build (single file SPA)
│   ├── build.mjs          # Build script
│   ├── supabase-bridge.js # 57 action handlers Supabase
│   ├── auth.js            # Supabase Auth integration
│   └── verify.mjs         # Verifikasi output build
├── migration/             # Script migrasi data
├── netlify.toml           # Config Netlify
├── firebase.json          # Config Firebase Hosting
└── supabase-config.json   # Credentials (gitignored)
```

## Build

```bash
npm run build     # → frontend/index.html
npm run verify    # Cek hasil build
```

## Deploy

### Opsi 1: Netlify (rekomendasi)

```bash
# 1. Install CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Init (pertama kali)
netlify init
#   - Build command: (kosongkan, karena sudah di-build)
#   - Publish directory: frontend

# 4. Deploy
npm run netlify:deploy
```

Atau **drag & drop** folder `frontend/` ke [app.netlify.com](https://app.netlify.com).

### Opsi 2: Firebase Hosting

```bash
# 1. Install CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Deploy
npm run firebase:deploy
```

### Prasyarat

- Akun Netlify (gratis) atau Firebase (gratis)
- Domain (opsional) — Netlify kasih `*.netlify.app` gratis
- Semua route harus diarahkan ke `index.html` (SPA fallback) — sudah diatur di `netlify.toml` / `firebase.json`

## Catatan Penting

- File statis murni — deploy ke hosting manapun yang support SPA fallback
- Koneksi ke Supabase via anon key (aman untuk client-side karena RLS)
- GAS lama masih berjalan di `script.google.com` sampai cutover selesai
