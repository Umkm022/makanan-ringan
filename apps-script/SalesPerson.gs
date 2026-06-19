/**
 * SALESPERSON.gs — Sales employee management
 */

var SalesPersonService = {
  getSales: function() {
    return respond(true, '', getDataAsObjects('02_SALES'));
  },

  getSalesById: function(id) {
    var sheet = getSheet('02_SALES');
    var row = findRow('02_SALES', 0, id);
    if (row < 0) return respond(false, 'Sales tidak ditemukan', null);
    var data = sheet.getRange(row, 1, 1, 17).getValues()[0];
    return respond(true, '', {
      sales_id: data[0], user_id: data[1], sales_code: data[2],
      full_name: data[3], phone: data[4], address: data[5],
      kota: data[6], komisi_rate: data[7], target_bulanan: data[8],
      status: data[9], join_date: data[10]
    });
  },

  createSales: function(data) {
    var missing = validateRequired(data, ['full_name', 'username', 'password']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);

    var salesSheet = getSheet('02_SALES');
    var userSheet = getSheet('01_USERS');
    if (!salesSheet || !userSheet) return respond(false, 'Sheet tidak ditemukan', null);

    var now = new Date();
    var salesId = 'SLS-' + ('000' + (salesSheet.getLastRow())).slice(-3);
    var userId = 'USR-' + ('000' + (userSheet.getLastRow())).slice(-3);

    // Create user account
    userSheet.appendRow([
      userId, data.username.trim().toLowerCase(), data.email || '',
      hashPassword(data.password), 'SALES', data.full_name,
      data.phone || '', true, '', now, now
    ]);

    // Create sales record
    salesSheet.appendRow([
      salesId, userId, 'SLS' + ('00' + (salesSheet.getLastRow())).slice(-2),
      data.full_name, data.phone || '', data.address || '',
      data.kota || '', data.komisi_rate || 5, data.target_bulanan || 0,
      'AKTIF', now, 0, 0, 0, 0, '', now, now
    ]);

    logActivity('SYSTEM', 'CREATE', 'SALES', salesId, 'Tambah sales: ' + data.full_name, null, data);
    clearDataCache();
    return respond(true, 'Sales berhasil ditambahkan', { sales_id: salesId, user_id: userId });
  },

  updateSales: function(id, data) {
    var sheet = getSheet('02_SALES');
    var row = findRow('02_SALES', 0, id);
    if (row < 0) return respond(false, 'Sales tidak ditemukan', null);

    var existing = sheet.getRange(row, 1, 1, 17).getValues()[0];
    var newRowData = [
      data.full_name || existing[3],
      data.phone || existing[4],
      data.address || existing[5],
      data.kota || existing[6],
      data.komisi_rate || existing[7],
      data.target_bulanan || existing[8],
      data.status || existing[9],
      existing[10], existing[11], existing[12], existing[13], existing[14], existing[15],
      new Date()
    ];
    sheet.getRange(row, 4, 1, 14).setValues([newRowData]);

    clearDataCache();
    logActivity('SYSTEM', 'UPDATE', 'SALES', id, 'Update sales: ' + (data.full_name || existing[3]), null, data);
    return respond(true, 'Sales berhasil diupdate', null);
  },

  deleteSales: function(id) {
    var sheet = getSheet('02_SALES');
    var row = findRow('02_SALES', 0, id);
    if (row < 0) return respond(false, 'Sales tidak ditemukan', null);

    var existing = sheet.getRange(row, 1, 1, 17).getValues()[0];
    sheet.getRange(row, 10).setValue('NONAKTIF');

    var userId = existing[1];
    if (userId) {
      var userSheet = getSheet('01_USERS');
      var userRow = findRow('01_USERS', 0, userId);
      if (userRow > 0) {
        userSheet.getRange(userRow, 8).setValue(false);
      }
    }

    clearDataCache();
    logActivity('SYSTEM', 'DELETE', 'SALES', id, 'Nonaktifkan sales: ' + (existing[3] || id), null, null);
    return respond(true, 'Sales dinonaktifkan', null);
  }
};
