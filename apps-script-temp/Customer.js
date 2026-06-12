/**
 * CUSTOMER.gs — Customer CRUD with sales-level access control
 */

var CustomerService = {
  getCustomers: function(params, session) {
    var all = getDataAsObjects('04_CUSTOMERS');
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      all = all.filter(function(c) { return c.sales_id === salesId; });
    }
    if (params && params.status) {
      all = all.filter(function(c) { return c.status === params.status; });
    }
    return respond(true, '', all);
  },

  getCustomer: function(id, session) {
    var all = getDataAsObjects('04_CUSTOMERS');
    var customer = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].customer_id === id) {
        customer = all[i];
        break;
      }
    }
    if (!customer) return respond(false, 'Customer tidak ditemukan', null);
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      if (customer.sales_id !== salesId) {
        return respond(false, 'Akses ditolak', null);
      }
    }
    return respond(true, '', customer);
  },

  createCustomer: function(data, session) {
    var missing = validateRequired(data, ['store_name', 'sales_id']);
    if (missing.length > 0) {
      return respond(false, 'Field wajib: ' + missing.join(', '), null);
    }
    var sheet = getSheet('04_CUSTOMERS');
    var lastId = sheet.getLastRow();
    var newId = 'CST-' + ('000' + (lastId)).slice(-3);
    var row = [
      newId, data.group_id || '', data.sales_id, data.store_name,
      data.owner_name || '', data.phone || '', data.address || '',
      data.kota || '', data.kecamatan || '', data.latitude || 0,
      data.longitude || 0, data.status || 'AKTIF', data.tipe_toko || 'WARUNG',
      data.limit_piutang || 0, data.tempo_pembayaran || 30,
      '', 0, 0, 0, data.notes || '',
      new Date(), new Date()
    ];
    sheet.appendRow(row);
    logActivity(session.user_id, 'CREATE', 'CUSTOMER', newId, 'Tambah customer: ' + data.store_name, null, data);
    return respond(true, 'Customer berhasil ditambahkan', { customer_id: newId });
  },

  updateCustomer: function(id, data, session) {
    var sheet = getSheet('04_CUSTOMERS');
    var row = findRow('04_CUSTOMERS', 0, id);
    if (row < 0) return respond(false, 'Customer tidak ditemukan', null);

    var existing = sheet.getRange(row, 1, 1, 22).getValues()[0];
    var newRow = [
      id, data.group_id || existing[1], data.sales_id || existing[2],
      data.store_name || existing[3], data.owner_name || existing[4],
      data.phone || existing[5], data.address || existing[6],
      data.kota || existing[7], data.kecamatan || existing[8],
      data.latitude || existing[9], data.longitude || existing[10],
      data.status || existing[11], data.tipe_toko || existing[12],
      data.limit_piutang || existing[13], data.tempo_pembayaran || existing[14],
      existing[15], existing[16], existing[17], existing[18],
      data.notes || existing[19], existing[20], new Date()
    ];
    sheet.getRange(row, 1, 1, 22).setValues([newRow]);
    logActivity(session.user_id, 'UPDATE', 'CUSTOMER', id, 'Update customer: ' + data.store_name, existing, newRow);
    return respond(true, 'Customer berhasil diupdate', null);
  }
};

function getSalesIdFromSession(session) {
  var sheet = getSheet('02_SALES');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === session.user_id) return data[i][0];
  }
  return '';
}
