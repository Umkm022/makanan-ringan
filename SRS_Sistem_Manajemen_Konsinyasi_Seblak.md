# SOFTWARE REQUIREMENT SPECIFICATION (SRS)
## Sistem Manajemen Konsinyasi Seblak Kering

**Dokumen:** SRS - Sistem Manajemen Konsinyasi Seblak Kering
**Versi:** 1.0
**Status:** Final Draft
**Tanggal:** 11 Juni 2026
**Platform:** Google Apps Script + Google Sheets

---

## DAFTAR ISI

1. [PENDAHULUAN](#1-pendahuluan)
2. [PROFIL BISNIS](#2-profil-bisnis)
3. [TUJUAN DAN RUANG LINGKUP](#3-tujuan-dan-ruang-lingkup)
4. [WORKFLOW BISNIS](#4-workflow-bisnis)
5. [STRUKTUR ORGANISASI DAN AKSES](#5-struktur-organisasi-dan-akses)
6. [ERD DAN DATABASE DESIGN](#6-erd-dan-database-design)
7. [GOOGLE SHEETS DESIGN](#7-google-sheets-design)
8. [GOOGLE APPS SCRIPT ARSITEKTUR](#8-google-apps-script-arsitektur)
9. [UI/UX DESIGN DAN WIREFRAME](#9-uiux-design-dan-wireframe)
10. [LOGIN DAN SECURITY](#10-login-dan-security)
11. [FORMULA BISNIS DAN KEUANGAN](#11-formula-bisnis-dan-keuangan)
12. [DASHBOARD KPI](#12-dashboard-kpi)
13. [REPORTING](#13-reporting)
14. [SETUP AWAL SISTEM](#14-setup-awal-sistem)
15. [ROADMAP PENGEMBANGAN](#15-roadmap-pengembangan)

---

## 1. PENDAHULUAN

### 1.1 Latar Belakang

Bisnis Seblak Kering berkembang pesat di Indonesia dengan sistem konsinyasi yang memungkinkan produk dipajang di berbagai toko tanpa pembayaran di muka. Sistem ini membutuhkan manajemen yang ketat karena melibatkan banyak sales lapangan, banyak titik toko, dan perputaran stok yang harus dimonitor secara real-time. Google Sheets + Google Apps Script dipilih sebagai platform karena biaya operasional rendah, kolaborasi real-time, dan aksesibilitas dari mana saja.

### 1.2 Tujuan Dokumen

Dokumen ini berfungsi sebagai:
- Acuan teknis pengembangan aplikasi
- Dokumentasi workflow bisnis
- Spesifikasi database dan struktur data
- Pedoman UI/UX design
- Dasar perhitungan financial KPI

### 1.3 Definisi Istilah

| Istilah | Definisi |
|---------|----------|
| **Konsinyasi** | Sistem titip jual dimana barang dititipkan ke toko dan dibayar setelah terjual |
| **Sales** | Tenaga penjual lapangan yang menitipkan barang ke toko-toko |
| **Owner** | Pemilik bisnis yang memonitor seluruh operasional |
| **Titip Awal** | Jumlah barang pertama kali dititipkan ke toko |
| **Titip Ulang / Restock** | Penambahan stok ke toko karena stok berkurang |
| **Retur** | Barang dikembalikan karena rusak/kadaluarsa/tidak laku |
| **Invoice** | Tagihan yang timbul dari barang terjual |
| **Piutang** | Tagihan yang belum dibayar toko |
| **HPP** | Harga Pokok Produksi |
| **Omzet** | Total nilai penjualan sebelum dipotong biaya |
| **Laba Kotor** | Omzet dikurangi HPP |
| **Laba Bersih** | Laba kotor dikurangi biaya operasional dan komisi |

---

## 2. PROFIL BISNIS

### 2.1 Identitas Perusahaan

| Item | Keterangan |
|------|------------|
| Nama Usaha | [Nama Perusahaan Seblak] |
| Jenis Usaha | Produksi dan Distribusi Seblak Kering |
| Model Penjualan | Konsinyasi |
| Target Market | Toko kelontong, Warung, Minimarket, Kantin, Kios |
| Wilayah Operasi | Multi-kota (scalable) |
| Tenaga Sales | Multiple field sales |

### 2.2 Model Bisnis

```
Produsen → Gudang → Sales → Toko (Konsinyasi) → Konsumen
              ↓                    ↓
         Stok Gudang         Stok di Toko
                                ↓
                           Penjualan terjadi
                                ↓
                           Invoice → Piutang → Pembayaran
                                ↓
                           Komisi Sales (jika lunas)
```

### 2.3 Karakteristik Sistem

- **Produk:** Seblak Kering berbagai varian rasa
- **Kemasan:** Pack kecil (100gr-250gr) dengan harga terjangkau
- **Rotasi Stok:** Produk memiliki masa edar sehingga perlu FIFO
- **Frekuensi Kunjungan:** Sales mengunjungi toko setiap 3-7 hari
- **Pembayaran:** Toko membayar setelah barang terjual (30-60 hari)

---

## 3. TUJUAN DAN RUANG LINGKUP

### 3.1 Tujuan Aplikasi

1. **Sentralisasi Data** - Semua data operasional dalam satu platform
2. **Monitoring Real-time** - Owner memonitor bisnis secara real-time
3. **Akselerasi Kunjungan** - Sales dapat bekerja cepat di lapangan
4. **Akurasi Stok** - Stok gudang dan konsinyasi selalu akurat
5. **Otomatisasi** - Invoice, piutang, komisi tergenerate otomatis
6. **Transparansi** - Semua transaksi tercatat dan dapat diaudit
7. **Scalability** - Siap untuk penambahan sales, toko, dan produk

### 3.2 Ruang Lingkup Fungsional

| Modul | Deskripsi |
|-------|-----------|
| **Manajemen User & Auth** | Login, role management, session |
| **Master Data** | Produk, Customer, Sales, Kategori |
| **Produksi** | Catat produksi, update stok gudang |
| **Stok Gudang** | Manajemen inventory gudang |
| **Titip Barang** | Kirim barang dari gudang ke toko via sales |
| **Kunjungan Sales** | Visit toko, catat sisa stok, retur, restock |
| **Invoice** | Generate invoice otomatis dari kunjungan |
| **Piutang** | Manajemen tagihan toko |
| **Pembayaran** | Catat pembayaran dari toko |
| **Komisi Sales** | Hitung komisi dari invoice lunas |
| **Dashboard** | KPI, grafik, monitoring |
| **Laporan** | 15+ jenis laporan bisnis |
| **Biaya Operasional** | Catat pengeluaran bisnis |

### 3.3 Ruang Lingkup Non-Fungsional

| Aspek | Spesifikasi |
|-------|-------------|
| **Platform** | Web-based (Google Apps Script) |
| **Database** | Google Sheets (15+ sheet) |
| **Responsive** | Mobile-first untuk sales, dekstop untuk owner |
| **Security** | Session storage, role-based access, row-level security |
| **Performance** | Load < 3 detik pada koneksi 4G |
| **Availability** | 24/7 via Google Cloud |
| **Backup** | Google Sheets version history |

---

## 4. WORKFLOW BISNIS

### 4.1 WORKFLOW PRODUKSI

```
START
  |
  v
[Catat Produksi]
  |-- Pilih Produk
  |-- Input Jumlah Produksi (qty)
  |-- Input HPP per unit (otomatis dari master)
  |-- Input Tanggal Produksi
  |-- Input Batch Number (auto-generate: BATCH-YYYYMMDD-XXX)
  |-- Input Keterangan (opsional)
  |
  v
[Sistem Proses]
  |-- Generate ID Produksi (PRD-YYYYMMDD-XXX)
  |-- Update STOK_GUDANG -> Tambah stok produk
  |-- Update LOG_AKTIVITAS
  |-- Update AUDIT_TRAIL
  |
  v
[Stok Gudang Bertambah]
  |
  v
END
```

**Rincian:**
- Setiap batch produksi tercatat dengan Batch Number unik
- HPP diambil dari master produk atau bisa diinput manual jika berubah
- Stok gudang bertambah secara otomatis setelah produksi dicatat
- Produksi hanya bisa dilakukan oleh OWNER/ADMIN

### 4.2 WORKFLOW TITIP BARANG (Sales -> Toko)

```
START
  |
  v
[Sales Meminta Barang dari Gudang]
  |
  v
[Pilih Toko Tujuan]
  |
  v
[Input Produk & Jumlah Titip]
  |-- Untuk setiap produk:
  |   |-- Input produk
  |   |-- Input qty titip
  |-- Catat tanggal titip
  |
  v
[Sistem Proses]
  |-- Generate ID Titip (TTP-YYYYMMDD-XXX)
  |-- Kurangi STOK_GUDANG untuk setiap produk
  |-- Tambah/Timpa STOK_KONSINYASI untuk toko tersebut
  |-- Hitung subtotal (qty x harga konsinyasi)
  |-- Generate LOG_AKTIVITAS
  |-- Generate AUDIT_TRAIL
  |
  v
[Stok Gudang Berkurang] [Stok Konsinyasi Toko Bertambah]
  |
  v
END
```

**Aturan Bisnis:**
- Sales hanya bisa menitip ke toko yang menjadi tanggung jawabnya
- Stok gudang harus mencukupi (validasi)
- Harga konsinyasi sudah ditentukan di master produk
- Satu sesi titip bisa untuk multiple produk
- Jika toko sudah memiliki stok (restock), maka stok lama + stok baru digabung

### 4.3 WORKFLOW KUNJUNGAN SALES (CORE ENGINE)

```
START
  |
  v
[Sales Datang ke Toko]
  |
  v
[Pilih Toko dari Daftar]
  |
  v
[Tampilkan Data Kunjungan Terakhir]
  |-- Stok terakhir
  |-- Tanggal kunjungan terakhir
  |-- Target display per produk
  |
  v
[Input Stok Fisik]
  |-- Untuk setiap produk di toko:
  |   |-- Sisa Stok Fisik (input manual - WAJIB)
  |   |-- Barang Rusak (input manual, default 0)
  |   |-- Barang Retur (input manual, default 0)
  |-- Catat tanggal kunjungan
  |
  v
[Sistem Otomatis Menghitung:]

  Terjual = Titip Awal - Sisa - Rusak - Retur

  Jika Terjual > 0:
    |-- Generate INVOICE (INV-YYYYMMDD-XXX)
    |-- Generate PIUTANG (status: OPEN)
    |-- Hitung Laba Kotor
    |-- Hitung Komisi Sales (ditahan)

  Jika Retur > 0:
    |-- Kembalikan ke STOK_GUDANG
    |-- Catat di RETUR

  Hitung Restock:
    Restock = Target Display - Sisa Stok
  |
  v
[Konfirmasi Kunjungan]
  |-- Sales melihat ringkasan:
  |   |-- Barang terjual
  |   |-- Invoice yang terbuat
  |   |-- Barang retur
  |   |-- Rekomendasi restock
  |-- Pilih Aksi: Titip Ulang Sekarang / Nanti
  |
  v
[Update Status]
  |-- Update STOK_KONSINYASI
  |-- Update KUNJUNGAN_DETAIL
  |-- Update SALES_CUSTOMER (last_visit)
  |-- Generate LOG_AKTIVITAS
  |
  v
END
```

**Aturan Bisnis Kunjungan:**
- Sales WAJIB menginput sisa stok fisik
- Sistem otomatis menghitung jumlah terjual
- Invoice langsung ter-generate jika ada penjualan
- Piutang langsung tercatat dengan status OPEN
- Retur barang langsung dikembalikan ke stok gudang
- Rekomendasi restock berdasarkan Target Display - Sisa
- Sales bisa langsung restock atau nanti

### 4.4 WORKFLOW TITIP ULANG (RESTOCK)

```
START
  |
  v
[Kebutuhan Restock Teridentifikasi]
  |-- Dari kunjungan: Target Display - Sisa Stok
  |-- Manual: Owner/Admin input langsung
  |
  v
[Hitung Kebutuhan]
  |-- Target Display = [Nilai dari master customer_produk]
  |-- Sisa Stok = [Dari input kunjungan]
  |-- Restock = Target Display - Sisa Stok
  |-- Minimum Restock = 1 (jika hasil < 1, tidak perlu restock)
  |
  v
[Konfirmasi Restock]
  |-- Sales setuju jumlah restock (bisa disesuaikan)
  |-- Validasi stok gudang tersedia
  |
  v
[Sistem Proses Restock]
  |-- Generate ID Titip Baru (TTP-YYYYMMDD-XXX)
  |-- Kurangi STOK_GUDANG
  |-- Tambah STOK_KONSINYASI di toko tersebut
  |-- Catat di TITIP_DETAIL sebagai restock
  |
  v
[Update Info Kunjungan]
  |-- Link restock ke kunjungan terakhir
  |-- Update status kunjungan (complete_with_restock)
  |
  v
END
```

### 4.5 WORKFLOW PEMBAYARAN

```
START
  |
  v
[Toko Ingin Membayar]
  |-- Sales datang ke toko / toko transfer
  |-- Sales/Toko menyampaikan jumlah pembayaran
  |
  v
[Sales Pilih Invoice yang Akan Dibayar]
  |-- Tampilkan daftar invoice toko yang belum lunas
  |-- Tampilkan total piutang
  |-- Sales pilih invoice (bisa multi invoice)
  |
  v
[Input Pembayaran]
  |-- Input Jumlah Dibayar
  |-- Input Tanggal Bayar
  |-- Pilih Metode Bayar: TUNAI / TRANSFER / GIRO
  |-- Input Bukti Bayar
  |
  v
[Sistem Proses]
  |-- Jika Jumlah >= Total Invoice: Status Invoice -> PAID (LUNAS)
  |-- Jika Jumlah < Total Invoice: Status Invoice -> PARTIAL (SEBAGIAN)
  |-- Jika Jumlah = 0: Status Invoice -> OPEN (BELUM BAYAR)
  |-- Generate ID Pembayaran (BYR-YYYYMMDD-XXX)
  |-- Update PIUTANG -> kurangi saldo piutang
  |-- Hitung Komisi Sales (hanya untuk invoice yang lunas)
  |-- Generate LOG_AKTIVITAS
  |
  v
[Update Rangkuman Piutang]
  |-- Total piutang toko berkurang
  |-- Status toko (jika piutang = 0, status: LANCAR)
  |
  v
END
```

### 4.6 WORKFLOW KOMISI SALES

```
START
  |
  v
[Trigger: Invoice Lunas]
  |
  v
[Hitung Komisi]
  |-- Rate Komisi = [Dari master sales atau setting umum]
  |-- Nilai Invoice = Total penjualan (omzet)
  |-- Komisi = Nilai Invoice x Rate Komisi
  |-- Periode Komisi = Bulan + Tahun invoice
  |
  v
[Sistem Proses]
  |-- Generate ID Komisi (KMS-YYYYMMDD-XXX)
  |-- Catat di KOMISI (status: READY)
  |-- Update total komisi sales per periode
  |-- Jika komisi sudah dicairkan -> status: PAID
  |
  v
[Pencairan Komisi]
  |-- Owner review komisi sales
  |-- Owner setujui pencairan
  |-- Status komisi: READY -> PAID
  |-- Catat tanggal cair
  |-- Update SALES (total_komisi_cair)
  |
  v
END
```

**Aturan Komisi:**
- Komisi hanya dihitung dari invoice yang **LUNAS**
- Komisi tidak dihitung dari invoice OPEN atau PARTIAL
- Jika invoice PARTIAL menjadi PAID, komisi dihitung dari sisa yang dibayar
- Rate komisi bisa berbeda per sales (di master SALES)
- Rate komisi default di SETTING

### 4.7 WORKFLOW RETUR

```
START
  |
  v
[Barang Retur Teridentifikasi]
  |-- Dari kunjungan: barang tidak laku/rusak
  |-- Dari toko: pengembalian barang
  |
  v
[Input Retur]
  |-- Pilih produk
  |-- Input jumlah retur
  |-- Pilih alasan retur: RUSAK / KADALUARSA / TIDAK_LAKU / LAINNYA
  |-- Catat tanggal retur
  |
  v
[Sistem Proses]
  |-- Generate ID Retur (RTU-YYYYMMDD-XXX)
  |-- Kurangi STOK_KONSINYASI di toko
  |-- Tambah STOK_GUDANG (barang kembali ke gudang)
  |-- Catat status retur: BARANG_MASUK_GUDANG / BARANG_DIMUSNAHKAN
  |-- Generate LOG_AKTIVITAS
  |
  v
END
```

### 4.8 WORKFLOW BIAYA OPERASIONAL

```
START
  |
  v
[Input Biaya]
  |-- Pilih kategori biaya: Gaji / Transport / Packing / BahanBaku / DLL
  |-- Input Jumlah Biaya
  |-- Input Tanggal
  |-- Input Keterangan
  |-- Input Bukti (opsional)
  |
  v
[Sistem Proses]
  |-- Generate ID Biaya (BYA-YYYYMMDD-XXX)
  |-- Update total biaya operasional
  |-- Generate LOG_AKTIVITAS
  |
  v
END
```

---

## 5. STRUKTUR ORGANISASI DAN AKSES

### 5.1 Role dan Hak Akses

| Fitur / Menu | OWNER | ADMIN | SALES |
|--------------|-------|-------|-------|
| Dashboard Owner | ✅ | ✅ | ❌ |
| Dashboard Sales | ✅ | ✅ | ✅ (data sendiri) |
| Master Produk | CRUD | CRUD | READ |
| Master Customer | CRUD | CRUD | READ |
| Master Sales | CRUD | READ | ❌ |
| Produksi | CRUD | CRUD | ❌ |
| Stok Gudang | CRUD | CRUD | READ |
| Stok Konsinyasi | CRUD | CRUD | READ (own) |
| Titip Barang | CRUD | CRUD | CREATE |
| Kunjungan | CRUD | CRUD | CREATE (own) |
| Invoice | READ | READ | READ (own) |
| Piutang | READ | READ | READ (own) |
| Pembayaran | CRUD | CRUD | CREATE |
| Komisi Sales | CRUD | READ | READ (own) |
| Biaya Operasional | CRUD | CRUD | ❌ |
| Laporan | ALL | TERBATAS | ❌ |
| Setting | CRUD | ❌ | ❌ |
| User Management | CRUD | ❌ | ❌ |

### 5.2 Aturan Akses Data SALES

- Sales hanya melihat **Customer miliknya sendiri**
- Sales hanya melihat **Transaksi miliknya sendiri**
- Sales hanya melihat **Stok Konsinyasi di tokonya sendiri**
- Sales hanya melihat **Invoice miliknya sendiri**
- Sales hanya melihat **Piutang di tokonya sendiri**
- Sales hanya melihat **Komisi miliknya sendiri**
- Sales hanya melihat **Dashboard dengan datanya sendiri**

### 5.3 Hierarchy Access

```
OWNER (Full Access)
  |
  |-- ADMIN (Operational Access)
  |     |-- Data Entry & Management
  |
  |-- SALES (Limited Access)
        |-- Own data & customers only

---

## 6. ERD DAN DATABASE DESIGN

### 6.1 ENTITY RELATIONSHIP DIAGRAM

```
USERS (1) ----- (N) SALES [link: user_id]
USERS (1) ----- (N) LOG_AKTIVITAS [link: user_id]

SALES (1) ----- (N) CUSTOMERS [link: sales_id]
SALES (1) ----- (N) TITIP_HEADER [link: sales_id]
SALES (1) ----- (N) KUNJUNGAN_HEADER [link: sales_id]
SALES (1) ----- (N) INVOICE_HEADER [link: sales_id]
SALES (1) ----- (N) KOMISI [link: sales_id]
SALES (1) ----- (N) TARGET_SALES [link: sales_id]

CUSTOMERS (1) ----- (N) TITIP_HEADER [link: customer_id]
CUSTOMERS (1) ----- (N) KUNJUNGAN_HEADER [link: customer_id]
CUSTOMERS (1) ----- (N) INVOICE_HEADER [link: customer_id]
CUSTOMERS (1) ----- (N) PIUTANG [link: customer_id]
CUSTOMERS (1) ----- (N) PEMBAYARAN [link: customer_id]
CUSTOMERS (1) ----- (N) STOK_KONSINYASI [link: customer_id]

CUSTOMER_GROUP (1) ----- (N) CUSTOMERS [link: group_id]

PRODUK (1) ----- (N) KATEGORI_PRODUK [link: kategori_id]
PRODUK (1) ----- (N) PRODUKSI [link: produk_id]
PRODUK (1) ----- (N) STOK_GUDANG [link: produk_id]
PRODUK (1) ----- (N) STOK_KONSINYASI [link: produk_id]
PRODUK (1) ----- (N) TITIP_DETAIL [link: produk_id]
PRODUK (1) ----- (N) KUNJUNGAN_DETAIL [link: produk_id]
PRODUK (1) ----- (N) RETUR [link: produk_id]
PRODUK (1) ----- (N) INVOICE_DETAIL [link: produk_id]

TITIP_HEADER (1) ----- (N) TITIP_DETAIL [link: titip_id]
KUNJUNGAN_HEADER (1) ----- (N) KUNJUNGAN_DETAIL [link: kunjungan_id]
INVOICE_HEADER (1) ----- (N) INVOICE_DETAIL [link: invoice_id]
INVOICE_HEADER (1) ----- (1) PIUTANG [link: invoice_id]
PIUTANG (1) ----- (N) PEMBAYARAN [link: piutang_id]

KUNJUNGAN_HEADER (1) ----- (N) RETUR [link: kunjungan_id]
KUNJUNGAN_HEADER (1) ----- (N) RESTOCK [link: kunjungan_id]
```

### 6.2 TABEL DATABASE

#### 6.2.1 USERS

| Kolom | Tipe Data | PK | Keterangan |
|-------|-----------|----|------------|
| user_id | String | PK | Format: USR-001, auto-increment |
| username | String | | Login username |
| email | String | | Email user |
| password_hash | String | | Hashed password |
| role | String | | OWNER / ADMIN / SALES |
| full_name | String | | Nama lengkap |
| phone | String | | Nomor telepon |
| is_active | Boolean | | TRUE / FALSE |
| last_login | DateTime | | Last login timestamp |
| created_at | DateTime | | Timestamp dibuat |
| updated_at | DateTime | | Timestamp diupdate |

#### 6.2.2 SALES

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| sales_id | String | PK | Format: SLS-001 |
| user_id | String | FK->USERS | Link ke user account |
| sales_code | String | | Kode sales unik |
| full_name | String | | Nama lengkap sales |
| phone | String | | Nomor telepon |
| address | String | | Alamat |
| kota | String | | Kota operasi |
| komisi_rate | Number | | Rate komisi khusus (%), override setting |
| target_bulanan | Number | | Target omzet bulanan |
| status | String | | AKTIF / NONAKTIF |
| join_date | Date | | Tanggal bergabung |
| total_kunjungan | Number | | Counter, update otomatis |
| total_omzet | Number | | Total omzet, update otomatis |
| total_komisi_cair | Number | | Total komisi sudah dicairkan |
| photo_url | String | | Foto sales |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.3 CUSTOMERS (Toko)

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| customer_id | String | PK | Format: CST-001 |
| group_id | String | FK->CUSTOMER_GROUP | Grup toko |
| sales_id | String | FK->SALES | Sales penanggung jawab |
| store_name | String | | Nama toko |
| owner_name | String | | Nama pemilik toko |
| phone | String | | Nomor telepon toko |
| address | String | | Alamat lengkap |
| kota | String | | Kota |
| kecamatan | String | | Kecamatan |
| latitude | Number | | Koordinat GPS |
| longitude | Number | | Koordinat GPS |
| status | String | | AKTIF / NONAKTIF / SUSPEND |
| tipe_toko | String | | WARUNG / KIOS / MINIMARKET / KANTIN |
| limit_piutang | Number | | Maksimal piutang yang diizinkan |
| tempo_pembayaran | Number | | Hari jatuh tempo (default: 30) |
| last_visit | DateTime | | Kunjungan terakhir, update otomatis |
| visit_count | Number | | Total kunjungan, update otomatis |
| total_omzet | Number | | Total omzet dari toko ini |
| total_piutang | Number | | Sisa piutang saat ini |
| notes | String | | Catatan internal |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.4 CUSTOMER_GROUP

| Kolom | Tipe Data | PK | Keterangan |
|-------|-----------|----|------------|
| group_id | String | PK | Format: GRP-001 |
| group_name | String | | Nama grup |
| description | String | | Deskripsi grup |
| diskon_khusus | Number | | Diskon khusus grup (%) |
| created_at | DateTime | | |

#### 6.2.5 PRODUK

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| produk_id | String | PK | Format: PRD-001 |
| kategori_id | String | FK->KATEGORI_PRODUK | Kategori produk |
| kode_produk | String | | SKU / barcode |
| nama_produk | String | | Nama produk |
| varian | String | | Varian rasa |
| deskripsi | String | | Deskripsi produk |
| kemasan | String | | Ukuran kemasan |
| satuan | String | | PCS / PACK / BALL |
| harga_jual | Number | | Harga jual ke toko (konsinyasi) |
| harga_ecer | Number | | Harga eceran ke konsumen |
| hpp | Number | | Harga Pokok Produksi per unit |
| target_display | Number | | Default target display di toko |
| stok_minimum | Number | | Minimal stok gudang untuk alert |
| is_active | Boolean | | TRUE / FALSE |
| gambar_url | String | | URL gambar produk |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.6 KATEGORI_PRODUK

| Kolom | Tipe Data | PK | Keterangan |
|-------|-----------|----|------------|
| kategori_id | String | PK | Format: KAT-001 |
| nama_kategori | String | | Nama kategori |
| deskripsi | String | | |
| created_at | DateTime | | |

#### 6.2.7 PRODUKSI

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| produksi_id | String | PK | Format: PRD-YYYYMMDD-XXX |
| produk_id | String | FK->PRODUK | Produk yang diproduksi |
| batch_number | String | | BATCH-YYYYMMDD-XXX |
| qty_produksi | Number | | Jumlah diproduksi |
| hpp_per_unit | Number | | HPP per unit saat produksi |
| total_hpp | Number | | qty_produksi x hpp_per_unit |
| tanggal_produksi | Date | | Tanggal produksi |
| tanggal_expired | Date | | Tanggal kadaluarsa (estimasi) |
| keterangan | String | | Catatan produksi |
| created_by | String | FK->USERS | User yang mencatat |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.8 STOK_GUDANG

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| stok_gudang_id | String | PK | Format: STG-001 |
| produk_id | String | FK->PRODUK | Produk |
| batch_number | String | | Batch produksi (FIFO) |
| qty_masuk | Number | | Jumlah masuk dari produksi/retur |
| qty_keluar | Number | | Jumlah keluar ke sales |
| qty_sisa | Number | | Stok akhir (masuk - keluar) |
| satuan | String | | Unit satuan |
| tanggal_update | DateTime | | Last update |
| created_at | DateTime | | |

#### 6.2.9 STOK_KONSINYASI (Stok di Toko)

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| stok_konsinyasi_id | String | PK | Format: SKN-001 |
| customer_id | String | FK->CUSTOMERS | Toko |
| produk_id | String | FK->PRODUK | Produk |
| sales_id | String | FK->SALES | Sales penanggung jawab |
| qty_titip | Number | | Total qty dititip |
| qty_terjual | Number | | Total qty terjual |
| qty_retur | Number | | Total qty diretur |
| qty_rusak | Number | | Total qty rusak |
| qty_sisa | Number | | Stok saat ini di toko |
| target_display | Number | | Target display khusus toko (override) |
| last_visit | DateTime | | Kunjungan terakhir |
| last_restock | DateTime | | Restock terakhir |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.10 STOK_MUTASI

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| mutasi_id | String | PK | Format: MTS-001 |
| tipe_mutasi | String | | PRODUKSI / TITIP / KUNJUNGAN / RETUR / RESTOCK |
| source_id | String | | ID sumber transaksi |
| produk_id | String | FK->PRODUK | Produk |
| from_location | String | | GUDANG / TOKO:[customer_id] |
| to_location | String | | GUDANG / TOKO:[customer_id] |
| qty | Number | | Jumlah mutasi |
| batch_number | String | | Batch terkait |
| tanggal | DateTime | | Tanggal mutasi |
| created_by | String | FK->USERS | |
| created_at | DateTime | | |

#### 6.2.11 TITIP_HEADER

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| titip_id | String | PK | Format: TTP-YYYYMMDD-XXX |
| customer_id | String | FK->CUSTOMERS | Toko tujuan |
| sales_id | String | FK->SALES | Sales yang menitip |
| tanggal_titip | Date | | Tanggal titip |
| tipe_titip | String | | AWAL / RESTOCK |
| status | String | | AKTIF / COMPLETED |
| total_item | Number | | Total item (produk) |
| total_qty | Number | | Total quantity |
| notes | String | | Catatan |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.12 TITIP_DETAIL

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| titip_detail_id | String | PK | Format: TPD-001 |
| titip_id | String | FK->TITIP_HEADER | Header titip |
| produk_id | String | FK->PRODUK | Produk |
| qty_titip | Number | | Jumlah dititip |
| harga_satuan | Number | | Harga per unit saat titip |
| subtotal | Number | | qty x harga_satuan |
| batch_number | String | | Batch yang dikirim |
| created_at | DateTime | | |

#### 6.2.13 KUNJUNGAN_HEADER

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| kunjungan_id | String | PK | Format: KUN-YYYYMMDD-XXX |
| customer_id | String | FK->CUSTOMERS | Toko dikunjungi |
| sales_id | String | FK->SALES | Sales yang berkunjung |
| tanggal_kunjungan | Date | | Tanggal kunjungan |
| waktu_mulai | Time | | Jam mulai visit |
| waktu_selesai | Time | | Jam selesai visit |
| status | String | | DRAFT / COMPLETED |
| total_terjual | Number | | Total qty terjual (semua produk) |
| total_retur | Number | | Total qty retur |
| total_invoice | Number | | Total nilai invoice yang terbuat |
| notes | String | | Catatan kunjungan |
| foto_toko | String | | URL foto bukti kunjungan |
| latitude | Number | | GPS saat kunjungan |
| longitude | Number | | GPS saat kunjungan |
| has_restock | Boolean | | Apakah melakukan restock |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.14 KUNJUNGAN_DETAIL

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| kunjungan_detail_id | String | PK | Format: KND-001 |
| kunjungan_id | String | FK->KUNJUNGAN_HEADER | Header kunjungan |
| produk_id | String | FK->PRODUK | Produk |
| stok_awal | Number | | Stok sebelum kunjungan (dari last titip) |
| sisa_fisik | Number | | **INPUT sales: stok fisik di rak** |
| rusak | Number | | **INPUT sales: barang rusak** |
| retur | Number | | **INPUT sales: barang diretur** |
| terjual | Number | | **OTOMATIS: stok_awal - sisa_fisik - rusak - retur** |
| target_display | Number | | Target display produk ini di toko |
| rekomendasi_restock | Number | | **OTOMATIS: target - sisa** |
| qty_restock | Number | | Jumlah restock (jika dilakukan) |
| harga_jual | Number | | Harga jual per unit |
| subtotal_terjual | Number | | terjual x harga_jual |
| created_at | DateTime | | |

#### 6.2.15 RETUR

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| retur_id | String | PK | Format: RTU-YYYYMMDD-XXX |
| kunjungan_id | String | FK->KUNJUNGAN_HEADER | Dari kunjungan |
| customer_id | String | FK->CUSTOMERS | Toko yang meretur |
| sales_id | String | FK->SALES | Sales |
| produk_id | String | FK->PRODUK | Produk diretur |
| qty_retur | Number | | Jumlah retur |
| alasan | String | | RUSAK / KADALUARSA / TIDAK_LAKU / LAINNYA |
| status_barang | String | | MASUK_GUDANG / DIMUSNAHKAN |
| tanggal_retur | Date | | |
| created_at | DateTime | | |

#### 6.2.16 RESTOCK

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| restock_id | String | PK | Format: RST-YYYYMMDD-XXX |
| kunjungan_id | String | FK->KUNJUNGAN_HEADER | Dari kunjungan |
| titip_id | String | FK->TITIP_HEADER | Link ke titip header |
| customer_id | String | FK->CUSTOMERS | Toko |
| sales_id | String | FK->SALES | Sales |
| status | String | | PLANNED / EXECUTED / SKIPPED |
| total_qty | Number | | Total restock |
| created_at | DateTime | | |

#### 6.2.17 INVOICE_HEADER

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| invoice_id | String | PK | Format: INV-YYYYMMDD-XXX |
| kunjungan_id | String | FK->KUNJUNGAN_HEADER | Dari kunjungan |
| customer_id | String | FK->CUSTOMERS | Toko |
| sales_id | String | FK->SALES | Sales |
| tanggal_invoice | Date | | Tanggal invoice |
| subtotal | Number | | Total sebelum diskon/pajak |
| diskon | Number | | Diskon (jika ada) |
| pajak | Number | | Pajak (jika ada) |
| total | Number | | Subtotal - diskon + pajak |
| status_pembayaran | String | | OPEN / PARTIAL / PAID |
| jatuh_tempo | Date | | Tanggal jatuh tempo |
| notes | String | | |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.18 INVOICE_DETAIL

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| invoice_detail_id | String | PK | Format: INVD-001 |
| invoice_id | String | FK->INVOICE_HEADER | Header invoice |
| produk_id | String | FK->PRODUK | Produk |
| qty | Number | | Jumlah terjual |
| harga_satuan | Number | | Harga per unit |
| subtotal | Number | | qty x harga_satuan |
| hpp_satuan | Number | | HPP per unit saat transaksi |
| laba_kotor | Number | | subtotal - (qty x hpp_satuan) |
| created_at | DateTime | | |

#### 6.2.19 PIUTANG

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| piutang_id | String | PK | Format: PIT-YYYYMMDD-XXX |
| invoice_id | String | FK->INVOICE_HEADER | Dari invoice |
| customer_id | String | FK->CUSTOMERS | Toko |
| sales_id | String | FK->SALES | Sales |
| total_piutang | Number | | Total invoice value |
| sisa_piutang | Number | | Sisa yang belum dibayar |
| status | String | | OPEN / PARTIAL / PAID |
| tanggal_invoice | Date | | |
| jatuh_tempo | Date | | |
| tgl_lunas | Date | | Tanggal lunas (jika PAID) |
| umur_piutang | Number | | Hari sejak invoice (aging) |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.20 PEMBAYARAN

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| pembayaran_id | String | PK | Format: BYR-YYYYMMDD-XXX |
| piutang_id | String | FK->PIUTANG | Piutang yang dibayar |
| customer_id | String | FK->CUSTOMERS | Toko |
| sales_id | String | FK->SALES | Sales yang menagih |
| invoice_id | String | FK->INVOICE_HEADER | Invoice terkait |
| jumlah_bayar | Number | | Jumlah pembayaran |
| sisa_setelah_bayar | Number | | Sisa piutang setelah bayar |
| metode_bayar | String | | TUNAI / TRANSFER / GIRO |
| bukti_bayar | String | | URL/No referensi |
| tanggal_bayar | Date | | Tanggal pembayaran |
| status | String | | VALID / VOID |
| created_by | String | FK->USERS | |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.21 KOMISI

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| komisi_id | String | PK | Format: KMS-YYYYMMDD-XXX |
| sales_id | String | FK->SALES | Sales |
| invoice_id | String | FK->INVOICE_HEADER | Invoice yang lunas |
| customer_id | String | FK->CUSTOMERS | Toko |
| total_invoice | Number | | Nilai invoice yang dibayar |
| rate_komisi | Number | | Rate komisi (%) |
| nilai_komisi | Number | | total_invoice x (rate_komisi/100) |
| periode_bulan | Number | | Bulan (1-12) |
| periode_tahun | Number | | Tahun |
| status | String | | READY / PAID |
| tanggal_cair | Date | | Tanggal dicairkan (jika PAID) |
| created_at | DateTime | | |
| updated_at | DateTime | | |

#### 6.2.22 BIAYA_OPERASIONAL

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| biaya_id | String | PK | Format: BYA-YYYYMMDD-XXX |
| kategori | String | | Gaji / Transport / Packing / DLL |
| deskripsi | String | | Rincian biaya |
| jumlah | Number | | Nominal biaya |
| tanggal | Date | | Tanggal biaya |
| metode_pembayaran | String | | TUNAI / TRANSFER |
| bukti | String | | URL bukti |
| notes | String | | |
| created_by | String | FK->USERS | |
| created_at | DateTime | | |

#### 6.2.23 SETTING

| Kolom | Tipe Data | PKFK | Keterangan |
|-------|-----------|------|------------|
| setting_id | String | PK | Format: SET-001 |
| group_setting | String | | KOMISI / UMUM / INVOICE / TOKO |
| key | String | | Nama setting |
| value | String | | Nilai setting |
| tipe_data | String | | STRING / NUMBER / BOOLEAN |
| deskripsi | String | | Penjelasan |
| updated_by | String | FK->USERS | |
| updated_at | DateTime | | |

Default Settings:

| Key | Value | Deskripsi |
|-----|-------|-----------|
| komisi_rate_default | 5 | Rate komisi default (%) |
| tempo_pembayaran_default | 30 | Jatuh tempo default (hari) |
| pajak_default | 0 | Pajak default (%) |
| target_display_default | 20 | Target display default |
| stok_minimum_alert | 10 | Alert stok minimum |
| nama_perusahaan | - | Nama perusahaan |
| alamat_perusahaan | - | Alamat |

#### 6.2.24 LOG_AKTIVITAS

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| log_id | String | PK | Format: LOG-001 |
| user_id | String | FK->USERS | User yang melakukan |
| tipe_aktivitas | String | | LOGIN / CREATE / UPDATE / DELETE |
| modul | String | | PRODUKSI / TITIP / KUNJUNGAN / DLL |
| source_id | String | | ID data yang diubah |
| deskripsi | String | | Deskripsi aktivitas |
| data_lama | String | | JSON data sebelum diubah |
| data_baru | String | | JSON data setelah diubah |
| ip_address | String | | IP user |
| user_agent | String | | Browser/device |
| created_at | DateTime | | |

#### 6.2.25 AUDIT_TRAIL

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| audit_id | String | PK | Format: AUD-001 |
| tabel | String | | Nama tabel/sheet |
| record_id | String | | ID record |
| aksi | String | | INSERT / UPDATE / DELETE |
| data_sebelum | String | | JSON sebelum perubahan |
| data_sesudah | String | | JSON setelah perubahan |
| diubah_oleh | String | FK->USERS | |
| diubah_pada | DateTime | | |
| ip_address | String | | |

#### 6.2.26 NOTIFIKASI

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| notifikasi_id | String | PK | Format: NOT-001 |
| user_id | String | FK->USERS | Penerima notifikasi |
| tipe | String | | INFO / WARNING / ERROR / SUCCESS |
| judul | String | | Judul notifikasi |
| pesan | String | | Isi notifikasi |
| link | String | | Link ke halaman terkait |
| is_read | Boolean | | Status dibaca |
| created_at | DateTime | | |

#### 6.2.27 TARGET_SALES

| Kolom | Tipe Data | PK/FK | Keterangan |
|-------|-----------|-------|------------|
| target_id | String | PK | Format: TGT-YYYYMM-XXX |
| sales_id | String | FK->SALES | Sales |
| bulan | Number | | Bulan (1-12) |
| tahun | Number | | Tahun |
| target_omzet | Number | | Target omzet bulanan |
| target_kunjungan | Number | | Target kunjungan bulanan |
| target_customer_baru | Number | | Target customer baru |
| komisi_target | Number | | Komisi jika mencapai target |
| pencapaian_omzet | Number | | Update otomatis |
| pencapaian_kunjungan | Number | | Update otomatis |
| persentase_pencapaian | Number | | (pencapaian / target) x 100 |
| created_at | DateTime | | |
| updated_at | DateTime | | |

```


---

## 7. GOOGLE SHEETS DESIGN

### 7.1 STRUKTUR SHEET

```
[NAMA_BISNIS] - Sistem Manajemen Konsinyasi Seblak
|
|-- MASTER DATA
|   |-- 01_USERS
|   |-- 02_SALES
|   |-- 03_CUSTOMER_GROUP
|   |-- 04_CUSTOMERS
|   |-- 05_KATEGORI_PRODUK
|   |-- 06_PRODUK
|   |-- 07_SETTING
|
|-- PRODUKSI & STOK
|   |-- 08_PRODUKSI
|   |-- 09_STOK_GUDANG
|   |-- 10_STOK_KONSINYASI
|   |-- 11_STOK_MUTASI
|
|-- TRANSAKSI
|   |-- 12_TITIP_HEADER
|   |-- 13_TITIP_DETAIL
|   |-- 14_KUNJUNGAN_HEADER
|   |-- 15_KUNJUNGAN_DETAIL
|   |-- 16_RETUR
|   |-- 17_RESTOCK
|
|-- KEUANGAN
|   |-- 18_INVOICE_HEADER
|   |-- 19_INVOICE_DETAIL
|   |-- 20_PIUTANG
|   |-- 21_PEMBAYARAN
|   |-- 22_KOMISI
|   |-- 23_BIAYA_OPERASIONAL
|
|-- LOG & TARGET
|   |-- 24_LOG_AKTIVITAS
|   |-- 25_AUDIT_TRAIL
|   |-- 26_NOTIFIKASI
|   |-- 27_TARGET_SALES
|
|-- DASHBOARD & REPORT
|   |-- 28_DASHBOARD_OWNER
|   |-- 29_DASHBOARD_SALES
|   |-- 30_REPORT_PENJUALAN
|   |-- 31_REPORT_PIUTANG
|   |-- 32_REPORT_KOMISI
|   |-- 33_REPORT_STOK
|
|-- SYSTEM (Hidden)
    |-- 34_SESSION
    |-- 35_AUDIT_CONFIG
```

### 7.2 DETAIL SETIAP SHEET

#### Sheet: 01_USERS
| Kolom | Tipe | Validasi |
|-------|------|----------|
| user_id | String | PK, format: USR-{3digit} |
| username | String | UNIQUE, required |
| email | String | Valid email format |
| password_hash | String | SHA-256 hash |
| role | String | Dropdown: OWNER, ADMIN, SALES |
| full_name | String | Required |
| phone | String | Format telepon |
| is_active | Boolean | Dropdown: TRUE, FALSE |
| last_login | DateTime | Auto |
| created_at | DateTime | Auto |
| updated_at | DateTime | Auto |

**Conditional Formatting:** Baris merah jika is_active = FALSE

#### Sheet: 02_SALES
| Kolom | Tipe | Validasi |
|-------|------|----------|
| sales_id | String | PK, format: SLS-{3digit} |
| user_id | String | FK, dropdown dari USERS |
| sales_code | String | UNIQUE |
| full_name | String | Required |
| phone | String | |
| address | String | |
| kota | String | |
| komisi_rate | Number | 0-100, persen |
| target_bulanan | Number | Currency |
| status | String | Dropdown: AKTIF, NONAKTIF |
| join_date | Date | |
| total_kunjungan | Number | Formula COUNTIF dari KUNJUNGAN_HEADER |
| total_omzet | Number | Formula SUMIF dari INVOICE_HEADER |
| total_komisi_cair | Number | Formula SUMIF dari KOMISI |
| created_at | DateTime | |

#### Sheet: 04_CUSTOMERS
| Kolom | Tipe | Validasi |
|-------|------|----------|
| customer_id | String | PK, format: CST-{3digit} |
| group_id | String | FK, dropdown dari CUSTOMER_GROUP |
| sales_id | String | FK, dropdown dari SALES |
| store_name | String | Required |
| owner_name | String | |
| phone | String | |
| address | String | |
| kota | String | |
| status | String | Dropdown: AKTIF, NONAKTIF, SUSPEND |
| tipe_toko | String | Dropdown: WARUNG, KIOS, MINIMARKET, KANTIN, LAINNYA |
| limit_piutang | Number | Currency |
| tempo_pembayaran | Number | Hari |
| last_visit | DateTime | Formula MAXIF |
| visit_count | Number | Formula COUNTIF |
| total_omzet | Number | Formula SUMIF |
| total_piutang | Number | Formula SUMIF dari PIUTANG |
| notes | String | |
| created_at | DateTime | |

**Conditional Formatting:**
- total_piutang > limit_piutang > merah
- last_visit > 30 hari > kuning

#### Sheet: 06_PRODUK
| Kolom | Tipe | Validasi |
|-------|------|----------|
| produk_id | String | PK, format: PRD-{3digit} |
| kategori_id | String | FK, dropdown dari KATEGORI_PRODUK |
| kode_produk | String | UNIQUE, SKU |
| nama_produk | String | Required |
| varian | String | |
| harga_jual | Number | Currency, required |
| harga_ecer | Number | Currency |
| hpp | Number | Currency |
| target_display | Number | Default display |
| stok_minimum | Number | |
| is_active | Boolean | |

#### Sheet: 08_PRODUKSI
| Kolom | Tipe | Validasi |
|-------|------|----------|
| produksi_id | String | PK, auto: PRD-YYYYMMDD-XXX |
| produk_id | String | FK, dropdown dari PRODUK |
| batch_number | String | Auto: BATCH-YYYYMMDD-XXX |
| qty_produksi | Number | > 0 |
| hpp_per_unit | Number | Currency |
| total_hpp | Number | Formula: qty x hpp |
| tanggal_produksi | Date | |
| tanggal_expired | Date | |
| keterangan | String | |
| created_by | String | Auto from session |

#### Sheet: 09_STOK_GUDANG
| Kolom | Tipe | Validasi |
|-------|------|----------|
| stok_gudang_id | String | PK |
| produk_id | String | FK, dropdown dari PRODUK |
| batch_number | String | |
| qty_masuk | Number | |
| qty_keluar | Number | |
| qty_sisa | Number | Formula: masuk - keluar |
| satuan | String | |
| tanggal_update | DateTime | |

**Pivot Table:** Ringkasan stok per produk

#### Sheet: 10_STOK_KONSINYASI
| Kolom | Tipe | Validasi |
|-------|------|----------|
| stok_konsinyasi_id | String | PK |
| customer_id | String | FK, dropdown dari CUSTOMERS |
| produk_id | String | FK, dropdown dari PRODUK |
| sales_id | String | FK |
| qty_titip | Number | |
| qty_terjual | Number | |
| qty_retur | Number | |
| qty_rusak | Number | |
| qty_sisa | Number | Formula: titip - terjual - retur - rusak |
| target_display | Number | |
| last_visit | DateTime | |
| last_restock | DateTime | |

**Conditional Formatting:**
- qty_sisa = 0 > merah (habis)
- qty_sisa < target_display x 0.3 > kuning (perlu restock)

#### Sheet: 15_KUNJUNGAN_DETAIL
| Kolom | Tipe | Validasi/Formula |
|-------|------|------------------|
| kunjungan_detail_id | String | PK |
| kunjungan_id | String | FK |
| produk_id | String | FK |
| stok_awal | Number | |
| sisa_fisik | Number | INPUT SALES |
| rusak | Number | INPUT SALES, default 0 |
| retur | Number | INPUT SALES, default 0 |
| terjual | Number | FORMULA: stok_awal - sisa_fisik - rusak - retur |
| target_display | Number | VLOOKUP dari PRODUK |
| rekomendasi_restock | Number | FORMULA: target_display - sisa_fisik |
| qty_restock | Number | Input jika restock |
| harga_jual | Number | VLOOKUP dari PRODUK |
| subtotal_terjual | Number | FORMULA: terjual x harga_jual |

#### Sheet: 18_INVOICE_HEADER
| Kolom | Tipe | Validasi/Formula |
|-------|------|------------------|
| invoice_id | String | PK, auto: INV-YYYYMMDD-XXX |
| kunjungan_id | String | FK |
| customer_id | String | FK |
| sales_id | String | FK |
| tanggal_invoice | Date | |
| subtotal | Number | Formula SUM dari detail |
| diskon | Number | |
| pajak | Number | |
| total | Number | Formula: subtotal - diskon + pajak |
| status_pembayaran | String | Dropdown: OPEN, PARTIAL, PAID |
| jatuh_tempo | Date | Formula: tanggal_invoice + 30 |
| created_at | DateTime | |

#### Sheet: 20_PIUTANG
| Kolom | Tipe | Validasi/Formula |
|-------|------|------------------|
| piutang_id | String | PK |
| invoice_id | String | FK |
| customer_id | String | FK |
| sales_id | String | FK |
| total_piutang | Number | |
| sisa_piutang | Number | Formula: total - SUM pembayaran |
| status | String | Dropdown: OPEN, PARTIAL, PAID |
| jatuh_tempo | Date | |
| umur_piutang | Number | FORMULA: TODAY() - tanggal_invoice |

**Conditional Formatting:**
- umur_piutang > 60 > merah (macet)
- umur_piutang > 30 > kuning (warning)
- status = PAID > hijau

### 7.3 NAMED RANGES

| Named Range | Sheet | Range | Kegunaan |
|-------------|-------|-------|----------|
| DB_USERS | 01_USERS | A:K | Database users |
| DB_SALES | 02_SALES | A:R | Database sales |
| DB_CUSTOMERS | 04_CUSTOMERS | A:T | Database customers |
| DB_PRODUK | 06_PRODUK | A:R | Database produk |
| DB_SETTING | 07_SETTING | A:G | Database setting |
| RNG_INVOICE_NUMBER | 18_INVOICE_HEADER | A1 | Counter invoice |
| RNG_SESSION | 34_SESSION | A:E | Session data |

---

## 8. GOOGLE APPS SCRIPT ARSITEKTUR

### 8.1 STRUKTUR FOLDER

```
SeblakManagementSystem (Apps Script Project)
|
|-- Code.gs                  # Main entry, doGet, doPost, routing
|-- Auth.gs                  # Login, logout, session, RBAC
|-- Customer.gs              # CRUD customer
|-- SalesPerson.gs           # CRUD sales
|-- Produk.gs                # CRUD produk & kategori
|-- Produksi.gs              # Produksi & update stok
|-- Stok.gs                  # Stok gudang & konsinyasi
|-- Titipan.gs               # Titip awal & restock
|-- Kunjungan.gs             # Kunjungan sales engine (CORE)
|-- Invoice.gs               # Generate invoice otomatis
|-- Pembayaran.gs            # Pembayaran & update piutang
|-- Komisi.gs                # Hitung komisi sales
|-- Dashboard.gs             # Data KPI dashboard
|-- Report.gs                # Generate semua laporan
|-- Utils.gs                 # Helper, ID generator, validasi
|-- Settings.gs              # Setting aplikasi
|-- Notifikasi.gs            # Notifikasi sistem
|-- Logging.gs               # Log aktivitas & audit trail
|
|-- views/
|   |-- index.html           # Landing page / redirect
|   |-- login.html           # Halaman login
|   |-- owner.html           # Dashboard owner (SPA)
|   |-- sales.html           # Dashboard sales (SPA)
|   |-- visit.html           # Form kunjungan (mobile)
|   |-- payment.html         # Form pembayaran
|   |-- setup.html           # Setup awal wizard
|   |-- report.html          # Halaman laporan
|
|-- components/
|   |-- navbar.html          # Navigation bar
|   |-- sidebar.html         # Sidebar owner
|   |-- bottomnav.html       # Bottom nav sales
|   |-- cards.html           # Card components
|   |-- modal.html           # Modal dialog
|   |-- toast.html           # Toast notification
|   |-- skeleton.html        # Skeleton loading
|   |-- emptyState.html      # Empty state component
|
|-- css/
|   |-- main.css             # Main stylesheet
|   |-- owner.css            # Owner-specific styles
|   |-- sales.css            # Sales-specific styles
|   |-- mobile.css           # Mobile responsive
|   |-- darkmode.css         # Dark mode theme
|   |-- components.css       # Component styles
|
|-- js/
|   |-- app.js               # Main app logic
|   |-- api.js               # API calls (google.script.run)
|   |-- auth.js              # Client-side auth
|   |-- router.js            # Client-side routing (SPA)
|   |-- utils.js             # Client-side utilities
|   |-- charts.js            # Chart rendering
|   |-- dashboard-owner.js   # Owner dashboard logic
|   |-- dashboard-sales.js   # Sales dashboard logic
|   |-- visit.js             # Visit form logic
|   |-- payment.js           # Payment form logic
|   |-- validators.js        # Client validations
|
|-- assets/
    |-- icons/               # SVG icons
    |-- images/              # Images & illustrations
    |-- fonts/               # Custom fonts (optional)
```

### 8.2 FUNGSI SETIAP FILE

#### Code.gs - Main Entry Point

- doGet(e) > Handle semua HTTP GET request, routing berdasarkan parameter ?page=
- doPost(e) > Handle semua HTTP POST request, parse JSON, route ke handler
- include(filename) > Include HTML file, menggabungkan HTML components
- getScriptUrl() > Return URL script
- setupTriggers() > Setup time-based triggers (daily backup, piutang aging, stok alert)

#### Auth.gs - Authentication System

- authenticate(username, password) > Validasi login, verify password hash, buat session
- createSession(userData) > Generate session token (UUID), simpan di SESSION sheet, expiry 24 jam
- validateSession(token) > Cek token, cek expiry, return user data
- destroySession(token) > Hapus session (logout), delete row dari SESSION
- checkAccess(userRole, requiredRole) > RBAC check, compare role hierarchy
- hashPassword(password) > Hash password SHA-256
- getCurrentUser() > Get user dari session
- requireRole(requiredRole) > Middleware access control

#### Kunjungan.gs - Kunjungan Engine (CORE)

- startKunjungan(customerId) > Validasi customer, get last visit data, get stok konsinyasi, create header DRAFT
- saveSisaStok(kunjunganId, items[]) > Simpan array [{produk_id, sisa_fisik, rusak, retur}], hitung TERJUAL, hitung RESTOCK
- finalizeKunjungan(kunjunganId) > Update COMPLETED, generate Invoice jika terjual, proses retur, update stok, update last_visit
- generateInvoice(kunjunganId) > Internal: hitung subtotal, insert INVOICE_HEADER + DETAIL, insert PIUTANG OPEN
- prosesRetur(kunjunganId) > Internal: insert RETUR, update stok gudang (+qty), update stok konsinyasi (-qty)
- prosesRestock(kunjunganId, items[]) > Validasi stok, create TITIP_RESTOCK, kurangi gudang, tambah konsinyasi

#### Invoice.gs - Invoice & Piutang

- getInvoices(filters) > GET invoices filter by sales_id, customer, status, date range
- getPiutang(filters) > GET piutang filter by sales_id (SALES role), status, aging analysis
- getAgingPiutang() > GET aging analysis: 0-30, 31-60, 61-90, >90 hari
- updateStatusPembayaran(invoiceId) > Update status OPEN/PARTIAL/PAID berdasarkan total pembayaran

#### Pembayaran.gs - Payment Processing

- createPembayaran(data) > POST catat pembayaran, validasi piutang, insert PEMBAYARAN, update PIUTANG, update INVOICE status, jika PAID hitung KOMISI
- cancelPembayaran(pembayaranId) > POST void payment (24 jam), restore piutang

#### Komisi.gs - Komisi Calculation

- hitungKomisi(invoiceId) > Internal: hitung total_invoice x rate/100, insert KOMISI READY
- getKomisiSales(salesId, periode) > GET komisi per sales filter by bulan/tahun
- cairkanKomisi(komisiIds[]) > POST pencairan: READY > PAID, catat tanggal_cair

#### Dashboard.gs - Dashboard Data

- getOwnerDashboardData() > GET semua KPI owner: omzet, laba, piutang, stok, produk terlaris, sales terbaik, grafik
- getSalesDashboardData(salesId) > GET KPI per sales: target, pencapaian, toko aktif, kunjungan, piutang, ranking
- getProdukTerlaris(limit, startDate, endDate) > Top produk dari INVOICE_DETAIL
- getSalesRanking(periode) > Ranking sales by omzet, kunjungan, customer aktif
- getGrafikPenjualanHarian(days) > Chart data penjualan harian
- getGrafikPenjualanBulanan(months) > Chart data penjualan bulanan

#### Report.gs - Reporting Engine

- generateReport(type, filters) > Generate 16 jenis laporan
- exportToGoogleDocs(reportData, format) > Export ke Google Docs / PDF / Email
- downloadReportAsCSV(reportType, filters) > CSV download

#### Utils.gs - Utility Functions

- generateId(prefix, sheet, column) > Auto ID generator: PRD-YYYYMMDD-XXX
- formatRupiah(number) > Format Rp 1.000.000
- getSheetByName(name), getLastRow, appendRow, updateRow, findRow
- getDataAsObjects(sheet) > Sheet to JSON-like array
- validateRequired(data, fields) > Validasi field required
- filterArrayByRole(array, role, userId) > Filter data berdasarkan role
- calculateMargin(hpp, hargaJual) > Hitung persentase margin

### 8.3 TRIGGER CONFIGURATION

| Trigger | Fungsi | Waktu |
|---------|--------|-------|
| updatePiutangAging | Update umur piutang | Every day 00:00 |
| stokMinimumAlert | Alert stok minimum | Every day 06:00 |
| backupData | Backup ke sheet backup | Every day 02:00 |
| updateSalesRanking | Update ranking sales | Every day 23:00 |
| generateMonthlyReport | Generate laporan bulanan | Setiap tanggal 1 |
| cleanupSessions | Hapus expired sessions | Every hour |

### 8.4 API ENDPOINTS (via doPost routing)

```
POST /auth/login          > Auth.gs > authenticate()
POST /auth/logout         > Auth.gs > destroySession()
GET  /customers           > Customer.gs > getCustomers()
POST /customers           > Customer.gs > createCustomer()
POST /kunjungan/start     > Kunjungan.gs > startKunjungan()
POST /kunjungan/save      > Kunjungan.gs > saveSisaStok()
POST /kunjungan/finalize  > Kunjungan.gs > finalizeKunjungan()
POST /kunjungan/restock   > Kunjungan.gs > prosesRestock()
GET  /invoices            > Invoice.gs > getInvoices()
GET  /piutang             > Invoice.gs > getPiutang()
POST /pembayaran          > Pembayaran.gs > createPembayaran()
GET  /dashboard/owner     > Dashboard.gs > getOwnerDashboardData()
GET  /dashboard/sales     > Dashboard.gs > getSalesDashboardData()
GET  /reports/:type       > Report.gs > generateReport()
```

---

## 9. UI/UX DESIGN DAN WIREFRAME

### 9.1 DESIGN SYSTEM

#### Warna (Color Palette)

- Primary: #C62828 (Merah Tua)
- Secondary: #FF6F00 (Oranye)
- Background: #F5F5F5 (Abu-abu Muda)
- Surface: #FFFFFF (Putih)
- Text: #212121 (Hitam)
- Text Light: #757575 (Abu-abu)
- Success: #2E7D32 (Hijau)
- Warning: #F9A825 (Kuning)
- Error: #C62828 (Merah)
- Info: #1565C0 (Biru)

#### Tipografi

- Font Family: Inter, sans-serif
- Heading 1: 24px Bold
- Heading 2: 20px Bold
- Heading 3: 18px Semibold
- Body: 14px Regular
- Small: 12px Regular

#### Komponen UI Konsisten

- Cards: Background putih, border-radius 12px, shadow 0 2px 8px rgba(0,0,0,0.08)
- Buttons: Rounded 8px, padding 12px 24px
- Input: Border 1px #E0E0E0, rounded 8px, padding 12px
- FAB: Fixed bottom-right, 56px circle, shadow, color secondary
- Bottom Nav: Fixed bottom, 5 menu max, icon+label
- Sidebar: Fixed left, 250px width, scrollable
- Modal: Centered, max-width 500px, backdrop blur
- Toast: Fixed top-right, auto-dismiss 3 detik

### 9.2 WIREFRAME HALAMAN UTAMA

#### Login Page

```
+---------------------------------------+
|                                       |
|            [LOGO BESAR]               |
|         Seblak Management             |
|                                       |
|  +-------------------------------+   |
|  |  Email / Username             |   |
|  |  [________________________]   |   |
|  |                               |   |
|  |  Password                     |   |
|  |  [________________________]   |   |
|  |                               |   |
|  |  [MASUK]                     |   |
|  |                               |   |
|  |  Lupa Password?               |   |
|  +-------------------------------+   |
|                                       |
+---------------------------------------+
```

#### Owner Dashboard (Desktop - Sidebar View)

```
+----------+-------------------------------------------+
| SIDEBAR  |  DASHBOARD OWNER                   Notif  |
|          |                                            |
| Dashboard|  +------+ +------+ +------+ +------+     |
| Sales    |  |Omzet  | |Laba   | |Piutang| |Stok  |     |
| Customer |  |Hari Ini| |Kotor  | |Aktif  | |Gudang|     |
| Produk   |  |Rp 5,2 | |Rp 2,1 | |Rp 8,5 | |1.250 |     |
| Produksi |  +------+ +------+ +------+ +------+     |
| Stok     |                                            |
| Titip    |  +--------------------------------------+ |
| Kunjungan|  |  Grafik Penjualan 30 Hari            | |
| Invoice  |  |  Line chart: omzet per hari          | |
| Piutang  |  +--------------------------------------+ |
| Bayar    |                                            |
| Komisi   |  +--------+ +--------+ +--------+         |
| Biaya    |  |Produk  | |Sales   | |Customer|         |
| Laporan  |  |Terlaris| |Terbaik | |Terbaik |         |
| Setting  |  |1.Seblak| |1. Andi | |1.TokoA |         |
|          |  |2.Balado| |2. Budi | |2.TokoB |         |
|          |  +--------+ +--------+ +--------+         |
|          |                                            |
|          |  +--------------------------------------+ |
|          |  | Tabel Piutang Aging                  | |
|          |  | 0-30: Rp4jt | 31-60: Rp2,5jt | ...   | |
|          |  +--------------------------------------+ |
+----------+-------------------------------------------+
```

#### Sales Dashboard (Mobile - Bottom Nav)

```
+-----------------------------------+
|  Halo, Andi!                Notif |
|                                   |
|  Target Bulan Ini                 |
|  Rp 15.000.000                    |
|  [==========......] 65%           |
|  Pencapaian: Rp 9,750,000         |
|                                   |
|  +------+ +------+               |
|  |Omzet  | |Toko  |               |
|  |Bulan  | |Aktif |               |
|  |Rp 9,7 | |12/15 |               |
|  +------+ +------+               |
|  +------+ +------+               |
|  |Kunj   | |Piutng|               |
|  |Hr Ini | |Area  |               |
|  |  5    | |Rp 2,1|               |
|  +------+ +------+               |
|                                   |
|  Invoice Belum Lunas              |
|  INV-001: Rp 500,000              |
|  INV-002: Rp 750,000              |
|  INV-003: Rp 300,000              |
|                                   |
|  Ranking Sales: #2 dari 5         |
|                                   |
+-----------------------------------+
| Dash | Toko | Kunj | Bayar | Akun |
+-----------------------------------+
```

#### Halaman Kunjungan (Mobile - CORE)

```
+-----------------------------------+
|  <- Kembali                  Save |
|                                   |
|  Toko Sumber Rejeki               |
|  Terakhir: 3 hari lalu            |
|                                   |
|  +-----------------------------+  |
|  | Seblak Original             |  |
|  | Stok Awal: 20 | Target: 20 |  |
|  |                             |  |
|  | Sisa Fisik: [__7__]        |  |
|  | Rusak:     [__0__]        |  |
|  | Retur:     [__0__]        |  |
|  |                             |  |
|  | Terjual: 13 pcs             |  |
|  | Restock: 13 pcs             |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | Seblak Balado               |  |
|  | Sisa Fisik: [__5__]        |  |
|  | Rusak:     [__1__]        |  |
|  | Retur:     [__0__]        |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | Ringkasan:                   |  |
|  | Terjual: 27 pcs              |  |
|  | Invoice: Rp 135,000          |  |
|  |                             |  |
|  | [Foto Toko]                 |  |
|  +-----------------------------+  |
|                                   |
|  [SIMPAN KUNJUNGAN]               |
|                                   |
+-----------------------------------+
```

#### Halaman Pembayaran (Mobile)

```
+-----------------------------------+
|  <- Kembali                       |
|                                   |
|  Pembayaran                       |
|                                   |
|  Toko: Sumber Rejeki              |
|  Total Piutang: Rp 1,550,000      |
|                                   |
|  Pilih Invoice:                   |
|  [x] INV-006 - Rp 500,000        |
|      30 hari                       |
|  [ ] INV-007 - Rp 750,000        |
|      15 hari                       |
|  [ ] INV-008 - Rp 300,000        |
|      5 hari                        |
|                                   |
|  Jumlah Bayar:                    |
|  [Rp 500,000                ]    |
|                                   |
|  Metode: (o) Tunai (x) Transfer   |
|                                   |
|  No. Referensi:                   |
|  [TRF-20260611-XXX          ]    |
|                                   |
|  [KONFIRMASI PEMBAYARAN]          |
|                                   |
+-----------------------------------+
```

### 9.3 RESPONSIVE BREAKPOINTS

| Breakpoint | Target | Layout |
|------------|--------|--------|
| < 576px | Mobile Sales | Bottom Navigation, Full Width |
| 576-768px | Tablet | Bottom Navigation, 2 Column Grid |
| 768-1024px | Tablet Landscape | Sidebar Collapsible |
| > 1024px | Desktop Owner | Sidebar Fixed, Multi Column |

### 9.4 LOADING & EMPTY STATE

**Skeleton Loading:** Shimmer effect pada card saat loading
**Empty State:** Ilustrasi + pesan "Belum ada data" + tombol aksi
**Toast Notification:** Success (hijau), Warning (kuning), Error (merah), auto-dismiss 3 detik

---

## 10. LOGIN DAN SECURITY

### 10.1 ALUR LOGIN

```
Step 1: User membuka aplikasi
  |
  v
Step 2: Cek session di SessionStorage
  |-- Jika ada session valid > redirect ke dashboard by role
  |-- Jika tidak > tampilkan halaman login
  |
  v
Step 3: User input username & password
  |
  v
Step 4: Client-side hash password (SHA-256)
  |
  v
Step 5: Kirim ke server (google.script.run.authenticate())
  |
  v
Step 6: Server-side:
  |-- Cari username di sheet USERS
  |-- Jika tidak ditemukan > error "User tidak ditemukan"
  |-- Jika ditemukan:
  |   |-- Verify password hash
  |   |-- Jika salah > error "Password salah"
  |   |-- Jika benar:
  |       |-- Generate session token (UUID v4)
  |       |-- Simpan session di sheet SESSION
  |       |-- Update last_login
  |       |-- Return {success: true, user, token}
  |
  v
Step 7: Client-side:
  |-- Simpan token & user data di SessionStorage
  |-- Redirect ke halaman sesuai role
  |-- Tampilkan toast "Selamat datang!"
```

### 10.2 SESSION MANAGEMENT

```
Session Storage (Client-Side):
  Key: 'seblak_session'
  Value: {
    token: "uuid-v4-string",
    user: {
      user_id: "USR-001",
      username: "andi",
      role: "SALES",
      full_name: "Andi Pratama",
      sales_id: "SLS-001"
    },
    expiry: "2026-06-12T10:00:00Z"
  }

Security Measures:
  - Session token di SessionStorage (bukan localStorage)
  - Session expired dalam 24 jam
  - Setiap API call me-validasi session
  - Regenerate token setiap login
```

### 10.3 ACCESS CONTROL

```
Role Hierarchy:
  OWNER (3) > ADMIN (2) > SALES (1)

function checkAccess(requiredRole) {
  const user = getCurrentUser();
  const roleHierarchy = { OWNER: 3, ADMIN: 2, SALES: 1 };
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new Error('Forbidden: Insufficient access');
  }
}

Row-Level Security:
  - SALES hanya melihat data dengan sales_id miliknya
  - Filter di setiap query function
  - Server-side enforcement (jangan trusted client)
```

### 10.4 SECURITY BEST PRACTICES

1. **Password:** SHA-256 hash (client + server), minimum 8 karakter
2. **Session:** Token UUID v4, expiry 24 jam, validasi setiap request
3. **Access Control:** Role-based + row-level, server-side enforcement
4. **Data Protection:** Input sanitization, logging akses sensitif, backup harian
5. **Google Apps Script:** Deploy "Execute as: User accessing", protect sheet ranges

---

## 11. FORMULA BISNIS DAN KEUANGAN

### 11.1 RUMUS DASAR

**Omzet (Revenue):**
Omzet = SUM (Qty Terjual x Harga Jual per Unit)

**HPP (Harga Pokok Produksi):**
HPP per Unit = Total Biaya Produksi / Jumlah Produksi
Total HPP Terjual = SUM (Qty Terjual x HPP per Unit)

**Laba Kotor (Gross Profit):**
Laba Kotor = Omzet - HPP
Laba Kotor per Produk = (Harga Jual - HPP) x Qty Terjual

**Laba Bersih (Net Profit):**
Laba Bersih = Laba Kotor - Biaya Operasional - Komisi Sales

**Margin:**
Margin Kotor = (Laba Kotor / Omzet) x 100
Margin Bersih = (Laba Bersih / Omzet) x 100
Margin per Produk = ((Harga Jual - HPP) / Harga Jual) x 100

### 11.2 RUMUS PIUTANG

**Total Piutang:** SUM (Nilai Invoice Belum Lunas)
**Sisa Piutang:** Total Invoice - Total Pembayaran
**Status:** OPEN (0), PARTIAL (>0 dan <total), PAID (lunas)
**Umur Piutang:** TODAY() - Tanggal Invoice
**Aging:** 0-30 (Lancar), 31-60 (Perhatian), 61-90 (Macet), >90 (Macet Berat)

### 11.3 RUMUS KOMISI

**Komisi:** Nilai Invoice Lunas x Rate Komisi
**Rate:** Default dari SETTING (5%) atau khusus dari master SALES
**Status:** READY (belum dicairkan), PAID (sudah dicairkan)
**Pencairan:** Hanya dari invoice yang PAID (lunas penuh)

### 11.4 RUMUS STOK

**Stok Gudang:** SUM Produksi + Retur Masuk - SUM Titip Keluar
**Stok Konsinyasi:** SUM Titip - SUM Terjual - SUM Retur - SUM Rusak
**Kebutuhan Restock:** Target Display - Sisa Stok
**Minimum Restock:** Jika hasil <= 0, tidak perlu restock

### 11.5 RUMUS TARGET & KPI

**Pencapaian Target:** (Realisasi / Target) x 100
**Customer Growth:** ((Baru - Lama) / Lama) x 100
**Sales Growth:** ((Omzet n - Omzet n-1) / Omzet n-1) x 100
**Retur Rate:** (Total Retur / Total Titip) x 100
**ROI:** (Laba Bersih / Total Investasi) x 100

### 11.6 FORMULA GOOGLE SHEETS

**Terjual (KUNJUNGAN_DETAIL):**
=IF(AND(ISBLANK(E2), ISBLANK(F2), ISBLANK(G2)), "", D2-E2-F2-G2)
(D=stok_awal, E=sisa_fisik, F=rusak, G=retur)

**Restock:**
=IF(H2-J2>0, H2-J2, 0)
(H=target_display, J=sisa_fisik)

**Umur Piutang:**
=IF(G2="PAID", "", TODAY()-E2)
(G=status, E=tanggal_invoice)

**Omzet Bulan Ini:**
=SUMPRODUCT(
  (INVOICE_HEADER!E:E>=DATE(YEAR(TODAY()),MONTH(TODAY()),1))*
  (INVOICE_HEADER!E:E<=EOMONTH(TODAY(),0))*
  (INVOICE_HEADER!I:I)
)

**Ranking Sales:**
=RANK(E2, E:E, 0)

---

## 12. DASHBOARD KPI

### 12.1 DASHBOARD OWNER - KEY METRICS

| KPI Utama | Formula | Target |
|-----------|---------|--------|
| Omzet Hari Ini | SUM penjualan hari ini | Growth 10% MoM |
| Omzet Bulan Ini | SUM penjualan bulan ini | Sesuai target |
| Laba Kotor | Omzet - HPP | Margin > 40% |
| Laba Bersih | Laba Kotor - Biaya - Komisi | Margin > 25% |
| Piutang Aktif | SUM sisa piutang belum lunas | < 30% dari omzet |
| Piutang Aging >60 | SUM piutang > 60 hari | < 10% total |
| Retur Rate | Retur/Titip x 100 | < 5% |
| Kunjungan/Sales | SUM Kunjungan / SUM Sales | > 5/hr |
| Customer Aktif | Customer dengan transaksi > 0 | Growth 20% |
| Konversi Kunjungan | Kunjungan dengan penjualan / Total | > 80% |

**Komponen Dashboard:**
- 4 Card Utama: Omzet, Laba, Piutang, Stok
- Grafik Penjualan Harian (30 hari - line chart)
- Grafik Penjualan Bulanan (12 bulan - bar chart)
- Grafik Performa Sales (multi-line)
- Produk Terlaris (Top 10)
- Sales Terbaik (Top 5)
- Customer Terbaik (Top 5)
- Piutang Aging Table
- Retur Terbanyak
- Kunjungan Sales Hari Ini

### 12.2 DASHBOARD SALES - KEY METRICS

| KPI Sales | Formula |
|-----------|---------|
| Target Bulanan | Dari TARGET_SALES |
| Pencapaian | Realisasi / Target x 100 |
| Omzet Bulan Ini | SUM invoice bulan ini |
| Toko Aktif | COUNT customer dengan kunjungan > 0 |
| Kunjungan Hari Ini | COUNT kunjungan hari ini |
| Piutang Area | SUM sisa piutang customer miliknya |
| Invoice Belum Lunas | COUNT invoice status OPEN/PARTIAL |
| Ranking Sales | RANK(omzet) dari semua sales |

**Komponen Dashboard:**
- Progress Bar Target Bulanan
- 4 Card Mini: Omzet, Toko, Kunjungan, Piutang
- Daftar Invoice Belum Lunas
- Ranking Sales
- Grafik Performa Pribadi

---

## 13. REPORTING

### 13.1 DAFTAR LAPORAN

| No | Nama Laporan | Filter |
|----|-------------|--------|
| 1 | Penjualan Harian | Tanggal, Sales, Customer |
| 2 | Penjualan Bulanan | Bulan, Tahun, Sales |
| 3 | Penjualan Tahunan | Tahun |
| 4 | Penjualan per Produk | Periode, Kategori |
| 5 | Penjualan per Customer | Periode, Sales |
| 6 | Penjualan per Sales | Periode |
| 7 | Laporan Piutang | Tanggal, Sales, Status |
| 8 | Laporan Pembayaran | Tanggal, Customer, Sales |
| 9 | Laporan Komisi | Bulan, Tahun, Status |
| 10 | Laporan Retur | Periode, Produk, Alasan |
| 11 | Laba Kotor | Periode, Produk |
| 12 | Laba Bersih | Periode |
| 13 | Omzet Report | Range tanggal |
| 14 | Stok Gudang | Produk, Batch |
| 15 | Stok Konsinyasi | Sales, Customer, Produk |
| 16 | Forecast Restock | Sales, Customer |

### 13.2 FORMAT OUTPUT

Semua laporan dapat di-ekspor dalam format:
- HTML (view di browser)
- CSV (download)
- Google Sheets (copy ke sheet baru)
- Email (format HTML)

---

## 14. SETUP AWAL SISTEM

### 14.1 WIZARD SETUP (8 Langkah)

**Step 1/8: Profil Perusahaan**
- Nama Perusahaan, Alamat, Telepon, Email, Kota, Logo

**Step 2/8: Data Sales**
- Tambah Sales (multiple): Nama, Telepon, Alamat, Komisi Rate, Target Bulanan
- Auto-create akun user untuk setiap sales

**Step 3/8: Data Produk**
- Tambah Kategori Produk
- Tambah Produk (multiple): Nama, Varian, Harga Jual, HPP, Target Display, Stok Minimum

**Step 4/8: Harga & HPP**
- Review harga jual, Review HPP, Set margin target

**Step 5/8: Target Sales**
- Set target per sales: Target omzet bulanan, target kunjungan, target customer baru

**Step 6/8: Data Customer**
- Tambah Customer (multiple/import): Nama Toko, Pemilik, Alamat, Telepon, Sales PJ, Limit Piutang, Tempo

**Step 7/8: Stok Awal**
- Stok Awal Gudang per produk + batch
- Stok Awal Konsinyasi per customer + produk
- Piutang Awal per customer

**Step 8/8: Hak Akses & Selesai**
- Buat akun OWNER (auto dari profil)
- Buat akun ADMIN (opsional)
- Review semua data, konfirmasi & simpan

---

## 15. ROADMAP PENGEMBANGAN

### FASE 1: FOUNDATION (Minggu 1-2)
- Setup Google Sheets structure (35 sheets)
- Buat sistem Auth & Login
- Buat Master Data CRUD (Produk, Customer, Sales)
- Buat Role-based access control
- UI: Login page, Owner sidebar, Sales bottom nav

### FASE 2: CORE OPERATIONS (Minggu 3-4)
- Modul Produksi + update stok gudang
- Modul Titip Barang (gudang ke toko)
- **Kunjungan Engine (CORE)** - input sisa stok, hitung otomatis terjual
- Generate Invoice & Piutang otomatis
- UI: Visit form mobile, customer list, produk list

### FASE 3: FINANCE & KOMISI (Minggu 5-6)
- Modul Pembayaran (OPEN/PARTIAL/PAID)
- Modul Komisi Sales (hitung dari invoice lunas)
- Modul Retur
- Modul Restock / Titip Ulang
- Dashboard Owner (semua KPI)
- UI: Payment form, detail invoice, dashboard

### FASE 4: DASHBOARD & LAPORAN (Minggu 7-8)
- Dashboard Sales (target, pencapaian, ranking)
- 16 jenis laporan
- Grafik dan chart
- Stok alert system
- Notifikasi
- Dark mode

### FASE 5: OPTIMASI & PRODUCTION (Minggu 9-10)
- Setup wizard (8 langkah) ✅
- Export laporan: CSV ✅, PDF (print-friendly) ✅, Email (GmailApp) ✅
- Performance optimization (CacheService in-memory, 30s TTL) ✅
- Error handling & logging (audit log viewer UI) ✅
- User acceptance testing
- Deployment production (v57 deployed)
- Dokumentasi & training

### FITUR TAMBAHAN (di luar SRS)
- **GPS Tracking Kunjungan** — Otomatis capture lokasi sales saat mulai kunjungan, disimpan di sheet, link Google Maps di riwayat.
- **Upload Foto Toko** — Sales bisa foto display produk saat kunjungan, tersimpan di Google Drive, link disimpan di sheet.
- **Komisi Payout UI** — Tab komisi dengan daftar, checkbox multi-select, tombol cairkan.
- **Ganti Password** — Profile user dengan form change password.
- **Audit Log Viewer** — UI untuk melihat log aktivitas dengan pagination dan search.
- **Bulk Titip** — Titip barang ke banyak customer sekaligus.
- **Search Bar** — Pencarian real-time di tabel Customer, Produk, Komisi, Log.
- **Loading Skeleton** — Animasi skeleton pengganti spinner untuk UX lebih halus.
- **Pengingat Piutang** — Fungsi `scheduledPiutangReminder` untuk trigger time-based, kirim email overdue.
- **Progressive Web App** — manifest.json, theme-color, standalone display, icon.
- **Dark Mode Polish** — Perbaikan warna untuk mode gelap di badge, panel notifikasi, dll.
- **Data Caching** — CacheService in-memory dengan TTL 30 detik untuk akses data lebih cepat.

---

**END OF DOCUMENT - SRS Sistem Manajemen Konsinyasi Seblak Kering v1.1**
