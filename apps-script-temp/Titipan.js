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

    data.items.forEach(function(item) {
      var detId = 'TPD-' + ('000' + (detSheet.getLastRow())).slice(-3);
      var batch = data.batch_number || '';
      var produk = ProdukService.getProdukById(item.produk_id);
      var harga = produk ? produk.harga_jual : 0;
      detSheet.appendRow([
        detId, titipId, item.produk_id, item.qty, harga, item.qty * harga,
        batch, new Date()
      ]);

      // Kurangi stok gudang
      var gudangData = stokSheet.getDataRange().getValues();
      for (var i = 1; i < gudangData.length; i++) {
        if (gudangData[i][1] === item.produk_id) {
          var qtyKeluar = (gudangData[i][4] || 0) + item.qty;
          var qtySisa = (gudangData[i][3] || 0) - qtyKeluar;
          stokSheet.getRange(i+1, 5).setValue(qtyKeluar);
          stokSheet.getRange(i+1, 6).setValue(qtySisa);
          stokSheet.getRange(i+1, 8).setValue(new Date());
          break;
        }
      }

      // Tambah / update stok konsinyasi
      var konsData = konsSheet.getDataRange().getValues();
      var found = false;
      for (var j = 1; j < konsData.length; j++) {
        if (konsData[j][1] === data.customer_id && konsData[j][2] === item.produk_id) {
          var newTitip = (konsData[j][4] || 0) + item.qty;
          var newSisa = (konsData[j][8] || 0) + item.qty;
          konsSheet.getRange(j+1, 5).setValue(newTitip);
          konsSheet.getRange(j+1, 9).setValue(newSisa);
          konsSheet.getRange(j+1, 12).setValue(new Date());
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
    });

    logActivity(session.user_id, 'CREATE', 'TITIP', titipId, 'Titip barang: ' + totalQty + ' items', null, data);
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
    return respond(true, 'Berhasil titip ke ' + count + ' customer', { count: count });
  }
};
