/**
 * KOMISI.gs — Commission calculation and payout
 */

var KomisiService = {
  hitungKomisi: function(invoiceId, session) {
    var invSheet = getSheet('18_INVOICE_HEADER');
    var invRow = findRow('18_INVOICE_HEADER', 0, invoiceId);
    if (invRow < 0) return null;

    var invoice = invSheet.getRange(invRow, 1, 1, 13).getValues()[0];
    var salesId = invoice[3];
    var customerId = invoice[2];
    var totalInvoice = invoice[8];
    var tglInvoice = invoice[4];

    var rate = SettingsService.getKomisiRate(salesId);
    var komisi = Math.round(totalInvoice * rate / 100);
    tglInvoice = tglInvoice || new Date();
    var bulan = tglInvoice.getMonth() + 1;
    var tahun = tglInvoice.getFullYear();

    var komisiSheet = getSheet('22_KOMISI');
    var komisiId = 'KMS-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + ('000' + (komisiSheet.getLastRow())).slice(-3);

    komisiSheet.appendRow([
      komisiId, salesId, invoiceId, customerId,
      totalInvoice, rate, komisi, bulan, tahun, 'READY', '', new Date(), new Date()
    ]);

    logActivity(session.user_id, 'CREATE', 'KOMISI', komisiId,
      'Komisi: Rp ' + komisi + ' untuk sales ' + salesId, null, { invoice_id: invoiceId, komisi: komisi });

    return { komisi_id: komisiId, nilai: komisi };
  },

  getKomisi: function(params, session) {
    var all = getDataAsObjects('22_KOMISI');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(k) { return k.sales_id === salesId; });
    }
    if (params) {
      if (params.sales_id) all = all.filter(function(k) { return k.sales_id === params.sales_id; });
      if (params.status) all = all.filter(function(k) { return k.status === params.status; });
      if (params.periode_bulan) all = all.filter(function(k) { return k.periode_bulan == params.periode_bulan; });
      if (params.periode_tahun) all = all.filter(function(k) { return k.periode_tahun == params.periode_tahun; });
    }
    return respond(true, '', all);
  },

  cairkanKomisi: function(komisiIds, session) {
    if (!komisiIds || komisiIds.length === 0) {
      return respond(false, 'Tidak ada komisi yang dipilih', null);
    }
    var sheet = getSheet('22_KOMISI');
    var totalCair = 0;
    var salesIds = {};

    komisiIds.forEach(function(id) {
      var row = findRow('22_KOMISI', 0, id);
      if (row > 0) {
        var komisi = sheet.getRange(row, 1, 1, 13).getValues()[0];
        if (komisi[9] === 'READY') {
          sheet.getRange(row, 10).setValue('PAID');
          sheet.getRange(row, 11).setValue(new Date());
          totalCair += komisi[6];
          salesIds[komisi[1]] = (salesIds[komisi[1]] || 0) + komisi[6];
        }
      }
    });

    // Update sales total_komisi_cair
    Object.keys(salesIds).forEach(function(sId) {
      var salesSheet = getSheet('02_SALES');
      var salesRow = findRow('02_SALES', 0, sId);
      if (salesRow > 0) {
        var curr = salesSheet.getRange(salesRow, 14).getValue() || 0;
        salesSheet.getRange(salesRow, 14).setValue(curr + salesIds[sId]);
      }
    });

    logActivity(session.user_id, 'UPDATE', 'KOMISI', komisiIds.join(','),
      'Pencairan komisi: Rp ' + totalCair, null, { komisi_ids: komisiIds });

    return respond(true, 'Komisi berhasil dicairkan: Rp ' + totalCair, { total_cair: totalCair });
  }
};
