/**
 * STOK.gs — Stock management (gudang & konsinyasi)
 */

var StokService = {
  getStokGudang: function() {
    var all = getDataAsObjects('09_STOK_GUDANG');
    var grouped = {};
    all.forEach(function(s) {
      if (!grouped[s.produk_id]) {
        grouped[s.produk_id] = { produk_id: s.produk_id, total_masuk: 0, total_keluar: 0, total_sisa: 0 };
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
    }
    return respond(true, '', all);
  }
};
