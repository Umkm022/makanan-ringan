
var KasService = {
  catatTransaksi: function(rekeningId, tipe, kategori, jumlah, tanggal, keterangan, referensiId, referensiTipe, userId) {
    if (!rekeningId || !tipe || !kategori || !jumlah) return null;
    var sheet = getSheet('37_KAS_TRANSAKSI');
    var rekSheet = getSheet('36_REKENING');
    var rekRow = findRow('36_REKENING', 0, rekeningId);
    if (rekRow < 0) return null;
    var saldoSblm = parseFloat(rekSheet.getRange(rekRow, 6).getValue()) || 0;
    var jumlahNum = parseFloat(jumlah);
    var saldoStlh = tipe === 'DEBIT' ? saldoSblm + jumlahNum : saldoSblm - jumlahNum;
    var id = 'KSX-' + Utilities.formatDate(tanggal || new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + ('000' + (sheet.getLastRow())).slice(-3);
    sheet.appendRow([
      id, rekeningId, tipe, kategori, jumlahNum, saldoSblm, saldoStlh,
      tanggal || new Date(), keterangan || '', referensiId || '', referensiTipe || '',
      userId || '', new Date()
    ]);
    rekSheet.getRange(rekRow, 6).setValue(saldoStlh);
    return id;
  },

  getMutasiRekening: function(params) {
    var all = getDataAsObjects('37_KAS_TRANSAKSI');
    if (params && params.rekening_id) {
      all = all.filter(function(t) { return t.rekening_id === params.rekening_id; });
    }
    if (params && params.date_from) {
      all = all.filter(function(t) { return t.tanggal >= params.date_from; });
    }
    if (params && params.date_to) {
      all = all.filter(function(t) { return t.tanggal <= params.date_to + ' 23:59:59'; });
    }
    all.sort(function(a, b) { return a.tanggal < b.tanggal ? 1 : -1; });
    return respond(true, '', all);
  },

  getRekapKas: function(session) {
    var rekenings = getDataAsObjects('36_REKENING');
    var transaksi = getDataAsObjects('37_KAS_TRANSAKSI');
    var result = [];
    rekenings.forEach(function(r) {
      if (r.is_active !== 'TRUE') return;
      var trx = transaksi.filter(function(t) { return t.rekening_id === r.rekening_id; });
      var totalMasuk = trx.filter(function(t) { return t.tipe === 'DEBIT'; }).reduce(function(s, t) { return s + (parseFloat(t.jumlah) || 0); }, 0);
      var totalKeluar = trx.filter(function(t) { return t.tipe === 'CREDIT'; }).reduce(function(s, t) { return s + (parseFloat(t.jumlah) || 0); }, 0);
      result.push({
        rekening_id: r.rekening_id,
        nama_bank: r.nama_bank,
        no_rekening: r.no_rekening,
        atas_nama: r.atas_nama,
        saldo_awal: parseFloat(r.saldo_awal) || 0,
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        saldo_saat_ini: (parseFloat(r.saldo_awal) || 0) + totalMasuk - totalKeluar
      });
    });
    return respond(true, '', result);
  },

  hitungTotalReturCost: function(params) {
    var retur = getDataAsObjects('16_RETUR');
    var produk = getDataAsObjects('06_PRODUK');
    var total = 0;
    retur.forEach(function(r) {
      var p = produk.filter(function(pr) { return pr.produk_id === r.produk_id; })[0] || {};
      var hpp = parseFloat(p.hpp) || 0;
      total += (parseFloat(r.qty_retur) || 0) * hpp;
    });
    return total;
  }
};
