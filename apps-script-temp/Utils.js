/**
 * UTILS.gs — Shared utilities, ID generators, helpers
 */

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function generateId(prefix, sheetName, colIndex) {
  var sheet = getSheet(sheetName);
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
  var seq = 1;

  if (sheet.getLastRow() > 1) {
    var lastRow = sheet.getRange(sheet.getLastRow(), colIndex + 1).getValue();
    if (lastRow) {
      var parts = lastRow.split('-');
      seq = parseInt(parts[parts.length-1], 10) + 1;
    }
  }

  return prefix + '-' + dateStr + '-' + ('000' + seq).slice(-3);
}

function generateBatchNumber() {
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
  return 'BATCH-' + dateStr + '-' + ('000' + Math.floor(Math.random() * 999)).slice(-3);
}

function formatRupiah(number) {
  if (!number) return 'Rp 0';
  var parts = number.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + parts.join(',');
}

function formatDate(date) {
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function getLastRow(sheet) {
  return sheet.getLastRow();
}

function appendRow(sheetName, data) {
  var sheet = getSheet(sheetName);
  sheet.appendRow(data);
  return sheet.getLastRow();
}

function updateRow(sheetName, row, data) {
  var sheet = getSheet(sheetName);
  sheet.getRange(row, 1, 1, data.length).setValues([data]);
}

function findRow(sheetName, column, value) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][column] == value) return i + 1;
  }
  return -1;
}

var _CACHE_TTL = 30;
var _dataCache = {};

function getDataAsObjects(sheetName, useCache) {
  if (useCache !== false) useCache = true;
  var cacheKey = '_dac_' + sheetName;
  if (useCache && _dataCache[cacheKey]) {
    var cached = _dataCache[cacheKey];
    if (cached.expiry > Date.now()) return cached.data;
  }
  var sheet = getSheet(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  if (useCache) {
    _dataCache[cacheKey] = { data: result, expiry: Date.now() + (_CACHE_TTL * 1000) };
  }
  return result;
}

function clearDataCache(sheetName) {
  if (sheetName) {
    delete _dataCache['_dac_' + sheetName];
  } else {
    _dataCache = {};
  }
}

function validateRequired(data, fields) {
  var missing = [];
  fields.forEach(function(f) {
    if (data[f] === undefined || data[f] === null || data[f] === '') {
      missing.push(f);
    }
  });
  return missing;
}

function calculateMargin(hpp, hargaJual) {
  if (!hpp || !hargaJual || hargaJual === 0) return 0;
  return Math.round(((hargaJual - hpp) / hargaJual) * 100);
}

function filterBySalesAccess(data, userId, salesId) {
  var session = validateSession(userId);
  if (!session) return [];
  if (session.role === 'SALES') {
    return data.filter(function(item) { return item.sales_id === salesId; });
  }
  return data;
}
