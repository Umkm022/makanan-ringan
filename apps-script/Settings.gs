/**
 * SETTINGS.gs — Application settings management
 */

var SettingsService = {
  getSetting: function(key) {
    var settings = getDataAsObjects('07_SETTING');
    for (var i = 0; i < settings.length; i++) {
      if (settings[i].key === key) return settings[i].value;
    }
    return null;
  },

  getAllSettings: function() {
    return getDataAsObjects('07_SETTING');
  },

  updateSetting: function(key, value, userId) {
    var sheet = getSheet('07_SETTING');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] === key) {
        sheet.getRange(i+1, 4).setValue(value);
        sheet.getRange(i+1, 7).setValue(userId);
        sheet.getRange(i+1, 8).setValue(new Date());
        clearDataCache();
        return true;
      }
    }
    clearDataCache();
    return false;
  },

  getKomisiRate: function(salesId) {
    // Check if sales has specific rate
    if (salesId) {
      var salesSheet = getSheet('02_SALES');
      var salesData = salesSheet.getDataRange().getValues();
      for (var i = 1; i < salesData.length; i++) {
        if (salesData[i][0] === salesId && salesData[i][7]) {
          return parseFloat(salesData[i][7]);
        }
      }
    }
    // Return default
    var defaultRate = this.getSetting('komisi_rate_default');
    return defaultRate ? parseFloat(defaultRate) : 5;
  }
};
