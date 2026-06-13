/**
 * UTILS.gs — Shared utilities, ID generators, helpers
 */

var _ss = null;

function getSS() {
  if (_ss) return _ss;
  _ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ss;
}

function getSheet(name) {
  try {
    var ss = getSS();
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      console.warn('Sheet not found: ' + name);
      return null;
    }
    return sheet;
  } catch(e) {
    console.error('Error accessing sheet ' + name + ': ' + e.message);
    _ss = null;
    return null;
  }
}

function generateId(prefix, sheetName, colIndex) {
  var sheet = getSheet(sheetName);
  var today = new Date();
  var dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyyMMdd');
  var seq = 1;

  if (sheet && sheet.getLastRow() > 1) {
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
  if (!sheet) return 0;
  return sheet.getLastRow();
}

function appendRow(sheetName, data) {
  var sheet = getSheet(sheetName);
  if (!sheet) return -1;
  sheet.appendRow(data);
  return sheet.getLastRow();
}

function updateRow(sheetName, row, data) {
  var sheet = getSheet(sheetName);
  if (!sheet) return;
  sheet.getRange(row, 1, 1, data.length).setValues([data]);
}

function findRow(sheetName, column, value) {
  var sheet = getSheet(sheetName);
  if (!sheet) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][column] == value) return i + 1;
  }
  return -1;
}

var _CACHE_TTL = 300; // seconds

function _getCacheVersion() {
  var cache = CacheService.getScriptCache();
  var v = cache.get('_CACHE_VERSION');
  if (!v) {
    v = '1';
    cache.put('_CACHE_VERSION', v, 86400);
  }
  return v;
}

function getDataAsObjects(sheetName, useCache) {
  if (useCache !== false) useCache = true;
  var cacheVersion = _getCacheVersion();
  var cacheKey = '_dac_' + cacheVersion + '_' + sheetName;
  var cache = CacheService.getScriptCache();
  
  if (useCache) {
    var cachedStr = cache.get(cacheKey);
    if (cachedStr) {
      try {
        return JSON.parse(cachedStr);
      } catch(e) {}
    }
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
      // Convert Date objects to string to avoid GAS serialization issues
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  
  if (useCache) {
    try {
      var jsonStr = JSON.stringify(result);
      if (jsonStr.length < 100000) { // CacheService limit is 100KB per value
        cache.put(cacheKey, jsonStr, _CACHE_TTL);
      }
    } catch(e) {}
  }
  return result;
}

function clearDataCache(sheetName) {
  var cache = CacheService.getScriptCache();
  if (sheetName) {
    var v = _getCacheVersion();
    cache.remove('_dac_' + v + '_' + sheetName);
  } else {
    var v = parseInt(_getCacheVersion()) + 1;
    cache.put('_CACHE_VERSION', String(v), 86400);
  }
}

function validateRequired(data, fields) {
  if (!data) return fields;
  var missing = [];
  fields.forEach(function(f) {
    if (data[f] === undefined || data[f] === null || data[f] === '') {
      missing.push(f);
    }
  });
  return missing;
}

function sanitizeForReturn(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (obj instanceof Date) return Utilities.formatDate(obj, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  if (Array.isArray(obj)) {
    return obj.map(function(item) { return sanitizeForReturn(item); });
  }
  if (typeof obj === 'object') {
    var result = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = sanitizeForReturn(obj[key]);
      }
    }
    return result;
  }
  return obj;
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
