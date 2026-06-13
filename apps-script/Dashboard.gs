/**
 * DASHBOARD.gs — KPI data for Owner and Sales dashboards
 */

var DashboardService = {
  getOwnerDashboard: function(session) {
    var today = new Date();
    var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var piutangList = getDataAsObjects('20_PIUTANG');
    var details = getDataAsObjects('19_INVOICE_DETAIL');
    var stok = getDataAsObjects('09_STOK_GUDANG');
    var konsinyasi = getDataAsObjects('10_STOK_KONSINYASI');
    var biayaList = getDataAsObjects('23_BIAYA_OPERASIONAL');
    var komisiList = getDataAsObjects('22_KOMISI');

    // Omzet
    var omzetHariIni = 0, omzetBulanIni = 0;
    var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    invoices.forEach(function(inv) {
      var tgl = Utilities.formatDate(new Date(inv.tanggal_invoice), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (tgl === todayStr) omzetHariIni += inv.total;
      if (new Date(inv.tanggal_invoice) >= startOfMonth && new Date(inv.tanggal_invoice) <= endOfMonth) {
        omzetBulanIni += inv.total;
      }
    });

    // Filter invoice details to current month only for laba calculation
    var labaKotor = 0;
    details.forEach(function(d) {
      var inv = invoices.filter(function(i) { return i.invoice_id === d.invoice_id; })[0];
      if (inv) {
        var invDate = new Date(inv.tanggal_invoice);
        if (invDate >= startOfMonth && invDate <= endOfMonth) {
          labaKotor += d.laba_kotor || 0;
        }
      }
    });

    // Piutang aktif
    var piutangAktif = 0;
    piutangList.forEach(function(p) {
      if (p.status !== 'PAID') piutangAktif += p.sisa_piutang;
    });

    // Stok totals
    var totalStokGudang = 0, totalStokKonsinyasi = 0;
    stok.forEach(function(s) { totalStokGudang += s.qty_sisa || 0; });
    konsinyasi.forEach(function(s) { totalStokKonsinyasi += s.qty_sisa || 0; });

    // Biaya operasional bulan ini
    var biayaBulanIni = 0;
    biayaList.forEach(function(b) {
      if (new Date(b.tanggal) >= startOfMonth && new Date(b.tanggal) <= endOfMonth) {
        biayaBulanIni += b.jumlah;
      }
    });

    // Komisi bulan ini
    var komisiBulanIni = 0;
    komisiList.forEach(function(k) {
      if (k.periode_bulan == (today.getMonth()+1) && k.periode_tahun == today.getFullYear()) {
        komisiBulanIni += k.nilai_komisi;
      }
    });

    // Retur cost bulan ini
    var returList = getDataAsObjects('16_RETUR');
    var produkList = getDataAsObjects('06_PRODUK');
    var returCostBulanIni = 0;
    returList.forEach(function(r) {
      var t = new Date(r.tanggal_retur);
      if (t >= startOfMonth && t <= endOfMonth) {
        var p = produkList.filter(function(pr) { return pr.produk_id === r.produk_id; })[0] || {};
        returCostBulanIni += (parseFloat(r.qty_retur) || 0) * (parseFloat(p.hpp) || 0);
      }
    });

    // Saldo kas total
    var rekenings = getDataAsObjects('36_REKENING') || [];
    var kasTransaksi = getDataAsObjects('37_KAS_TRANSAKSI') || [];
    var totalSaldoKas = 0;
    rekenings.forEach(function(r) {
      if (r.is_active !== 'TRUE') return;
      var saldo = parseFloat(r.saldo_awal) || 0;
      kasTransaksi.filter(function(t) { return t.rekening_id === r.rekening_id; }).forEach(function(t) {
        saldo += t.tipe === 'DEBIT' ? (parseFloat(t.jumlah) || 0) : -(parseFloat(t.jumlah) || 0);
      });
      totalSaldoKas += saldo;
    });

    // Laba bersih
    var labaBersih = labaKotor - biayaBulanIni - komisiBulanIni - returCostBulanIni;

    // Top products
    var produkTerjual = {};
    details.forEach(function(d) {
      if (new Date(d.created_at) >= startOfMonth && new Date(d.created_at) <= endOfMonth) {
        produkTerjual[d.produk_id] = (produkTerjual[d.produk_id] || 0) + d.qty;
      }
    });
    var topProduk = Object.keys(produkTerjual)
      .sort(function(a,b) { return produkTerjual[b] - produkTerjual[a]; })
      .slice(0, 10);

    // Top sales
    var salesOmzet = {};
    invoices.forEach(function(inv) {
      if (new Date(inv.tanggal_invoice) >= startOfMonth && new Date(inv.tanggal_invoice) <= endOfMonth) {
        salesOmzet[inv.sales_id] = (salesOmzet[inv.sales_id] || 0) + inv.total;
      }
    });
    var topSales = Object.keys(salesOmzet)
      .sort(function(a,b) { return salesOmzet[b] - salesOmzet[a]; })
      .slice(0, 5);

    // Daily sales chart (30 days)
    var chartHarian = this._buildDailyChart(invoices, 30);

    // Monthly sales chart (12 months)
    var chartBulanan = this._buildMonthlyChart(invoices, 12);

    return respond(true, '', {
      kpi: {
        omzet_hari_ini: omzetHariIni,
        omzet_bulan_ini: omzetBulanIni,
        laba_kotor: labaKotor,
        laba_bersih: labaBersih,
        piutang_aktif: piutangAktif,
        stok_gudang: totalStokGudang,
        stok_konsinyasi: totalStokKonsinyasi,
        biaya_bulan_ini: biayaBulanIni,
        komisi_bulan_ini: komisiBulanIni,
        retur_cost_bulan_ini: returCostBulanIni,
        saldo_kas: totalSaldoKas
      },
      top_produk: topProduk,
      top_sales: topSales,
      chart_harian: chartHarian,
      chart_bulanan: chartBulanan
    });
  },

  getSalesDashboard: function(session) {
    var salesId = getSalesIdFromSession(session);
    var today = new Date();
    var startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    var endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Sales data
    var salesSheet = getSheet('02_SALES');
    var salesRow = findRow('02_SALES', 0, salesId);
    var salesData = salesRow > 0 ? salesSheet.getRange(salesRow, 1, 1, 17).getValues()[0] : null;
    var targetBulanan = salesData ? salesData[8] : 0;

    // Invoices by this sales
    var invoices = getDataAsObjects('18_INVOICE_HEADER');
    var myInvoices = invoices.filter(function(inv) { return inv.sales_id === salesId; });
    var omzetBulanIni = 0;
    myInvoices.forEach(function(inv) {
      if (new Date(inv.tanggal_invoice) >= startOfMonth && new Date(inv.tanggal_invoice) <= endOfMonth) {
        omzetBulanIni += inv.total;
      }
    });

    // Active customers
    var customers = getDataAsObjects('04_CUSTOMERS');
    var myCustomers = customers.filter(function(c) { return c.sales_id === salesId && c.status === 'AKTIF'; });
    var tokoAktif = myCustomers.length;

    // Today visits
    var kunjungan = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var kunjunganHariIni = 0;
    kunjungan.forEach(function(k) {
      if (k.sales_id === salesId) {
        var tgl = Utilities.formatDate(new Date(k.tanggal_kunjungan), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (tgl === todayStr) kunjunganHariIni++;
      }
    });

    // Piutang area
    var piutang = getDataAsObjects('20_PIUTANG');
    var piutangArea = 0, invoiceBelumLunas = 0;
    piutang.forEach(function(p) {
      if (p.sales_id === salesId && p.status !== 'PAID') {
        piutangArea += p.sisa_piutang;
        invoiceBelumLunas++;
      }
    });

    // Komisi
    var komisiList = getDataAsObjects('22_KOMISI');
    var komisiReady = 0, komisiPaid = 0;
    komisiList.forEach(function(k) {
      if (k.sales_id === salesId) {
        if (k.status === 'READY') komisiReady += k.nilai_komisi;
        if (k.status === 'PAID') komisiPaid += k.nilai_komisi;
      }
    });

    // Ranking
    var salesOmzet = {};
    invoices.forEach(function(inv) {
      if (new Date(inv.tanggal_invoice) >= startOfMonth && new Date(inv.tanggal_invoice) <= endOfMonth) {
        salesOmzet[inv.sales_id] = (salesOmzet[inv.sales_id] || 0) + inv.total;
      }
    });
    var ranking = Object.keys(salesOmzet)
      .sort(function(a,b) { return salesOmzet[b] - salesOmzet[a]; });
    var rank = ranking.indexOf(salesId) + 1;

    return respond(true, '', {
      kpi: {
        target_bulanan: targetBulanan,
        pencapaian: omzetBulanIni,
        persentase: targetBulanan > 0 ? Math.round(omzetBulanIni / targetBulanan * 100) : 0,
        omzet_bulan_ini: omzetBulanIni,
        toko_aktif: tokoAktif,
        kunjungan_hari_ini: kunjunganHariIni,
        piutang_area: piutangArea,
        invoice_belum_lunas: invoiceBelumLunas,
        komisi_ready: komisiReady,
        komisi_paid: komisiPaid,
        ranking: rank,
        total_sales: Object.keys(salesOmzet).length
      }
    });
  },

  _buildDailyChart: function(invoices, days) {
    var chart = [];
    for (var i = days-1; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      var total = 0;
      invoices.forEach(function(inv) {
        var tgl = Utilities.formatDate(new Date(inv.tanggal_invoice), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (tgl === dateStr) total += inv.total;
      });
      chart.push({ date: dateStr, total: total });
    }
    return chart;
  },

  _buildMonthlyChart: function(invoices, months) {
    var chart = [];
    for (var i = months-1; i >= 0; i--) {
      var d = new Date();
      d.setMonth(d.getMonth() - i);
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      var total = 0;
      invoices.forEach(function(inv) {
        var tgl = new Date(inv.tanggal_invoice);
        if (tgl.getMonth()+1 === month && tgl.getFullYear() === year) {
          total += inv.total;
        }
      });
      chart.push({ label: month + '/' + year, total: total });
    }
    return chart;
  }
};
