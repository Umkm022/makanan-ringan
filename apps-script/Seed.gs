/**
 * SEED.gs — Create initial admin user and seed test data
 * Run this after setupAll() to create the first login account.
 */

var SPREADSHEET_ID = '1J_Grr-18E82QO81z1-17nQR0Y3swd40NGHLoJsUSJsc';

function seedInitialData() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Seed Data - Buat Owner',
    'Masukkan password untuk akun OWNER (min 6 karakter):',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var password = response.getResponseText();
  if (!password || password.length < 6) {
    ui.alert('Password minimal 6 karakter. Ulangi.');
    return;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Buat user OWNER
  var userSheet = ss.getSheetByName('01_USERS');
  if (!userSheet) { ui.alert('01_USERS tidak ditemukan. Jalankan setupAll() dulu.'); return; }
  var existingData = userSheet.getDataRange().getValues();
  for (var i = 1; i < existingData.length; i++) {
    if (existingData[i][0] === 'USR-001') {
      ui.alert('User OWNER sudah ada (USR-001). Lewati pembuatan user.');
      return;
    }
  }

  var passwordHash = hashPassword(password);
  var now = new Date();
  userSheet.appendRow([
    'USR-001', 'owner', 'owner@seblak.com', passwordHash, 'OWNER',
    'Pemilik Usaha', '0812-XXXX-XXXX', true, '', now, now
  ]);

  // 2. Buat setting default
  var settingSheet = ss.getSheetByName('07_SETTING');
  if (settingSheet && settingSheet.getLastRow() <= 1) {
    var defaults = [
      ['SET-001','KOMISI','komisi_rate_default','5','NUMBER','Rate komisi default (%)','SYSTEM',now],
      ['SET-002','INVOICE','tempo_pembayaran_default','30','NUMBER','Jatuh tempo default (hari)','SYSTEM',now],
      ['SET-003','PRODUK','target_display_default','20','NUMBER','Target display default','SYSTEM',now],
      ['SET-004','STOK','stok_minimum_alert','10','NUMBER','Alert stok minimum','SYSTEM',now],
      ['SET-005','UMUM','nama_perusahaan','Seblak Kering','STRING','Nama perusahaan','SYSTEM',now],
      ['SET-006','UMUM','alamat_perusahaan','','STRING','Alamat perusahaan','SYSTEM',now],
      ['SET-007','UMUM','telp_perusahaan','','STRING','Telepon perusahaan','SYSTEM',now]
    ];
    settingSheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
  }

  ui.alert('✅ Seed data berhasil!\n\nUser OWNER: USR-001\nUsername: owner\nPassword: ' + password + '\n\nGunakan kredensial ini untuk login.');
}

