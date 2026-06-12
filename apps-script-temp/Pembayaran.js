/**
 * PEMBAYARAN.gs — Payment recording and piutang update
 */

var PembayaranService = {
  createPembayaran: function(data, session) {
    var missing = validateRequired(data, ['piutang_id', 'jumlah_bayar']);
    if (missing.length > 0) {
      return respond(false, 'Field wajib: ' + missing.join(', '), null);
    }

    var piutangSheet = getSheet('20_PIUTANG');
    var piutangRow = findRow('20_PIUTANG', 0, data.piutang_id);
    if (piutangRow < 0) return respond(false, 'Piutang tidak ditemukan', null);

    var piutang = piutangSheet.getRange(piutangRow, 1, 1, 13).getValues()[0];
    var sisaPiutang = piutang[5] || piutang[4];
    var invoiceId = piutang[1];
    var customerId = piutang[2];
    var salesId = piutang[3];
    var jumlahBayar = parseFloat(data.jumlah_bayar);

    if (jumlahBayar <= 0) return respond(false, 'Jumlah bayar harus lebih dari 0', null);
    if (jumlahBayar > sisaPiutang) return respond(false, 'Jumlah bayar melebihi sisa piutang', null);

    // Calculate new sisa
    var newSisa = sisaPiutang - jumlahBayar;
    var newStatus = newSisa <= 0 ? 'PAID' : 'PARTIAL';

    // Insert payment record
    var bayarSheet = getSheet('21_PEMBAYARAN');
    var today = new Date();
    var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
    var bayarId = 'BYR-' + dateStr + '-' + ('000' + (bayarSheet.getLastRow())).slice(-3);

    bayarSheet.appendRow([
      bayarId, data.piutang_id, customerId, salesId, invoiceId,
      jumlahBayar, newSisa, data.metode_bayar || 'TUNAI',
      data.bukti_bayar || '', today, 'VALID',
      session.user_id, today, today
    ]);

    // Update piutang
    piutangSheet.getRange(piutangRow, 6).setValue(newSisa);
    piutangSheet.getRange(piutangRow, 7).setValue(newStatus);
    if (newStatus === 'PAID') {
      piutangSheet.getRange(piutangRow, 10).setValue(today);
    }

    // Update invoice header status
    var invSheet = getSheet('18_INVOICE_HEADER');
    var invRow = findRow('18_INVOICE_HEADER', 0, invoiceId);
    if (invRow > 0) {
      invSheet.getRange(invRow, 10).setValue(newStatus);
    }

    // Update customer total_piutang
    var custSheet = getSheet('04_CUSTOMERS');
    var custRow = findRow('04_CUSTOMERS', 0, customerId);
    if (custRow > 0) {
      var currPiutang = custSheet.getRange(custRow, 19).getValue() || 0;
      custSheet.getRange(custRow, 19).setValue(currPiutang - jumlahBayar);
    }

    // If PAID, calculate commission
    if (newStatus === 'PAID') {
      KomisiService.hitungKomisi(invoiceId, session);
    }

    logActivity(session.user_id, 'CREATE', 'PEMBAYARAN', bayarId,
      'Pembayaran: Rp ' + jumlahBayar + ' untuk ' + invoiceId, null, data);

    return respond(true, 'Pembayaran berhasil dicatat. Status: ' + newStatus, {
      pembayaran_id: bayarId,
      invoice_id: invoiceId,
      jumlah_bayar: jumlahBayar,
      sisa_piutang: newSisa,
      status: newStatus
    });
  }
};
