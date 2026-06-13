/**
 * SETUP.gs — Initialize all 35 sheets with headers, formatting, and protection
 * Run this script ONCE after creating a new spreadsheet.
 */

var SPREADSHEET_ID = '1J_Grr-18E82QO81z1-17nQR0Y3swd40NGHLoJsUSJsc';

function setupAll() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  createAllSheets(ss);
  setupAllHeaders(ss);
  setupNamedRanges(ss);
  setupProtectedRanges(ss);
  setupDefaultSettings(ss);
  setupTriggers();
  SpreadsheetApp.getUi().alert('Setup complete! 37 sheets created.');
}

function createAllSheets(ss) {
  var sheetNames = [
    // MASTER DATA
    '01_USERS', '02_SALES', '03_CUSTOMER_GROUP', '04_CUSTOMERS',
    '05_KATEGORI_PRODUK', '06_PRODUK', '07_SETTING',
    // PRODUKSI & STOK
    '08_PRODUKSI', '09_STOK_GUDANG', '10_STOK_KONSINYASI', '11_STOK_MUTASI',
    // TRANSAKSI
    '12_TITIP_HEADER', '13_TITIP_DETAIL', '14_KUNJUNGAN_HEADER',
    '15_KUNJUNGAN_DETAIL', '16_RETUR', '17_RESTOCK',
    // KEUANGAN
    '18_INVOICE_HEADER', '19_INVOICE_DETAIL', '20_PIUTANG',
    '21_PEMBAYARAN', '22_KOMISI', '23_BIAYA_OPERASIONAL',
    // LOG & TARGET
    '24_LOG_AKTIVITAS', '25_AUDIT_TRAIL', '26_NOTIFIKASI', '27_TARGET_SALES',
    // DASHBOARD & REPORT
    '28_DASHBOARD_OWNER', '29_DASHBOARD_SALES',
    '30_REPORT_PENJUALAN', '31_REPORT_PIUTANG', '32_REPORT_KOMISI', '33_REPORT_STOK',
    // KAS & BANK
    '36_REKENING', '37_KAS_TRANSAKSI',
    // SYSTEM (hidden sheets)
    '34_SESSION', '35_AUDIT_CONFIG'
  ];

  sheetNames.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
  });
}

