/**
 * TITIPAN.gs — Consignment shipping (gudang -> toko via sales)
 */

var TitipanService = {
  createTitip: function(data, session) {
    var missing = validateRequired(data, ['customer_id', 'items']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);
    if (!data.items || data.items.length === 0) return respond(false, 'Item tidak boleh kosong', null);

    var salesId = data.sales_id || getSalesIdFromSession(session);
    var sheet = getSheet('12_TITIP_HEADER');
    var titipId = 'TTP-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + ('000' + (sheet.getLastRow())).slice(-3);
    var tipe = data.tipe || 'AWAL';
    var totalQty = data.items.reduce(function(sum, item) { return sum + item.qty; }, 0);

    sheet.appendRow([
      titipId, data.customer_id, salesId, new Date(), tipe, 'AKTIF',
      data.items.length, totalQty, data.notes || '', new Date(), new Date()
    ]);

    var detSheet = getSheet('13_TITIP_DETAIL');
    var stokSheet = getSheet('09_STOK_GUDANG');
    var konsSheet = getSheet('10_STOK_KONSINYASI');

    var gudangData = stokSheet.getDataRange().getValues();
    var konsData = konsSheet.getDataRange().getValues();

    // Validate stock across all rows (multi-batch) before any mutations
    for (var ii = 0; ii < data.items.length; ii++) {
      var item = data.items[ii];
      var totalAvailable = 0;
      for (var gi = 1; gi < gudangData.length; gi++) {
        if (gudangData[gi][1] === item.produk_id) {
          totalAvailable += (gudangData[gi][3] || 0) - (gudangData[gi][4] || 0);
        }
      }
      if (item.qty > totalAvailable) {
        return respond(false, 'Stok ' + item.produk_id + ' tidak mencukupi. Tersedia: ' + totalAvailable + ', diminta: ' + item.qty, null);
      }
    }

    for (var ii = 0; ii < data.items.length; ii++) {
      var item = data.items[ii];
      var detId = 'TPD-' + ('000' + (detSheet.getLastRow())).slice(-3);
      var batch = data.batch_number || '';
      var produk = ProdukService.getProdukById(item.produk_id);
      var harga = produk ? produk.harga_jual : 0;
      detSheet.appendRow([
        detId, titipId, item.produk_id, item.qty, harga, item.qty * harga,
        batch, new Date()
      ]);

      // Kurangi stok gudang — iterate across all matching batch rows
      var sisaKurang = item.qty;
      for (var gi = 1; gi < gudangData.length && sisaKurang > 0; gi++) {
        if (gudangData[gi][1] === item.produk_id) {
          var rowAvailable = (gudangData[gi][3] || 0) - (gudangData[gi][4] || 0);
          var deduct = Math.min(sisaKurang, rowAvailable);
          var qtyKeluarBaru = (gudangData[gi][4] || 0) + deduct;
          var qtySisaBaru = (gudangData[gi][3] || 0) - qtyKeluarBaru;
          stokSheet.getRange(gi + 1, 5).setValue(qtyKeluarBaru);
          stokSheet.getRange(gi + 1, 6).setValue(qtySisaBaru);
          stokSheet.getRange(gi + 1, 8).setValue(new Date());
          sisaKurang -= deduct;
          // update cached row data for subsequent items
          gudangData[gi][4] = qtyKeluarBaru;
          gudangData[gi][5] = qtySisaBaru;
        }
      }

      // Tambah / update stok konsinyasi
      var found = false;
      for (var j = 1; j < konsData.length; j++) {
        if (konsData[j][1] === data.customer_id && konsData[j][2] === item.produk_id) {
          var newTitip = (konsData[j][4] || 0) + item.qty;
          var newSisa = (konsData[j][8] || 0) + item.qty;
          konsSheet.getRange(j + 1, 5).setValue(newTitip);
          konsSheet.getRange(j + 1, 9).setValue(newSisa);
          konsSheet.getRange(j + 1, 12).setValue(new Date());
          found = true;
          break;
        }
      }
      if (!found) {
        var newId = 'SKN-' + ('000' + (konsSheet.getLastRow())).slice(-3);
        konsSheet.appendRow([
          newId, data.customer_id, item.produk_id, salesId,
          item.qty, 0, 0, 0, item.qty,
          produk ? produk.target_display : 20,
          '', new Date(), new Date(), new Date()
        ]);
      }
    }

    logActivity(session.user_id, 'CREATE', 'TITIP', titipId, 'Titip barang: ' + totalQty + ' items', null, data);
    clearDataCache();
    return respond(true, 'Barang berhasil dititipkan', { titip_id: titipId });
  },

  bulkTitip: function(data, session) {
    var missing = validateRequired(data, ['customerIds', 'items']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);
    if (!data.customerIds || data.customerIds.length === 0) return respond(false, 'Pilih minimal 1 customer', null);
    if (!data.items || data.items.length === 0) return respond(false, 'Item tidak boleh kosong', null);
    var salesId = data.sales_id || getSalesIdFromSession(session);
    var count = 0;
    data.customerIds.forEach(function(custId) {
      var titipData = {
        customer_id: custId,
        sales_id: salesId,
        items: data.items,
        notes: data.notes || 'Bulk titip',
        tipe: data.tipe || 'AWAL'
      };
      var result = TitipanService.createTitip(titipData, session);
      if (result && result.success) count++;
    });
    logActivity(session.user_id, 'CREATE', 'BULK_TITIP', count + ' customers', 'Bulk titip ke ' + count + ' customer', null, data);
    clearDataCache();
    return respond(true, 'Berhasil titip ke ' + count + ' customer', { count: count });
  },

  getShipmentDetail: function(params, session) {
    var shpId = params.shipment_id;
    if (!shpId) return respond(false, 'Parameter shipment_id diperlukan', null);
    var headers = getDataAsObjects('12_TITIP_HEADER');
    var header = headers.filter(function(h) { return h.titip_id === shpId; })[0];
    if (!header) return respond(false, 'Data tidak ditemukan', null);
    var details = getDataAsObjects('13_TITIP_DETAIL');
    var dets = details.filter(function(d) { return d.titip_id === shpId; });
    var customers = getDataAsObjects('04_CUSTOMERS');
    var cust = customers.filter(function(c) { return c.customer_id === header.customer_id; })[0] || {};
    var sales = getDataAsObjects('02_SALES');
    var sal = sales.filter(function(sl) { return sl.sales_id === header.sales_id; })[0] || {};
    var produk = getDataAsObjects('06_PRODUK');
    var mappedDets = dets.map(function(d) {
      var pr = produk.filter(function(p) { return p.produk_id === d.produk_id; })[0] || {};
      return {
        qty: d.qty_titip,
        nama_produk: pr.nama_produk || d.produk_id,
        produk_id: d.produk_id
      };
    });
    var result = {
      id: header.titip_id,
      customer_id: header.customer_id,
      sales_id: header.sales_id,
      tipe: header.tipe_titip,
      status: header.status,
      total_qty: header.total_qty,
      notes: header.notes,
      created_at: header.tanggal_titip,
      customers: cust,
      sales: sal,
      shipment_details: mappedDets
    };
    return respond(true, '', result);
  },

  getAllShipments: function(params, session) {
    var headers = getDataAsObjects('12_TITIP_HEADER');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      headers = headers.filter(function(h) { return h.sales_id === salesId; });
    }
    if (params && params.sales_id && session.role !== 'SALES') {
      headers = headers.filter(function(h) { return h.sales_id === params.sales_id; });
    }
    headers.sort(function(a, b) { return (b.tanggal_titip || '').localeCompare(a.tanggal_titip || ''); });
    if (params && params.limit) headers = headers.slice(0, params.limit);
    var customers = getDataAsObjects('04_CUSTOMERS');
    var sales = getDataAsObjects('02_SALES');
    var result = headers.map(function(h) {
      var cust = customers.filter(function(c) { return c.customer_id === h.customer_id; })[0] || {};
      var sal = sales.filter(function(sl) { return sl.sales_id === h.sales_id; })[0] || {};
      return {
        id: h.titip_id,
        customer_id: h.customer_id,
        sales_id: h.sales_id,
        tipe: h.tipe_titip,
        status: h.status,
        total_qty: h.total_qty,
        notes: h.notes,
        created_at: h.tanggal_titip,
        customers: { store_name: cust.store_name },
        sales: { full_name: sal.full_name }
      };
    });
    return respond(true, '', result);
  }
};