function seedTestData() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Seed Test Data',
    'Buat data uji coba (produk, sales, customer)?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var now = new Date();

  // 1. Kategori Produk
  var katSheet = ss.getSheetByName('05_KATEGORI_PRODUK');
  if (katSheet && katSheet.getLastRow() <= 1) {
    katSheet.appendRow(['KAT-001','SEBLAK','Seblak kering berbagai varian',now]);
    katSheet.appendRow(['KAT-002','SNACK','Cemilan ringan lainnya',now]);
  }

  // 2. Produk
  var prodSheet = ss.getSheetByName('06_PRODUK');
  if (prodSheet && prodSheet.getLastRow() <= 1) {
    prodSheet.appendRow(['PRD-001','KAT-001','SBL-ORG','Seblak Original','Original','','100gr','PCS',5000,7000,2500,20,50,true,'',now,now]);
    prodSheet.appendRow(['PRD-002','KAT-001','SBL-BAL','Seblak Balado','Balado','','100gr','PCS',5500,7500,3000,20,50,true,'',now,now]);
    prodSheet.appendRow(['PRD-003','KAT-001','SBL-KEJ','Seblak Keju','Keju','','100gr','PCS',5500,7500,3000,15,40,true,'',now,now]);
    prodSheet.appendRow(['PRD-004','KAT-001','SBL-PDS','Seblak Pedas Daun Jeruk','Pedas Daun Jeruk','','100gr','PCS',6000,8000,3500,20,50,true,'',now,now]);
    prodSheet.appendRow(['PRD-005','KAT-002','STK-ORI','Stik Seblak Original','Original','','150gr','PCS',4000,6000,2000,15,40,true,'',now,now]);
  }

  // 3. Sales (dengan user)
  var salesSheet = ss.getSheetByName('02_SALES');
  var userSheet = ss.getSheetByName('01_USERS');
  if (salesSheet && salesSheet.getLastRow() <= 1) {
    var salesData = [
      ['SLS-001','USR-002','SLS001','Andi Pratama','0812-1111-1111','Jl. Merdeka No.1','Jakarta',5,15000000,'AKTIF',now,0,0,0,'',now,now],
      ['SLS-002','USR-003','SLS002','Budi Santoso','0812-2222-2222','Jl. Sudirman No.5','Bandung',5,12000000,'AKTIF',now,0,0,0,'',now,now],
      ['SLS-003','USR-004','SLS003','Cici Permata','0812-3333-3333','Jl. Diponegoro No.3','Jakarta',7,18000000,'AKTIF',now,0,0,0,'',now,now]
    ];
    salesData.forEach(function(r) { salesSheet.appendRow(r); });

    // Create corresponding user accounts for sales
    var salesUsers = [
      ['USR-002','andi','andi@seblak.com',hashPassword('andi123'),'SALES','Andi Pratama','0812-1111-1111',true,'',now,now],
      ['USR-003','budi','budi@seblak.com',hashPassword('budi123'),'SALES','Budi Santoso','0812-2222-2222',true,'',now,now],
      ['USR-004','cici','cici@seblak.com',hashPassword('cici123'),'SALES','Cici Permata','0812-3333-3333',true,'',now,now]
    ];
    salesUsers.forEach(function(r) { userSheet.appendRow(r); });
  }

  // 4. Customer
  var custSheet = ss.getSheetByName('04_CUSTOMERS');
  if (custSheet && custSheet.getLastRow() <= 1) {
    var customers = [
      ['CST-001','','SLS-001','Toko Sumber Rejeki','Pak Rahmat','021-1111','Jl. Raya No.10','Jakarta','Cengkareng',0,0,'AKTIF','WARUNG',500000,30,'',0,0,0,'',now,now],
      ['CST-002','','SLS-001','Warung Bu Tini','Bu Tini','021-2222','Jl. Melati No.5','Jakarta','Grogol',0,0,'AKTIF','WARUNG',300000,30,'',0,0,0,'',now,now],
      ['CST-003','','SLS-002','Kios Bang Ali','Bang Ali','022-1111','Jl. Asia Afrika No.20','Bandung','Regol',0,0,'AKTIF','KIOS',400000,30,'',0,0,0,'',now,now],
      ['CST-004','','SLS-002','Kantin SMA 1','Pak Dedi','022-2222','Jl. Pendidikan No.1','Bandung','Coblong',0,0,'AKTIF','KANTIN',600000,30,'',0,0,0,'',now,now],
      ['CST-005','','SLS-003','Minimarket Makmur','Bu Sari','021-3333','Jl. Mangga Besar No.8','Jakarta','Taman Sari',0,0,'AKTIF','MINIMARKET',1000000,30,'',0,0,0,'',now,now]
    ];
    customers.forEach(function(r) { custSheet.appendRow(r); });
  }

  // 5. Stok Gudang Awal
  var stokSheet = ss.getSheetByName('09_STOK_GUDANG');
  if (stokSheet && stokSheet.getLastRow() <= 1) {
    stokSheet.appendRow(['STG-001','PRD-001','BATCH-INIT-001',500,0,500,'PCS',now,now]);
    stokSheet.appendRow(['STG-002','PRD-002','BATCH-INIT-001',400,0,400,'PCS',now,now]);
    stokSheet.appendRow(['STG-003','PRD-003','BATCH-INIT-001',300,0,300,'PCS',now,now]);
    stokSheet.appendRow(['STG-004','PRD-004','BATCH-INIT-001',350,0,350,'PCS',now,now]);
    stokSheet.appendRow(['STG-005','PRD-005','BATCH-INIT-001',500,0,500,'PCS',now,now]);
  }

  // 6. Target Sales
  var targetSheet = ss.getSheetByName('27_TARGET_SALES');
  if (targetSheet && targetSheet.getLastRow() <= 1) {
    var bulan = now.getMonth() + 1;
    var tahun = now.getFullYear();
    targetSheet.appendRow(['TGT-'+tahun+'-'+('00'+bulan).slice(-2)+'-001','SLS-001',bulan,tahun,15000000,30,5,750000,0,0,0,now,now]);
    targetSheet.appendRow(['TGT-'+tahun+'-'+('00'+bulan).slice(-2)+'-002','SLS-002',bulan,tahun,12000000,25,3,600000,0,0,0,now,now]);
    targetSheet.appendRow(['TGT-'+tahun+'-'+('00'+bulan).slice(-2)+'-003','SLS-003',bulan,tahun,18000000,35,8,900000,0,0,0,now,now]);
  }

  ui.alert('✅ Test data berhasil dibuat!\n\nAkun Sales:\n- andi / andi123\n- budi / budi123\n- cici / cici123\n\nProduk: 5 varian\nCustomer: 5 toko');
}
