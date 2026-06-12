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

    return respond(true, 'Kunjungan berhasil difinalisasi', {
      kunjungan_id: kunjunganId,
      invoice_id: invoiceId,
      total_terjual: header[7],
      total_invoice: invoiceTotal,
      has_restock_recommendation: details.some(function(d) { return d.rekomendasi_restock > 0; })
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
      status: header[6],
      total_terjual: header[7],
      total_retur: header[8],
      total_invoice: header[9],
      notes: header[10],
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
  }
};
