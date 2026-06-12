/**
 * STOK.gs — Stock management (gudang & konsinyasi)
 */

var StokService = {
  getStokGudang: function() {
    var all = getDataAsObjects('09_STOK_GUDANG');
    var produkList = getDataAsObjects('06_PRODUK');
    var grouped = {};
    all.forEach(function(s) {
      if (!grouped[s.produk_id]) {
        var p = produkList.filter(function(pr) { return pr.produk_id === s.produk_id; })[0] || {};
        grouped[s.produk_id] = { produk_id: s.produk_id, produk_nama: p.nama_produk || s.produk_id, total_masuk: 0, total_keluar: 0, total_sisa: 0 };
      }
      grouped[s.produk_id].total_masuk += s.qty_masuk || 0;
      grouped[s.produk_id].total_keluar += s.qty_keluar || 0;
      grouped[s.produk_id].total_sisa += s.qty_sisa || 0;
    });
    return respond(true, '', Object.values(grouped));
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
  }
};
