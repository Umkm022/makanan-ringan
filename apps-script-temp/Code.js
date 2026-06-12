/**
 * CODE.gs — Main entry point for Seblak Management System
 * Handles doGet (serve HTML), doPost (API routing)
 */

function doGet(e) {
  var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'index';
  var template;

  switch(page) {
    case 'login':
      template = HtmlService.createTemplateFromFile('views/login');
      break;
    case 'owner':
      template = HtmlService.createTemplateFromFile('views/owner');
      break;
    case 'sales':
      template = HtmlService.createTemplateFromFile('views/sales');
      break;
    case 'visit':
      template = HtmlService.createTemplateFromFile('views/visit');
      break;
    case 'payment':
      template = HtmlService.createTemplateFromFile('views/payment');
      break;
    case 'setup':
      template = HtmlService.createTemplateFromFile('views/setup');
      break;
    default:
      template = HtmlService.createTemplateFromFile('views/index');
  }

  template.scriptUrl = ScriptApp.getService().getUrl();
  var html = template.evaluate()
    .setTitle('Seblak Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  return html;
}

function doPost(e) {
  var result = { success: false, message: '', data: null };
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action || '';
    var token = params.token || '';

    // Auth actions (no session required)
    if (['login','logout','validateSession'].indexOf(action) > -1) {
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

    // PRODUK
    case 'getProduk':             return ProdukService.getProduk(params, session);
    case 'createProduk':          return ProdukService.createProduk(params.data, session);
    case 'updateProduk':          return ProdukService.updateProduk(params.id, params.data, session);

    // AUTH / PROFILE
    case 'changePassword':        return changePassword(params.oldPassword, params.newPassword, session);
    // LOG
    case 'getAuditLogs':          return getAuditLogs(params, session);

    // KUNJUNGAN
    case 'startKunjungan':        return KunjunganService.startKunjungan(params.customerId, session, params.latitude, params.longitude);
    case 'saveSisaStok':          return KunjunganService.saveSisaStok(params.kunjunganId, params.items, session);
    case 'finalizeKunjungan':     return KunjunganService.finalizeKunjungan(params.kunjunganId, session);
    case 'getKunjunganData':      return KunjunganService.getKunjunganData(params.kunjunganId, session);
    case 'getRiwayatKunjungan':   return KunjunganService.getRiwayatKunjungan(params.customerId, session);
    case 'uploadFotoToko':        return KunjunganService.uploadFotoToko(params.kunjunganId, params.fileName, params.fileData, session);

    // INVOICE
    case 'getInvoices':           return InvoiceService.getInvoices(params, session);
    case 'getPiutang':            return InvoiceService.getPiutang(params, session);
    case 'getAgingPiutang':       return InvoiceService.getAgingPiutang(params, session);

    // PEMBAYARAN
    case 'createPembayaran':      return PembayaranService.createPembayaran(params.data, session);

    // KOMISI
    case 'getKomisi':             return KomisiService.getKomisi(params, session);
    case 'cairkanKomisi':         return KomisiService.cairkanKomisi(params.komisiIds, session);

    // TITIPAN
    case 'createTitip':           return TitipanService.createTitip(params.data, session);
    case 'bulkTitip':             return TitipanService.bulkTitip(params, session);

    // DASHBOARD
    case 'getOwnerDashboard':     return DashboardService.getOwnerDashboard(session);
    case 'getSalesDashboard':     return DashboardService.getSalesDashboard(session);

    case 'sendPiutangReminder':   return sendPiutangReminder(params, session);

    default:
      return respond(false, 'Unknown action: ' + action, null);
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

function respond(success, message, data) {
  return { success: success, message: message, data: data };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
