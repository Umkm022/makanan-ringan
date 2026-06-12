/**
 * INVOICE.gs — Invoice and piutang (receivables) management
 */

var InvoiceService = {
  getInvoices: function(params, session) {
    var all = getDataAsObjects('18_INVOICE_HEADER');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(inv) { return inv.sales_id === salesId; });
    }
    if (params) {
      if (params.status) all = all.filter(function(inv) { return inv.status_pembayaran === params.status; });
      if (params.customer_id) all = all.filter(function(inv) { return inv.customer_id === params.customer_id; });
      if (params.sales_id && session.role !== 'SALES') all = all.filter(function(inv) { return inv.sales_id === params.sales_id; });
    }
    return respond(true, '', all);
  },

  getPiutang: function(params, session) {
    var all = getDataAsObjects('20_PIUTANG');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(p) { return p.sales_id === salesId; });
    }
    if (params) {
      if (params.status) all = all.filter(function(p) { return p.status === params.status; });
      if (params.customer_id) all = all.filter(function(p) { return p.customer_id === params.customer_id; });
    }
    return respond(true, '', all);
  },

  getAgingPiutang: function(params, session) {
    var all = this.getPiutang(params, session).data;
    var today = new Date();
    var result = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 };

    all.forEach(function(p) {
      if (p.status === 'PAID') return;
      var days = Math.floor((today - new Date(p.tanggal_invoice)) / (1000*60*60*24));
      if (days <= 30) result['0-30'] += p.sisa_piutang;
      else if (days <= 60) result['31-60'] += p.sisa_piutang;
      else if (days <= 90) result['61-90'] += p.sisa_piutang;
      else result['>90'] += p.sisa_piutang;
      result.total += p.sisa_piutang;
    });

    return respond(true, '', result);
  }
};