function setupAllHeaders(ss) {
  var schema = {
    '01_USERS': ['user_id','username','email','password_hash','role','full_name','phone','is_active','last_login','created_at','updated_at'],
    '02_SALES': ['sales_id','user_id','sales_code','full_name','phone','address','kota','komisi_rate','target_bulanan','status','join_date','total_kunjungan','total_omzet','total_komisi_cair','photo_url','created_at','updated_at'],
    '03_CUSTOMER_GROUP': ['group_id','group_name','description','diskon_khusus','created_at'],
    '04_CUSTOMERS': ['customer_id','group_id','sales_id','store_name','owner_name','phone','address','kota','kecamatan','latitude','longitude','status','tipe_toko','limit_piutang','tempo_pembayaran','last_visit','visit_count','total_omzet','total_piutang','notes','created_at','updated_at'],
    '05_KATEGORI_PRODUK': ['kategori_id','nama_kategori','deskripsi','created_at'],
    '06_PRODUK': ['produk_id','kategori_id','kode_produk','nama_produk','varian','deskripsi','kemasan','satuan','harga_jual','harga_ecer','hpp','target_display','stok_minimum','is_active','gambar_url','created_at','updated_at'],
    '07_SETTING': ['setting_id','group_setting','key','value','tipe_data','deskripsi','updated_by','updated_at'],
    '08_PRODUKSI': ['produksi_id','produk_id','batch_number','qty_produksi','hpp_per_unit','total_hpp','tanggal_produksi','tanggal_expired','keterangan','created_by','created_at','updated_at'],
    '09_STOK_GUDANG': ['stok_gudang_id','produk_id','batch_number','qty_masuk','qty_keluar','qty_sisa','satuan','tanggal_update','created_at'],
    '10_STOK_KONSINYASI': ['stok_konsinyasi_id','customer_id','produk_id','sales_id','qty_titip','qty_terjual','qty_retur','qty_rusak','qty_sisa','target_display','last_visit','last_restock','created_at','updated_at'],
    '11_STOK_MUTASI': ['mutasi_id','tipe_mutasi','source_id','produk_id','from_location','to_location','qty','batch_number','tanggal','created_by','created_at'],
    '12_TITIP_HEADER': ['titip_id','customer_id','sales_id','tanggal_titip','tipe_titip','status','total_item','total_qty','notes','created_at','updated_at'],
    '13_TITIP_DETAIL': ['titip_detail_id','titip_id','produk_id','qty_titip','harga_satuan','subtotal','batch_number','created_at'],
    '14_KUNJUNGAN_HEADER': ['kunjungan_id','customer_id','sales_id','tanggal_kunjungan','waktu_mulai','waktu_selesai','status','total_terjual','total_retur','total_invoice','notes','foto_toko','latitude','longitude','has_restock','created_at','updated_at'],
    '15_KUNJUNGAN_DETAIL': ['kunjungan_detail_id','kunjungan_id','produk_id','stok_awal','sisa_fisik','rusak','retur','terjual','target_display','rekomendasi_restock','qty_restock','harga_jual','subtotal_terjual','created_at'],
    '16_RETUR': ['retur_id','kunjungan_id','customer_id','sales_id','produk_id','qty_retur','alasan','status_barang','tanggal_retur','created_at'],
    '17_RESTOCK': ['restock_id','kunjungan_id','titip_id','customer_id','sales_id','status','total_qty','created_at'],
    '18_INVOICE_HEADER': ['invoice_id','kunjungan_id','customer_id','sales_id','tanggal_invoice','subtotal','diskon','pajak','total','status_pembayaran','jatuh_tempo','notes','created_at','updated_at'],
    '19_INVOICE_DETAIL': ['invoice_detail_id','invoice_id','produk_id','qty','harga_satuan','subtotal','hpp_satuan','laba_kotor','created_at'],
    '20_PIUTANG': ['piutang_id','invoice_id','customer_id','sales_id','total_piutang','sisa_piutang','status','tanggal_invoice','jatuh_tempo','tgl_lunas','umur_piutang','created_at','updated_at'],
    '21_PEMBAYARAN': ['pembayaran_id','piutang_id','customer_id','sales_id','invoice_id','jumlah_bayar','sisa_setelah_bayar','metode_bayar','bukti_bayar','tanggal_bayar','status','created_by','created_at','updated_at'],
    '22_KOMISI': ['komisi_id','sales_id','invoice_id','customer_id','total_invoice','rate_komisi','nilai_komisi','periode_bulan','periode_tahun','status','tanggal_cair','created_at','updated_at'],
    '23_BIAYA_OPERASIONAL': ['biaya_id','kategori','deskripsi','jumlah','tanggal','metode_pembayaran','bukti','notes','created_by','created_at'],
    '24_LOG_AKTIVITAS': ['log_id','user_id','tipe_aktivitas','modul','source_id','deskripsi','data_lama','data_baru','ip_address','user_agent','created_at'],
    '25_AUDIT_TRAIL': ['audit_id','tabel','record_id','aksi','data_sebelum','data_sesudah','diubah_oleh','diubah_pada','ip_address'],
    '26_NOTIFIKASI': ['notifikasi_id','user_id','tipe','judul','pesan','link','is_read','created_at'],
    '27_TARGET_SALES': ['target_id','sales_id','bulan','tahun','target_omzet','target_kunjungan','target_customer_baru','komisi_target','pencapaian_omzet','pencapaian_kunjungan','persentase_pencapaian','created_at','updated_at'],
    '28_DASHBOARD_OWNER': ['kpi','nilai','target','status','updated_at'],
    '29_DASHBOARD_SALES': ['kpi','nilai','target','status','updated_at'],
    '30_REPORT_PENJUALAN': ['report_id','tipe','periode','sales_id','customer_id','produk_id','qty','omzet','laba','generated_at'],
    '31_REPORT_PIUTANG': ['report_id','customer_id','sales_id','total_piutang','sisa_piutang','aging','status','generated_at'],
    '32_REPORT_KOMISI': ['report_id','sales_id','periode','total_komisi','status','generated_at'],
    '33_REPORT_STOK': ['report_id','produk_id','stok_gudang','stok_konsinyasi','total','alert','generated_at'],
    '34_SESSION': ['token','user_id','role','created_at','expiry','ip_address'],
    '35_AUDIT_CONFIG': ['config_id','key','value','deskripsi','updated_at'],
    '36_REKENING': ['rekening_id','nama_bank','no_rekening','atas_nama','saldo_awal','saldo_saat_ini','is_active','created_at','updated_at'],
    '37_KAS_TRANSAKSI': ['transaksi_id','rekening_id','tipe','kategori','jumlah','saldo_sebelum','saldo_setelah','tanggal','keterangan','referensi_id','referensi_tipe','created_by','created_at']
  };

  Object.keys(schema).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    var headers = schema[sheetName];
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#C62828')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  });
}

