/**
 * NOTIFIKASI.gs — Notification system
 */

var NotifikasiService = {
  createNotif: function(userId, tipe, judul, pesan, link) {
    var sheet = getSheet('26_NOTIFIKASI');
    var notifId = 'NOT-' + ('000' + (sheet.getLastRow())).slice(-3);
    sheet.appendRow([notifId, userId, tipe, judul, pesan, link || '', false, new Date()]);
  },

  getNotifikasi: function(userId) {
    var all = getDataAsObjects('26_NOTIFIKASI');
    var filtered = all.filter(function(n) { return n.user_id === userId || !n.user_id; });
    return respond(true, '', filtered.sort(function(a,b) {
      return new Date(b.created_at) - new Date(a.created_at);
    }));
  },

  markAsRead: function(notifId) {
    var row = findRow('26_NOTIFIKASI', 0, notifId);
    if (row > 0) {
      getSheet('26_NOTIFIKASI').getRange(row, 8).setValue(true);
    }
  },

  stokMinimumAlert: function() {
    var stok = getDataAsObjects('09_STOK_GUDANG');
    var produk = getDataAsObjects('06_PRODUK');
    stok.forEach(function(s) {
      var p = produk.filter(function(pr) { return pr.produk_id === s.produk_id; });
      if (p.length > 0 && s.qty_sisa <= p[0].stok_minimum) {
        this.createNotif('', 'WARNING', 'Stok Minimum: ' + p[0].nama_produk,
          'Stok ' + p[0].nama_produk + ' tinggal ' + s.qty_sisa + ' (min: ' + p[0].stok_minimum + ')', '');
      }
    }, this);
  }
};
