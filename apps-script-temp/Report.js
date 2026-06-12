/**
 * REPORT.gs — Reporting engine
 */

var ReportService = {
  generateReport: function(type, params) {
    switch(type) {
      case 'penjualan_harian': return this._penjualanHarian(params);
      case 'penjualan_bulanan': return this._penjualanBulanan(params);
      case 'piutang': return this._piutang(params);
      case 'komisi': return this._komisi(params);
      case 'stok_gudang': return StokService.getStokGudang();
      case 'stok_konsinyasi': return StokService.getStokKonsinyasi(params, {role:'OWNER'});
      default: return respond(false, 'Tipe report tidak dikenal', null);
    }
  },

  _penjualanHarian: function(params) {
    var tgl = params && params.tanggal ? params.tanggal : new Date();
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var details = getDataAsObjects('19_INVOICE_DETAIL');
    var tglStr = Utilities.formatDate(new Date(tgl), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var filtered = invoices.filter(function(inv) {
      var invTgl = Utilities.formatDate(new Date(inv.tanggal_invoice), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      return invTgl === tglStr;
    });

    var result = filtered.map(function(inv) {
      var invDetails = details.filter(function(d) { return d.invoice_id === inv.invoice_id; });
      return {
        invoice_id: inv.invoice_id,
        customer_id: inv.customer_id,
        sales_id: inv.sales_id,
        total: inv.total,
        status: inv.status_pembayaran,
        details: invDetails
      };
    });

    return respond(true, '', result);
  },

  _penjualanBulanan: function(params) {
    var bulan = params && params.bulan ? parseInt(params.bulan) : (new Date().getMonth() + 1);
    var tahun = params && params.tahun ? parseInt(params.tahun) : new Date().getFullYear();

    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var filtered = invoices.filter(function(inv) {
      var d = new Date(inv.tanggal_invoice);
      return d.getMonth() + 1 === bulan && d.getFullYear() === tahun;
    });

    var total = filtered.reduce(function(sum, inv) { return sum + inv.total; }, 0);
    return respond(true, '', { bulan: bulan, tahun: tahun, total: total, count: filtered.length, invoices: filtered });
  },

  _piutang: function(params) {
    var all = getDataAsObjects('20_PIUTANG');
    if (params) {
      if (params.status) all = all.filter(function(p) { return p.status === params.status; });
      if (params.customer_id) all = all.filter(function(p) { return p.customer_id === params.customer_id; });
    }
    var total = all.reduce(function(sum, p) { return sum + p.sisa_piutang; }, 0);
    return respond(true, '', { total: total, count: all.length, data: all });
  },

  _komisi: function(params) {
    var all = getDataAsObjects('22_KOMISI');
    if (params) {
      if (params.bulan) all = all.filter(function(k) { return k.periode_bulan == params.bulan; });
      if (params.tahun) all = all.filter(function(k) { return k.periode_tahun == params.tahun; });
      if (params.sales_id) all = all.filter(function(k) { return k.sales_id === params.sales_id; });
    }
    var total = all.reduce(function(sum, k) { return sum + k.nilai_komisi; }, 0);
    return respond(true, '', { total: total, count: all.length, data: all });
  }
};
