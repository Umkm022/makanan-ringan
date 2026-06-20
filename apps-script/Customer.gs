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
    // Join sales name
    var sales = getDataAsObjects('02_SALES');
    all = all.map(function(c) {
      var s = sales.filter(function(sa) { return sa.sales_id === c.sales_id; })[0] || {};
      c.sales_name = s.full_name || s.nama || (c.sales_id || '');
      return c;
    });
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
    // Notifikasi ke Owner jika Sales yang daftarkan
    if (session && session.role === 'SALES') {
      try {
        var users = getDataAsObjects('01_USERS');
        var owners = users.filter(function(u) { return u.role === 'OWNER'; });
        var pesan = 'Sales ' + (session.full_name || session.username) + ' mendaftarkan toko baru: ' + data.store_name;
        owners.forEach(function(o) {
          NotifikasiService.createNotif(o.user_id, 'CUSTOMER_BARU', '🏪 Toko Baru', pesan, '?page=customer');
        });
      } catch(e) { console.error('Notif Owner gagal: ' + e.message); }
    }
    clearDataCache();
    return respond(true, 'Customer berhasil ditambahkan', { customer_id: newId });
  },

  updateCustomer: function(id, data, session) {
    var sheet = getSheet('04_CUSTOMERS');
    var row = findRow('04_CUSTOMERS', 0, id);
    if (row < 0) return respond(false, 'Customer tidak ditemukan', null);

    var existing = sheet.getRange(row, 1, 1, 22).getValues()[0];
    if (session.role === 'SALES') {
      var salesId = getSalesIdFromSession(session);
      if (existing[2] !== salesId) return respond(false, 'Akses ditolak: bukan customer Anda', null);
    }
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
    clearDataCache();
    return respond(true, 'Customer berhasil diupdate', null);
  },

  deleteCustomer: function(id, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') {
      return respond(false, 'Hanya owner/admin yang bisa menghapus customer', null);
    }
    var sheet = getSheet('04_CUSTOMERS');
    var row = findRow('04_CUSTOMERS', 0, id);
    if (row < 0) return respond(false, 'Customer tidak ditemukan', null);
    sheet.deleteRow(row);
    clearDataCache();
    logActivity(session.user_id, 'DELETE', 'CUSTOMER', id, 'Hapus customer: ' + id, null, null);
    return respond(true, 'Customer berhasil dihapus', null);
  }
};

function getSalesIdFromSession(session) {
  if (!session || !session.user_id) return '';
  var sheet = getSheet('02_SALES');
  if (!sheet) return '';
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === session.user_id) return data[i][0];
  }
  return '';
}
