/**
 * PRODUKSI.gs — Production recording
 */

var ProduksiService = {
  createProduksi: function(data, session) {
    var missing = validateRequired(data, ['produk_id', 'qty_produksi', 'hpp_per_unit']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);

    var sheet = getSheet('08_PRODUKSI');
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
    var seq = sheet.getLastRow();
    var prodId = 'PRK-' + dateStr + '-' + ('000' + seq).slice(-3);
    var batch = 'BATCH-' + dateStr + '-' + ('000' + seq).slice(-3);

    sheet.appendRow([
      prodId, data.produk_id, batch, data.qty_produksi, data.hpp_per_unit,
      data.qty_produksi * data.hpp_per_unit, today,
      data.tanggal_expired || '', data.keterangan || '',
      session.user_id, today, today
    ]);

    // Update stock gudang
    var gudangSheet = getSheet('09_STOK_GUDANG');
    var gudangData = gudangSheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < gudangData.length; i++) {
      if (gudangData[i][1] === data.produk_id && gudangData[i][2] === batch) {
        var newMasuk = (gudangData[i][3] || 0) + data.qty_produksi;
        var newSisa = newMasuk - (gudangData[i][4] || 0);
        gudangSheet.getRange(i+1, 4).setValue(newMasuk);
        gudangSheet.getRange(i+1, 6).setValue(newSisa);
        found = true;
        break;
      }
    }
    if (!found) {
      gudangSheet.appendRow([
        'STG-' + ('000' + (gudangSheet.getLastRow())).slice(-3),
        data.produk_id, batch, data.qty_produksi, 0, data.qty_produksi,
        data.satuan || 'PCS', today, today
      ]);
    }

    logActivity(session.user_id, 'CREATE', 'PRODUKSI', prodId, 'Produksi: ' + data.qty_produksi + ' ' + data.produk_id, null, data);
    clearDataCache();
    return respond(true, 'Produksi berhasil dicatat', { produksi_id: prodId, batch: batch });
  },

  getProduksi: function(params) {
    var all = getDataAsObjects('08_PRODUKSI');
    if (params && params.produk_id) {
      all = all.filter(function(p) { return p.produk_id === params.produk_id; });
    }
    return respond(true, '', all);
  }
};
