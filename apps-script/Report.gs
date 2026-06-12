/**
 * REPORT.gs — 16 jenis laporan
 */

var ReportService = {
  generateReport: function(type, params) {
    switch(type) {
      case 'penjualan_harian':        return this._penjualanHarian(params);
      case 'penjualan_bulanan':       return this._penjualanBulanan(params);
      case 'penjualan_tahunan':       return this._penjualanTahunan(params);
      case 'penjualan_per_produk':    return this._penjualanPerProduk(params);
      case 'penjualan_per_customer':  return this._penjualanPerCustomer(params);
      case 'penjualan_per_sales':     return this._penjualanPerSales(params);
      case 'piutang':                 return this._piutang(params);
      case 'pembayaran':              return this._pembayaran(params);
      case 'komisi':                  return this._komisi(params);
      case 'retur':                   return this._retur(params);
      case 'laba_kotor':              return this._labaKotor(params);
      case 'laba_bersih':             return this._labaBersih(params);
      case 'omzet':                   return this._omzet(params);
      case 'stok_gudang':             return this._stokGudang(params);
      case 'stok_konsinyasi':         return this._stokKonsinyasi(params);
      case 'forecast_restock':        return this._forecastRestock(params);
      default: return respond(false, 'Tipe report tidak dikenal', null);
    }
  },

  _filterTanggal: function(invoices, tglMulai, tglSelesai) {
    return invoices.filter(function(inv) {
      var t = new Date(inv.tanggal_invoice);
      return t >= tglMulai && t <= tglSelesai;
    });
  },

  // 1. Penjualan Harian
  _penjualanHarian: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var data = [];
    for (var d = 6; d >= 0; d--) {
      var tgl = new Date(); tgl.setDate(tgl.getDate() - d);
      var tglStr = Utilities.formatDate(tgl, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      var filtered = invoices.filter(function(inv) {
        return Utilities.formatDate(new Date(inv.tanggal_invoice), Session.getScriptTimeZone(), 'yyyy-MM-dd') === tglStr;
      });
      data.push({ label: tglStr, total: filtered.reduce(function(s,inv) { return s+(inv.total||0); }, 0), jumlah: filtered.length });
    }
    return respond(true, '', data);
  },

  // 2. Penjualan Bulanan
  _penjualanBulanan: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var data = [];
    for (var m = 11; m >= 0; m--) {
      var d = new Date(); d.setMonth(d.getMonth() - m);
      var bulan = d.getMonth() + 1, tahun = d.getFullYear();
      var filtered = invoices.filter(function(inv) {
        var id = new Date(inv.tanggal_invoice);
        return id.getMonth()+1 === bulan && id.getFullYear() === tahun;
      });
      data.push({ label: bulan+'/'+tahun, total: filtered.reduce(function(s,inv){return s+(inv.total||0);},0), jumlah: filtered.length });
    }
    return respond(true, '', data);
  },

  // 3. Penjualan Tahunan
  _penjualanTahunan: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var data = {};
    invoices.forEach(function(inv) {
      var t = new Date(inv.tanggal_invoice);
      var tahun = '' + t.getFullYear();
      if (!data[tahun]) data[tahun] = { tahun: tahun, total: 0, jumlah: 0 };
      data[tahun].total += inv.total || 0;
      data[tahun].jumlah++;
    });
    var result = Object.values(data).sort(function(a,b) { return a.tahun - b.tahun; });
    return respond(true, '', result);
  },

  // 4. Penjualan per Produk
  _penjualanPerProduk: function(params) {
    var details = getDataAsObjects('19_INVOICE_DETAIL');
    var produk = getDataAsObjects('06_PRODUK');
    var data = {};
    details.forEach(function(d) {
      if (!data[d.produk_id]) {
        var p = produk.filter(function(pr) { return pr.produk_id === d.produk_id; })[0] || {};
        data[d.produk_id] = { produk_id: d.produk_id, nama: p.nama_produk || d.produk_id, qty: 0, total: 0, laba: 0 };
      }
      data[d.produk_id].qty += d.qty || 0;
      data[d.produk_id].total += d.subtotal || 0;
      data[d.produk_id].laba += d.laba || 0;
    });
    return respond(true, '', Object.values(data).sort(function(a,b) { return b.total - a.total; }));
  },

  // 5. Penjualan per Customer
  _penjualanPerCustomer: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var data = {};
    invoices.forEach(function(inv) {
      if (!data[inv.customer_id]) {
        var c = customers.filter(function(cu) { return cu.customer_id === inv.customer_id; })[0] || {};
        data[inv.customer_id] = { customer_id: inv.customer_id, nama: c.store_name || c.nama || inv.customer_id, total: 0, jumlah: 0 };
      }
      data[inv.customer_id].total += inv.total || 0;
      data[inv.customer_id].jumlah++;
    });
    return respond(true, '', Object.values(data).sort(function(a,b) { return b.total - a.total; }));
  },

  // 6. Penjualan per Sales
  _penjualanPerSales: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var sales = getDataAsObjects('02_SALES');
    var data = {};
    invoices.forEach(function(inv) {
      if (!data[inv.sales_id]) {
        var s = sales.filter(function(sa) { return sa.sales_id === inv.sales_id; })[0] || {};
        data[inv.sales_id] = { sales_id: inv.sales_id, nama: s.full_name || s.nama || inv.sales_id, total: 0, jumlah: 0 };
      }
      data[inv.sales_id].total += inv.total || 0;
      data[inv.sales_id].jumlah++;
    });
    return respond(true, '', Object.values(data).sort(function(a,b) { return b.total - a.total; }));
  },

  // 7. Laporan Piutang
  _piutang: function(params) {
    var all = getDataAsObjects('20_PIUTANG');
    if (params) {
      if (params.status) {
        var sts = params.status.split(',');
        all = all.filter(function(p) { return sts.indexOf(p.status) > -1; });
      }
      if (params.customer_id) all = all.filter(function(p) { return p.customer_id === params.customer_id; });
    }
    var customers = getDataAsObjects('04_CUSTOMERS');
    return respond(true, '', all.map(function(p) {
      var c = customers.filter(function(cu) { return cu.customer_id === p.customer_id; })[0] || {};
      return { piutang_id: p.piutang_id, invoice_id: p.invoice_id, customer_id: p.customer_id, customer_nama: c.store_name || c.nama || p.customer_id, sales_id: p.sales_id, total_piutang: p.total_piutang, sisa_piutang: p.sisa_piutang, status: p.status, tanggal_invoice: p.tanggal_invoice, jatuh_tempo: p.jatuh_tempo };
    }));
  },

  // 8. Laporan Pembayaran
  _pembayaran: function(params) {
    var all = getDataAsObjects('21_PEMBAYARAN');
    if (params) {
      if (params.customer_id) all = all.filter(function(p) { return p.customer_id === params.customer_id; });
      if (params.metode) all = all.filter(function(p) { return p.metode_bayar === params.metode; });
      if (params.status) all = all.filter(function(p) { return p.status === params.status; });
    }
    var customers = getDataAsObjects('04_CUSTOMERS');
    return respond(true, '', all.map(function(p) {
      var c = customers.filter(function(cu) { return cu.customer_id === p.customer_id; })[0] || {};
      return { pembayaran_id: p.pembayaran_id, piutang_id: p.piutang_id, invoice_id: p.invoice_id, customer_id: p.customer_id, customer_nama: c.store_name || c.nama || p.customer_id, jumlah_bayar: p.jumlah_bayar, metode_bayar: p.metode_bayar, sisa_piutang: p.sisa_piutang, tanggal: p.tanggal_pembayaran };
    }));
  },

  // 9. Laporan Komisi
  _komisi: function(params) {
    var all = getDataAsObjects('22_KOMISI');
    if (params) {
      if (params.bulan) all = all.filter(function(k) { return k.periode_bulan == params.bulan; });
      if (params.tahun) all = all.filter(function(k) { return k.periode_tahun == params.tahun; });
      if (params.sales_id) all = all.filter(function(k) { return k.sales_id === params.sales_id; });
      if (params.status) all = all.filter(function(k) { return k.status === params.status; });
    }
    var sales = getDataAsObjects('02_SALES');
    return respond(true, '', all.map(function(k) {
      var s = sales.filter(function(sa) { return sa.sales_id === k.sales_id; })[0] || {};
      return { komisi_id: k.komisi_id, sales_id: k.sales_id, sales_nama: s.full_name || s.nama || k.sales_id, invoice_id: k.invoice_id, nilai_komisi: k.nilai_komisi, periode_bulan: k.periode_bulan, periode_tahun: k.periode_tahun, status: k.status };
    }));
  },

  // 10. Laporan Retur
  _retur: function(params) {
    var all = getDataAsObjects('16_RETUR');
    if (params) {
      if (params.produk_id) all = all.filter(function(r) { return r.produk_id === params.produk_id; });
      if (params.customer_id) all = all.filter(function(r) { return r.customer_id === params.customer_id; });
    }
    var produk = getDataAsObjects('06_PRODUK');
    return respond(true, '', all.map(function(r) {
      var p = produk.filter(function(pr) { return pr.produk_id === r.produk_id; })[0] || {};
      return { retur_id: r.retur_id, kunjungan_id: r.kunjungan_id, customer_id: r.customer_id, produk_id: r.produk_id, produk_nama: p.nama_produk || r.produk_id, qty_retur: r.qty_retur, alasan: r.alasan_retur, status_retur: r.status_retur, tanggal: r.tanggal_retur };
    }));
  },

  // 11. Laba Kotor
  _labaKotor: function(params) {
    var details = getDataAsObjects('19_INVOICE_DETAIL');
    var produk = getDataAsObjects('06_PRODUK');
    var data = {};
    var periode = params && params.periode;
    details.forEach(function(d) {
      var key = periode === 'tahunan' ? (d.invoice_id || '').substring(4,8) : (d.invoice_id || '').substring(4,7);
      if (!data[key]) data[key] = { periode: key, total_penjualan: 0, total_hpp: 0, laba_kotor: 0 };
      data[key].total_penjualan += d.subtotal || 0;
      data[key].total_hpp += (d.hpp || 0) * (d.qty || 0);
      data[key].laba_kotor += d.laba || 0;
    });
    return respond(true, '', Object.values(data).sort(function(a,b) { return a.periode - b.periode; }));
  },

  // 12. Laba Bersih
  _labaBersih: function(params) {
    var details = getDataAsObjects('19_INVOICE_DETAIL');
    var biaya = getDataAsObjects('23_BIAYA_OPERASIONAL') || [];
    var totalLabaKotor = details.reduce(function(s, d) { return s + (d.laba || 0); }, 0);
    var totalBiaya = biaya.reduce(function(s, b) { return s + (b.jumlah || 0); }, 0);
    return respond(true, '', [{
      total_penjualan: details.reduce(function(s, d) { return s + (d.subtotal || 0); }, 0),
      total_laba_kotor: totalLabaKotor,
      total_biaya_operasional: totalBiaya,
      laba_bersih: totalLabaKotor - totalBiaya
    }]);
  },

  // 13. Omzet Report
  _omzet: function(params) {
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var startDate = params && params.tanggal_mulai ? new Date(params.tanggal_mulai) : new Date(Date.now() - 30*24*60*60*1000);
    var endDate = params && params.tanggal_selesai ? new Date(params.tanggal_selesai) : new Date();
    var totalOmzet = 0, totalPiutang = 0, totalLunas = 0;
    invoices.forEach(function(inv) {
      var t = new Date(inv.tanggal_invoice);
      if (t >= startDate && t <= endDate) {
        totalOmzet += inv.total || 0;
        if (inv.status_pembayaran === 'PAID') totalLunas += inv.total || 0;
        else totalPiutang += inv.total || 0;
      }
    });
    return respond(true, '', {
      omzet: totalOmzet,
      lunas: totalLunas,
      piutang: totalPiutang,
      periode_mulai: Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      periode_selesai: Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    });
  },

  // 14. Stok Gudang
  _stokGudang: function(params) {
    var all = getDataAsObjects('09_STOK_GUDANG');
    var produk = getDataAsObjects('06_PRODUK');
    if (params && params.produk_id) all = all.filter(function(s) { return s.produk_id === params.produk_id; });
    return respond(true, '', all.map(function(s) {
      var p = produk.filter(function(pr) { return pr.produk_id === s.produk_id; })[0] || {};
      return { stok_id: s.stok_id, produk_id: s.produk_id, produk_nama: p.nama_produk || s.produk_id, batch: s.batch_number || s.batch || '', qty_masuk: s.qty_masuk, qty_keluar: s.qty_keluar, qty_sisa: s.qty_sisa };
    }));
  },

  // 15. Stok Konsinyasi
  _stokKonsinyasi: function(params) {
    var all = getDataAsObjects('10_STOK_KONSINYASI');
    if (params && params.customer_id) all = all.filter(function(s) { return s.customer_id === params.customer_id; });
    if (params && params.produk_id) all = all.filter(function(s) { return s.produk_id === params.produk_id; });
    var produk = getDataAsObjects('06_PRODUK');
    var customers = getDataAsObjects('04_CUSTOMERS');
    return respond(true, '', all.map(function(s) {
      var p = produk.filter(function(pr) { return pr.produk_id === s.produk_id; })[0] || {};
      var c = customers.filter(function(cu) { return cu.customer_id === s.customer_id; })[0] || {};
      return { stok_id: s.stok_id, customer_id: s.customer_id, customer_nama: c.store_name || c.nama || s.customer_id, produk_id: s.produk_id, produk_nama: p.nama_produk || s.produk_id, qty_titip_awal: s.qty_titip_awal, qty_terjual: s.qty_terjual, qty_retur: s.qty_retur, qty_rusak: s.qty_rusak, qty_sisa: s.qty_sisa, target_display: s.target_display };
    }));
  },

  // 16. Forecast Restock
  _forecastRestock: function(params) {
    var konsinyasi = getDataAsObjects('10_STOK_KONSINYASI');
    var produk = getDataAsObjects('06_PRODUK');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var data = [];
    konsinyasi.forEach(function(k) {
      var target = k.target_display || 20;
      var sisa = k.qty_sisa || 0;
      var rekomendasi = Math.max(0, target - sisa);
      if (rekomendasi > 0) {
        var p = produk.filter(function(pr) { return pr.produk_id === k.produk_id; })[0] || {};
        var c = customers.filter(function(cu) { return cu.customer_id === k.customer_id; })[0] || {};
        data.push({ customer_id: k.customer_id, customer_nama: c.store_name || c.nama || k.customer_id, produk_id: k.produk_id, produk_nama: p.nama_produk || k.produk_id, sisa_stok: sisa, target_display: target, rekomendasi_restock: rekomendasi });
      }
    });
    return respond(true, '', data.sort(function(a,b) { return b.rekomendasi_restock - a.rekomendasi_restock; }));
  }
};
