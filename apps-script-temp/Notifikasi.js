/**
 * NOTIFIKASI.gs — Notification system
 */

var NotifikasiService = {
  createNotif: function(userId, tipe, judul, pesan, link) {
    try {
      var sheet = getSheet('26_NOTIFIKASI');
      if (!sheet) return;
      var notifId = 'NOT-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') +
        '-' + ('000' + (sheet.getLastRow())).slice(-3);
      sheet.appendRow([notifId, userId || '', tipe, judul, pesan, link || '', false, new Date()]);
    } catch(e) { console.error('createNotif error: ' + e.message); }
  },

  getNotifikasi: function(userId, session) {
    var all = getDataAsObjects('26_NOTIFIKASI');
    var uid = userId || (session ? session.user_id : '');
    var filtered = all.filter(function(n) { return n.user_id === uid || !n.user_id || n.user_id === ''; });
    if (session && session.role === 'OWNER') {
      var alerts = this._checkAlerts(session);
      if (alerts.length > 0) {
        alerts.forEach(function(a) { this.createNotif(session.user_id, a.tipe, a.judul, a.pesan, a.link); }, this);
        filtered = getDataAsObjects('26_NOTIFIKASI').filter(function(n) { return n.user_id === uid || !n.user_id || n.user_id === ''; });
      }
    }
    return respond(true, '', filtered.sort(function(a,b) {
      return new Date(b.created_at) - new Date(a.created_at);
    }));
  },

  _checkAlerts: function(session) {
    var alerts = [];
    if (session._alertsChecked) return alerts;
    session._alertsChecked = true;
    // Check overdue piutang
    try {
      var piutang = getDataAsObjects('20_PIUTANG');
      var today = new Date();
      piutang.forEach(function(p) {
        if (p.status === 'PAID') return;
        var days = Math.floor((today - new Date(p.tanggal_invoice)) / (1000*60*60*24));
        if (days > 30) {
          alerts.push({ tipe: 'WARNING', judul: 'Piutang Jatuh Tempo', pesan: 'Piutang ' + p.piutang_id + ' (' + p.customer_id + ') sudah ' + days + ' hari - Rp ' + Math.round(p.sisa_piutang || 0).toLocaleString('id-ID'), link: '' });
        }
      });
    } catch(e) { console.error('piutang alert error: ' + e.message); }

    // Check komisi ready
    try {
      var komisi = getDataAsObjects('22_KOMISI');
      komisi.forEach(function(k) {
        if (k.status === 'READY') {
          alerts.push({ tipe: 'INFO', judul: 'Komisi Siap Cair', pesan: 'Komisi ' + k.komisi_id + ' (' + k.sales_id + ') Rp ' + Math.round(k.nilai_komisi || 0).toLocaleString('id-ID') + ' siap dicairkan', link: '' });
        }
      });
    } catch(e) { console.error('komisi alert error: ' + e.message); }

    // Check stok minimum
    try {
      var stok = getDataAsObjects('09_STOK_GUDANG');
      var produk = getDataAsObjects('06_PRODUK');
      stok.forEach(function(s) {
        var p = produk.filter(function(pr) { return pr.produk_id === s.produk_id; });
        if (p.length > 0 && s.qty_sisa <= p[0].stok_minimum) {
          alerts.push({ tipe: 'WARNING', judul: 'Stok Minimum: ' + p[0].nama_produk, pesan: 'Stok ' + p[0].nama_produk + ' tinggal ' + s.qty_sisa + ' (min: ' + p[0].stok_minimum + ')', link: '' });
        }
      });
    } catch(e) { console.error('stok alert error: ' + e.message); }

    return alerts;
  },

  markAsRead: function(notifId) {
    var row = findRow('26_NOTIFIKASI', 0, notifId);
    if (row > 0) {
      getSheet('26_NOTIFIKASI').getRange(row, 8).setValue(true);
    }
  }
};
