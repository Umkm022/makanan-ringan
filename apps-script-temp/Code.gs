/**
 * CODE.gs — Main entry point for Seblak Management System
 * Handles doGet (serve HTML), doPost (API routing)
 */

function doGet(e) {
  try {
    var page = e && e.parameter && e.parameter.page ? e.parameter.page : 'login';
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
        template = HtmlService.createTemplateFromFile('views/login');
    }

    template.scriptUrl = ScriptApp.getService().getUrl();
    var html = template.evaluate()
      .setTitle('Seblak Management System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    return html;
  } catch(err) {
    return HtmlService.createHtmlOutput('<h3>Error: ' + err.message + '</h3><pre>' + err.stack + '</pre>')
      .setTitle('Error');
  }
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

    // KUNJUNGAN
    case 'startKunjungan':        return KunjunganService.startKunjungan(params.customerId, session);
    case 'saveSisaStok':          return KunjunganService.saveSisaStok(params.kunjunganId, params.items, session);
    case 'finalizeKunjungan':     return KunjunganService.finalizeKunjungan(params.kunjunganId, session);
    case 'getKunjunganData':      return KunjunganService.getKunjunganData(params.kunjunganId, session);
    case 'getRiwayatKunjungan':   return KunjunganService.getRiwayatKunjungan(params.customerId, session);

    // INVOICE
    case 'getInvoices':           return InvoiceService.getInvoices(params, session);
    case 'getPiutang':            return InvoiceService.getPiutang(params, session);
    case 'getAgingPiutang':       return InvoiceService.getAgingPiutang(params, session);

    // PEMBAYARAN
    case 'createPembayaran':      return PembayaranService.createPembayaran(params.data, session);

    // KOMISI
    case 'getKomisi':             return KomisiService.getKomisi(params, session);
    case 'cairkanKomisi':         return KomisiService.cairkanKomisi(params.komisiIds, session);

    // DASHBOARD
    case 'getOwnerDashboard':     return DashboardService.getOwnerDashboard(session);
    case 'getSalesDashboard':     return DashboardService.getSalesDashboard(session);

    default:
      return respond(false, 'Unknown action: ' + action, null);
  }
}

function respond(success, message, data) {
  return { success: success, message: message, data: data };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
