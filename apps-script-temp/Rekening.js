
var RekeningService = {
  getRekening: function(session) {
    var all = getDataAsObjects('36_REKENING');
    return respond(true, '', all);
  },

  createRekening: function(data, session) {
    if (session.role !== 'OWNER') return respond(false, 'Akses ditolak', null);
    var missing = validateRequired(data, ['nama_bank', 'no_rekening', 'atas_nama']);
    if (missing.length > 0) return respond(false, 'Field wajib: ' + missing.join(', '), null);
    var sheet = getSheet('36_REKENING');
    var id = 'REK-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + ('000' + (sheet.getLastRow())).slice(-3);
    var saldoAwal = parseFloat(data.saldo_awal) || 0;
    sheet.appendRow([id, data.nama_bank, data.no_rekening, data.atas_nama, saldoAwal, saldoAwal, 'TRUE', new Date(), new Date()]);
    clearDataCache();
    logActivity(session.user_id, 'CREATE', 'REKENING', id, 'Tambah rekening: ' + data.nama_bank, null, data);
    return respond(true, 'Rekening ditambahkan', { rekening_id: id });
  },

  updateRekening: function(id, data, session) {
    if (session.role !== 'OWNER') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('36_REKENING');
    var row = findRow('36_REKENING', 0, id);
    if (row < 0) return respond(false, 'Rekening tidak ditemukan', null);
    if (data.nama_bank !== undefined) sheet.getRange(row, 2).setValue(data.nama_bank);
    if (data.no_rekening !== undefined) sheet.getRange(row, 3).setValue(data.no_rekening);
    if (data.atas_nama !== undefined) sheet.getRange(row, 4).setValue(data.atas_nama);
    if (data.saldo_awal !== undefined) {
      var saldoAwal = parseFloat(data.saldo_awal);
      sheet.getRange(row, 5).setValue(saldoAwal);
      sheet.getRange(row, 6).setValue(saldoAwal);
    }
    if (data.is_active !== undefined) sheet.getRange(row, 7).setValue(data.is_active);
    sheet.getRange(row, 9).setValue(new Date());
    clearDataCache();
    return respond(true, 'Rekening diperbarui', null);
  },

  deleteRekening: function(id, session) {
    if (session.role !== 'OWNER') return respond(false, 'Akses ditolak', null);
    var sheet = getSheet('36_REKENING');
    var row = findRow('36_REKENING', 0, id);
    if (row < 0) return respond(false, 'Rekening tidak ditemukan', null);
    sheet.deleteRow(row);
    clearDataCache();
    return respond(true, 'Rekening dihapus', null);
  },

  getSaldoRekening: function(session) {
    var rekenings = getDataAsObjects('36_REKENING');
    var transaksi = getDataAsObjects('37_KAS_TRANSAKSI');
    rekenings = rekenings.map(function(r) {
      var trx = transaksi.filter(function(t) { return t.rekening_id === r.rekening_id; });
      var totalMasuk = trx.filter(function(t) { return t.tipe === 'DEBIT'; }).reduce(function(s, t) { return s + (parseFloat(t.jumlah) || 0); }, 0);
      var totalKeluar = trx.filter(function(t) { return t.tipe === 'CREDIT'; }).reduce(function(s, t) { return s + (parseFloat(t.jumlah) || 0); }, 0);
      r.saldo_saat_ini = (parseFloat(r.saldo_awal) || 0) + totalMasuk - totalKeluar;
      r.total_masuk = totalMasuk;
      r.total_keluar = totalKeluar;
      return r;
    });
    return respond(true, '', rekenings);
  }
};
