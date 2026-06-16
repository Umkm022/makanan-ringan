/**
 * CODE.gs — Main entry point for Seblak Management System
 * Handles doGet (serve HTML), doPost (API routing)
 */

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.page === 'manifest') {
      var manifest = {
        "name": "Macaroni Ku",
        "short_name": "MacaroniKu",
        "start_url": ScriptApp.getService().getUrl(),
        "display": "standalone",
        "background_color": "#C62828",
        "theme_color": "#C62828",
        "icons": [{"src": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🍜%3C/text%3E%3C/svg%3E", "sizes": "192x192", "type": "image/svg+xml"}]
      };
      return ContentService.createTextOutput(JSON.stringify(manifest)).setMimeType(ContentService.MimeType.JSON);
    }
    var html = HtmlService.createTemplateFromFile('index').evaluate()
      .setTitle('Macaroni Ku')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    return html;
  } catch(err) {
    return HtmlService.createHtmlOutput('Error: ' + err.message + '<br><pre>' + err.stack + '</pre>');
  }
}

function doPost(e) {
  var result = { success: false, message: '', data: null };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action || '';
    var token = params.token || '';

    // Auth actions (no session required)
    if (['login','logout','validateSession','checkSystemReady','setupOwner'].indexOf(action) > -1) {
      return handleAuthAction(action, params);
    }

    // All other actions require valid session
    var session = validateSession(token);
    if (!session) {
      return respond(false, 'Session expired. Please login again.', null);
    }

    // Route to appropriate handler based on action
    result = routeAction(action, params, session);
  } catch(e) {
    result = { success: false, message: 'Error: ' + e.message, data: null };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAuthAction(action, params) {
  var result;
  switch(action) {
    case 'login':
      result = authenticate(params.username, params.password);
      break;
    case 'logout':
      result = destroySession(params.token);
      break;
    case 'validateSession':
      result = validateSession(params.token);
      result = { success: !!result, data: result };
      break;
    case 'checkSystemReady':
      result = checkSystemReady();
      break;
    case 'setupOwner':
      result = setupOwner(params);
      break;
    default:
      result = respond(false, 'Unknown action', null);
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeAction(action, params, session) {
  switch(action) {
    // CUSTOMER
    case 'getCustomers':          return CustomerService.getCustomers(params, session);
    case 'getCustomer':           return CustomerService.getCustomer(params.id, session);
    case 'createCustomer':        return CustomerService.createCustomer(params.data, session);
    case 'updateCustomer':        return CustomerService.updateCustomer(params.id, params.data, session);

    // AUTH / PROFILE
    case 'changePassword':        return changePassword(params.oldPassword, params.newPassword, session);
    case 'updateProfile':         return updateProfile(params.data, session);

    // LOG
    case 'getAuditLogs':          return getAuditLogs(params, session);

    // PRODUK
    case 'getProduk':             return ProdukService.getProduk(params, session);
    case 'createProduk':          return ProdukService.createProduk(params.data, session);
    case 'updateProduk':          return ProdukService.updateProduk(params.id, params.data, session);
    case 'getKategori':           return ProdukService.getKategori();
    case 'createKategori':        return ProdukService.createKategori(params.data, session);

    // KUNJUNGAN
    case 'startKunjungan':        return KunjunganService.startKunjungan(params.customerId, session, params.latitude, params.longitude);
    case 'saveSisaStok':          return KunjunganService.saveSisaStok(params.kunjunganId, params.items, session);
    case 'finalizeKunjungan':     return KunjunganService.finalizeKunjungan(params.kunjunganId, session);
    case 'getKunjunganData':      return KunjunganService.getKunjunganData(params.kunjunganId, session);
    case 'getRiwayatKunjungan':   return KunjunganService.getRiwayatKunjungan(params.customerId, session);
    case 'getRiwayatSales':       return KunjunganService.getRiwayatSales(session);
    case 'getAllRiwayatKunjungan': return KunjunganService.getAllRiwayatKunjungan(params);
    case 'getAllKunjungan':       return KunjunganService.getAllKunjungan(params, session);
    case 'uploadFotoToko':        return KunjunganService.uploadFotoToko(params.kunjunganId, params.fileName, params.fileData, session, params.tipe, params.lat, params.lng);
    case 'restockFromKunjungan':  return KunjunganService.restockFromKunjungan(params.kunjunganId, session);
    case 'getDraftKunjungan':     return KunjunganService.getDraftKunjungan(session);
    case 'resumeKunjungan':       return KunjunganService.resumeKunjungan(params.kunjunganId, session);
    case 'cancelKunjungan':       return KunjunganService.cancelKunjungan(params.kunjunganId, session);
    case 'getVisitReminders':     return KunjunganService.getVisitReminders(params, session);
    case 'getStockPredictions':   return KunjunganService.getStockPredictions(params, session);

    // INVOICE
    case 'getInvoices':           return InvoiceService.getInvoices(params, session);
    case 'getPiutang':            return InvoiceService.getPiutang(params, session);
    case 'getAgingPiutang':       return InvoiceService.getAgingPiutang(params, session);

    // PEMBAYARAN
    case 'createPembayaran':      return PembayaranService.createPembayaran(params.data, session);

    // KOMISI
    case 'getKomisi':             return KomisiService.getKomisi(params, session);
    case 'cairkanKomisi':         return KomisiService.cairkanKomisi(params.komisiIds, session);

    // PRODUKSI
    case 'createProduksi':        return ProduksiService.createProduksi(params.data, session);
    case 'getProduksi':           return ProduksiService.getProduksi(params);

    // TITIP BARANG
    case 'createTitip':           return TitipanService.createTitip(params.data, session);
    case 'bulkTitip':             return TitipanService.bulkTitip(params, session);
    case 'getShipmentDetail':     return TitipanService.getShipmentDetail(params, session);
    case 'getAllShipments':       return TitipanService.getAllShipments(params, session);

    // STOK
    case 'getStokGudang':         return StokService.getStokGudang();
    case 'updateStokGudang':      return StokService.updateStokGudang(params.id, params.data, session);
    case 'deleteStokGudang':      return StokService.deleteStokGudang(params.id, session);
    case 'getStokKonsinyasi':     return StokService.getStokKonsinyasi(params, session);
    case 'updateStokKonsinyasi':  return StokService.updateStokKonsinyasi(params.id, params.data, session);
    case 'deleteStokKonsinyasi':  return StokService.deleteStokKonsinyasi(params.id, session);
    case 'getRekapStokKonsinyasi': return StokService.getRekapStokKonsinyasi(session);

    // REKENING & KAS
    case 'getRekening':           return RekeningService.getRekening(session);
    case 'createRekening':        return RekeningService.createRekening(params.data, session);
    case 'updateRekening':        return RekeningService.updateRekening(params.id, params.data, session);
    case 'deleteRekening':        return RekeningService.deleteRekening(params.id, session);
    case 'getSaldoRekening':      return RekeningService.getSaldoRekening(session);
    case 'getMutasiRekening':     return KasService.getMutasiRekening(params);
    case 'getRekapKas':           return KasService.getRekapKas(session);

    // NOTIFIKASI
    case 'checkCustomerStock':    return StokService.checkCustomerStock(params, session);
    case 'requestTitipAwal':      return NotifikasiService.requestTitipAwal(params, session);
    case 'fulfillTitipRequest':   return NotifikasiService.fulfillTitipRequest(params, session);

    // DASHBOARD
    case 'getOwnerDashboard':     return DashboardService.getOwnerDashboard(session);
    case 'getSalesDashboard':     return DashboardService.getSalesDashboard(session);



    // SALES
    case 'getSales':              return SalesPersonService.getSales();
    case 'getSalesList':          return SalesPersonService.getSales();
    case 'getSalesById':          return SalesPersonService.getSalesById(params.id);
    case 'createSales':           if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Forbidden', null); return SalesPersonService.createSales(params.data);
    case 'updateSales':           if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Forbidden', null); return SalesPersonService.updateSales(params.id, params.data);
    case 'deleteSales':           if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Forbidden', null); return SalesPersonService.deleteSales(params.id);

    // BIAYA OPERASIONAL
    case 'getBiaya':              return BiayaService.getBiaya(params);
    case 'createBiaya':           return BiayaService.createBiaya(params.data, session);
    case 'deleteBiaya':           if (requireRole(session, 'ADMIN')) return respond(false, 'Forbidden', null); return BiayaService.deleteBiaya(params.id);

    // SETTINGS
    case 'getAllSettings':        if (requireRole(session, 'OWNER')) return respond(false, 'Forbidden', null); var _s = SettingsService.getAllSettings(); var _sd = {}; if (Array.isArray(_s)) _s.forEach(function(it){if(it.key)_sd[it.key]=it.value;}); return respond(true, '', _sd);
    case 'updateSetting':         if (requireRole(session, 'OWNER')) return respond(false, 'Forbidden', null); return SettingsService.updateSetting(params.key, params.value, session.user_id);

    // USERS
    case 'getUsers':              return respond(true, '', getDataAsObjects('01_USERS'));

    case 'ping':                  return respond(true, 'pong', null);

    // DELETE
    case 'deleteProduk':          return ProdukService.deleteProduk(params.id, session);
    case 'deleteCustomer':        return CustomerService.deleteCustomer(params.id, session);

    // REPORT
    case 'generateReport':        return sanitizeForReturn(ReportService.generateReport(params.type, params));
    case 'setupAll':               return respond(true, 'Spreadsheet siap', setupAll());

    // SYSTEM
    case 'seedAll':               return seedAllData(session);
    case 'getSystemStatus':       return getSystemStatusData();
    case 'sendPiutangReminder':   return sendPiutangReminder(params, session);

    default:
      return respond(false, 'Unknown action: ' + action, null);
  }
}

function respond(success, message, data) {
  return sanitizeForReturn({ success: success, message: message, data: data });
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getPageHtml(pageName) {
  return HtmlService.createHtmlOutputFromFile('page-' + pageName).getContent();
}

// DEBUG: direct wrappers (bypass handleApi for testing)
function getProdukDirect(token) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'Invalid session', data: null };
    var result = ProdukService.getProduk({}, session);
    return sanitizeForReturn(result || { success: false, message: 'ProdukService returned null', data: null });
  } catch(e) {
    return { success: false, message: 'Error: ' + e.message, data: null, stack: e.stack };
  }
}

function pong() {
  return { success: true, message: 'pong', data: { time: new Date().toISOString() } };
}

function getSystemStatusData() {
  try {
    var data = {
      users: getSheet('01_USERS') ? getSheet('01_USERS').getLastRow() - 1 : 0,
      sales: getSheet('02_SALES') ? getSheet('02_SALES').getLastRow() - 1 : 0,
      produk: getSheet('06_PRODUK') ? getSheet('06_PRODUK').getLastRow() - 1 : 0,
      customers: getSheet('04_CUSTOMERS') ? getSheet('04_CUSTOMERS').getLastRow() - 1 : 0,
      kunjungan: getSheet('14_KUNJUNGAN_HEADER') ? getSheet('14_KUNJUNGAN_HEADER').getLastRow() - 1 : 0,
      invoices: getSheet('18_INVOICE_HEADER') ? getSheet('18_INVOICE_HEADER').getLastRow() - 1 : 0
    };
    return respond(true, '', data);
  } catch(e) {
    return respond(false, e.message, {});
  }
}

function seedAllData(session) {
  try {
    if (!session || (session.role !== 'OWNER' && session.role !== 'ADMIN')) {
      return respond(false, 'Hanya owner yang bisa seed data', null);
    }
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var now = new Date();
    var result = [];

    // 1. Kategori Produk
    var katSheet = getSheet('05_KATEGORI_PRODUK');
    if (katSheet && katSheet.getLastRow() <= 1) {
      katSheet.appendRow(['KAT-001','SEBLAK','Seblak kering berbagai varian',now]);
      katSheet.appendRow(['KAT-002','SNACK','Cemilan ringan lainnya',now]);
      result.push('Kategori: 2');
    }

    // 2. Produk
    var prodSheet = getSheet('06_PRODUK');
    if (prodSheet && prodSheet.getLastRow() <= 1) {
      prodSheet.appendRow(['PRD-001','KAT-001','SBL-ORG','Seblak Original','Original','','100gr','PCS',5000,7000,2500,20,50,true,'',now,now]);
      prodSheet.appendRow(['PRD-002','KAT-001','SBL-BAL','Seblak Balado','Balado','','100gr','PCS',5500,7500,3000,20,50,true,'',now,now]);
      prodSheet.appendRow(['PRD-003','KAT-001','SBL-KEJ','Seblak Keju','Keju','','100gr','PCS',5500,7500,3000,15,40,true,'',now,now]);
      prodSheet.appendRow(['PRD-004','KAT-001','SBL-PDS','Seblak Pedas Daun Jeruk','Pedas Daun Jeruk','','100gr','PCS',6000,8000,3500,20,50,true,'',now,now]);
      prodSheet.appendRow(['PRD-005','KAT-002','STK-ORI','Stik Seblak Original','Original','','150gr','PCS',4000,6000,2000,15,40,true,'',now,now]);
      result.push('Produk: 5');
    }

    // 3. Sales users
    var userSheet = getSheet('01_USERS');
    var salesSheet = getSheet('02_SALES');
    if (salesSheet && salesSheet.getLastRow() <= 1) {
      var salesData = [
        ['SLS-001','USR-002','SLS001','Andi Pratama','0812-1111-1111','Jl. Merdeka No.1','Jakarta',5,15000000,'AKTIF',now,0,0,0,'',now,now],
        ['SLS-002','USR-003','SLS002','Budi Santoso','0812-2222-2222','Jl. Sudirman No.5','Bandung',5,12000000,'AKTIF',now,0,0,0,'',now,now],
        ['SLS-003','USR-004','SLS003','Cici Permata','0812-3333-3333','Jl. Diponegoro No.3','Jakarta',7,18000000,'AKTIF',now,0,0,0,'',now,now]
      ];
      salesData.forEach(function(r) { salesSheet.appendRow(r); });
      var salesUsers = [
        ['USR-002','andi','andi@seblak.com','','SALES','Andi Pratama','0812-1111-1111',true,'',now,now],
        ['USR-003','budi','budi@seblak.com','','SALES','Budi Santoso','0812-2222-2222',true,'',now,now],
        ['USR-004','cici','cici@seblak.com','','SALES','Cici Permata','0812-3333-3333',true,'',now,now]
      ];
      salesUsers.forEach(function(r) { userSheet.appendRow(r); });
      result.push('Sales: 3 + akun');
    }

    // 4. Customer
    var custSheet = getSheet('04_CUSTOMERS');
    if (custSheet && custSheet.getLastRow() <= 1) {
      var customers = [
        ['CST-001','','SLS-001','Toko Sumber Rejeki','Pak Rahmat','021-1111','Jl. Raya No.10','Jakarta','Cengkareng',0,0,'AKTIF','WARUNG',500000,30,'',0,0,0,'',now,now],
        ['CST-002','','SLS-001','Warung Bu Tini','Bu Tini','021-2222','Jl. Melati No.5','Jakarta','Grogol',0,0,'AKTIF','WARUNG',300000,30,'',0,0,0,'',now,now],
        ['CST-003','','SLS-002','Kios Bang Ali','Bang Ali','022-1111','Jl. Asia Afrika No.20','Bandung','Regol',0,0,'AKTIF','KIOS',400000,30,'',0,0,0,'',now,now],
        ['CST-004','','SLS-002','Kantin SMA 1','Pak Dedi','022-2222','Jl. Pendidikan No.1','Bandung','Coblong',0,0,'AKTIF','KANTIN',600000,30,'',0,0,0,'',now,now],
        ['CST-005','','SLS-003','Minimarket Makmur','Bu Sari','021-3333','Jl. Mangga Besar No.8','Jakarta','Taman Sari',0,0,'AKTIF','MINIMARKET',1000000,30,'',0,0,0,'',now,now]
      ];
      customers.forEach(function(r) { custSheet.appendRow(r); });
      result.push('Customer: 5');
    }

    // 5. Stok Gudang
    var stokSheet = getSheet('09_STOK_GUDANG');
    if (stokSheet && stokSheet.getLastRow() <= 1) {
      stokSheet.appendRow(['STG-001','PRD-001','BATCH-INIT-001',500,0,500,'PCS',now,now]);
      stokSheet.appendRow(['STG-002','PRD-002','BATCH-INIT-001',400,0,400,'PCS',now,now]);
      stokSheet.appendRow(['STG-003','PRD-003','BATCH-INIT-001',300,0,300,'PCS',now,now]);
      stokSheet.appendRow(['STG-004','PRD-004','BATCH-INIT-001',350,0,350,'PCS',now,now]);
      stokSheet.appendRow(['STG-005','PRD-005','BATCH-INIT-001',500,0,500,'PCS',now,now]);
      result.push('Stok Gudang: 5');
    }

    result.push('Seed selesai!');
    return respond(true, result.join('\n'), null);
  } catch(e) {
    return respond(false, 'Error: ' + e.message, null);
  }
}

// Bridge function for google.script.run calls from client side
// Client calls: google.script.run.handleApi(JSON.stringify({action, token, ...}))
function handleApi(jsonParams) {
  var result = { success: false, message: '', data: null };
  try {
    var params = JSON.parse(jsonParams);
    var action = params.action || '';
    var token = params.token || '';

    // Auth actions (no session required)
    if (['login','logout','validateSession','checkSystemReady','setupOwner'].indexOf(action) > -1) {
      var authResult = handleAuthAction(action, params);
      if (!authResult) return respond(false, 'Auth handler returned null', null);
      var parsed = JSON.parse(authResult.getContent());
      return parsed || respond(false, 'Auth result parse failed', null);
    }

    // All other actions require valid session
    var session = validateSession(token);
    if (!session) {
      return respond(false, 'Session expired. Please login again.', null);
    }

    result = routeAction(action, params, session);
    if (!result) result = respond(false, 'Route returned null for: ' + action, null);
  } catch(e) {
    result = { success: false, message: 'Error: ' + e.message, data: null };
  }
  return sanitizeForReturn(result);
}

function checkSystemReady() {
  try {
    var sheet = getSheet('01_USERS');
    if (!sheet) return { success: true, data: { ready: false, reason: 'Sheet belum dibuat. Jalankan setupAll() dulu.' } };
    var data = sheet.getDataRange().getValues();
    var hasUsers = data.length > 1;
    return { success: true, data: { ready: hasUsers } };
  } catch(e) {
    return { success: false, message: e.message, data: { ready: false } };
  }
}

function setupOwner(params) {
  try {
    var username = params.username ? params.username.trim().toLowerCase() : '';
    var password = params.password || '';
    var fullName = params.fullName ? params.fullName.trim() : '';
    var email = params.email ? params.email.trim() : '';

    if (!username || username.length < 3) return respond(false, 'Username minimal 3 karakter.', null);
    if (!password || password.length < 6) return respond(false, 'Password minimal 6 karakter.', null);
    if (!fullName) return respond(false, 'Nama lengkap harus diisi.', null);

    var sheet = getSheet('01_USERS');
    if (!sheet) return respond(false, 'Sheet 01_USERS tidak ditemukan. Jalankan setupAll() dulu.', null);

    var existingData = sheet.getDataRange().getValues();
    for (var i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === 'USR-001') return respond(false, 'Owner sudah ada. Login dengan akun owner.', null);
      if (existingData[i][1] === username) return respond(false, 'Username sudah digunakan.', null);
    }

    var passwordHash = hashPassword(password);
    var now = new Date();
    sheet.appendRow([
      'USR-001', username, email || username + '@seblak.com', passwordHash, 'OWNER',
      fullName, '', true, '', now, now
    ]);

    // Default settings
    try {
      var settingSheet = getSheet('07_SETTING');
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
    } catch(e) { /* skip settings if sheet not ready */ }

    clearDataCache();
    return respond(true, 'Setup berhasil! Silakan login dengan akun owner.', {
      username: username
    });
  } catch(e) {
    return respond(false, 'Gagal setup: ' + e.message, null);
  }
}

