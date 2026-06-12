var BiayaService = {
  createBiaya: function(data, session) {
    var missing = validateRequired(data, ['kategori', 'deskripsi', 'jumlah']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);

    var sheet = getSheet('23_BIAYA_OPERASIONAL');
    var biayaId = 'BYA-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
      '-' + ('000' + (sheet.getLastRow())).slice(-3);
    var now = new Date();

    sheet.appendRow([
      biayaId, data.kategori, data.deskripsi, data.jumlah, now,
      data.metode_pembayaran || 'TUNAI', data.bukti || '',
      data.notes || '', session.user_id, now
    ]);

    logActivity(session.user_id, 'CREATE', 'BIAYA', biayaId,
      'Biaya: ' + data.deskripsi + ' Rp ' + data.jumlah, null, data);
    clearDataCache();
    return respond(true, 'Biaya berhasil dicatat', { biaya_id: biayaId });
  },

  getBiaya: function(params) {
    var all = getDataAsObjects('23_BIAYA_OPERASIONAL');
    if (params) {
      if (params.kategori) all = all.filter(function(b) { return b.kategori === params.kategori; });
      if (params.tanggal_mulai) {
        var tgl = new Date(params.tanggal_mulai);
        all = all.filter(function(b) { return new Date(b.tanggal) >= tgl; });
      }
      if (params.tanggal_selesai) {
        var tgl2 = new Date(params.tanggal_selesai);
        all = all.filter(function(b) { return new Date(b.tanggal) <= tgl2; });
      }
    }
    all.sort(function(a,b) { return new Date(b.tanggal) - new Date(a.tanggal); });
    return respond(true, '', all);
  },

  deleteBiaya: function(id) {
    var sheet = getSheet('23_BIAYA_OPERASIONAL');
    var row = findRow('23_BIAYA_OPERASIONAL', 0, id);
    if (row < 0) return respond(false, 'Biaya tidak ditemukan', null);
    sheet.deleteRow(row);
    clearDataCache();
    return respond(true, 'Biaya berhasil dihapus', null);
  }
};
