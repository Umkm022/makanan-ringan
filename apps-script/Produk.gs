/**
 * PRODUK.gs — Product and category management
 */

var ProdukService = {
  getProduk: function(params, session) {
    var all = getDataAsObjects('06_PRODUK');
    if (params) {
      if (params.kategori_id) all = all.filter(function(p) { return p.kategori_id === params.kategori_id; });
      if (params.is_active !== undefined) all = all.filter(function(p) { return p.is_active === params.is_active; });
    }
    // Sembunyikan HPP untuk role SALES
    if (session && session.role === 'SALES') {
      all = all.map(function(p) {
        var safe = {};
        for (var k in p) {
          if (k !== 'hpp' && k !== 'harga_modal') safe[k] = p[k];
        }
        return safe;
      });
    }
    return respond(true, '', all);
  },

  getProdukById: function(id) {
    var all = getDataAsObjects('06_PRODUK');
    for (var i = 0; i < all.length; i++) {
      if (all[i].produk_id === id) return all[i];
    }
    return null;
  },

  createProduk: function(data, session) {
    var missing = validateRequired(data, ['nama_produk', 'harga_jual', 'hpp']);
    if (missing.length > 0) {
      return respond(false, 'Field wajib: ' + missing.join(', '), null);
    }
    var sheet = getSheet('06_PRODUK');
    var lastId = sheet.getLastRow();
    var newId = 'PRD-' + ('000' + (lastId)).slice(-3);
    var row = [
      newId, data.kategori_id || '', data.kode_produk || '',
      data.nama_produk, data.varian || '', data.deskripsi || '',
      data.kemasan || '', data.satuan || 'PCS',
      data.harga_jual, data.harga_ecer || data.harga_jual,
      data.hpp, data.target_display || 20,
      data.stok_minimum || 10, true, data.gambar_url || '',
      new Date(), new Date()
    ];
    sheet.appendRow(row);
    logActivity(session.user_id, 'CREATE', 'PRODUK', newId, 'Tambah produk: ' + data.nama_produk, null, data);
    clearDataCache();
    return respond(true, 'Produk berhasil ditambahkan', { produk_id: newId });
  },

  updateProduk: function(id, data, session) {
    var sheet = getSheet('06_PRODUK');
    var row = findRow('06_PRODUK', 0, id);
    if (row < 0) return respond(false, 'Produk tidak ditemukan', null);

    var existing = sheet.getRange(row, 1, 1, 17).getValues()[0];
    var newRow = [
      id, data.kategori_id || existing[1], data.kode_produk || existing[2],
      data.nama_produk || existing[3], data.varian || existing[4],
      data.deskripsi || existing[5], data.kemasan || existing[6],
      data.satuan || existing[7], data.harga_jual || existing[8],
      data.harga_ecer || existing[9], data.hpp || existing[10],
      data.target_display || existing[11], data.stok_minimum || existing[12],
      data.is_active !== undefined ? data.is_active : existing[13],
      data.gambar_url || existing[14], existing[15], new Date()
    ];
    sheet.getRange(row, 1, 1, 17).setValues([newRow]);
    logActivity(session.user_id, 'UPDATE', 'PRODUK', id, 'Update produk: ' + data.nama_produk, existing, newRow);
    clearDataCache();
    return respond(true, 'Produk berhasil diupdate', null);
  },

  deleteProduk: function(id, session) {
    if (session.role !== 'OWNER' && session.role !== 'ADMIN') {
      return respond(false, 'Hanya owner/admin yang bisa menghapus produk', null);
    }
    var sheet = getSheet('06_PRODUK');
    var row = findRow('06_PRODUK', 0, id);
    if (row < 0) return respond(false, 'Produk tidak ditemukan', null);
    sheet.deleteRow(row);
    logActivity(session.user_id, 'DELETE', 'PRODUK', id, 'Hapus produk: ' + id, null, null);
    clearDataCache();
    return respond(true, 'Produk berhasil dihapus', null);
  },

  getKategori: function() {
    return respond(true, '', getDataAsObjects('05_KATEGORI_PRODUK'));
  },

  createKategori: function(data, session) {
    var missing = validateRequired(data, ['nama_kategori']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);
    var sheet = getSheet('05_KATEGORI_PRODUK');
    var lastId = sheet.getLastRow();
    var newId = 'KAT-' + ('000' + (lastId)).slice(-3);
    sheet.appendRow([newId, data.nama_kategori, data.deskripsi || '', new Date(), new Date()]);
    logActivity(session.user_id, 'CREATE', 'KATEGORI', newId, 'Tambah kategori: ' + data.nama_kategori, null, data);
    clearDataCache();
    return respond(true, 'Kategori berhasil ditambahkan', { kategori_id: newId });
  }
};
