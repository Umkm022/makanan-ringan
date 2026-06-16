# Testing Matrix — Supplier Seblak

## Setup
- Login 2 akun: **SALES** (misal akun `sales1@test.com`) dan **OWNER** (akun owner)
- Buka di HP/emulator mobile (Chrome DevTools mobile mode)
- Refresh halaman setelah deploy

---

## Checklist Per Role

### 1. SALES

| No | Fitur | Langkah Test | OK? |
|----|-------|-------------|-----|
| 1.1 | **Login** | Login sebagai SALES, setelah login langsung masuk dashboard | ☐ |
| 1.2 | **Session persist** | Tutup browser, buka lagi → langsung masuk (tidak perlu login ulang) | ☐ |
| 1.3 | **Dashboard KPI** | Lihat omzet bulan ini, toko aktif, kunjungan hari ini, piutang, komisi, target | ☐ |
| 1.4 | **Visit Reminders** | Lihat card "Toko yang Perlu Dikunjungi" di dashboard (toko dengan kunjungan >7 hari) | ☐ |
| 1.5 | **Refresh dashboard** | Klik tombol Refresh, data update | ☐ |
| 1.6 | **Tambah Customer** | Buka tab Customer → Tambah → isi nama, alamat, lat/lng, upload foto → Simpan → muncul di tabel | ☐ |
| 1.7 | **Edit Customer** | Klik customer → Edit → ubah nama → Simpan | ☐ |
| 1.8 | **Foto Customer** | Upload foto pas tambah/edit customer → setelah simpan, thumbnail foto muncul di tabel | ☐ |
| 1.9 | **Map & Reminder** | Buka Peta → lihat marker toko + daftar reminder | ☐ |
| 1.10 | **Visit: Mulai** | Buka Kunjungan → pilih toko → GPS → masuk step 1 | ☐ |
| 1.11 | **Visit: Check-in foto** | Setelah mulai, kamera muncul → foto mandatory → otomatis lanjut step 2 | ☐ |
| 1.12 | **Visit: Stok** | Catat sisa fisik, rusak, retur → terjual otomatis terhitung | ☐ |
| 1.13 | **Visit: Pembayaran** | Step 3: masukkan nominal bayar, metode, hitung kembalian | ☐ |
| 1.14 | **Visit: Finalisasi** | Klik Finalisasi → WAJIB foto Sesudah → berhasil (status COMPLETED) | ☐ |
| 1.15 | **Invoice** | Buat invoice → cek status UNPAID → lihat piutang | ☐ |
| 1.16 | **Setoran** | Buka Setoran → lihat 3 section (Belum Disetor / Menunggu / Selesai) → setor (VALID→MENUNGGU) | ☐ |
| 1.17 | **Komisi** | Cek komisi bulan ini, status READY/PAID | ☐ |
| 1.18 | **Notifikasi** | Cek badge notif di navbar → klik lihat panel | ☐ |
| 1.19 | **Back Navigation** | Buka tab → tekan back HP → navigasi ke tab sebelumnya → tekan back lagi → "Tekan sekali lagi untuk keluar" | ☐ |
| 1.20 | **Report** | Generate PDF/CSV laporan | ☐ |

### 2. OWNER

| No | Fitur | Langkah Test | OK? |
|----|-------|-------------|-----|
| 2.1 | **Login** | Login sebagai OWNER | ☐ |
| 2.2 | **Dashboard KPI** | Lihat omzet hari ini, bulan ini, laba kotor/bersih, piutang, stok, komisi | ☐ |
| 2.3 | **Visit Reminders** | Lihat card "Toko yang Perlu Dikunjungi" di dashboard (all sales) | ☐ |
| 2.4 | **Top Produk & Top Sales** | Cek tabel ranking produk & sales | ☐ |
| 2.5 | **Chart** | Lihat grafik 30 hari + bulanan | ☐ |
| 2.6 | **Dashboard Forecast** | Lihat prediksi di dashboard | ☐ |
| 2.7 | **Lihat Customer** | Buka Customer → lihat semua toko (all sales) | ☐ |
| 2.8 | **Edit Customer** | Klik edit → bisa ubah data, lat/lng, foto | ☐ |
| 2.9 | **Map & Reminder** | Buka Peta → lihat semua marker toko + daftar reminder | ☐ |
| 2.10 | **Setoran: Konfirmasi** | Buka Setoran → lihat section "Menunggu Konfirmasi" → klik Terima → status jadi DIKONFIRMASI | ☐ |
| 2.11 | **Notifikasi** | Notif muncul saat ada setoran baru, badge terupdate | ☐ |
| 2.12 | **Invoice/Piutang** | Lihat semua invoice & piutang | ☐ |
| 2.13 | **Kunjungan** | Lihat riwayat kunjungan semua sales | ☐ |
| 2.14 | **Report** | Generate laporan kunjungan harian, omzet, dll | ☐ |
| 2.15 | **Back Navigation** | Sama seperti SALES | ☐ |

### 3. Edge Cases

| No | Skenario | Langkah Test | OK? |
|----|---------|-------------|-----|
| 3.1 | **Visit tanpa foto Sesudah** | Finalisasi → skip foto → harus ditolak | ☐ |
| 3.2 | **Visit tanpa check-in foto** | Mulai kunjungan → skip kamera → harus ditolak | ☐ |
| 3.3 | **Foto upload gagal** | Matikan internet → upload foto customer → error toast muncul | ☐ |
| 3.4 | **Session expired** | Hapus sessionStorage → refresh → redirect ke login | ☐ |
| 3.5 | **Cache stale** | Edit data → refresh → data terbaru muncul (tidak stale) | ☐ |
| 3.6 | **Double-tap back exit** | Di dashboard → tekan back 2x cepat → keluar dari app | ☐ |
| 3.7 | **Kunjungan draft** | Mulai kunjungan, isi stok step 2, tapi jangan finalisasi → buka tab lain → balik → draft masih ada | ☐ |
| 3.8 | **Setor 0 rupiah** | Coba setor dengan amount 0 → harus ditolak | ☐ |

---

## Hasil Test

| Tanggal | Tester | Role | Bug Ditemukan | Status |
|---------|--------|------|---------------|--------|
| | | | | |

---

## Catatan

- Visit reminders: muncul untuk toko dengan hari sejak kunjungan terakhir >= 7 (🔴) atau >= 3 (🟡)
- Foto customer disimpan di Supabase Storage bucket `customer-photos` (public)
- Urutan upload: `__CUSTPHOTO__:uuid.jpg||teks_catatan` di field `notes`
- Setoran 3 state: `VALID` → `MENUNGGU` → `DIKONFIRMASI`
