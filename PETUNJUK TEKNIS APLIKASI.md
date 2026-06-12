# PETUNJUK TEKNIS APLIKASI
## Macaroni Ku — Sistem Manajemen Konsinyasi & Penjualan

---

# DAFTAR ISI

1. [Pendahuluan](#1-pendahuluan)
2. [Akses & Login](#2-akses--login)
3. [Setup Awal](#3-setup-awal)
4. [Role Owner — Fitur Lengkap](#4-role-owner--fitur-lengkap)
5. [Role Sales — Fitur Lengkap](#5-role-sales--fitur-lengkap)
6. [Alur Bisnis Lengkap](#6-alur-bisnis-lengkap)
7. [Laporan & Dashboard](#7-laporan--dashboard)
8. [Pengaturan](#8-pengaturan)
9. [FAQ & Troubleshooting](#9-faq--troubleshooting)

---

# 1. PENDAHULUAN

**Macaroni Ku** adalah aplikasi berbasis web untuk mengelola bisnis konsinyasi dan penjualan. Aplikasi ini mencakup manajemen produk, stok, titipan produk ke toko, kunjungan sales, invoice, piutang, pembayaran, komisi, biaya operasional, dan laporan.

### Teknologi
- **Platform**: Google Apps Script (Web App)
- **Database**: Google Spreadsheet (35 sheet)
- **Akses**: Browser HP/PC via link

### Dua Role Pengguna
| Role | Akses |
|------|-------|
| **OWNER** | Full akses — semua fitur manajemen, laporan, pengaturan |
| **SALES** | Akses terbatas — kunjungan, stok di toko, tagihan, target |

---

# 2. AKSES & LOGIN

### 2.1 Membuka Aplikasi
1. Buka link web app yang diberikan oleh admin
2. Tampilan awal: layar login dengan logo **Macaroni Ku**

### 2.2 Halaman Login
- **Logo** — logo perusahaan
- **Nama Perusahaan** — Macaroni Ku
- **Alamat** — Jln. Sukamulya No. 59 Bandung
- **Username** — masukkan username
- **Password** — masukkan password (bisa klik ikon 👁️ untuk melihat)
- **Remember Me** — centang jika ingin tetap login
- **Forgot Password** — hubungi owner untuk reset password
- **Tombol Sign In** — masuk ke aplikasi
- **Theme Toggle (☀️/🌙)** — di pojok kanan atas, untuk ganti tema terang/gelap

### 2.3 Login Pertama Kali
Jika belum ada akun, akan muncul banner **"Sistem Belum Siap!"** dengan tombol **SETUP AWAL** — lanjut ke bagian [Setup Awal](#3-setup-awal).

### 2.4 Ganti Tema
Klik ikon ☀️ (di halaman login) atau 🌙/☀️ (setelah login) untuk berpindah antara mode terang dan gelap. Preferensi tersimpan otomatis.

### 2.5 Logout
Klik tombol **Logout** di pojok kanan atas setelah login.

---

# 3. SETUP AWAL

Hanya dilakukan **satu kali** saat pertama kali menggunakan aplikasi.

### Langkah-langkah:
1. Pada halaman login, klik tombol **SETUP AWAL**
2. Isi data:
   - **Nama Lengkap** — nama pemilik
   - **Username** — untuk login (min. 3 karakter)
   - **Email** — opsional
   - **Password** — minimal 6 karakter
3. Klik **BUAT AKUN OWNER**
4. Jika berhasil, akan muncul notifikasi **"Setup berhasil! Silakan login."**
5. Kembali ke halaman login dan masuk dengan akun yang baru dibuat

> **Catatan:** Setelah setup, akun yang dibuat adalah role **OWNER** (pemilik). User dengan role **SALES** harus ditambahkan oleh Owner melalui menu **Sales**.

---

# 4. ROLE OWNER — FITUR LENGKAP

Setelah login sebagai Owner, tampilan terdiri dari:
- **Sidebar kiri** — navigasi menu
- **Area utama** — konten halaman aktif
- **Topbar** — nama user, notifikasi 🔔, toggle dark mode, profile, logout

## 4.1 📊 Dashboard
Halaman utama setelah login. Menampilkan ringkasan bisnis:
- **KPI Cards**:
  - Total Produk
  - Total Customer (toko)
  - Total Sales
  - Total Penjualan (omzet)
  - Total Piutang
  - Rata-rata Kunjungan
- **Grafik** — penjualan harian/bulanan
- **Alert** — stok menipis, piutang jatuh tempo, notifikasi

## 4.2 📦 Produk
Manajemen daftar produk yang dijual.

**Fitur:**
- **Tambah Produk Baru**:
  - Kategori Produk (pilih atau tambah baru)
  - Kode Produk
  - Nama Produk
  - Varian (rasa/ukuran)
  - Kemasan
  - Harga Jual
  - Harga Ecer
  - HPP (Harga Pokok Produksi)
  - Target Display
  - Stok Minimum
  - URL Gambar
- **Edit Produk** — klik tombol edit pada produk
- **Hapus Produk** — klik tombol hapus
- **Cari Produk** — kolom pencarian
- **Filter Kategori** — filter berdasarkan kategori

## 4.3 👥 Customer
Manajemen toko / outlet yang menjadi mitra konsinyasi.

**Fitur:**
- **Tambah Customer Baru**:
  - Group Customer
  - Sales (penanggung jawab)
  - Nama Toko
  - Nama Pemilik
  - No. Telepon
  - Alamat, Kota, Kecamatan
  - Pilih Lokasi (peta) — latitude & longitude
  - Status (Aktif/Tidak Aktif)
  - Tipe Toko
  - Limit Piutang
  - Tempo Pembayaran (hari)
  - Catatan
- **Edit / Hapus Customer**
- **Lihat di Peta** — lihat lokasi toko
- **Riwayat Kunjungan** — history kunjungan sales ke toko tersebut

## 4.4 👤 Sales
Manajemen tenaga sales.

**Fitur:**
- **Tambah Sales Baru**:
  - Nama Lengkap
  - Kode Sales
  - No. Telepon
  - Alamat, Kota
  - Rate Komisi (%)
  - Target Bulanan
  - Status (Aktif/Tidak Aktif)
  - URL Foto
- **Edit / Hapus Sales**
- **Lihat Performa Sales** — total kunjungan, omzet, komisi

## 4.5 🚗 Kunjungan
Monitoring semua kunjungan sales ke toko-toko.

**Fitur:**
- **Daftar Kunjungan** — semua kunjungan dari semua sales
- **Filter** — per sales, per tanggal, per status
- **Detail Kunjungan**:
  - Nama toko, sales, waktu
  - Produk yang terjual
  - Produk yang diretur
  - Restock (jika ada)
  - Foto toko
  - Lokasi (latitude/longitude)
- **Finalisasi** — Owner bisa melihat status (draft/final)
- **Hapus Kunjungan**

## 4.6 💰 Invoice
Manajemen invoice/tagihan dari hasil penjualan.

**Fitur:**
- **Daftar Invoice** — semua invoice
- **Filter** — per sales, customer, status bayar
- **Detail Invoice**:
  - Produk, qty, harga, subtotal
  - Diskon, pajak, total
  - Status pembayaran
  - Jatuh tempo
- **Tambah Pembayaran** — langsung dari halaman invoice
- **Cetak / Download** — invoice

## 4.7 🏭 Stok
Manajemen stok gudang dan stok konsinyasi.

### Stok Produksi
- **Tambah Produksi** — catat batch produksi:
  - Produk, batch number
  - Qty produksi, HPP per unit
  - Tanggal produksi, tanggal expired
  - Keterangan
- **Riwayat Produksi**

### Stok Gudang
- Melihat stok yang ada di gudang
- Riwayat mutasi stok (masuk/keluar)

### Stok Konsinyasi
- Stok yang dititipkan di masing-masing toko
- Informasi: qty titip, qty terjual, qty retur, qty sisa
- Target display per toko

## 4.8 📤 Titipan
Manajemen penitipan produk ke toko-toko.

**Fitur:**
- **Tambah Titipan Baru**:
  - Pilih customer (toko)
  - Pilih sales
  - Tanggal titip
  - Tipe titip (konsinyasi/biasa)
  - Daftar produk + qty
  - Catatan
- **Detail Titipan** — lihat isi titipan
- **Status** — aktif/selesai

## 4.9 💸 Biaya
Manajemen biaya operasional.

**Fitur:**
- **Tambah Biaya**:
  - Kategori (transportasi, konsumsi, dll)
  - Deskripsi
  - Jumlah
  - Tanggal
  - Metode pembayaran
  - Bukti (URL)
  - Catatan
- **Edit / Hapus Biaya**
- **Total Biaya per Periode**

## 4.10 🏆 Komisi
Perhitungan komisi sales.

**Fitur:**
- **Daftar Komisi** — per sales, per periode
- **Detail** — invoice yang dihitung, rate, nilai komisi
- **Cairkan Komisi** — ubah status dari pending ke cair
- **Riwayat Pencairan** — komisi yang sudah dicairkan

## 4.11 📈 Laporan
16 jenis laporan untuk analisis bisnis.

**Jenis Laporan:**
1. Penjualan Harian
2. Penjualan Bulanan
3. Penjualan per Sales
4. Penjualan per Produk
5. Penjualan per Customer
6. Piutang per Customer
7. Piutang Aging
8. Komisi Sales
9. Stok Gudang
10. Stok Konsinyasi
11. Produksi
12. Biaya Operasional
13. Kunjungan Sales
14. Target vs Realisasi
15. Laba/Rugi
16. Rekap Omzet

**Fitur:**
- **Filter Tanggal** — pilih periode
- **Export** — data ditampilkan dalam tabel
- **Grafik** — visualisasi data

## 4.12 🗺️ Peta
Visualisasi lokasi toko-toko di peta.

**Fitur:**
- **Marker Toko** — setiap toko muncul sebagai marker
- **Warna Berbeda** — berdasarkan status atau sales
- **Klik Marker** — lihat info toko
- **Filter** — per sales, per status

## 4.13 ⚙️ Setup
Pengaturan data master.

**Fitur:**
- **Kategori Produk** — tambah/edit kategori
- **Group Customer** — tambah/edit group
- **Setting Sistem** — rate komisi default, tempo bayar, pajak, target display, alert stok, dll
- **Data Perusahaan** — nama, alamat, telepon

## 4.14 👤 Profile
- Lihat profil user
- Ganti nama lengkap
- Ganti password

## 4.15 📋 Log Aktivitas
Catatan semua aktivitas yang dilakukan oleh semua user.

---

# 5. ROLE SALES — FITUR LENGKAP

Setelah login sebagai Sales, tampilan terdiri dari:
- **Top Navigation** — title Macaroni Ku
- **Tab Bar** — navigasi menu (horizontal)
- **Area utama** — konten halaman aktif
- **Bottom Navigation** (mobile) — navigasi cepat

## 5.1 📊 Dashboard Sales
Ringkasan aktivitas sales:
- **KPI** — jumlah kunjungan hari ini, total penjualan, target
- **Riwayat Kunjungan Terakhir** — 5 kunjungan terakhir
- **Toko yang Harus Dikunjungi** — reminder toko yang sudah lama tidak dikunjungi
- **Target Bulanan** — progress target omzet & kunjungan

## 5.2 🚗 Kunjungan
Fitur utama untuk sales — melakukan kunjungan ke toko.

### Memulai Kunjungan Baru:
1. Klik tombol **"Kunjungan Baru"** atau **"+"**
2. Pilih **Toko** dari daftar customer
3. Sistem otomatis mencatat:
   - Tanggal & waktu mulai
   - Lokasi (lat/long) dari GPS HP
   - Foto toko (dari kamera HP)

### Selama Kunjungan:
- **Cek Stok** — lihat stok produk yang ada di toko
- **Input Penjualan**:
  - Stok awal
  - Sisa fisik
  - Rusak
  - Retur
  - Terjual
  - Target display
  - Rekomendasi restock
- **Rekomendasi Restock** — sistem menyarankan qty restock berdasarkan target display dan sisa
- **Restock** — jika ada restock, sistem otomatis mengurangi stok gudang

### Finalisasi Kunjungan:
1. Klik **"Selesai"** atau **"Finalisasi"**
2. Sistem otomatis membuat:
   - **Invoice** — tagihan untuk toko
   - **Piutang** — jika belum dibayar
   - **Update Stok Konsinyasi** — qty terjual, retur, sisa
   - **Update Riwayat Kunjungan** — last visit, visit count

### Melanjutkan Kunjungan Draft:
- Kunjungan yang belum difinalisasi tersimpan sebagai **Draft**
- Bisa dilanjutkan kapan saja

## 5.3 📋 Riwayat
Riwayat semua kunjungan yang sudah dilakukan.

**Fitur:**
- **Daftar Kunjungan** — tanggal, toko, status
- **Filter** — per tanggal
- **Detail** — lihat hasil kunjungan, penjualan, invoice

## 5.4 👥 Toko
Daftar toko yang menjadi tanggung jawab sales.

**Fitur:**
- **Lihat Toko** — nama, alamat, kontak
- **Peta** — lihat lokasi toko
- **Stok di Toko** — lihat stok konsinyasi di toko tersebut
- **Kunjungi** — shortcut untuk mulai kunjungan ke toko ini

## 5.5 📦 Produk
Daftar produk untuk referensi.

**Fitur:**
- **Lihat Produk** — nama, harga jual, harga ecer
- **Kategori** — filter per kategori
- **Stok Tersedia** — lihat stok yang tersedia di gudang

## 5.6 💰 Tagihan
Daftar invoice/tagihan milik sales.

**Fitur:**
- **Daftar Invoice** — customer, tanggal, total, status bayar
- **Detail** — produk, qty, harga
- **Status** — lunas/belum lunas

## 5.7 📦 Stok
Stok produk yang dititipkan di toko-toko binaan sales.

**Fitur:**
- **Daftar Stok Konsinyasi** — per toko
- **Detail** — qty titip, terjual, sisa
- **Riwayat Restock** — kapan terakhir restock

## 5.8 🗺️ Peta
Peta lokasi toko-toko binaan sales.

## 5.9 👤 Profile
- Lihat profil
- Ganti password

---

# 6. ALUR BISNIS LENGKAP

## 6.1 Alur Produk → Produksi → Stok Gudang

```
[Owner] Tambah Produk (nama, harga, HPP, kategori)
       ↓
[Owner] Catat Produksi (batch, qty, HPP, tgl expired)
       ↓
[System] Stok Gudang Bertambah
```

## 6.2 Alur Titipan → Stok Konsinyasi

```
[Owner] Pilih Customer (toko)
       ↓
[Owner] Pilih Sales penanggung jawab
       ↓
[Owner] Input produk + qty yang dititip
       ↓
[System] Stok Gudang Berkurang
       ↓
[System] Stok Konsinyasi (di toko) Bertambah
```

## 6.3 Alur Kunjungan → Penjualan → Invoice → Piutang

```
[Sales] Mulai Kunjungan (pilih toko, foto, GPS)
       ↓
[Sales] Input Stok Fisik di Toko
       ↓
[Sales] Catat Penjualan (terjual, retur, rusak)
       ↓
[Sales] Restock (jika perlu)
       ↓
[Sales] Finalisasi Kunjungan
       ↓
[System] Buat INVOICE
       ↓
[System] Hitung PIUTANG (jika belum bayar)
       ↓
[System] Update STOK KONSINYASI
       ↓
[System] Update DASHBOARD & LAPORAN
```

## 6.4 Alur Pembayaran → Pelunasan Piutang

```
[Owner] Lihat daftar piutang
       ↓
[Owner] Input Pembayaran dari toko
       ↓
[System] Piutang Berkurang
       ↓
[System] Jika lunas, status → PAID
```

## 6.5 Alur Komisi Sales

```
[System] Hitung komisi berdasarkan penjualan (setiap invoice)
       ↓
[Owner] Review komisi per periode
       ↓
[Owner] Cairkan komisi
       ↓
[Sales] Mendapatkan komisi
```

## 6.6 Alur Retur

```
[Sales] Saat kunjungan, catat produk yang diretur
       ↓
[System] Stok Konsinyasi Berkurang (qty retur)
       ↓
[System] Stok Gudang Bertambah (jika retur barang)
       ↓
[Owner] Review retur
```

---

# 7. LAPORAN & DASHBOARD

## 7.1 Dashboard Owner
Ringkasan eksekutif berupa KPI cards:
- Total produk aktif
- Total customer aktif
- Total sales aktif
- Omzet hari ini / bulan ini
- Total piutang
- Rata-rata kunjungan per hari
- Target vs realisasi

## 7.2 Dashboard Sales
- Jumlah kunjungan hari ini
- Total penjualan hari ini
- Progress target bulanan (omzet & kunjungan)
- 5 kunjungan terakhir
- Reminder toko yang perlu dikunjungi

## 7.3 Jenis Laporan (Owner)
1. **Penjualan Harian** — rekap penjualan per hari
2. **Penjualan Bulanan** — rekap penjualan per bulan
3. **Penjualan per Sales** — performa per sales
4. **Penjualan per Produk** — produk terlaris
5. **Penjualan per Customer** — omzet per toko
6. **Piutang per Customer** — sisa piutang per toko
7. **Piutang Aging** — umur piutang
8. **Komisi Sales** — komisi yang harus dibayar
9. **Stok Gudang** — stok di gudang
10. **Stok Konsinyasi** — stok di toko
11. **Produksi** — riwayat produksi
12. **Biaya Operasional** — pengeluaran
13. **Kunjungan Sales** — aktivitas sales
14. **Target vs Realisasi** — pencapaian target
15. **Laba/Rugi** — keuntungan bersih
16. **Rekap Omzet** — rangkuman omzet

---

# 8. PENGATURAN

## 8.1 Setting Sistem (Owner → Setup)
- **Komisi Rate Default** — persentase komisi (default 5%)
- **Tempo Pembayaran Default** — jatuh tempo invoice (default 30 hari)
- **Pajak Default** — persentase pajak
- **Target Display Default** — target display per toko (default 20)
- **Stok Minimum Alert** — batas stok menipis (default 10)
- **Nama Perusahaan**
- **Alamat Perusahaan**
- **Telepon Perusahaan**

## 8.2 Manajemen Data Master
- **Kategori Produk** — tambah/edit kategori
- **Group Customer** — klasifikasi customer

## 8.3 Profile & Password
- Ganti nama lengkap
- Ganti password (memerlukan password lama)

---

# 9. FAQ & TROUBLESHOOTING

### Q: Lupa password?
Hubungi Owner untuk mereset password.

### Q: Tidak bisa login?
- Pastikan username dan password benar
- Pastikan akun masih aktif (hubungi Owner)
- Coba clear cache browser

### Q: Kunjungan tidak bisa difinalisasi?
- Pastikan semua data terisi (stok awal, sisa, terjual)
- Pastikan ada koneksi internet

### Q: Data tidak muncul setelah input?
Coba refresh halaman (F5 atau tarik ke bawah).

### Q: Stok tidak sesuai?
- Laporkan ke Owner untuk dilakukan penyesuaian stok
- Cek riwayat mutasi stok

### Q: Error "Sistem Belum Siap"?
Jalankan **Setup Awal** dari halaman login untuk membuat akun Owner pertama.

### Q: Aplikasi lambat?
- Pastikan koneksi internet stabil
- Data akan di-cache setelah pertama kali dimuat
- Hubungi Owner jika terus lambat

---

*Dokumen ini dibuat untuk user aplikasi Macaroni Ku — Sistem Manajemen Konsinyasi & Penjualan*
