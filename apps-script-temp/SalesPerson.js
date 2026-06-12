/**
 * SALESPERSON.gs — Sales employee management
 */

var SalesPersonService = {
  getSales: function() {
    return respond(true, '', getDataAsObjects('02_SALES'));
  },

  getSalesById: function(id) {
    var sheet = getSheet('02_SALES');
    var row = findRow('02_SALES', 0, id);
    if (row < 0) return respond(false, 'Sales tidak ditemukan', null);
    var data = sheet.getRange(row, 1, 1, 17).getValues()[0];
    return respond(true, '', {
      sales_id: data[0], user_id: data[1], sales_code: data[2],
      full_name: data[3], phone: data[4], address: data[5],
      kota: data[6], komisi_rate: data[7], target_bulanan: data[8],
      status: data[9], join_date: data[10]
    });
  }
};