function sendPiutangReminder(params, session) {
  try {
    var piutangList = getDataAsObjects('20_PIUTANG');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var today = new Date();
    var reminders = [];
    piutangList.forEach(function(p) {
      if (p.status === 'PAID' || p.status === 'LUNAS') return;
      if (!p.jatuh_tempo) return;
      var jatuhTgl = new Date(p.jatuh_tempo);
      var diffDays = Math.floor((today - jatuhTgl) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        var cust = customers.filter(function(c) { return c.customer_id === p.customer_id; })[0] || {};
        reminders.push({
          piutang_id: p.piutang_id,
          customer_name: cust.store_name || cust.nama || p.customer_id,
          sisa: p.sisa_piutang || p.total_piutang || 0,
          overdue_days: diffDays + 1,
          jatuh_tempo: p.jatuh_tempo
        });
      }
    });
    reminders.sort(function(a,b) { return b.overdue_days - a.overdue_days; });
    return respond(true, 'Ditemukan ' + reminders.length + ' piutang overdue', { reminders: reminders, count: reminders.length });
  } catch(e) {
    return respond(false, 'Gagal: ' + e.message, null);
  }
}

// Time-triggered function: scheduled daily to send piutang reminders
function scheduledPiutangReminder() {
  try {
    var piutangList = getDataAsObjects('20_PIUTANG');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var settings = SettingsService.getAllSettings();
    var companyName = settings.nama_perusahaan || 'Seblak Kering';
    var ownerEmail = '';
    var userSheet = getSheet('01_USERS');
    if (userSheet) {
      var users = userSheet.getDataRange().getValues();
      for (var i = 1; i < users.length; i++) {
        if (users[i][4] === 'OWNER' && users[i][2]) {
          ownerEmail = users[i][2];
          break;
        }
      }
    }
    if (!ownerEmail) return;
    var today = new Date();
    var overdueList = [];
    piutangList.forEach(function(p) {
      if (p.status === 'PAID' || p.status === 'LUNAS') return;
      if (!p.jatuh_tempo) return;
      var jatuhTgl = new Date(p.jatuh_tempo);
      var diffDays = Math.floor((today - jatuhTgl) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        var cust = customers.filter(function(c) { return c.customer_id === p.customer_id; })[0] || {};
        overdueList.push({
          customer: cust.store_name || cust.nama || p.customer_id,
          sisa: p.sisa_piutang || p.total_piutang || 0,
          telat: diffDays + 1 + ' hari'
        });
      }
    });
    if (overdueList.length === 0) return;
    var subject = '[REMINDER] ' + overdueList.length + ' Piutang Overdue - ' + companyName;
    var body = 'Berikut daftar piutang yang sudah melewati jatuh tempo:\n\n';
    overdueList.forEach(function(o) {
      body += '• ' + o.customer + ' - Rp ' + (o.sisa || 0).toLocaleString() + ' (Telat ' + o.telat + ')\n';
    });
    body += '\nHarap segera ditindaklanjuti.\n\nSistem Manajemen Konsinyasi';
    GmailApp.sendEmail(ownerEmail, subject, body);
    logActivity('SYSTEM', 'TRIGGER', 'PIUTANG_REMINDER', '', 'Mengirim reminder ' + overdueList.length + ' piutang ke ' + ownerEmail, null, null);
  } catch(e) {
    console.error('scheduledPiutangReminder error: ' + e.message);
  }
}