function setupNamedRanges(ss) {
  var ranges = [
    { name: 'DB_USERS', sheet: '01_USERS', range: 'A:K' },
    { name: 'DB_SALES', sheet: '02_SALES', range: 'A:Q' },
    { name: 'DB_CUSTOMERS', sheet: '04_CUSTOMERS', range: 'A:V' },
    { name: 'DB_PRODUK', sheet: '06_PRODUK', range: 'A:P' },
    { name: 'DB_SETTING', sheet: '07_SETTING', range: 'A:H' },
    { name: 'DB_INVOICE', sheet: '18_INVOICE_HEADER', range: 'A:M' },
    { name: 'DB_PIUTANG', sheet: '20_PIUTANG', range: 'A:M' },
    { name: 'RNG_SESSION', sheet: '34_SESSION', range: 'A:F' }
  ];

  ranges.forEach(function(r) {
    try {
      ss.setNamedRange(r.name, ss.getRange(r.sheet + '!' + r.range));
    } catch(e) {
      console.log('Named range error: ' + r.name + ' - ' + e.message);
    }
  });
}

function setupProtectedRanges(ss) {
  var dashboardSheets = ['28_DASHBOARD_OWNER','29_DASHBOARD_SALES',
    '30_REPORT_PENJUALAN','31_REPORT_PIUTANG','32_REPORT_KOMISI','33_REPORT_STOK'];
  dashboardSheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      var protection = sheet.protect().setDescription('Dashboard: Read Only');
      protection.setWarningOnly(true);
    }
  });
}

function setupDefaultSettings(ss) {
  var sheet = ss.getSheetByName('07_SETTING');
  if (!sheet) return;
  var defaults = [
    ['SET-001','KOMISI','komisi_rate_default','5','NUMBER','Rate komisi default (%)','SYSTEM',new Date()],
    ['SET-002','INVOICE','tempo_pembayaran_default','30','NUMBER','Jatuh tempo default (hari)','SYSTEM',new Date()],
    ['SET-003','INVOICE','pajak_default','0','NUMBER','Pajak default (%)','SYSTEM',new Date()],
    ['SET-004','PRODUK','target_display_default','20','NUMBER','Target display default','SYSTEM',new Date()],
    ['SET-005','STOK','stok_minimum_alert','10','NUMBER','Alert stok minimum','SYSTEM',new Date()],
    ['SET-006','UMUM','nama_perusahaan','','STRING','Nama perusahaan','SYSTEM',new Date()],
    ['SET-007','UMUM','alamat_perusahaan','','STRING','Alamat perusahaan','SYSTEM',new Date()],
    ['SET-008','UMUM','telp_perusahaan','','STRING','Telepon perusahaan','SYSTEM',new Date()]
  ];
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  }
}

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('updatePiutangAging').timeBased().everyDays(1).atHour(0).create();
  ScriptApp.newTrigger('cleanupExpiredSessions').timeBased().everyHours(1).create();
}

function updatePiutangAging() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('20_PIUTANG');
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 13).getValues();
  var today = new Date();
  data.forEach(function(row, i) {
    if (row[6] !== 'PAID') {
      var tglInvoice = new Date(row[7]);
      var diffDays = Math.floor((today - tglInvoice) / (1000*60*60*24));
      sheet.getRange(i+2, 11).setValue(diffDays);
    }
  });
}

function cleanupExpiredSessions() {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('34_SESSION');
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = sheet.getRange(2, 1, sheet.getLastRow()-1, 6).getValues();
  var today = new Date();
  for (var i = data.length-1; i >= 0; i--) {
    if (new Date(data[i][4]) < today) {
      sheet.deleteRow(i+2);
    }
  }
}
