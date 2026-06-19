/**
 * STOK.gs — Stock management (gudang & konsinyasi)
 */

var StokService = {
  getStokGudang: function() {
    var all = getDataAsObjects('09_STOK_GUDANG');
    var produkList = getDataAsObjects('06_PRODUK');
    // Return individual records with product name
    all = all.map(function(s) {
      var p = produkList.filter(function(pr) { return pr.produk_id === s.produk_id; })[0] || {};
      s.produk_nama = p.nama_produk || s.produk_id;
      return s;
    });
    return respond(true, '', all);
  },

  updateStokGudang: function(id, data, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('09_STOK_GUDANG');
    var row = findRow('09_STOK_GUDANG', 0, id);
    if (row < 0) return respond(false, 'Data tidak ditemukan', null);
    var qtyMasuk = data.qty_masuk !== undefined ? Number(data.qty_masuk) : sheet.getRange(row, 4).getValue();
    var qtyKeluar = data.qty_keluar !== undefined ? Number(data.qty_keluar) : sheet.getRange(row, 5).getValue();
    var qtySisa = data.qty_sisa !== undefined ? Number(data.qty_sisa) : qtyMasuk - qtyKeluar;
    if (qtySisa < 0) qtySisa = 0;
    sheet.getRange(row, 4).setValue(qtyMasuk);
    sheet.getRange(row, 5).setValue(qtyKeluar);
    sheet.getRange(row, 6).setValue(qtySisa);
    sheet.getRange(row, 8).setValue(new Date());
    clearDataCache();
    return respond(true, 'Stok gudang diperbarui', null);
  },

  deleteStokGudang: function(id, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('09_STOK_GUDANG');
    var row = findRow('09_STOK_GUDANG', 0, id);
    if (row < 0) return respond(false, 'Data tidak ditemukan', null);
    sheet.deleteRow(row);
    clearDataCache();
    return respond(true, 'Stok gudang dihapus', null);
  },

  getStokKonsinyasi: function(params, session) {
    var all = getDataAsObjects('10_STOK_KONSINYASI');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(s) { return s.sales_id === salesId; });
    }
    if (params) {
      if (params.customer_id) all = all.filter(function(s) { return s.customer_id === params.customer_id; });
      if (params.produk_id) all = all.filter(function(s) { return s.produk_id === params.produk_id; });
      if (params.sales_id && session.role !== 'SALES') all = all.filter(function(s) { return s.sales_id === params.sales_id; });
    }
    // Join sales, customer & product names
    var sales = getDataAsObjects('02_SALES');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var produk = getDataAsObjects('06_PRODUK');
    all = all.map(function(s) {
      var sa = sales.filter(function(sl) { return sl.sales_id === s.sales_id; })[0] || {};
      var cu = customers.filter(function(c) { return c.customer_id === s.customer_id; })[0] || {};
      var pr = produk.filter(function(p) { return p.produk_id === s.produk_id; })[0] || {};
      s.sales_name = sa.full_name || sa.nama || s.sales_id;
      s.customer_name = cu.store_name || cu.nama || s.customer_id;
      s.produk_nama = pr.nama_produk || s.produk_id;
      return s;
    });
    return respond(true, '', all);
  },

  updateStokKonsinyasi: function(id, data, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('10_STOK_KONSINYASI');
    var row = findRow('10_STOK_KONSINYASI', 0, id);
    if (row < 0) return respond(false, 'Data tidak ditemukan', null);
    if (data.qty_titip !== undefined) sheet.getRange(row, 5).setValue(Number(data.qty_titip));
    if (data.qty_terjual !== undefined) sheet.getRange(row, 6).setValue(Number(data.qty_terjual));
    if (data.qty_retur !== undefined) sheet.getRange(row, 7).setValue(Number(data.qty_retur));
    if (data.qty_rusak !== undefined) sheet.getRange(row, 8).setValue(Number(data.qty_rusak));
    if (data.qty_sisa !== undefined) sheet.getRange(row, 9).setValue(Number(data.qty_sisa));
    if (data.target_display !== undefined) sheet.getRange(row, 10).setValue(Number(data.target_display));
    sheet.getRange(row, 14).setValue(new Date());
    clearDataCache();
    return respond(true, 'Stok konsinyasi diperbarui', null);
  },

  deleteStokKonsinyasi: function(id, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('10_STOK_KONSINYASI');
    var row = findRow('10_STOK_KONSINYASI', 0, id);
    if (row < 0) return respond(false, 'Data tidak ditemukan', null);
    sheet.deleteRow(row);
    clearDataCache();
    return respond(true, 'Stok konsinyasi dihapus', null);
  },

  checkCustomerStock: function(params, session) {
    var all = getDataAsObjects('10_STOK_KONSINYASI');
    var custId = params.customer_id;
    if (!custId) return respond(true, '', { hasStock: false });
    var hasStock = all.some(function(s) { return s.customer_id === custId; });
    return respond(true, '', { hasStock: hasStock });
  },

  getRekapStokKonsinyasi: function(session) {
    var all = getDataAsObjects('10_STOK_KONSINYASI');
    var sales = getDataAsObjects('02_SALES');
    var bySales = {};
    all.forEach(function(s) {
      if (session.role === 'SALES') {
        var sId = getSalesIdFromSession(session);
        if (s.sales_id !== sId) return;
      }
      if (!bySales[s.sales_id]) {
        var sa = sales.filter(function(sl) { return sl.sales_id === s.sales_id; })[0] || {};
        bySales[s.sales_id] = {
          sales_id: s.sales_id,
          sales_name: sa.full_name || sa.nama || s.sales_id,
          total_titip: 0,
          total_terjual: 0,
          total_retur: 0,
          total_sisa: 0
        };
      }
      bySales[s.sales_id].total_titip += Number(s.qty_titip) || 0;
      bySales[s.sales_id].total_terjual += Number(s.qty_terjual) || 0;
      bySales[s.sales_id].total_retur += Number(s.qty_retur) || 0;
      bySales[s.sales_id].total_sisa += Number(s.qty_sisa) || 0;
    });
    return respond(true, '', Object.values(bySales));
  }
};
