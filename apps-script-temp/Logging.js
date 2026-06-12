/**
 * LOGGING.gs — Activity log and audit trail
 */

function logActivity(userId, tipe, modul, sourceId, deskripsi, dataLama, dataBaru) {
  var sheet = getSheet('24_LOG_AKTIVITAS');
  if (!sheet) return;
  var logId = 'LOG-' + ('000' + (sheet.getLastRow())).slice(-3);
  sheet.appendRow([
    logId, userId, tipe, modul, sourceId, deskripsi,
    JSON.stringify(dataLama), JSON.stringify(dataBaru),
    '', '', new Date()
  ]);
}

function auditTrail(tabel, recordId, aksi, dataSebelum, dataSesudah, userId) {
  var sheet = getSheet('25_AUDIT_TRAIL');
  if (!sheet) return;
  var auditId = 'AUD-' + ('000' + (sheet.getLastRow())).slice(-3);
  sheet.appendRow([
    auditId, tabel, recordId, aksi,
    JSON.stringify(dataSebelum), JSON.stringify(dataSesudah),
    userId, new Date(), ''
  ]);
}

function getAuditLogs(params, session) {
  var sheet = getSheet('24_LOG_AKTIVITAS');
  if (!sheet) return respond(false, 'Sheet tidak ditemukan', null);
  var all = getDataAsObjects('24_LOG_AKTIVITAS');
  all = all.map(function(log) {
    return {
      log_id: log.log_id,
      user_id: log.user_id,
      action: log.tipe_aktivitas,
      target_type: log.modul,
      target_id: log.source_id,
      description: log.deskripsi,
      created_at: log.created_at
    };
  });
  all.sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  var page = (params && params.page) || 0;
  var limit = (params && params.limit) || 50;
  var start = page * limit;
  var paged = all.slice(start, start + limit);
  return respond(true, '', paged);
}

function clearOldLogs(days) {
  days = days || 90;
  var sheet = getSheet('24_LOG_AKTIVITAS');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][10] && new Date(data[i][10]) < cutoff) {
      sheet.deleteRow(i+1);
    }
  }
}
