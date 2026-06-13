/**
 * AUTH.gs — Authentication, Session Management, RBAC
 */

var SESSION_EXPIRY_HOURS = 24;

function authenticate(username, password) {
  var sheet = getSheet('01_USERS');
  if (!sheet) return respond(false, 'Sistem belum siap. Hubungi owner.', null);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var userCol = headers.indexOf('username');
  var passCol = headers.indexOf('password_hash');
  var idCol = headers.indexOf('user_id');
  var roleCol = headers.indexOf('role');
  var nameCol = headers.indexOf('full_name');
  var activeCol = headers.indexOf('is_active');

  for (var i = 1; i < data.length; i++) {
    if (data[i][userCol] === username) {
      if (data[i][activeCol] === false || data[i][activeCol] === 'FALSE') {
        return respond(false, 'Akun dinonaktifkan. Hubungi owner.', null);
      }
      var passwordHash = data[i][passCol];
      var inputHash = hashPassword(password);
      if (passwordHash === inputHash) {
        var user = {
          user_id: data[i][idCol],
          username: data[i][userCol],
          role: data[i][roleCol],
          full_name: data[i][nameCol]
        };

        // Get sales_id if role is SALES
        if (user.role === 'SALES') {
          var salesData = getSalesIdByUserId(user.user_id);
          user.sales_id = salesData.sales_id;
          user.sales_name = salesData.full_name;
        }

        var token = generateUUID();
        createSession(token, user);

        // Update last_login
        sheet.getRange(i+1, 9).setValue(new Date());

        return respond(true, 'Login berhasil. Selamat datang ' + user.full_name + '!', {
          token: token,
          user: user
        });
      } else {
        return respond(false, 'Password salah. Silakan coba lagi.', null);
      }
    }
  }
  return respond(false, 'Username tidak ditemukan.', null);
}

function getSalesIdByUserId(userId) {
  var sheet = getSheet('02_SALES');
  if (!sheet) return { sales_id: '', full_name: '' };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === userId) {
      return { sales_id: data[i][0], full_name: data[i][3] };
    }
  }
  return { sales_id: '', full_name: '' };
}

function createSession(token, user) {
  var sheet = getSheet('34_SESSION');
  if (!sheet) return;
  var expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_EXPIRY_HOURS);
  sheet.appendRow([token, user.user_id, user.role, new Date(), expiry, '']);
}

var _sessionCache = {};

function validateSession(token) {
  if (!token) return null;
  if (_sessionCache[token]) {
    var cached = _sessionCache[token];
    if (new Date(cached.expiry) > new Date()) return cached;
    delete _sessionCache[token];
  }
  var sheet = getSheet('34_SESSION');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var now = new Date();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (new Date(data[i][4]) > now) {
        var session = { user_id: data[i][1], role: data[i][2], token: token, expiry: data[i][4] };
        _sessionCache[token] = session;
        return session;
      } else {
        sheet.deleteRow(i+1);
        return null;
      }
    }
  }
  return null;
}

function destroySession(token) {
  var sheet = getSheet('34_SESSION');
  if (!sheet) return respond(true, 'Session tidak ditemukan.', null);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.deleteRow(i+1);
      return respond(true, 'Logout berhasil.', null);
    }
  }
  return respond(true, 'Session tidak ditemukan.', null);
}

function checkAccess(userRole, requiredRole) {
  var hierarchy = { OWNER: 3, ADMIN: 2, SALES: 1 };
  return hierarchy[userRole] >= hierarchy[requiredRole];
}

function requireRole(session, requiredRole) {
  if (!session) return respond(false, 'Unauthorized. Silakan login.', null);
  if (!checkAccess(session.role, requiredRole)) {
    return respond(false, 'Forbidden. Anda tidak memiliki akses.', null);
  }
  return null; // access granted
}

function hashPassword(password) {
  var rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return rawHash.map(function(b) {
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
}

function getCurrentUser(token) {
  var session = validateSession(token);
  if (!session) return null;
  var sheet = getSheet('01_USERS');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === session.user_id) {
      return {
        user_id: data[i][0],
        username: data[i][1],
        role: data[i][4],
        full_name: data[i][5]
      };
    }
  }
  return null;
}

function generateUUID() {
  return Utilities.getUuid();
}

function changePassword(oldPassword, newPassword, session) {
  if (!session) return respond(false, 'Unauthorized', null);
  var sheet = getSheet('01_USERS');
  if (!sheet) return respond(false, 'Sistem error', null);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var passCol = headers.indexOf('password_hash');
  if (passCol < 0) return respond(false, 'Sistem error: kolom password tidak ditemukan', null);
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === session.user_id) {
      var oldHash = hashPassword(oldPassword);
      if (data[i][passCol] !== oldHash) return respond(false, 'Password lama salah', null);
      var newHash = hashPassword(newPassword);
      sheet.getRange(i+1, passCol+1).setValue(newHash);
      logActivity(session.user_id, 'UPDATE', 'USER', session.user_id, 'Ganti password', null, null);
      return respond(true, 'Password berhasil diubah', null);
    }
  }
  return respond(false, 'User tidak ditemukan', null);
}

function updateProfile(data, session) {
  if (!session) return respond(false, 'Unauthorized', null);
  var sheet = getSheet('01_USERS');
  if (!sheet) return respond(false, 'Sistem error', null);
  var all = sheet.getDataRange().getValues();
  var h = all[0];
  var idCol = h.indexOf('user_id');
  var nameCol = h.indexOf('full_name');
  if (nameCol < 0) return respond(false, 'Sistem error: kolom tidak ditemukan', null);
  for (var i = 1; i < all.length; i++) {
    if (all[i][idCol] === session.user_id) {
      if (data.full_name) sheet.getRange(i+1, nameCol+1).setValue(data.full_name);
      logActivity(session.user_id, 'UPDATE', 'USER', session.user_id, 'Update profil', null, null);
      return respond(true, 'Profil berhasil diperbarui', null);
    }
  }
  return respond(false, 'User tidak ditemukan', null);
}
