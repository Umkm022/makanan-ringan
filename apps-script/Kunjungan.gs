/**
 * KUNJUNGAN.gs — Core visit engine (MOST IMPORTANT FILE)
 * Handles: start visit, save stock data, finalize, auto-generate invoice/piutang
 */

var KunjunganService = {
  startKunjungan: function(customerId, session, latitude, longitude) {
    var customerSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, customerId);
    if (custRow < 0) return respond(false, 'Customer tidak ditemukan', null);

    var customer = customerSheet.getRange(custRow, 1, 1, 22).getValues()[0];
    var salesId = customer[2];

    // Validate sales access
    if (session.role === 'SALES') {
      var sId = getSalesIdFromSession(session);
      if (salesId !== sId) return respond(false, 'Akses ditolak: bukan customer Anda', null);
    }

    // Create visit header
    var visitSheet = getSheet('14_KUNJUNGAN_HEADER');
    var visitId = 'KUN-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + ('000' + (visitSheet.getLastRow())).slice(-3);

    visitSheet.appendRow([
      visitId, customerId, salesId, new Date(),
      new Date(), '', 'DRAFT', 0, 0, 0, '', '',
      latitude || '', longitude || '', false,
      new Date(), new Date()
    ]);

    // Get last consignment stock for this customer
    var stokData = this._getStokKonsinyasi(customerId);

    // Get products
    var produkList = getDataAsObjects('06_PRODUK');
    if (session.role !== 'SALES' && session.role !== 'ADMIN') {
      // Filter only active if not owner/admin
    }
    produkList = produkList.filter(function(p) { return p.is_active === true || p.is_active === 'TRUE'; });

    // Build products with current stock info
    var produkWithStok = produkList.map(function(p) {
      var sk = null;
      for (var i = 0; i < stokData.length; i++) {
        if (stokData[i].produk_id === p.produk_id) {
          sk = stokData[i];
          break;
        }
      }
      return {
        produk_id: p.produk_id,
        nama_produk: p.nama_produk,
        varian: p.varian,
        stok_awal: sk ? sk.qty_sisa : 0,
        target_display: (sk && sk.target_display) ? sk.target_display : (p.target_display || 20),
        harga_jual: p.harga_jual,
        hpp: p.hpp
      };
    });

    return respond(true, '', {
      kunjungan_id: visitId,
      customer: {
        customer_id: customer[0],
        store_name: customer[3],
        owner_name: customer[4],
        address: customer[6],
        kota: customer[7]
      },
      produk: produkWithStok,
      last_visit: customer[15] || null
    });
  },

  saveSisaStok: function(kunjunganId, items, session) {
    if (!items || items.length === 0) {
      return respond(false, 'Tidak ada data produk', null);
    }

    var detailSheet = getSheet('15_KUNJUNGAN_DETAIL');

    // Delete existing details for this visit (re-save)
    var existingData = detailSheet.getDataRange().getValues();
    for (var i = existingData.length - 1; i >= 1; i--) {
      if (existingData[i][1] === kunjunganId) {
        detailSheet.deleteRow(i + 1);
      }
    }

    var totalTerjual = 0;
    var totalRetur = 0;
    var totalInvoice = 0;

    items.forEach(function(item) {
      var terjual = item.stok_awal - item.sisa_fisik - (item.rusak || 0) - (item.retur || 0);
      if (terjual < 0) terjual = 0;
      var restock = item.target_display - item.sisa_fisik;
      if (restock < 0) restock = 0;
      var subtotal = terjual * item.harga_jual;

      var detId = 'KND-' + ('000' + (detailSheet.getLastRow())).slice(-3);
      detailSheet.appendRow([
        detId, kunjunganId, item.produk_id,
        item.stok_awal, item.sisa_fisik, item.rusak || 0, item.retur || 0,
        terjual, item.target_display, restock, 0,
        item.harga_jual, subtotal, new Date()
      ]);

      totalTerjual += terjual;
      totalRetur += (item.retur || 0);
      totalInvoice += subtotal;
    });

    // Update header totals
    var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
    var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
    if (headerRow > 0) {
      headerSheet.getRange(headerRow, 8).setValue(totalTerjual);
      headerSheet.getRange(headerRow, 9).setValue(totalRetur);
      headerSheet.getRange(headerRow, 10).setValue(totalInvoice);
    }

    clearDataCache();
    return respond(true, 'Data stok berhasil disimpan', {
      total_terjual: totalTerjual,
      total_retur: totalRetur,
      total_invoice: totalInvoice
    });
  },

  finalizeKunjungan: function(kunjunganId, session) {
    var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
    var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
    if (headerRow < 0) return respond(false, 'Kunjungan tidak ditemukan', null);

    var header = headerSheet.getRange(headerRow, 1, 1, 17).getValues()[0];
    var customerId = header[1];
    var salesId = header[2];
    var invoiceTotal = header[9] || 0;

    // Get detail items
    var detailSheet = getSheet('15_KUNJUNGAN_DETAIL');
    var detailData = detailSheet.getDataRange().getValues();
    var details = [];
    for (var i = 1; i < detailData.length; i++) {
      if (detailData[i][1] === kunjunganId) {
        details.push({
          row: i+1,
          produk_id: detailData[i][2],
          stok_awal: detailData[i][3],
          sisa_fisik: detailData[i][4],
          rusak: detailData[i][5],
          retur: detailData[i][6],
          terjual: detailData[i][7],
          target_display: detailData[i][8],
          rekomendasi_restock: detailData[i][9],
          harga_jual: detailData[i][11],
          subtotal: detailData[i][12]
        });
      }
    }

    // 1. Update consignment stock (STOK_KONSINYASI)
    details.forEach(function(d) {
      if (d.terjual > 0 || d.rusak > 0 || d.retur > 0) {
        this._updateStokKonsinyasi(customerId, d.produk_id, salesId, d);
      }
    }, this);

    // 2. Process returns -> update gudang
    details.forEach(function(d) {
      if (d.retur > 0) {
        this._prosesRetur(kunjunganId, customerId, salesId, d, session);
      }
    }, this);

    // 3. Generate invoice if there are sales
    var invoiceId = null;
    if (invoiceTotal > 0) {
      var invoiceResult = this._generateInvoice(kunjunganId, customerId, salesId, details, session);
      invoiceId = invoiceResult.invoice_id;
    }

    // 4. Update header status
    headerSheet.getRange(headerRow, 7).setValue('COMPLETED');
    headerSheet.getRange(headerRow, 6).setValue(new Date()); // waktu selesai

    // 5. Update customer last visit
    var custSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, customerId);
    if (custRow > 0) {
      custSheet.getRange(custRow, 16).setValue(new Date());
      var currCount = custSheet.getRange(custRow, 17).getValue() || 0;
      custSheet.getRange(custRow, 17).setValue(currCount + 1);
    }

    logActivity(session.user_id, 'CREATE', 'KUNJUNGAN', kunjunganId,
      'Kunjungan selesai: ' + invoiceTotal + ' invoice', null, header);

    var allProduk = getDataAsObjects('06_PRODUK');
    var restockItems = details.filter(function(d) { return d.rekomendasi_restock > 0; }).map(function(d) {
      var p = allProduk.filter(function(pr) { return pr.produk_id === d.produk_id; })[0] || {};
      return { produk_id: d.produk_id, produk_nama: p.nama_produk || d.produk_id, qty: d.rekomendasi_restock };
    });

    clearDataCache();
    return respond(true, 'Kunjungan berhasil difinalisasi', {
      kunjungan_id: kunjunganId,
      invoice_id: invoiceId,
      total_terjual: header[7],
      total_invoice: invoiceTotal,
      has_restock_recommendation: restockItems.length > 0,
      restock_items: restockItems
    });
  },

  _updateStokKonsinyasi: function(customerId, produkId, salesId, detail) {
    var sheet = getSheet('10_STOK_KONSINYASI');
    var data = sheet.getDataRange().getValues();
    var found = false;
    var targetDisplay = detail.target_display || 20;

    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === customerId && data[i][2] === produkId) {
        // Calculate new values
        var qtyTitip = data[i][4] || 0;
        var qtyTerjual = (data[i][5] || 0) + detail.terjual;
        var qtyRetur = (data[i][6] || 0) + detail.retur;
        var qtyRusak = (data[i][7] || 0) + detail.rusak;
        var qtySisa = detail.sisa_fisik; // update actual physical stock

        sheet.getRange(i+1, 1, 1, 14).setValues([[
          data[i][0], customerId, produkId, salesId,
          qtyTitip, qtyTerjual, qtyRetur, qtyRusak, qtySisa,
          targetDisplay, new Date(), data[i][11] || data[i][11],
          data[i][12] || new Date(), new Date()
        ]]);
        found = true;
        break;
      }
    }

    if (!found) {
      var newId = 'SKN-' + ('000' + (sheet.getLastRow())).slice(-3);
      sheet.appendRow([
        newId, customerId, produkId, salesId,
        0, detail.terjual, detail.retur, detail.rusak, detail.sisa_fisik,
        targetDisplay, new Date(), '', new Date(), new Date()
      ]);
    }
  },

  _getStokKonsinyasi: function(customerId) {
    var all = getDataAsObjects('10_STOK_KONSINYASI');
    return all.filter(function(s) { return s.customer_id === customerId; });
  },

  _prosesRetur: function(kunjunganId, customerId, salesId, detail, session) {
    var returSheet = getSheet('16_RETUR');
    var returId = 'RTU-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + ('000' + (returSheet.getLastRow())).slice(-3);
    returSheet.appendRow([
      returId, kunjunganId, customerId, salesId, detail.produk_id,
      detail.retur, 'TIDAK_LAKU', 'MASUK_GUDANG', new Date(), new Date()
    ]);

    // Tambah stok gudang
    var gudangSheet = getSheet('09_STOK_GUDANG');
    var gudangData = gudangSheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < gudangData.length; i++) {
      if (gudangData[i][1] === detail.produk_id) {
        var qtyMasuk = (gudangData[i][3] || 0) + detail.retur;
        var qtySisa = qtyMasuk - (gudangData[i][4] || 0);
        gudangSheet.getRange(i+1, 4).setValue(qtyMasuk);
        gudangSheet.getRange(i+1, 6).setValue(qtySisa);
        found = true;
        break;
      }
    }
    if (!found) {
      gudangSheet.appendRow([
        'STG-' + ('000' + (gudangSheet.getLastRow())).slice(-3),
        detail.produk_id, '', detail.retur, 0, detail.retur, 'PCS', new Date(), new Date()
      ]);
    }
  },

  _generateInvoice: function(kunjunganId, customerId, salesId, details, session) {
    var invSheet = getSheet('18_INVOICE_HEADER');
    var invDetSheet = getSheet('19_INVOICE_DETAIL');
    var piutangSheet = getSheet('20_PIUTANG');

    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
    var invId = 'INV-' + dateStr + '-' + ('000' + (invSheet.getLastRow())).slice(-3);
    var piutangId = 'PIT-' + dateStr + '-' + ('000' + (piutangSheet.getLastRow())).slice(-3);

    var subtotal = 0;
    details.forEach(function(d) { subtotal += d.subtotal || 0; });

    var tempo = 30; // default
    var custSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, customerId);
    if (custRow > 0) {
      var tempoVal = custSheet.getRange(custRow, 15).getValue();
      if (tempoVal) tempo = parseInt(tempoVal, 10);
    }

    var jatuhTempo = new Date(today);
    jatuhTempo.setDate(jatuhTempo.getDate() + tempo);

    // Insert invoice header
    invSheet.appendRow([
      invId, kunjunganId, customerId, salesId, today,
      subtotal, 0, 0, subtotal, 'OPEN', jatuhTempo, '', today, today
    ]);

    // Insert invoice details
    details.forEach(function(d) {
      if (d.terjual > 0) {
        var produk = ProdukService.getProdukById(d.produk_id);
        var hpp = produk ? produk.hpp : 0;
        var laba = d.subtotal - (d.terjual * hpp);
        var detId = 'INVD-' + ('000' + (invDetSheet.getLastRow())).slice(-3);
        invDetSheet.appendRow([
          detId, invId, d.produk_id, d.terjual, d.harga_jual,
          d.subtotal, hpp, laba, new Date()
        ]);
      }
    });

    // Insert piutang
    piutangSheet.appendRow([
      piutangId, invId, customerId, salesId,
      subtotal, subtotal, 'OPEN', today, jatuhTempo, '', 0, today, today
    ]);

    // Update customer total_omzet
    if (custRow > 0) {
      var currOmzet = custSheet.getRange(custRow, 18).getValue() || 0;
      custSheet.getRange(custRow, 18).setValue(currOmzet + subtotal);
      var currPiutang = custSheet.getRange(custRow, 19).getValue() || 0;
      custSheet.getRange(custRow, 19).setValue(currPiutang + subtotal);
    }

    // Update sales total_omzet
    var salesSheet = getSheet('02_SALES');
    var salesRow = findRow('02_SALES', 0, salesId);
    if (salesRow > 0) {
      var currSalesOmzet = salesSheet.getRange(salesRow, 13).getValue() || 0;
      salesSheet.getRange(salesRow, 13).setValue(currSalesOmzet + subtotal);
    }

    logActivity(session.user_id, 'CREATE', 'INVOICE', invId,
      'Generate invoice: ' + invId + ' Rp ' + subtotal, null, { invoice_id: invId, total: subtotal });

    return { invoice_id: invId, piutang_id: piutangId, total: subtotal };
  },

  getKunjunganData: function(kunjunganId, session) {
    var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
    var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
    if (headerRow < 0) return respond(false, 'Kunjungan tidak ditemukan', null);

    var header = headerSheet.getRange(headerRow, 1, 1, 17).getValues()[0];
    var detailSheet = getSheet('15_KUNJUNGAN_DETAIL');
    var detailData = detailSheet.getDataRange().getValues();
    var details = [];

    for (var i = 1; i < detailData.length; i++) {
      if (detailData[i][1] === kunjunganId) {
        details.push({
          produk_id: detailData[i][2],
          stok_awal: detailData[i][3],
          sisa_fisik: detailData[i][4],
          rusak: detailData[i][5],
          retur: detailData[i][6],
          terjual: detailData[i][7],
          target_display: detailData[i][8],
          rekomendasi_restock: detailData[i][9],
          qty_restock: detailData[i][10],
          harga_jual: detailData[i][11],
          subtotal: detailData[i][12]
        });
      }
    }

    return respond(true, '', {
      kunjungan_id: header[0],
      customer_id: header[1],
      sales_id: header[2],
      tanggal: header[3],
      waktu_mulai: header[4],
      waktu_selesai: header[5],
      status: header[6],
      total_terjual: header[7],
      total_retur: header[8],
      total_invoice: header[9],
      notes: header[10],
      foto_toko: header[11],
      latitude: header[12],
      longitude: header[13],
      details: details
    });
  },

  getRiwayatKunjungan: function(customerId, session) {
    var all = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var filtered = all.filter(function(v) { return v.customer_id === customerId; });
    return respond(true, '', filtered.sort(function(a, b) {
      return new Date(b.tanggal_kunjungan) - new Date(a.tanggal_kunjungan);
    }));
  },

  getRiwayatSales: function(session) {
    var all = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var salesId = getSalesIdFromSession(session);
    if (salesId) {
      all = all.filter(function(k) { return k.sales_id === salesId; });
    }
    all.sort(function(a, b) {
      return new Date(b.tanggal_kunjungan) - new Date(a.tanggal_kunjungan);
    });
    return respond(true, '', all);
  },

  getAllRiwayatKunjungan: function(params) {
    var all = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var customers = getDataAsObjects('04_CUSTOMERS');
    var sales = getDataAsObjects('02_SALES');
    if (params && params.salesId) {
      all = all.filter(function(k) { return k.sales_id === params.salesId; });
    }
    all = all.map(function(k) {
      var c = customers.filter(function(cu) { return cu.customer_id === k.customer_id; })[0] || {};
      var s = sales.filter(function(sa) { return sa.sales_id === k.sales_id; })[0] || {};
      k.customer_name = c.store_name || c.nama || k.customer_id;
      k.sales_name = s.full_name || s.nama || k.sales_id;
      return k;
    });
    all.sort(function(a, b) {
      return new Date(b.tanggal_kunjungan) - new Date(a.tanggal_kunjungan);
    });
    return respond(true, '', all);
  },

  restockFromKunjungan: function(kunjunganId, session) {
    var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
    var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
    if (headerRow < 0) return respond(false, 'Kunjungan tidak ditemukan', null);

    var header = headerSheet.getRange(headerRow, 1, 1, 17).getValues()[0];
    var customerId = header[1];
    var salesId = header[2];
    var status = header[6];
    if (status !== 'COMPLETED') return respond(false, 'Kunjungan harus difinalisasi dulu', null);

    // Get detail items with restock recommendation
    var detailSheet = getSheet('15_KUNJUNGAN_DETAIL');
    var detailData = detailSheet.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < detailData.length; i++) {
      if (detailData[i][1] === kunjunganId) {
        var rekomendasi = detailData[i][9];
        if (rekomendasi > 0) {
          items.push({ produk_id: detailData[i][2], qty: rekomendasi });
        }
      }
    }

    if (items.length === 0) return respond(false, 'Tidak ada rekomendasi restock', null);

    // Get sales_id from customer if needed
    var custSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, customerId);
    if (custRow > 0) {
      salesId = custSheet.getRange(custRow, 3).getValue() || salesId;
    }

    // Simulate session for TitipanService
    var titipSession = session;
    if (!titipSession.sales_id) titipSession.sales_id = salesId;

    return TitipanService.createTitip({
      customer_id: customerId,
      sales_id: salesId,
      tipe: 'RESTOCK',
      items: items,
      notes: 'Restock otomatis dari kunjungan ' + kunjunganId
    }, titipSession);
  },

  getDraftKunjungan: function(session) {
    var all = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var salesId = getSalesIdFromSession(session);
    if (salesId) all = all.filter(function(k) { return k.sales_id === salesId; });
    all = all.filter(function(k) { return k.status === 'DRAFT'; });
    all.sort(function(a,b) { return new Date(b.tanggal_kunjungan) - new Date(a.tanggal_kunjungan); });
    return respond(true, '', all);
  },

  resumeKunjungan: function(kunjunganId, session) {
    var result = this.getKunjunganData(kunjunganId, session);
    if (!result.success) return result;
    var data = result.data;
    if (!data || data.status !== 'DRAFT') return respond(false, 'Kunjungan bukan DRAFT', null);

    // Get customer info
    var custSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, data.customer_id);
    var customer = null;
    if (custRow > 0) {
      var c = custSheet.getRange(custRow, 1, 1, 22).getValues()[0];
      customer = { customer_id: c[0], store_name: c[3], owner_name: c[4], address: c[6], kota: c[7] };
    }

    // Build produk with stock info from details
    var allProdukResume = getDataAsObjects('06_PRODUK');
    var produk = data.details.map(function(d) {
      var pr = allProdukResume.filter(function(p) { return p.produk_id === d.produk_id; })[0] || {};
      return {
        produk_id: d.produk_id,
        nama_produk: pr.nama_produk || d.produk_id,
        stok_awal: d.stok_awal,
        sisa_fisik: d.sisa_fisik,
        rusak: d.rusak,
        retur: d.retur,
        terjual: d.terjual,
        target_display: d.target_display,
        rekomendasi_restock: d.rekomendasi_restock,
        harga_jual: d.harga_jual
      };
    });

    return respond(true, '', {
      kunjungan_id: data.kunjungan_id,
      customer: customer,
      produk: produk,
      last_visit: data.tanggal
    });
  },

  cancelKunjungan: function(kunjunganId, session) {
    var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
    var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
    if (headerRow < 0) return respond(false, 'Kunjungan tidak ditemukan', null);
    var status = headerSheet.getRange(headerRow, 7).getValue();
    if (status !== 'DRAFT') return respond(false, 'Hanya kunjungan DRAFT yang bisa dibatalkan', null);
    var salesId = headerSheet.getRange(headerRow, 3).getValue();
    if (session.role === 'SALES') {
      var sId = getSalesIdFromSession(session);
      if (salesId !== sId) return respond(false, 'Akses ditolak', null);
    }
    // Delete detail rows
    var detailSheet = getSheet('15_KUNJUNGAN_DETAIL');
    var detailData = detailSheet.getDataRange().getValues();
    for (var i = detailData.length - 1; i >= 1; i--) {
      if (detailData[i][1] === kunjunganId) detailSheet.deleteRow(i + 1);
    }
    // Delete header
    headerSheet.deleteRow(headerRow);
    clearDataCache();
    logActivity(session.user_id, 'DELETE', 'KUNJUNGAN', kunjunganId, 'Hapus kunjungan DRAFT', null, null);
    return respond(true, 'Kunjungan draft berhasil dihapus', null);
  },

  getVisitReminders: function(params, session) {
    var all = getDataAsObjects('04_CUSTOMERS');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(c) { return c.sales_id === salesId; });
    }
    var sales = getDataAsObjects('02_SALES');
    var now = new Date();
    var result = [];
    all.forEach(function(c) {
      if (c.status === 'NONAKTIF' || c.status === 'SUSPEND') return;
      var lastVisit = c.last_visit ? new String(c.last_visit).indexOf('0') > -1 ? null : new Date(c.last_visit) : null;
      if (c.last_visit) {
        var ts = new Date(c.last_visit);
        lastVisit = ts.getTime() > 0 ? ts : null;
      }
      var daysSince = lastVisit ? Math.floor((now - lastVisit) / (1000*60*60*24)) : 999;
      var urgency = daysSince >= 7 ? 'red' : (daysSince >= 3 ? 'yellow' : 'green');
      var s = sales.filter(function(sa) { return sa.sales_id === c.sales_id; })[0] || {};
      result.push({
        customer_id: c.customer_id,
        store_name: c.store_name || c.nama || '',
        address: c.address || '',
        kota: c.kota || '',
        sales_id: c.sales_id,
        sales_name: s.full_name || s.nama || c.sales_id || '',
        latitude: parseFloat(c.latitude) || 0,
        longitude: parseFloat(c.longitude) || 0,
        last_visit: c.last_visit || null,
        days_since_last_visit: daysSince,
        visit_count: parseInt(c.visit_count) || 0,
        urgency: urgency
      });
    });
    result.sort(function(a,b) { return b.days_since_last_visit - a.days_since_last_visit; });
    return respond(true, '', result);
  },

  getStockPredictions: function(params, session) {
    var customers = getDataAsObjects('04_CUSTOMERS');
    var sales = getDataAsObjects('02_SALES');
    var produkList = getDataAsObjects('06_PRODUK');
    var stokAll = getDataAsObjects('10_STOK_KONSINYASI');
    var headers = getDataAsObjects('14_KUNJUNGAN_HEADER');
    var details = getDataAsObjects('15_KUNJUNGAN_DETAIL');
    var now = new Date();
    var result = [];

    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      customers = customers.filter(function(c) { return c.sales_id === salesId; });
    }

    customers.forEach(function(cust) {
      if (cust.status === 'NONAKTIF' || cust.status === 'SUSPEND') return;
      var custStok = stokAll.filter(function(s) { return s.customer_id === cust.customer_id; });
      if (custStok.length === 0) return;

      var custVisits = headers.filter(function(h) {
        return h.customer_id === cust.customer_id && h.status === 'COMPLETED';
      }).sort(function(a,b) { return new Date(a.tanggal_kunjungan) - new Date(b.tanggal_kunjungan); });

      custStok.forEach(function(s) {
        var prod = produkList.filter(function(p) { return p.produk_id === s.produk_id; })[0] || {};
        var qtySisa = parseInt(s.qty_sisa) || 0;
        if (qtySisa <= 0) return;

        var prodDetails = details.filter(function(d) {
          return d.produk_id === s.produk_id && custVisits.some(function(v) { return v.kunjungan_id === d.kunjungan_id; });
        });

        var totalTerjual = 0;
        var firstDate = null;
        var lastDate = null;
        prodDetails.forEach(function(d) {
          var terjual = parseInt(d.terjual) || 0;
          totalTerjual += terjual;
          if (terjual > 0) {
            var hv = custVisits.filter(function(v) { return v.kunjungan_id === d.kunjungan_id; })[0];
            if (hv) {
              var dt = new Date(hv.tanggal_kunjungan);
              if (!firstDate || dt < firstDate) firstDate = dt;
              if (!lastDate || dt > lastDate) lastDate = dt;
            }
          }
        });

        var daysSpan = 0;
        if (firstDate && lastDate && firstDate.getTime() !== lastDate.getTime()) {
          daysSpan = Math.max(1, Math.round((lastDate - firstDate) / (1000*60*60*24)));
        } else if (firstDate && lastDate) {
          daysSpan = 1;
        }

        var dailyAvg = daysSpan > 0 ? totalTerjual / daysSpan : 0;
        var daysUntilEmpty = dailyAvg > 0 ? Math.round(qtySisa / dailyAvg) : 999;
        var status = 'aman';
        if (daysUntilEmpty <= 3) status = 'kritis';
        else if (daysUntilEmpty <= 7) status = 'warning';

        if (status !== 'aman' || daysUntilEmpty <= 14) {
          var sObj = sales.filter(function(sa) { return sa.sales_id === cust.sales_id; })[0] || {};
          result.push({
            customer_id: cust.customer_id,
            store_name: cust.store_name || cust.nama || '',
            sales_name: sObj.full_name || sObj.nama || cust.sales_id || '',
            produk_id: s.produk_id,
            produk_name: prod.nama_produk || s.produk_id,
            qty_sisa: qtySisa,
            target_display: parseInt(s.target_display) || 0,
            daily_avg_sales: Math.round(dailyAvg * 10) / 10,
            days_until_empty: daysUntilEmpty,
            status: status
          });
        }
      });
    });

    result.sort(function(a,b) { return a.days_until_empty - b.days_until_empty; });
    return respond(true, '', result);
  },

  uploadFotoToko: function(kunjunganId, fileName, fileData, session, tipe, lat, lng) {
    if (!kunjunganId) return respond(false, 'Kunjungan ID wajib', null);
    try {
      var folderName = 'Foto_Toko_Kunjungan';
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      var blob = Utilities.newBlob(fileData, 'image/jpeg', fileName || 'foto_toko.jpg');
      var file = folder.createFile(blob);
      var fileUrl = file.getUrl();
      var headerSheet = getSheet('14_KUNJUNGAN_HEADER');
      var headerRow = findRow('14_KUNJUNGAN_HEADER', 0, kunjunganId);
      if (headerRow > 0) {
        var entry = { url: fileUrl };
        if (lat && lng) { entry.lat = parseFloat(lat); entry.lng = parseFloat(lng); }
        var existing = headerSheet.getRange(headerRow, 12).getValue() || '[]';
        var arr = [];
        try { arr = JSON.parse(existing); } catch(e) { arr = existing ? [{ url: existing }] : []; }
        if (!Array.isArray(arr)) arr = [{ url: arr }];
        if (tipe === 'sesudah') { arr[1] = entry; if (arr.length < 2) arr.push(entry); }
        else { arr[0] = entry; if (arr.length < 1) arr.push(entry); }
        headerSheet.getRange(headerRow, 12).setValue(JSON.stringify(arr));
        logActivity(session.user_id, 'UPDATE', 'KUNJUNGAN', kunjunganId, 'Upload foto ' + (tipe||'sebelum'), null, { foto_url: fileUrl, tipe: tipe, lat: lat, lng: lng });
      }
      return respond(true, 'Foto berhasil diupload', { url: fileUrl });
    } catch (e) {
      return respond(false, 'Gagal upload: ' + e.message, null);
    }
  }
};
