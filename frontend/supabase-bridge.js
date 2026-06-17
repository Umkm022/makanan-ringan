// ═══════════════════════════════════════════════════════════════════
// SUPABASE BRIDGE — replaces google.script.run with Supabase SDK
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://byuocfavyxlotmoslihv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nf3b87N70ut3fPWwDeeBUQ_XvJ15S0Q';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dW9jZmF2eXhsb3Rtb3NsaWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwMDI0MCwiZXhwIjoyMDk2ODc2MjQwfQ.Ibnw0g1_7A7t65qtwofI0SihAxkTxnIqgYtherKna8M';
let _supabaseAdmin = null;
try {
  _supabaseAdmin = supabase.createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, storageKey: 'sb-admin-token' } });
} catch(e) { _supabaseAdmin = null; }

// ── Auth helpers ───────────────────────────────────────────────────
const bridge = {
  _supabase,
  
  getSession() {
    return _supabase.auth.getSession();
  },
  
  getCurrentUser() {
    return _supabase.auth.getUser();
  },

  // ── Direct call handler (for auth, setupOwner, etc.) ──────────────
  direct(fnName, ...args) {
    switch (fnName) {
      case 'authenticate':
        return _handleAuthLogin(args[0], args[1]);
      case 'destroySession':
        return _handleLogout();
      case 'checkSystemReady':
        return _handleCheckSystemReady();
      case 'setupOwner':
        return _handleSetupOwner(args[0]);
      case 'validateSession':
        return _handleValidateSession(args[0]);
      case 'getProdukDirect':
        return _handleGetProduk();
      default:
        console.warn('Unknown direct function:', fnName);
        return { success: false, message: 'Unknown function: ' + fnName };
    }
  },

  // ── API handler (for all business actions) ───────────────────────
  handleApi(jsonStr) {
    // Old GAS format: action is flat in the object, e.g. { action: 'getCustomers', token: '...' }
    const data = JSON.parse(jsonStr);
    const action = data.action;
    delete data.action;
    delete data.token;
    return this._routeAction(action, data);
  },

  async _routeAction(action, params) {
    console.log('[BRIDGE] _routeAction:', action, params);
    try {
      const handler = this._actions[action];
      if (!handler) {
        console.warn('[BRIDGE] Unknown action:', action);
        return { success: false, message: 'Unknown action: ' + action };
      }
      console.log('[BRIDGE] Calling handler for:', action);
      const start = Date.now();
      const result = await handler(params);
      console.log('[BRIDGE] Handler completed:', action, Date.now() - start + 'ms', result);
      return result;
    } catch (err) {
      console.error('[BRIDGE] Error:', action, err);
      return { success: false, message: err.message || 'Unknown error' };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════

bridge._actions = {};

// ── Helpers ────────────────────────────────────────────────────────
function ok(data, msg) {
  return { success: true, message: msg || 'OK', data: data || null };
}
function fail(msg) {
  return { success: false, message: msg || 'Error', data: null };
}

// Map DB columns → GAS frontend field names
function mapFields(obj, mapping) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => mapFields(item, mapping));
  const r = {};
  // Copy all original fields
  for (const k of Object.keys(obj)) r[k] = obj[k];
  // Add mapped aliases
  for (const [oldKey, newKey] of Object.entries(mapping)) {
    if (r[newKey] !== undefined && r[oldKey] === undefined) {
      r[oldKey] = r[newKey];
    }
  }
  return r;
}
function dataUrlToBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime = parts[0].match(/:(.*?);/)[1];
  var bstr = atob(parts[1]);
  var n = bstr.length;
  var u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], { type: mime });
}
function parseCustomerNotes(notes) {
  if (!notes) return { photo: null, text: notes || '' };
  var idx = notes.indexOf('__CUSTPHOTO__:');
  if (idx === 0) {
    var after = notes.slice('__CUSTPHOTO__:'.length);
    var sep = after.indexOf('||');
    if (sep >= 0) return { photo: after.slice(0, sep), text: after.slice(sep + 2) };
    return { photo: after, text: '' };
  }
  return { photo: null, text: notes };
}
function customerPhotoUrl(path) {
  if (!path) return null;
  return SUPABASE_URL + '/storage/v1/object/public/customer-photos/' + path;
}

const productMap = {
  produk_id: 'id', kode_produk: 'code', nama_produk: 'name',
  varian: 'variant', harga_jual: 'price', harga_ecer: 'retail_price',
  hpp: 'hpp', kemasan: 'packaging', satuan: 'unit',
  target_display: 'target_display', stok_minimum: 'min_stock',
  kategori_id: 'category_id', deskripsi: 'description', gambar_url: 'image_url'
};
const customerMap = {
  customer_id: 'id', store_name: 'store_name', owner_name: 'owner_name',
  phone: 'phone', address: 'address', kota: 'city', kecamatan: 'district',
  status: 'status', tipe_toko: 'store_type', limit_piutang: 'credit_limit',
  tempo_pembayaran: 'payment_term', notes: 'notes', sales_id: 'sales_id',
  latitude: 'latitude', longitude: 'longitude'
};
const salesMap = {
  sales_id: 'id', sales_code: 'code', full_name: 'full_name',
  phone: 'phone', address: 'address', kota: 'city',
  komisi_rate: 'komisi_rate', target_bulanan: 'target_bulanan', status: 'status'
};
const visitMap = {
  kunjungan_id: 'id', tanggal_kunjungan: 'visit_date',
  waktu_mulai: 'start_time', waktu_selesai: 'end_time',
  foto_toko: 'photos', catatan: 'notes',
};
const settingMap = {
  setting_id: 'id', key: 'key', value: 'value', description: 'description'
};
const productionMap = {
  produksi_id: 'id', produk_id: 'product_id', qty_produksi: 'qty',
  hpp_per_unit: 'hpp_per_unit', total_hpp: 'total_hpp',
  tanggal_produksi: 'production_date', tanggal_expired: 'expiry_date',
  batch: 'batch_number', keterangan: 'notes', created_by: 'created_by',
};
const stockMap = {
  stok_id: 'id', produk_id: 'product_id', batch: 'batch_number',
  qty_masuk: 'qty_in', qty_keluar: 'qty_out', qty_sisa: 'qty_remaining',
  satuan: 'unit',
};
const consignmentMap = {
  konsinyasi_id: 'id', produk_id: 'product_id',
  qty_titip_awal: 'qty_consigned', qty_terjual: 'qty_sold',
  qty_retur: 'qty_returned', qty_sisa: 'qty_remaining',
  target_display: 'target_display',
};

// ── Helper: get user session ───────────────────────────────────────
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (session) return session;
  // Fallback: session not in memory, try to restore from storage
  var savedToken = sessionStorage.getItem('seblak_token');
  var savedRefresh = sessionStorage.getItem('seblak_refresh');
  if (savedToken && savedRefresh) {
    var { data, error } = await _supabase.auth.setSession({ access_token: savedToken, refresh_token: savedRefresh });
    if (!error && data.session) return data.session;
  }
  throw new Error('Not authenticated');
}

// ── Helper: get current user with profile ──────────────────────────
async function getCurrentProfile() {
  const session = await requireAuth();
  // Try auth_id lookup first (fast path)
  const { data: users, error } = await _supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .maybeSingle();
  if (users) return users;
  // Fallback: look up by email (handles missing auth_id)
  if (session.user.email) {
    const { data: byEmail } = await _supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle();
    if (byEmail) return byEmail;
  }
  throw new Error('User profile not found');
}

// ═══════════════════════════════════════════════════════════════════
// AUTH ACTIONS
// ═══════════════════════════════════════════════════════════════════

async function _handleAuthLogin(username, password) {
  // Find user by username
  const { data: users, error: lookupErr } = await _supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (lookupErr || !users) return { success: false, message: 'User not found', data: null };

  // Sign in with Supabase Auth
  const { data, error } = await _supabase.auth.signInWithPassword({
    email: users.email,
    password: password,
  });

  if (error) return { success: false, message: 'Invalid password', data: null };

  // Return in old format
  return {
    success: true,
    message: 'Login berhasil',
    data: {
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        user_id: users.id, // UUID
        username: users.username,
        email: users.email,
        role: users.role,
        full_name: users.full_name,
        phone: users.phone,
        sales_id: users.sales_id,
      },
    },
  };
}

let _loggingOut = false;
async function _handleLogout() {
  if (_loggingOut) return ok(null, 'Logout sedang diproses');
  _loggingOut = true;
  try {
    await _supabase.auth.signOut();
    return ok(null, 'Logout berhasil');
  } finally {
    _loggingOut = false;
  }
}

async function _handleCheckSystemReady() {
  const { count } = await _supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  return { success: true, data: { ready: count > 0 } };
}

async function _handleSetupOwner(params) {
  var email = params.email && params.email.trim() ? params.email.trim() : (params.username + '@seblak.id');
  // Use admin API to bypass password policy & email confirmation
  if (!_supabaseAdmin) return fail('Service role not configured');
  const { data: authData, error: authErr } = await _supabaseAdmin.auth.admin.createUser({
    email: email,
    password: params.password,
    email_confirm: true,
  });
  if (authErr) return fail(authErr.message);

  // Create user record
  const { error: insertErr } = await _supabase.from('users').insert({
    auth_id: authData.user.id,
    username: params.username,
    email: email,
    role: 'OWNER',
    full_name: params.full_name || params.fullName,
    phone: params.phone || null,
    is_active: true,
  });
  if (insertErr) return fail(insertErr.message);
  return ok(null, 'Setup berhasil');
}

async function _handleGetProduk() {
  const { data } = await _supabase.from('products').select('*');
  return ok((data || []).map(p => mapFields(p, productMap)));
}

async function _handleValidateSession(token) {
  // Check if the stored session is still valid
  const { data: { session } } = await _supabase.auth.getSession();
  if (session && session.access_token === token) {
    const profile = await getCurrentProfile();
    return ok({ valid: true, user: profile });
  }
  return { success: false, message: 'Session expired' };
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOMER ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getCustomers'] = async () => {
  const profile = await getCurrentProfile();
  var q = _supabase.from('customers').select('*, sales(full_name)');
  if (profile.role === 'SALES' && profile.sales_id) q = q.eq('sales_id', profile.sales_id);
  const { data } = await q;
  const mapped = (data || []).map(c => {
    const m = mapFields(c, customerMap);
    m.sales_name = c.sales ? c.sales.full_name : null;
    const pn = parseCustomerNotes(m.notes || '');
    if (pn.photo) m.store_photo = customerPhotoUrl(pn.photo);
    return m;
  });
  return ok(mapped);
};

bridge._actions['getCustomer'] = async (params) => {
  const { data } = await _supabase.from('customers').select('*, sales(full_name)').eq('id', params.id).single();
  if (data) {
    const m = mapFields(data, customerMap);
    m.sales_name = data.sales ? data.sales.full_name : null;
    const pn = parseCustomerNotes(m.notes || '');
    if (pn.photo) m.store_photo = customerPhotoUrl(pn.photo);
    return ok(m);
  }
  return ok(null);
};

bridge._actions['createCustomer'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('customers').insert({
    sales_id: d.sales_id || null,
    store_name: d.store_name,
    owner_name: d.owner_name,
    phone: d.phone,
    address: d.address,
    city: d.kota,
    district: d.kecamatan,
    status: d.status || 'AKTIF',
    store_type: d.tipe_toko,
    credit_limit: d.limit_piutang || 0,
    payment_term: d.tempo_pembayaran || 30,
    notes: d.notes,
    latitude: d.latitude || null,
    longitude: d.longitude || null,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Customer berhasil dibuat');
};

bridge._actions['updateCustomer'] = async (params) => {
  const d = params.data || params;
  const id = d.id || params.id;
  const { data, error } = await _supabase.from('customers').update({
    store_name: d.store_name,
    owner_name: d.owner_name,
    phone: d.phone,
    address: d.address,
    city: d.kota,
    district: d.kecamatan,
    store_type: d.tipe_toko,
    credit_limit: d.limit_piutang,
    payment_term: d.tempo_pembayaran,
    notes: d.notes,
    latitude: d.latitude || null,
    longitude: d.longitude || null,
  }).eq('id', id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Customer berhasil diupdate');
};

bridge._actions['deleteCustomer'] = async (params) => {
  // Clean up photo from storage first
  try {
    const client = _supabaseAdmin || _supabase;
    const { data: files } = await client.storage.from('customer-photos').list({ search: params.id });
    if (files?.length) await client.storage.from('customer-photos').remove(files.map(f => f.name));
  } catch(e) { /* ignore storage errors */ }
  const { error } = await _supabase.from('customers').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Customer berhasil dihapus');
};

bridge._actions['ensureCustomerPhotoBucket'] = async () => {
  try {
    const client = _supabaseAdmin || _supabase;
    const { data: buckets } = await client.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'customer-photos')) {
      const admin = _supabaseAdmin;
      if (admin) await admin.storage.createBucket('customer-photos', { public: true });
    }
  } catch(e) { /* ignore */ }
  return ok(null, 'OK');
};

bridge._actions['uploadCustomerPhoto'] = async (params) => {
  const d = params.data || params;
  if (!d.customerId || !d.dataUrl) return fail('Parameter kurang');
  try {
    var ext = d.dataUrl.includes('png') ? 'png' : 'jpg';
    var path = d.customerId + '.' + ext;
    var blob = dataUrlToBlob(d.dataUrl);
    var client = _supabaseAdmin || _supabase;
    await client.storage.from('customer-photos').upload(path, blob, { upsert: true, contentType: 'image/' + ext });
    // Store reference in notes field
    var { data: cust } = await _supabase.from('customers').select('notes').eq('id', d.customerId).single();
    var pn = parseCustomerNotes(cust?.notes || '');
    var newNotes = '__CUSTPHOTO__:' + path + (pn.text ? '||' + pn.text : '');
    await _supabase.from('customers').update({ notes: newNotes }).eq('id', d.customerId);
    return ok(path, 'Foto berhasil diupload');
  } catch(e) { return fail(e.message || 'Gagal upload foto'); }
};

// ═══════════════════════════════════════════════════════════════════
// PRODUCT ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getProduk'] = async () => {
  const { data } = await _supabase.from('products').select('*, categories(*)');
  const mapped = (data || []).map(p => mapFields(p, productMap));
  // Also add kategori_nama
  mapped.forEach(p => {
    if (p.categories) p.kategori_nama = p.categories.name;
  });
  return ok(mapped);
};

bridge._actions['createProduk'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('products').insert({
    category_id: d.kategori_id,
    code: d.kode_produk || d.code,
    name: d.nama_produk || d.name,
    variant: d.varian,
    description: d.deskripsi,
    packaging: d.kemasan,
    unit: d.satuan,
    price: d.harga_jual,
    retail_price: d.harga_ecer,
    hpp: d.hpp,
    target_display: d.target_display,
    min_stock: d.stok_minimum,
    is_active: true,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Produk berhasil dibuat');
};

bridge._actions['updateProduk'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('products').update({
    category_id: d.kategori_id,
    code: d.kode_produk || d.code,
    name: d.nama_produk || d.name,
    variant: d.varian,
    description: d.deskripsi,
    packaging: d.kemasan,
    unit: d.satuan,
    price: d.harga_jual,
    retail_price: d.harga_ecer,
    hpp: d.hpp,
    target_display: d.target_display,
    min_stock: d.stok_minimum,
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Produk berhasil diupdate');
};

bridge._actions['deleteProduk'] = async (params) => {
  const { error } = await _supabase.from('products').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Produk berhasil dihapus');
};

// ═══════════════════════════════════════════════════════════════════
// CATEGORY ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getKategori'] = async () => {
  const { data } = await _supabase.from('categories').select('*');
  return ok(data);
};

bridge._actions['createKategori'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('categories').insert({
    name: d.nama_kategori,
    description: d.deskripsi,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Kategori berhasil dibuat');
};

// ═══════════════════════════════════════════════════════════════════
// SALES ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getSales'] = bridge._actions['getSalesList'] = async () => {
  const { data, error } = await _supabase.from('sales').select('*').order('id', { ascending: false });
  if (error) return fail(error.message);
  const mapped = (data || []).map(function(s) {
    var m = mapFields(s, salesMap);
    m.is_active = s.status !== 'NONAKTIF';
    return m;
  });
  return ok(mapped);
};

bridge._actions['getSalesById'] = async (params) => {
  const { data } = await _supabase.from('sales').select('*').eq('id', params.id).single();
  return ok(data ? mapFields(data, salesMap) : null);
};

bridge._actions['createSales'] = async (params) => {
  const d = params.data || params;
  var password = d.password || 'seblak123';
  var { count } = await _supabase.from('sales').select('*', { count: 'exact', head: true });
  var salesCode = 'SLS-' + String(count + 1).padStart(3, '0');
  var { data: salesData, error: salesErr } = await _supabase.from('sales').insert({
    code: d.sales_code || salesCode,
    full_name: d.full_name,
    phone: d.phone,
    address: d.address,
    city: d.kota,
    komisi_rate: d.komisi_rate,
    target_bulanan: d.target_bulanan,
    status: d.status || 'AKTIF',
  }).select().single();
  if (salesErr) return fail(salesErr.message);
  var baseUsername = (d.username || d.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '') || salesCode.toLowerCase();
  var finalUsername = baseUsername;
  for (var u = 1; u < 100; u++) {
    var { data: dup } = await _supabase.from('users').select('id').eq('username', finalUsername).maybeSingle();
    if (!dup) break;
    finalUsername = baseUsername + '_' + u;
  }
  var email = d.email || finalUsername + '@seblak.id';
  var authId = null;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
    var { data: authData, error: authErr } = await _supabase.auth.signUp({ email: email, password: password });
    if (!authErr) { authId = authData.user.id; break; }
    if (!authErr.message?.toLowerCase().includes('rate')) return fail(authErr.message);
  }
  var { error: userErr } = await _supabase.from('users').insert({
    auth_id: authId,
    username: finalUsername,
    email: email,
    role: 'SALES',
    full_name: d.full_name,
    sales_id: salesData.sales_id,
    is_active: true,
  });
  if (userErr) return fail(userErr.message);
  var msg = 'Sales berhasil dibuat';
  if (!authId) msg += '. Akun login gagal dibuat (rate limit), silakan coba lagi nanti.';
  return ok(salesData, msg);
};

bridge._actions['createSalesAuth'] = async (params) => {
  const d = params.data || params;
  if (!d.sales_id || !d.username || !d.password) return fail('sales_id, username, password wajib');
  var { data: salesData, error: salesErr } = await _supabase.from('sales').select('*').eq('id', d.sales_id).maybeSingle();
  if (salesErr) return fail(salesErr.message);
  if (!salesData) return fail('Sales tidak ditemukan');
  var { data: existingUser } = await _supabase.from('users').select('id').eq('sales_id', d.sales_id).maybeSingle();
  if (existingUser) return fail('Sales sudah memiliki akun login');
  var { data: dup } = await _supabase.from('users').select('id').eq('username', d.username).maybeSingle();
  if (dup) return fail('Username sudah digunakan');
  if (!_supabaseAdmin) return fail('Service role not configured');
  var email = d.email || d.username + '@seblak.id';
  const { data: authData, error: authErr } = await _supabaseAdmin.auth.admin.createUser({
    email: email,
    password: d.password,
    email_confirm: true,
  });
  if (authErr) return fail(authErr.message);
  var { error: userErr } = await _supabase.from('users').insert({
    auth_id: authData.user.id,
    username: d.username,
    email: email,
    role: 'SALES',
    full_name: salesData.full_name || d.full_name,
    sales_id: d.sales_id,
    is_active: true,
  });
  if (userErr) return fail(userErr.message);
  return ok(null, 'Akun login berhasil dibuat');
};

bridge._actions['updateSales'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('sales').update({
    full_name: d.full_name,
    phone: d.phone,
    address: d.address,
    city: d.kota,
    komisi_rate: d.komisi_rate,
    target_bulanan: d.target_bulanan,
    status: d.status,
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Sales berhasil diupdate');
};

bridge._actions['deleteSales'] = async (params) => {
  // Soft delete: nonaktifkan sales + user
  await _supabase.from('users').update({ is_active: false }).eq('sales_id', params.id);
  const { error } = await _supabase.from('sales').update({ status: 'NONAKTIF' }).eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Sales berhasil dinonaktifkan');
};
bridge._actions['activateSales'] = async (params) => {
  await _supabase.from('users').update({ is_active: true }).eq('sales_id', params.id);
  const { error } = await _supabase.from('sales').update({ status: 'AKTIF' }).eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Sales berhasil diaktifkan');
};
bridge._actions['hardDeleteSales'] = async (params) => {
  // Hapus permanen: user + sales record + auth user
  var { data: userData } = await _supabase.from('users').select('auth_id').eq('sales_id', params.id).maybeSingle();
  await _supabase.from('users').delete().eq('sales_id', params.id);
  const { error } = await _supabase.from('sales').delete().eq('id', params.id);
  if (error) return fail(error.message);
  // Hapus dari Supabase Auth (pakai service_role key)
  if (userData?.auth_id && _supabaseAdmin) {
    await _supabaseAdmin.auth.admin.deleteUser(userData.auth_id);
  }
  return ok(null, 'Sales berhasil dihapus permanen');
};

// ═══════════════════════════════════════════════════════════════════
// VISIT / KUNJUNGAN ACTIONS  (partial — main ones)
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getAllKunjungan'] = async (params) => {
  const d = params?.data || params;
  let query = _supabase.from('visits').select('*, customers(*), sales(*)');
  if (d?.status) query = query.eq('status', d.status);
  if (d?.sales_id) query = query.eq('sales_id', d.sales_id);
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getRiwayatKunjungan'] = async (params) => {
  const d = params?.data || params;
  const { data } = await _supabase
    .from('visits')
    .select('*, sales(full_name)')
    .eq('customer_id', d.customer_id)
    .order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getRiwayatSales'] = async (params) => {
  const d = params?.data || params;
  const { data } = await _supabase
    .from('visits')
    .select('*, customers(store_name)')
    .eq('sales_id', d.sales_id)
    .order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getAllRiwayatKunjungan'] = async (params) => {
  const d = params?.data || params;
  var q = _supabase.from('visits').select('*, customers(*), sales(*)');
  if (d && d.salesId) q = q.eq('sales_id', d.salesId);
  const { data } = await q.order('created_at', { ascending: false });
  return ok((data || []).map(function(v){ return mapFields(v, visitMap); }));
};

bridge._actions['getDraftKunjungan'] = async () => {
  const profile = await getCurrentProfile();
  if (!profile.sales_id) return ok([]);
  const { data } = await _supabase.from('visits').select('id, customer_id, status, visit_date, start_time, customers(store_name)').eq('sales_id', profile.sales_id).eq('status', 'DRAFT').order('created_at', { ascending: false }).limit(20);
  return ok((data || []).map(function(v){
    var c = v.customers || {};
    return { kunjungan_id: v.id, customer_id: v.customer_id, customer_nama: c.store_name || v.customer_id, status: v.status, tanggal: v.visit_date, jam_mulai: v.start_time };
  }));
};

bridge._actions['startKunjungan'] = async (params) => {
  const d = params.data || params;
  const profile = await getCurrentProfile();
  const { data: customer } = await _supabase.from('customers').select('*, sales(full_name)').eq('id', d.customerId).single();
  if (!customer) return fail('Customer tidak ditemukan');
  if (profile.role === 'SALES' && customer.sales_id !== profile.sales_id) return fail('Akses ditolak: bukan customer Anda');
  const { data: visit, error } = await _supabase.from('visits').insert({
    customer_id: customer.id, sales_id: customer.sales_id,
    visit_date: new Date().toISOString().substring(0, 10), start_time: new Date().toTimeString().substring(0, 8),
    status: 'DRAFT', latitude: d.latitude || '', longitude: d.longitude || '',
  }).select().single();
  if (error) return fail(error.message);
  const { data: stokAll } = await _supabase.from('consignment_stock')      .select('*').eq('customer_id', customer.id);
  const { data: allProduk } = await _supabase.from('products').select('*').eq('is_active', true);
  var produk = (allProduk || []).map(function(p) {
    var sk = (stokAll || []).filter(function(s) { return s.product_id === p.id; })[0] || {};
    return { produk_id: p.id, nama_produk: p.name, stok_awal: sk.qty_remaining || 0, target_display: sk.target_display || p.target_display || 20, harga_jual: p.price || 0, hpp: p.hpp || 0 };
  });
  return ok({ kunjungan_id: visit.id, customer: { customer_id: customer.id, store_name: customer.store_name, owner_name: customer.owner_name, address: customer.address, kota: customer.city }, produk: produk, last_visit: customer.last_visit });
};

bridge._actions['saveSisaStok'] = async (params) => {
  const d = params.data || params;
  var items = d.items || [];
  if (!items.length) return fail('Tidak ada data produk');
  var totalTerjual = 0, totalRetur = 0, totalInvoice = 0;
  await _supabase.from('visit_details').delete().eq('visit_id', d.kunjunganId);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var terjual = Math.max(0, item.stok_awal - item.sisa_fisik - (item.rusak || 0) - (item.retur || 0));
    var restock = Math.max(0, item.target_display - item.sisa_fisik);
    var subtotal = terjual * item.harga_jual;
    var { error } = await _supabase.from('visit_details').insert({
      visit_id: d.kunjunganId, product_id: item.produk_id, initial_stock: item.stok_awal, remaining: item.sisa_fisik,
      damaged: item.rusak || 0, returned: item.retur || 0, sold: terjual, target_display: item.target_display,
      restock_recommendation: restock, price: item.harga_jual, subtotal: subtotal,
    });
    if (error) return fail(error.message);
    totalTerjual += terjual; totalRetur += (item.retur || 0); totalInvoice += subtotal;
  }
  await _supabase.from('visits').update({ total_sold: totalTerjual, total_returned: totalRetur, total_invoice: totalInvoice }).eq('id', d.kunjunganId);
  return ok({ total_terjual: totalTerjual, total_retur: totalRetur, total_invoice: totalInvoice });
};

bridge._actions['resumeKunjungan'] = async (params) => {
  const d = params.data || params;
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', d.kunjunganId).single();
  if (!visit || visit.status !== 'DRAFT') return fail('Kunjungan tidak ditemukan atau bukan DRAFT');
  const { data: details } = await _supabase.from('visit_details').select('*').eq('visit_id', visit.id);
  const { data: allProduk } = await _supabase.from('products').select('*');
  var customer = visit.customers ? { customer_id: visit.customers.id, store_name: visit.customers.store_name, owner_name: visit.customers.owner_name, address: visit.customers.address, kota: visit.customers.city } : {};
  var produk = (details || []).map(function(d) {
    var pr = (allProduk || []).filter(function(p) { return p.id === d.product_id; })[0] || {};
    return { produk_id: d.product_id, nama_produk: pr.name || d.product_id, stok_awal: d.initial_stock, sisa_fisik: d.remaining, rusak: d.damaged, retur: d.returned, terjual: d.sold, target_display: d.target_display, rekomendasi_restock: d.restock_recommendation, harga_jual: d.price };
  });
  return ok({ kunjungan_id: visit.id, customer: customer, produk: produk, last_visit: visit.visit_date });
};

bridge._actions['finalizeKunjungan'] = async (params) => {
  const d = params.data || params;
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', d.kunjunganId).single();
  if (!visit) return fail('Kunjungan tidak ditemukan');
  if (visit.status !== 'DRAFT') return fail('Kunjungan sudah difinalisasi');
  var customerId = visit.customer_id, salesId = visit.sales_id, invoiceTotal = visit.total_invoice || 0;
  const { data: details } = await _supabase.from('visit_details').select('*').eq('visit_id', visit.id);
  var paymentAmount = parseInt(d.paymentAmount) || 0;
  var paymentMethod = d.paymentMethod || 'TUNAI';
  for (var vd of details || []) {
    if (vd.sold > 0 || vd.damaged > 0 || vd.returned > 0) {
      var { data: existing } = await _supabase.from('consignment_stock').select('*').eq('customer_id', customerId).eq('product_id', vd.product_id).single();
      if (existing) { await _supabase.from('consignment_stock').update({ qty_sold: (existing.qty_sold || 0) + (vd.sold || 0), qty_returned: (existing.qty_returned || 0) + (vd.returned || 0), qty_damaged: (existing.qty_damaged || 0) + (vd.damaged || 0), qty_remaining: vd.remaining }).eq('id', existing.id); }
      else { await _supabase.from('consignment_stock').insert({ customer_id: customerId, product_id: vd.product_id, sales_id: salesId, qty_consigned: 0, qty_sold: vd.sold, qty_returned: vd.returned, qty_damaged: vd.damaged, qty_remaining: vd.remaining, target_display: vd.target_display }); }
    }
    if (vd.returned > 0) {
      await _supabase.from('returns').insert({ visit_id: visit.id, customer_id: customerId, sales_id: salesId, product_id: vd.product_id, qty: vd.returned, reason: 'TIDAK_LAKU', condition: 'MASUK_GUDANG' });
      var { data: gudang } = await _supabase.from('warehouse_stock').select('*').eq('product_id', vd.product_id).single();
      if (gudang) { await _supabase.from('warehouse_stock').update({ qty_in: (gudang.qty_in || 0) + (vd.returned || 0), qty_remaining: (gudang.qty_remaining || 0) + (vd.returned || 0) }).eq('id', gudang.id); }
      else { await _supabase.from('warehouse_stock').insert({ product_id: vd.product_id, qty_in: vd.returned, qty_out: 0, qty_remaining: vd.returned, unit: 'PCS' }); }
    }
  }
  var invoiceId = null, paymentId = null;
  if (invoiceTotal > 0) {
    var tempo = 30;
    var { data: cust } = await _supabase.from('customers').select('payment_term').eq('id', customerId).single();
    if (cust?.payment_term) tempo = parseInt(cust.payment_term) || 30;
    var jatuhTempo = new Date(); jatuhTempo.setDate(jatuhTempo.getDate() + tempo);
    var invStatus = paymentAmount >= invoiceTotal ? 'PAID' : 'OPEN';
    var { data: inv, error: invErr } = await _supabase.from('invoices').insert({ visit_id: visit.id, customer_id: customerId, sales_id: salesId, total: invoiceTotal, status: invStatus, invoice_date: new Date().toISOString(), due_date: jatuhTempo.toISOString() }).select().single();
    if (!invErr && inv) {
      invoiceId = inv.id;
      for (var dd of details || []) {
        if (dd.sold > 0) {
          var { data: prod } = await _supabase.from('products').select('hpp').eq('id', dd.product_id).single();
          var hpp = prod?.hpp || 0;
          await _supabase.from('invoice_details').insert({ invoice_id: inv.id, product_id: dd.product_id, qty: dd.sold, price: dd.price, subtotal: dd.subtotal, hpp: hpp, profit: dd.subtotal - (dd.sold * hpp) });
        }
      }
      if (paymentAmount > 0) {
        var remainingAfter = Math.max(0, invoiceTotal - paymentAmount);
        var { data: pay } = await _supabase.from('payments').insert({ invoice_id: inv.id, customer_id: customerId, sales_id: salesId, amount: paymentAmount, method: paymentMethod, remaining_after: remainingAfter, payment_date: new Date().toISOString(), status: 'VALID' }).select().single();
        if (pay) paymentId = pay.id;
      }
      var remaining = Math.max(0, invoiceTotal - paymentAmount);
      if (remaining > 0) {
        await _supabase.from('receivables').insert({ invoice_id: inv.id, customer_id: customerId, sales_id: salesId, total: invoiceTotal, remaining: remaining, status: paymentAmount > 0 ? 'PARTIAL' : 'OPEN', invoice_date: new Date().toISOString(), due_date: jatuhTempo.toISOString() });
      }
      if (invStatus === 'PAID') {
        hitungKomisi(inv.id);
      }
    }
  }
  await _supabase.from('visits').update({ status: 'COMPLETED', end_time: new Date().toTimeString().substring(0, 8) }).eq('id', visit.id);
  await _supabase.from('customers').update({ last_visit: new Date().toISOString() }).eq('id', customerId);
  return ok({ kunjungan_id: visit.id, invoice_id: invoiceId, payment_id: paymentId, total_terjual: visit.total_sold, total_invoice: invoiceTotal, total_paid: paymentAmount }, 'Kunjungan berhasil difinalisasi');
};

bridge._actions['cancelKunjungan'] = async (params) => {
  const d = params.data || params;
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*').eq('id', d.kunjunganId).single();
  if (!visit) return fail('Kunjungan tidak ditemukan');
  if (session.role === 'SALES' && visit.sales_id !== (session.user?.user_metadata?.sales_id || '')) return fail('Akses ditolak');
  if (visit.status === 'DRAFT') { await _supabase.from('visits').update({ status: 'CANCELLED', end_time: new Date().toTimeString().substring(0, 8) }).eq('id', d.kunjunganId); return ok(null, 'Kunjungan draft dibatalkan'); }
  if (visit.status === 'COMPLETED') {
    if (visit.total_invoice > 0) {
      var { data: invoices } = await _supabase.from('invoices').select('*').eq('visit_id', visit.id);
      for (var inv of invoices || []) { await _supabase.from('invoices').update({ status: 'VOID' }).eq('id', inv.id); await _supabase.from('receivables').update({ status: 'VOID' }).eq('invoice_id', inv.id); }
    }
    await _supabase.from('visits').update({ status: 'CANCELLED', end_time: new Date().toTimeString().substring(0, 8) }).eq('id', d.kunjunganId);
    return ok(null, 'Kunjungan dibatalkan, invoice & piutang dibatalkan');
  }
  return fail('Kunjungan sudah ' + visit.status + ', tidak bisa dibatalkan');
};

bridge._actions['restockFromKunjungan'] = async (params) => {
  const d = params.data || params;
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', d.kunjunganId).single();
  if (!visit || visit.status !== 'COMPLETED') return fail('Kunjungan harus difinalisasi dulu');
  const { data: details } = await _supabase.from('visit_details').select('*').eq('visit_id', visit.id);
  var items = (details || []).filter(function(d) { return d.restock_recommendation > 0; }).map(function(d) { return { product_id: d.product_id, qty: d.restock_recommendation }; });
  if (!items.length) return fail('Tidak ada rekomendasi restock');
  var { data: shp, error: shpErr } = await _supabase.from('shipments').insert({ customer_id: visit.customer_id, sales_id: visit.sales_id, type: 'RESTOCK', status: 'SHIPPED', total_items: items.length, total_qty: items.reduce(function(s, i) { return s + i.qty; }, 0), notes: 'Restock otomatis dari kunjungan ' + visit.id }).select().single();
  if (shpErr) return fail(shpErr.message);
  for (var item of items) {
    await _supabase.from('shipment_details').insert({ shipment_id: shp.id, product_id: item.product_id, qty: item.qty });
    var { data: cs } = await _supabase.from('consignment_stock').select('*').eq('customer_id', visit.customer_id).eq('product_id', item.product_id).single();
    if (cs) { await _supabase.from('consignment_stock').update({ qty_consigned: (cs.qty_consigned || 0) + item.qty, qty_remaining: (cs.qty_remaining || 0) + item.qty }).eq('id', cs.id); }
    else { await _supabase.from('consignment_stock').insert({ customer_id: visit.customer_id, product_id: item.product_id, sales_id: visit.sales_id, qty_consigned: item.qty, qty_sold: 0, qty_remaining: item.qty }); }
  }
  return ok(null, 'Restock berhasil');
};

bridge._actions['uploadFotoToko'] = bridge._actions['uploadFotoKunjungan'] = async (params) => {
  const d = params.data || params;
  var kunjunganId = d.kunjunganId, tipe = d.tipe || 'sebelum', dataUrl = d.dataUrl;
  if (!kunjunganId || !dataUrl) return fail('Parameter kurang');
  var { data: visit } = await _supabase.from('visits').select('photos').eq('id', kunjunganId).single();
  var arr = []; try { arr = JSON.parse(visit?.photos || '[]'); } catch(e) { arr = []; } if (!Array.isArray(arr)) arr = [];
  var entry = { url: dataUrl }; if (d.latitude && d.longitude) { entry.lat = d.latitude; entry.lng = d.longitude; }
  if (tipe === 'sesudah') { arr[1] = entry; if (arr.length < 2) arr.push(entry); } else { arr[0] = entry; if (arr.length < 1) arr.push(entry); }
  await _supabase.from('visits').update({ photos: JSON.stringify(arr) }).eq('id', kunjunganId);
  return ok(null, 'Foto berhasil diupload');
};

// ═══════════════════════════════════════════════════════════════════
// STOCK ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getStokGudang'] = async () => {
  const { data } = await _supabase.from('warehouse_stock').select('*, products(*)');
  const mapped = (data || []).map(s => mapFields(s, stockMap));
  return ok(mapped);
};

bridge._actions['updateStokGudang'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('warehouse_stock').update({
    batch_number: d.batch_number,
    qty_in: d.qty_masuk,
    qty_out: d.qty_keluar,
    qty_remaining: d.qty_sisa,
    unit: d.satuan,
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Stok berhasil diupdate');
};

bridge._actions['deleteStokGudang'] = async (params) => {
  const { error } = await _supabase.from('warehouse_stock').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Stok berhasil dihapus');
};
bridge._actions['getStokById'] = async (params) => {
  const { data } = await _supabase.from('warehouse_stock').select('*, products(*)').eq('id', params.id).maybeSingle();
  return ok(data);
};
bridge._actions['deleteStokKonsinyasi'] = async (params) => {
  const { error } = await _supabase.from('consignment_stock').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Stok konsinyasi berhasil dihapus');
};
bridge._actions['getStokKonsinyasiById'] = async (params) => {
  const { data } = await _supabase.from('consignment_stock').select('*, customers(*), sales(*), products(*)').eq('id', params.id).maybeSingle();
  return ok(data ? mapFields(data, consignmentMap) : null);
};

bridge._actions['checkCustomerStock'] = async (params) => {
  const d = params?.data || params;
  if (!d.customer_id) return ok(false);
  const { count } = await _supabase.from('consignment_stock')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', d.customer_id);
  return ok({ hasStock: (count || 0) > 0 });
};

bridge._actions['getStokKonsinyasi'] = async (params) => {
  const d = params?.data || params;
  let query = _supabase.from('consignment_stock').select('*, customers(*), sales(*), products(*)');
  if (d?.sales_id) query = query.eq('sales_id', d.sales_id);
  const { data } = await query;
  const mapped = (data || []).map(s => mapFields(s, consignmentMap));
  return ok(mapped);
};

bridge._actions['updateStokKonsinyasi'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('consignment_stock').update({
    qty_consigned: d.qty_titip,
    qty_sold: d.qty_terjual,
    qty_returned: d.qty_retur,
    qty_remaining: d.qty_sisa,
    target_display: d.target_display,
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Stok konsinyasi berhasil diupdate');
};

bridge._actions['deleteStokKonsinyasi'] = async (params) => {
  const d = params.data || params;
  const { error } = await _supabase.from('consignment_stock').delete().eq('id', d.id);
  if (error) return fail(error.message);
  return ok(null, 'Stok konsinyasi berhasil dihapus');
};

bridge._actions['getKpiSummary'] = async (params) => {
  function _f(n){ return Math.round(n || 0).toLocaleString('id-ID'); }
  var d = params.data || params;
  var profile = await getCurrentProfile();
  var type = d.type || 'piutang';
  var today = new Date().toISOString().substring(0, 10);
  var monthStart = today.substring(0, 7) + '-01';

  if (type === 'piutang') {
    var q = _supabase.from('receivables').select('*, customers(store_name)');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [], total = 0;
    (data || []).filter(function(r){ return r.status !== 'PAID'; }).forEach(function(r){
      rows.push([(r.customers?.store_name || r.customer_id || '-'), 'Rp ' + _f(r.remaining || 0)]);
      total += (r.remaining || 0);
    });
    return ok({ headers: ['Customer', 'Sisa'], rows: rows, total: total });
  }

  if (type === 'omzet-bulan') {
    var q = _supabase.from('invoices').select('invoice_date, total, customers(store_name)').eq('status', 'PAID').gte('invoice_date', monthStart).lte('invoice_date', today);
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q.order('invoice_date', { ascending: false });
    var rows = [], total = 0;
    (data || []).forEach(function(i){
      rows.push([(i.invoice_date || '').substring(0, 10), i.customers?.store_name || '-', 'Rp ' + _f(i.total || 0)]);
      total += (i.total || 0);
    });
    return ok({ headers: ['Tanggal', 'Customer', 'Total'], rows: rows, total: total });
  }

  if (type === 'omzet-hari') {
    var q = _supabase.from('invoices').select('invoice_date, total, customers(store_name)').eq('status', 'PAID').gte('invoice_date', today).lte('invoice_date', today);
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q.order('created_at', { ascending: false });
    var rows = [], total = 0;
    (data || []).forEach(function(i){
      rows.push([i.customers?.store_name || '-', 'Rp ' + _f(i.total || 0)]);
      total += (i.total || 0);
    });
    return ok({ headers: ['Customer', 'Total'], rows: rows, total: total });
  }

  if (type === 'toko-aktif') {
    var q = _supabase.from('customers').select('store_name, city, status, visit_count, total_omzet');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [], total = 0;
    (data || []).forEach(function(c){
      rows.push([c.store_name || '-', c.city || '-', c.visit_count || 0, 'Rp ' + _f(c.total_omzet || 0)]);
      total++;
    });
    return ok({ headers: ['Nama Toko', 'Kota', 'Kunjungan', 'Total Omzet'], rows: rows, total: total });
  }

  if (type === 'kunjungan') {
    var q = _supabase.from('visits').select('visit_date, customers(store_name)');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [];
    (data || []).filter(function(v){ return (v.visit_date || '').substring(0, 10) === today; }).forEach(function(v){
      rows.push([(v.visit_date || '').substring(0, 10), v.customers?.store_name || '-']);
    });
    return ok({ headers: ['Tanggal', 'Toko'], rows: rows });
  }

  if (type === 'komisi-ready' || type === 'komisi-paid') {
    var st = type === 'komisi-paid' ? 'PAID' : 'READY,UNPAID';
    var q = _supabase.from('commissions').select('amount, status, created_at, customers(store_name)');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var statuses = st.split(',');
    var rows = [], total = 0;
    (data || []).filter(function(c){ return statuses.indexOf(c.status) >= 0; }).forEach(function(c){
      rows.push([c.customers?.store_name || '-', 'Rp ' + _f(c.amount || 0), c.status]);
      total += (c.amount || 0);
    });
    return ok({ headers: ['Customer', 'Jumlah', 'Status'], rows: rows, total: total });
  }

  if (type === 'invoice-baru') {
    var q = _supabase.from('invoices').select('invoice_date, total, customers(store_name)');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [], total = 0;
    (data || []).filter(function(i){ return i.status === 'UNPAID' || i.status === 'OVERDUE'; }).forEach(function(i){
      rows.push([(i.invoice_date || '').substring(0, 10), i.customers?.store_name || '-', 'Rp ' + _f(i.total || 0)]);
      total += (i.total || 0);
    });
    return ok({ headers: ['Tanggal', 'Customer', 'Total'], rows: rows, total: total });
  }

  if (type === 'komisi') {
    var q = _supabase.from('commissions').select('amount, status, created_at, customers(store_name)');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [], total = 0;
    (data || []).forEach(function(c){
      rows.push([(c.created_at || '').substring(0, 10), c.customers?.store_name || '-', 'Rp ' + _f(c.amount || 0), c.status]);
      total += (c.amount || 0);
    });
    return ok({ headers: ['Tanggal', 'Customer', 'Jumlah', 'Status'], rows: rows, total: total });
  }

  if (type === 'laba-kotor' || type === 'laba-bersih') {
    var q = _supabase.from('invoices').select('invoice_date, total, customers(store_name)').eq('status', 'PAID');
    if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
    var { data } = await q;
    var rows = [], total = 0;
    (data || []).forEach(function(i){
      rows.push([(i.invoice_date || '').substring(0, 10), i.customers?.store_name || '-', 'Rp ' + _f(i.total || 0)]);
      total += (i.total || 0);
    });
    return ok({ headers: ['Tanggal', 'Customer', 'Total'], rows: rows, total: total });
  }

  return fail('Tipe KPI tidak dikenal: ' + type);
};

// ═══════════════════════════════════════════════════════════════════
// INVOICE / PIUTANG ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getInvoices'] = async (params) => {
  const d = params?.data || params;
  let query = _supabase.from('invoices').select('*, customers(*), sales(*)');
  if (d?.customer_id) query = query.eq('customer_id', d.customer_id);
  if (d?.sales_id) query = query.eq('sales_id', d.sales_id);
  if (!d?.sales_id) {
    var profile = await getCurrentProfile();
    if (profile.role === 'SALES') query = query.eq('sales_id', profile.sales_id);
  }
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getPiutang'] = async () => {
  let query = _supabase.from('receivables').select('*, customers(*), sales(*), invoices(*)');
  var profile = await getCurrentProfile();
  if (profile.role === 'SALES') query = query.eq('sales_id', profile.sales_id);
  const { data } = await query;
  return ok(data);
};

bridge._actions['getAgingPiutang'] = async () => {
  let query = _supabase.from('receivables').select('*, customers(*), sales(*)');
  var profile = await getCurrentProfile();
  if (profile.role === 'SALES') query = query.eq('sales_id', profile.sales_id);
  const { data } = await query;
  var result = { '0-30': 0, '31-60': 0, '61-90': 0, '>90': 0, total: 0 };
  (data || []).filter(function(p){ return p.status !== 'PAID'; }).forEach(function(p){
    var days = p.due_date ? Math.floor((new Date() - new Date(p.due_date)) / (1000 * 60 * 60 * 24)) : 0;
    var sisa = p.remaining || 0;
    if (days <= 0) return;
    if (days <= 30) result['0-30'] += sisa;
    else if (days <= 60) result['31-60'] += sisa;
    else if (days <= 90) result['61-90'] += sisa;
    else result['>90'] += sisa;
    result.total += sisa;
  });
  return ok(result);
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['createPembayaran'] = async (params) => {
  const d = params.data || params;
  if (!d.piutang_id) return fail('piutang_id diperlukan');
  var { data: recv, error: recvErr } = await _supabase.from('receivables').select('*').eq('id', d.piutang_id).single();
  if (recvErr) return fail('Data piutang tidak ditemukan: ' + recvErr.message);
  var newRemaining = (recv.remaining || 0) - (d.amount || 0);
  if (newRemaining < 0) return fail('Jumlah bayar melebihi sisa piutang');
  var { data: payment, error: payErr } = await _supabase.from('payments').insert({
    invoice_id: recv.invoice_id,
    customer_id: recv.customer_id,
    sales_id: recv.sales_id,
    amount: d.amount,
    method: d.metode,
    remaining_after: newRemaining,
    payment_date: new Date().toISOString(),
    status: 'VALID',
  }).select().single();
  if (payErr) return fail(payErr.message);
  var newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';
  await _supabase.from('receivables').update({ remaining: newRemaining, status: newStatus }).eq('id', d.piutang_id);
  if (newStatus === 'PAID' && recv.invoice_id) {
    await _supabase.from('invoices').update({ status: 'PAID' }).eq('id', recv.invoice_id);
    hitungKomisi(recv.invoice_id);
  }
  return ok(payment, 'Pembayaran berhasil');
};

bridge._actions['setorPembayaran'] = async (params) => {
  const d = params?.data || params;
  if (!d.pembayaran_id) return fail('pembayaran_id diperlukan');
  const { data: payment, error } = await _supabase.from('payments').update({
    status: 'MENUNGGU',
  }).eq('id', d.pembayaran_id).select('*, customers(store_name)').single();
  if (error) return fail(error.message);
  const { data: owners } = await _supabase.from('users').select('id').eq('role', 'OWNER');
  if (owners && owners.length > 0) {
    var namaToko = payment?.customers?.store_name || 'Sales';
    var jumlah = payment?.amount || 0;
    for (var o of owners) {
      await _supabase.from('notifications').insert({
        user_id: o.id, tipe: 'SETORAN',
        judul: '💰 Setoran Baru',
        pesan: 'Setoran dari ' + namaToko + ': Rp ' + jumlah,
        link: '?page=invoice&view=setor',
        is_read: false, created_at: new Date(),
      });
    }
  }
  return ok(payment, 'Pembayaran menunggu konfirmasi owner');
};

bridge._actions['getPembayaranSales'] = async (params) => {
  const profile = await getCurrentProfile();
  if (!profile.sales_id) return fail('Sales ID tidak ditemukan');
  const { data } = await _supabase.from('payments').select('*, customers(*)').eq('sales_id', profile.sales_id).order('created_at', { ascending: false });
  const result = (data || []).map(function(p) {
    const c = p.customers || {};
    var st = 'BELUM_DISETOR';
    if (p.status === 'MENUNGGU') st = 'MENUNGGU';
    else if (p.status === 'DIKONFIRMASI') st = 'SUDAH_DISETOR';
    return {
      pembayaran_id: p.id,
      invoice_id: p.invoice_id,
      customer_nama: c.store_name || c.name || p.customer_id,
      jumlah_bayar: p.amount || 0,
      metode_bayar: p.method || '',
      tanggal: p.payment_date || p.created_at || '',
      status_penyetoran: st,
      tanggal_penyetoran: st === 'SUDAH_DISETOR' ? (p.updated_at || null) : null,
    };
  });
  return ok(result);
};

bridge._actions['konfirmasiSetoran'] = async (params) => {
  const d = params?.data || params;
  if (!d.pembayaran_id) return fail('pembayaran_id diperlukan');
  const { data, error } = await _supabase.from('payments').update({
    status: 'DIKONFIRMASI',
  }).eq('id', d.pembayaran_id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Setoran dikonfirmasi');
};

// ═══════════════════════════════════════════════════════════════════
// COMMISSION ACTIONS
// ═══════════════════════════════════════════════════════════════════

async function hitungKomisi(invoiceId) {
  var { data: inv, error: invErr } = await _supabase.from('invoices').select('*, sales(*)').eq('id', invoiceId).single();
  if (invErr || !inv) return;
  if (inv.status !== 'PAID') return;
  var { data: dup } = await _supabase.from('commissions').select('id').eq('invoice_id', invoiceId);
  if (dup && dup.length > 0) return;
  var rate = inv.sales?.komisi_rate;
  if (!rate) {
    var { data: setting } = await _supabase.from('settings').select('value').eq('key', 'komisi_rate_default').maybeSingle();
    rate = setting ? parseFloat(setting.value) : 5;
  }
  var amount = Math.round(inv.total * rate / 100);
  var d = new Date(inv.invoice_date || inv.created_at);
  await _supabase.from('commissions').insert({
    sales_id: inv.sales_id,
    invoice_id: inv.id,
    customer_id: inv.customer_id,
    total_invoice: inv.total,
    rate: rate,
    amount: amount,
    period_month: d.getMonth() + 1,
    period_year: d.getFullYear(),
    status: 'READY',
  });
}

bridge._actions['getKomisi'] = async (params) => {
  const d = params?.data || params || {};
  let query = _supabase.from('commissions').select('*, customers(*), sales(*), invoices(*)');
  if (d?.sales_id) query = query.eq('sales_id', d.sales_id);
  if (d?.status) query = query.eq('status', d.status);
  if (d?.date_from) query = query.gte('created_at', d.date_from);
  if (d?.date_to) query = query.lte('created_at', d.date_to + 'T23:59:59');
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['cairkanKomisi'] = async (params) => {
  const d = params?.data || params;
  var ids = d.komisiIds || (d.id ? [d.id] : []);
  if (ids.length === 0) return fail('ID komisi tidak ditemukan');
  const { data, error } = await _supabase.from('commissions').update({
    status: 'PAID',
    paid_date: new Date().toISOString(),
  }).in('id', ids).select();
  if (error) return fail(error.message);
  return ok(data, 'Komisi berhasil dicairkan');
};

// ═══════════════════════════════════════════════════════════════════
// EXPENSE (BIAYA) ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getBiaya'] = async () => {
  const { data } = await _supabase.from('expenses').select('*').order('date', { ascending: false });
  return ok(data);
};

bridge._actions['createBiaya'] = async (params) => {
  const d = params.data || params;
  const session = await requireAuth();
  const { data, error } = await _supabase.from('expenses').insert({
    category: d.kategori,
    description: d.deskripsi,
    amount: d.jumlah,
    date: d.tanggal || new Date().toISOString(),
    method: d.metode,
    notes: d.catatan,
    created_by: session.user.id,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Biaya berhasil dicatat');
};

bridge._actions['deleteBiaya'] = async (params) => {
  const { error } = await _supabase.from('expenses').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Biaya berhasil dihapus');
};

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getProduksi'] = async () => {
  const { data } = await _supabase.from('productions').select('*, products(*), users(full_name)');
  const mapped = (data || []).map(p => mapFields(p, productionMap));
  return ok(mapped);
};

bridge._actions['createProduksi'] = async (params) => {
  const profile = await getCurrentProfile();
  const d = params.data || params;
  const qty = parseFloat(d.qty_produksi) || 0;
  const hpp = parseFloat(d.hpp_per_unit) || 0;
  const { data, error } = await _supabase.from('productions').insert({
    product_id: d.produk_id,
    batch_number: d.batch_number || '',
    qty: qty,
    hpp_per_unit: hpp,
    total_hpp: d.total_hpp || (qty * hpp),
    production_date: d.tanggal_produksi || new Date().toISOString(),
    expiry_date: d.tanggal_expired || null,
    notes: d.keterangan || '',
    created_by: profile.id,
  }).select().single();
  if (error) return fail(error.message);
  // Update warehouse stock
  var { data: gudang } = await _supabase.from('warehouse_stock').select('*').eq('product_id', d.produk_id).maybeSingle();
  if (gudang) {
    await _supabase.from('warehouse_stock').update({
      qty_in: (gudang.qty_in || 0) + qty,
      qty_remaining: (gudang.qty_remaining || 0) + qty,
    }).eq('id', gudang.id);
  } else {
    await _supabase.from('warehouse_stock').insert({
      product_id: d.produk_id,
      qty_in: qty,
      qty_out: 0,
      qty_remaining: qty,
      unit: 'PCS',
    });
  }
  return ok(data, 'Produksi berhasil dicatat');
};

// ═══════════════════════════════════════════════════════════════════
// CONSIGNMENT (TITIPAN) ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['createTitip'] = bridge._actions['bulkTitip'] = async (params) => {
  const d = params.data || params;
  const { data: cust } = await _supabase.from('customers').select('sales_id').eq('id', d.customer_id).single();
  var salesId = d.sales_id || cust?.sales_id || null;
  const items = d.items || [];
  const { data: shp, error: shpErr } = await _supabase.from('shipments').insert({
    customer_id: d.customer_id, sales_id: salesId, type: d.tipe || 'RESTOCK', status: 'SHIPPED',
    total_items: items.length, total_qty: items.reduce((s, i) => s + (i.qty || 0), 0), notes: d.notes || '',
  }).select().single();
  if (shpErr) return fail(shpErr.message);
  for (var item of items) {
    await _supabase.from('shipment_details').insert({ shipment_id: shp.id, product_id: item.produk_id, qty: item.qty });

    // Kurangi stok gudang (FIFO)
    var { data: gudangList } = await _supabase.from('warehouse_stock')
      .select('*').eq('product_id', item.produk_id).gt('qty_remaining', 0)
      .order('created_at', { ascending: true });
    var need = item.qty;
    if (gudangList) {
      for (var g of gudangList) {
        if (need <= 0) break;
        var deduct = Math.min(need, g.qty_remaining || 0);
        await _supabase.from('warehouse_stock').update({
          qty_out: (g.qty_out || 0) + deduct,
          qty_remaining: (g.qty_remaining || 0) - deduct
        }).eq('id', g.id);
        need -= deduct;
      }
    }
    if (need > 0) {
      return fail('Stok gudang untuk produk ' + item.produk_id + ' tidak mencukupi. Kurang ' + need + ' pcs');
    }

    var { data: cs } = await _supabase.from('consignment_stock').select('*').eq('customer_id', d.customer_id).eq('product_id', item.produk_id).maybeSingle();
    if (cs) { await _supabase.from('consignment_stock').update({ qty_consigned: (cs.qty_consigned || 0) + item.qty, qty_remaining: (cs.qty_remaining || 0) + item.qty }).eq('id', cs.id); }
    else { await _supabase.from('consignment_stock').insert({ customer_id: d.customer_id, product_id: item.produk_id, sales_id: salesId, qty_consigned: item.qty, qty_sold: 0, qty_returned: 0, qty_remaining: item.qty }); }
  }
  return ok(shp, 'Titipan berhasil');
};

bridge._actions['getShipmentDetail'] = async (params) => {
  const d = params?.data || params;
  const { data: shp, error } = await _supabase.from('shipments')
    .select('*, customers(*), sales(*), shipment_details(*, products(*))')
    .eq('id', d.shipment_id)
    .single();
  if (error) return fail(error.message);
  return ok(shp);
};

bridge._actions['getAllShipments'] = async (params) => {
  const d = params?.data || params;
  let query = _supabase.from('shipments').select('*, customers(store_name), sales(full_name)').order('created_at', { ascending: false });
  if (d?.sales_id) query = query.eq('sales_id', d.sales_id);
  if (d?.limit) query = query.limit(d.limit);
  const { data, error } = await query;
  if (error) return fail(error.message);
  return ok(data || []);
};

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getOwnerDashboard'] = async () => {
  var today = new Date().toISOString().substring(0, 10);
  var monthStart = today.substring(0, 7) + '-01';
  var [sales, customers, products, visits, unpaidInv, piutang, produksi, stok, konsinyasi, todayInv, monthInv, monthExpenses, monthCommissions, topP, topS, chartD, chartM] = await Promise.all([
    safeCount('sales'), safeCount('customers'), safeCount('products'),
    safeCount('visits'), safeCount('invoices', { status: 'UNPAID' }),
    _supabase.from('receivables').select('remaining').neq('status', 'PAID'), safeCount('productions'),
    safeList('warehouse_stock'), safeList('consignment_stock'),
    _supabase.from('invoices').select('total').eq('status', 'PAID').gte('invoice_date', today).lte('invoice_date', today),
    _supabase.from('invoices').select('total').eq('status', 'PAID').gte('invoice_date', monthStart).lte('invoice_date', today),
    _supabase.from('expenses').select('amount').gte('date', monthStart),
    _supabase.from('commissions').select('amount, status').gte('created_at', monthStart),
    _supabase.from('invoice_details').select('product_id, subtotal, products(hpp)').limit(5).order('subtotal', { ascending: false }),
    _supabase.from('invoices').select('sales_id, total').eq('status', 'PAID').gte('invoice_date', monthStart).limit(5).order('total', { ascending: false }),
    _supabase.from('invoices').select('invoice_date, total').eq('status', 'PAID').gte('invoice_date', new Date(Date.now() - 7*86400000).toISOString().substring(0, 10)).order('invoice_date'),
    _supabase.from('invoices').select('invoice_date, total').eq('status', 'PAID').gte('invoice_date', new Date(Date.now() - 365*86400000).toISOString().substring(0, 10)).order('invoice_date'),
  ]);

  var omzetHari = (todayInv.data || []).reduce(function(s, i){ return s + (i.total || 0); }, 0);
  var omzetBulan = (monthInv.data || []).reduce(function(s, i){ return s + (i.total || 0); }, 0);
  var expenses = (monthExpenses.data || []).reduce(function(s, e){ return s + (e.amount || 0); }, 0);
  var komisi = (monthCommissions.data || []).reduce(function(s, c){ return s + (c.amount || 0); }, 0);
  var stokGudang = (stok.data || []).reduce(function(s, item){ return s + (item.qty_remaining || 0); }, 0);
  var totalPiutang = (piutang.data || []).reduce(function(s, r){ return s + (r.remaining || 0); }, 0);
  // Simple laba estimate: 30% of omzet
  var labaKotor = Math.round(omzetBulan * 0.3);
  var labaBersih = Math.max(0, labaKotor - expenses - komisi);

  var chartHarian = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(Date.now() - i * 86400000);
    var ds = d.toISOString().substring(0, 10);
    var dayTotal = (chartD.data || []).filter(function(inv){ return (inv.invoice_date || '').substring(0, 10) === ds; }).reduce(function(s, inv){ return s + (inv.total || 0); }, 0);
    chartHarian.push({ date: ds, total: dayTotal });
  }
  var chartBulanan = [];
  for (var m = 11; m >= 0; m--) {
    var md = new Date(today); md.setMonth(md.getMonth() - m);
    var ms = md.toISOString().substring(0, 7);
    var monthTotal = (chartM.data || []).filter(function(inv){ return (inv.invoice_date || '').substring(0, 7) === ms; }).reduce(function(s, inv){ return s + (inv.total || 0); }, 0);
    chartBulanan.push({ label: ms, total: monthTotal });
  }

  return ok({
    kpi: {
      omzet_hari_ini: omzetHari, omzet_bulan_ini: omzetBulan,
      laba_kotor: labaKotor, laba_bersih: labaBersih,
      piutang_aktif: totalPiutang,
      stok_gudang: stokGudang,
      stok_konsinyasi: (konsinyasi.data || []).reduce(function(s, k){ return s + (k.qty_remaining || 0); }, 0),
      komisi_bulan_ini: komisi,
    },
    top_produk: (topP.data || []).map(function(p){ return { produk_id: p.product_id, name: p.products?.name || '', total: p.subtotal || 0 }; }),
    top_sales: (topS.data || []).map(function(s){ return { sales_id: s.sales_id, total: s.total || 0 }; }),
    chart_harian: chartHarian,
    chart_bulanan: chartBulanan,
    total_sales: sales.count, total_customers: customers.count,
    total_products: products.count, total_visits: visits.count,
    total_unpaid_invoices: unpaidInv.count, total_piutang: totalPiutang,
    total_productions: produksi.count, warehouse_stock: stok.data || [],
  });
};

bridge._actions['getSalesDashboard'] = async (params) => {
  const d = params?.data || params || {};
  const profile = await getCurrentProfile();
  var today = new Date().toISOString().substring(0, 10);
  var monthStart = today.substring(0, 7) + '-01';
  if (!profile.sales_id) return fail('Sales ID tidak ditemukan. Hubungi owner untuk setup akun.');
  var [visits, customers, invoices, monthInv, receivables, konsinyasi, komisi] = await Promise.all([
    _supabase.from('visits').select('*', { count: 'exact' }).eq('sales_id', profile.sales_id),
    _supabase.from('customers').select('*', { count: 'exact', head: true }).eq('sales_id', profile.sales_id),
    _supabase.from('invoices').select('*').eq('sales_id', profile.sales_id),
    _supabase.from('invoices').select('total').eq('sales_id', profile.sales_id).eq('status', 'PAID').gte('invoice_date', monthStart).lte('invoice_date', today),
    _supabase.from('receivables').select('remaining').eq('sales_id', profile.sales_id),
    _supabase.from('consignment_stock').select('qty_remaining').eq('sales_id', profile.sales_id),
    (function(){
      var q = _supabase.from('commissions').select('amount, status').eq('sales_id', profile.sales_id);
      if (d.date_from) q = q.gte('created_at', d.date_from);
      if (d.date_to) q = q.lte('created_at', d.date_to + 'T23:59:59');
      return q;
    })(),
  ]);

  var omzet = (monthInv.data || []).reduce(function(s, i){ return s + (i.total || 0); }, 0);
  var piutang = (receivables.data || []).reduce(function(s, r){ return s + (r.remaining || 0); }, 0);
  var stok = (konsinyasi.data || []).reduce(function(s, k){ return s + (k.qty_remaining || 0); }, 0);
  var komisiReady = (komisi.data || []).filter(function(c){ return c.status === 'READY' || c.status === 'UNPAID'; }).reduce(function(s, c){ return s + (c.amount || 0); }, 0);
  var komisiPaid = (komisi.data || []).filter(function(c){ return c.status === 'PAID'; }).reduce(function(s, c){ return s + (c.amount || 0); }, 0);
  var unpaid = (invoices.data || []).filter(function(i){ return i.status === 'UNPAID' || i.status === 'OVERDUE'; }).length;
  var todayVisits = (visits.data || []).filter(function(v){ return (v.visit_date || '').substring(0, 10) === today; });

  var { data: profileData } = await _supabase.from('sales').select('target_bulanan').eq('id', profile.sales_id).maybeSingle();
  var pencapaian = omzet;

  return ok({
    kpi: {
      omzet_bulan_ini: omzet,
      toko_aktif: customers.count || (customers.data || []).length || 0,
      kunjungan_hari_ini: todayVisits.length || 0,
      piutang_area: piutang,
      komisi_ready: komisiReady,
      komisi_paid: komisiPaid,
      invoice_belum_lunas: unpaid,
    },
    target_bulanan: (profileData.data || {}).target_bulanan || 0,
    persentase: pencapaian > 0 ? Math.round(Math.min(pencapaian / ((profileData.data || {}).target_bulanan || 1), 1) * 100) : 0,
    pencapaian: pencapaian,
    total_visits: visits.count || 0,
    customers: (customers.data || []).map(function(c){ return mapFields(c, customerMap); }),
    invoices: invoices.data || [],
  });
};

// ═══════════════════════════════════════════════════════════════════
// SETTINGS ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getAllSettings'] = async () => {
  const { data } = await _supabase.from('settings').select('*');
  // Frontend expects key-value object format: { key1: value1, key2: value2 }
  const obj = {};
  (data || []).forEach(s => {
    const val = typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value || '');
    obj[s.key] = val;
  });
  return ok(obj);
};

bridge._actions['updateSetting'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('settings').update({
    value: String(d.value),
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Setting berhasil diupdate');
};

// ═══════════════════════════════════════════════════════════════════
// REPORT ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['generateReport'] = async (params) => {
  const d = params.data || params;
  switch (d.type) {
    // ── 1. Penjualan Harian (7 hari terakhir) ────────────────────
    case 'penjualan_harian': {
      const { data: invoices } = await _supabase.from('invoices').select('total, invoice_date');
      const result = [];
      for (let d = 6; d >= 0; d--) {
        const tgl = new Date(); tgl.setDate(tgl.getDate() - d);
        const tglStr = tgl.toISOString().substring(0, 10);
        const filtered = (invoices || []).filter(function(inv) {
          return inv.invoice_date && inv.invoice_date.substring(0, 10) === tglStr;
        });
        result.push({
          label: tglStr,
          total: filtered.reduce(function(s, inv) { return s + (inv.total || 0); }, 0),
          jumlah: filtered.length
        });
      }
      return ok(result);
    }
    // ── 2. Penjualan Bulanan (12 bulan) ──────────────────────────
    case 'penjualan_bulanan': {
      const { data: invoices } = await _supabase.from('invoices').select('total, invoice_date');
      const result = [];
      for (let m = 11; m >= 0; m--) {
        const d = new Date(); d.setMonth(d.getMonth() - m);
        const bulan = d.getMonth() + 1;
        const tahun = d.getFullYear();
        const filtered = (invoices || []).filter(function(inv) {
          if (!inv.invoice_date) return false;
          const id = new Date(inv.invoice_date);
          return id.getMonth() + 1 === bulan && id.getFullYear() === tahun;
        });
        result.push({
          label: bulan + '/' + tahun,
          total: filtered.reduce(function(s, inv) { return s + (inv.total || 0); }, 0),
          jumlah: filtered.length
        });
      }
      return ok(result);
    }
    // ── 3. Penjualan Tahunan ─────────────────────────────────────
    case 'penjualan_tahunan': {
      const { data: invoices } = await _supabase.from('invoices').select('total, invoice_date');
      const data = {};
      (invoices || []).forEach(function(inv) {
        if (!inv.invoice_date) return;
        const tgl = new Date(inv.invoice_date);
        const tahun = '' + tgl.getFullYear();
        if (!data[tahun]) data[tahun] = { tahun: tahun, total: 0, jumlah: 0 };
        data[tahun].total += inv.total || 0;
        data[tahun].jumlah++;
      });
      return ok(Object.values(data).sort(function(a, b) { return a.tahun - b.tahun; }));
    }
    // ── 4. Penjualan per Produk ──────────────────────────────────
    case 'penjualan_per_produk': {
      const { data: details } = await _supabase.from('invoice_details').select('*, products(*)');
      const data = {};
      (details || []).forEach(function(d) {
        const pid = d.product_id;
        if (!data[pid]) {
          const p = d.products || {};
          data[pid] = { produk_id: pid, nama: p.name || pid, qty: 0, total: 0, laba: 0 };
        }
        data[pid].qty += d.qty || 0;
        data[pid].total += d.subtotal || 0;
        data[pid].laba += d.profit || 0;
      });
      return ok(Object.values(data).sort(function(a, b) { return b.total - a.total; }));
    }
    // ── 5. Penjualan per Customer ────────────────────────────────
    case 'penjualan_per_customer': {
      const { data: invoices } = await _supabase.from('invoices').select('*, customers(*)');
      const data = {};
      (invoices || []).forEach(function(inv) {
        const cid = inv.customer_id;
        if (!data[cid]) {
          const c = inv.customers || {};
          data[cid] = { customer_id: cid, nama: c.store_name || cid, total: 0, jumlah: 0 };
        }
        data[cid].total += inv.total || 0;
        data[cid].jumlah++;
      });
      return ok(Object.values(data).sort(function(a, b) { return b.total - a.total; }));
    }
    // ── 6. Penjualan per Sales ───────────────────────────────────
    case 'penjualan_per_sales': {
      const { data: invoices } = await _supabase.from('invoices').select('*, sales(*)');
      const data = {};
      (invoices || []).forEach(function(inv) {
        const sid = inv.sales_id;
        if (!data[sid]) {
          const s = inv.sales || {};
          data[sid] = { sales_id: sid, nama: s.full_name || s.name || sid, total: 0, jumlah: 0 };
        }
        data[sid].total += inv.total || 0;
        data[sid].jumlah++;
      });
      return ok(Object.values(data).sort(function(a, b) { return b.total - a.total; }));
    }
    // ── 7. Piutang ───────────────────────────────────────────────
    case 'piutang': {
      const { data } = await _supabase.from('receivables').select('*, customers(*)');
      const result = (data || []).map(function(p) {
        const c = p.customers || {};
        return {
          piutang_id: p.id,
          customer_nama: c.store_name || c.name || p.customer_id,
          total_piutang: p.total || 0,
          sisa_piutang: p.remaining || 0,
          status: p.status || ''
        };
      });
      return ok(result);
    }
    // ── 8. Pembayaran ───────────────────────────────────────────
    case 'pembayaran': {
      let q = _supabase.from('payments').select('*, customers(*)');
      if (d.sales_id) q = q.eq('sales_id', d.sales_id);
      const { data } = await q;
      const result = (data || []).map(function(p) {
        const c = p.customers || {};
        var st = 'BELUM_DISETOR';
        if (p.status === 'MENUNGGU') st = 'MENUNGGU';
        else if (p.status === 'DIKONFIRMASI') st = 'SUDAH_DISETOR';
        return {
          pembayaran_id: p.id,
          customer_nama: c.store_name || c.name || p.customer_id,
          jumlah_bayar: p.amount || 0,
          metode_bayar: p.method || '',
          tanggal: p.payment_date || p.created_at || '',
          sales_id: p.sales_id || '',
          status_penyetoran: st,
        };
      });
      return ok(result);
    }
    // ── 9. Komisi ────────────────────────────────────────────────
    case 'komisi': {
      const { data } = await _supabase.from('commissions').select('*, sales(*)');
      const result = (data || []).map(function(k) {
        const s = k.sales || {};
        return {
          komisi_id: k.id,
          sales_nama: s.full_name || s.name || k.sales_id,
          nilai_komisi: k.amount || 0,
          periode_bulan: k.period_month || 0,
          periode_tahun: k.period_year || 0,
          status: k.status || ''
        };
      });
      return ok(result);
    }
    // ── 10. Retur ────────────────────────────────────────────────
    case 'retur': {
      const { data } = await _supabase.from('returns').select('*, products(*)');
      const result = (data || []).map(function(r) {
        const p = r.products || {};
        return {
          retur_id: r.id,
          produk_nama: p.name || r.product_id,
          customer_id: r.customer_id || '',
          qty_retur: r.qty || 0,
          alasan: r.reason || ''
        };
      });
      return ok(result);
    }
    // ── 11. Laba Kotor ──────────────────────────────────────────
    case 'laba_kotor': {
      const { data: details } = await _supabase.from('invoice_details').select('*');
      const data = {};
      (details || []).forEach(function(d) {
        const key = d.invoice_id ? d.invoice_id.substring(0, 7) : 'unknown';
        if (!data[key]) data[key] = { periode: key, total_penjualan: 0, total_hpp: 0, laba_kotor: 0 };
        data[key].total_penjualan += d.subtotal || 0;
        data[key].total_hpp += (d.hpp || 0) * (d.qty || 0);
        data[key].laba_kotor += d.profit || 0;
      });
      return ok(Object.values(data).sort(function(a, b) { return a.periode < b.periode ? -1 : 1; }));
    }
    // ── 12. Laba Bersih ──────────────────────────────────────────
    case 'laba_bersih': {
      const [detailsRes, expensesRes, commissionsRes] = await Promise.all([
        _supabase.from('invoice_details').select('subtotal, profit'),
        _supabase.from('expenses').select('amount'),
        _supabase.from('commissions').select('amount'),
      ]);
      const details = detailsRes.data || [];
      const expenses = expensesRes.data || [];
      const commissions = commissionsRes.data || [];
      const totalPenjualan = details.reduce(function(s, d) { return s + (d.subtotal || 0); }, 0);
      const totalLabaKotor = details.reduce(function(s, d) { return s + (d.profit || 0); }, 0);
      const totalBiaya = expenses.reduce(function(s, b) { return s + (b.amount || 0); }, 0);
      const totalKomisi = commissions.reduce(function(s, k) { return s + (k.amount || 0); }, 0);
      const totalReturCost = 0;
      return ok([{
        total_penjualan: totalPenjualan,
        total_laba_kotor: totalLabaKotor,
        total_biaya_operasional: totalBiaya,
        total_biaya_komisi: totalKomisi,
        total_biaya_retur: totalReturCost,
        laba_bersih: totalLabaKotor - totalBiaya - totalKomisi - totalReturCost
      }]);
    }
    // ── 13. Omzet Report ─────────────────────────────────────────
    case 'omzet': {
      const { data: invoices } = await _supabase.from('invoices').select('total, status, invoice_date');
      const now = new Date();
      const startDate = d.tanggal_mulai || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = d.tanggal_selesai || now.toISOString();
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      var totalOmzet = 0, totalLunas = 0, totalPiutang = 0;
      (invoices || []).forEach(function(inv) {
        if (!inv.invoice_date) return;
        const t = new Date(inv.invoice_date).getTime();
        if (t >= startMs && t <= endMs) {
          totalOmzet += inv.total || 0;
          if (inv.status === 'PAID') totalLunas += inv.total || 0;
          else totalPiutang += inv.total || 0;
        }
      });
      return ok({
        omzet: totalOmzet,
        lunas: totalLunas,
        piutang: totalPiutang,
        periode_mulai: startDate.substring(0, 10),
        periode_selesai: endDate.substring(0, 10)
      });
    }
    // ── 14. Stok Gudang ──────────────────────────────────────────
    case 'stok_gudang': {
      const { data } = await _supabase.from('warehouse_stock').select('*, products(*)');
      const result = (data || []).map(function(s) {
        const p = s.products || {};
        return {
          produk_nama: p.name || s.product_id,
          batch: s.batch_number || '',
          qty_masuk: s.qty_in || 0,
          qty_keluar: s.qty_out || 0,
          qty_sisa: s.qty_remaining || 0
        };
      });
      return ok(result);
    }
    // ── 15. Stok Konsinyasi ──────────────────────────────────────
    case 'stok_konsinyasi': {
      const { data } = await _supabase.from('consignment_stock').select('*, customers(*), products(*)');
      const result = (data || []).map(function(s) {
        const c = s.customers || {};
        const p = s.products || {};
        return {
          customer_nama: c.store_name || c.name || s.customer_id,
          produk_nama: p.name || s.product_id,
          qty_titip_awal: s.qty_consigned || 0,
          qty_terjual: s.qty_sold || 0,
          qty_retur: s.qty_returned || 0,
          qty_sisa: s.qty_remaining || 0
        };
      });
      return ok(result);
    }
    // ── 16. Forecast Restock ─────────────────────────────────────
    case 'forecast_restock': {
      const { data } = await _supabase.from('consignment_stock').select('*, customers(*), products(*)');
      const result = [];
      (data || []).forEach(function(s) {
        const target = s.target_display || s.products?.target_display || 20;
        const sisa = s.qty_remaining || 0;
        const rekomendasi = Math.max(0, target - sisa);
        if (rekomendasi > 0) {
          const c = s.customers || {};
          const p = s.products || {};
          result.push({
            customer_nama: c.store_name || c.name || s.customer_id,
            produk_nama: p.name || s.product_id,
            sisa_stok: sisa,
            target_display: target,
            rekomendasi_restock: rekomendasi
          });
        }
      });
      return ok(result.sort(function(a, b) { return b.rekomendasi_restock - a.rekomendasi_restock; }));
    }
    // ── 17. Kunjungan Harian ────────────────────────────────────────
    case 'kunjungan_harian': {
      const { data: visits } = await _supabase.from('visits')
        .select('*, customers(store_name), sales(full_name)')
        .gte('visit_date', d.tanggal || new Date().toISOString().substring(0, 10))
        .order('visit_date', { ascending: false })
        .order('start_time', { ascending: true });
      const result = (visits || []).map(function(v) {
        const c = v.customers || {};
        const s = v.sales || {};
        return {
          tanggal: v.visit_date ? v.visit_date.substring(0, 10) : '',
          jam_mulai: v.start_time ? v.start_time.substring(11, 16) : '',
          jam_selesai: v.end_time ? v.end_time.substring(11, 16) : '',
          sales_nama: s.full_name || v.sales_id || '',
          customer_nama: c.store_name || v.customer_id || '',
          status: v.status || '',
          total_invoice: v.total_invoice || 0
        };
      });
      return ok(result);
    }
    default:
      return fail('Unknown report type: ' + d.type);
  }
};

// ═══════════════════════════════════════════════════════════════════
// OTHER ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['ping'] = async () => ok(null, 'pong');
bridge._actions['changePassword'] = async (params) => {
  const d = params.data || params;
  const { error } = await _supabase.auth.updateUser({ password: d.password_baru });
  if (error) return fail(error.message);
  return ok(null, 'Password berhasil diubah');
};

// ── Safe query helpers ───────────────────────────────────────
async function safeCount(table, filter) {
  try {
    let q = _supabase.from(table).select('*', { count: 'exact', head: true });
    if (filter) { for (const k of Object.keys(filter)) q = q.eq(k, filter[k]); }
    return await q;
  } catch { return { count: 0 }; }
}
async function safeList(table) {
  try { return (await _supabase.from(table).select('*')) || { data: [] }; }
  catch { return { data: [] }; }
}

// ── Missing handlers ─────────────────────────────────────────
bridge._actions['getNotifikasi'] = async (params) => {
  const d = params?.data || params;
  var q = _supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
  if (d && d.userId) q = q.eq('user_id', d.userId);
  const { data } = await q;
  var mapped = (data || []).map(function(n) {
    return {
      notifikasi_id: n.id,
      tipe: n.tipe, judul: n.judul, pesan: n.pesan, link: n.link,
      is_read: n.is_read, created_at: n.created_at,
    };
  });
  return ok(mapped);
};
bridge._actions['getVisitReminders'] = async () => {
  const profile = await getCurrentProfile();
  var q = _supabase.from('customers').select('id, store_name, address, latitude, longitude, sales_id, status');
  if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
  const { data: raw } = await q;
  var customers = (raw || []).filter(function(c){ return c.status !== 'NONAKTIF' && c.status !== 'SUSPEND'; });

  var salesIds = [...new Set(customers.map(function(c){ return c.sales_id; }).filter(Boolean))];
  var salesMap = {};
  if (salesIds.length) {
    var { data: sales } = await _supabase.from('sales').select('id, full_name, nama').in('id', salesIds);
    (sales || []).forEach(function(s){ salesMap[s.id] = s.full_name || s.nama || ''; });
  }

  var cIds = customers.map(function(c){ return c.id; });
  var visits = [];
  if (cIds.length) {
    var { data: v } = await _supabase.from('visits').select('customer_id, visit_date').eq('status', 'COMPLETED').in('customer_id', cIds).order('visit_date', { ascending: false });
    visits = v || [];
  }
  var lastVisitMap = {};
  var visitCountMap = {};
  (visits || []).forEach(function(v){
    if (!lastVisitMap[v.customer_id]) lastVisitMap[v.customer_id] = v.visit_date;
    visitCountMap[v.customer_id] = (visitCountMap[v.customer_id] || 0) + 1;
  });
  var reminders = customers.map(function(c) {
    var daysSince = 999;
    var lastVisit = lastVisitMap[c.id];
    if (lastVisit) daysSince = Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000);
    var urgency = daysSince >= 7 ? 'red' : daysSince >= 3 ? 'yellow' : 'green';
    return {
      customer_id: c.id,
      store_name: c.store_name || c.nama,
      address: c.address || '',
      latitude: c.latitude,
      longitude: c.longitude,
      sales_id: c.sales_id,
      sales_name: salesMap[c.sales_id] || '',
      days_since_last_visit: daysSince,
      visit_count: visitCountMap[c.id] || 0,
      urgency: urgency
    };
  });
  reminders.sort(function(a, b) { return b.days_since_last_visit - a.days_since_last_visit; });
  return ok(reminders);
};
bridge._actions['getSystemStatus'] = async () => {
  const [users, sales, customers, produk, kunjungan, invoices] = await Promise.all([
    safeCount('users'), safeCount('sales'), safeCount('customers'),
    safeCount('products'), safeCount('visits'), safeCount('invoices'),
  ]);
  return ok({
    users: users.count || 0, sales: sales.count || 0,
    produk: produk.count || 0, customers: customers.count || 0,
    kunjungan: kunjungan.count || 0, invoices: invoices.count || 0,
  });
};
bridge._actions['getStockPredictions'] = async () => {
  const profile = await getCurrentProfile();
  var q = _supabase.from('consignment_stock').select('*, customers(store_name), products(name)');
  if (profile.role === 'SALES') q = q.eq('sales_id', profile.sales_id);
  const { data: stocks } = await q;
  var predictions = (stocks || []).map(function(s) {
    var dailyAvg = s.qty_sold || 0;
    var daysLeft = dailyAvg > 0 ? Math.floor((s.qty_remaining || 0) / dailyAvg) : 99;
    var status = daysLeft <= 7 ? 'kritis' : daysLeft <= 14 ? 'warning' : 'aman';
    return { stock_id: s.id, customer_id: s.customer_id, store_name: s.customers?.store_name || '', produk_id: s.product_id, produk_name: s.products?.name || '', qty_sisa: s.qty_remaining || 0, daily_avg_sales: dailyAvg, estimated_days_left: daysLeft, status: status };
  });
  return ok(predictions);
};
bridge._actions['getKunjunganData'] = async (params) => {
  const d = params.data || params;
  const { data } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', d.kunjunganId).single();
  return ok(data);
};
bridge._actions['getLogs'] = async () => {
  const { data } = await _supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
  return ok(data || []);
};

bridge._actions['updateProfile'] = async (params) => {
  const d = params.data || params;
  const profile = await getCurrentProfile();
  const { data, error } = await _supabase.from('users').update({
    full_name: d.full_name,
    phone: d.phone,
  }).eq('id', profile.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Profil berhasil diupdate');
};

bridge._actions['getUsers'] = async () => {
  const { data } = await _supabase.from('users').select('*');
  const mapped = (data || []).map(u => ({
    ...u,
    user_id: u.id, username: u.username, full_name: u.full_name,
    role: u.role, email: u.email, is_active: u.is_active,
  }));
  return ok(mapped);
};

bridge._actions['getAuditLogs'] = async () => {
  const { data } = await _supabase.from('activity_logs').select('*, users(full_name)').order('created_at', { ascending: false });
  return ok(data);
};

// ═══════════════════════════════════════════════════════════════════
// BANK ACCOUNT (REKENING) ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getRekening'] = async () => {
  const { data } = await _supabase.from('bank_accounts').select('*');
  return ok(data);
};

bridge._actions['createRekening'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('bank_accounts').insert({
    bank_name: d.nama_bank,
    account_number: d.no_rekening,
    account_name: d.atas_nama,
    initial_balance: d.saldo_awal || 0,
    current_balance: d.saldo_awal || 0,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Rekening berhasil dibuat');
};

bridge._actions['updateRekening'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('bank_accounts').update({
    bank_name: d.nama_bank,
    account_number: d.no_rekening,
    account_name: d.atas_nama,
  }).eq('id', d.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Rekening berhasil diupdate');
};

bridge._actions['deleteRekening'] = async (params) => {
  const { error } = await _supabase.from('bank_accounts').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Rekening berhasil dihapus');
};

bridge._actions['getSaldoRekening'] = async () => {
  const { data } = await _supabase.from('bank_accounts').select('id, bank_name, account_number, current_balance');
  return ok(data);
};

// ═══════════════════════════════════════════════════════════════════
// CASH TRANSACTION (KAS) ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getMutasiRekening'] = async (params) => {
  const d = params.data || params;
  const { data } = await _supabase.from('cash_transactions')
    .select('*')
    .eq('bank_account_id', d.rekening_id)
    .order('date', { ascending: false });
  return ok(data);
};

bridge._actions['getRekapKas'] = async () => {
  const { data } = await _supabase.from('cash_transactions').select('*');
  return ok(data);
};

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATION ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getNotifications'] = async () => {
  const session = await requireAuth();
  const profile = await getCurrentProfile();
  const { data } = await _supabase.from('notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return ok(data || []);
};

bridge._actions['markNotifRead'] = async (params) => {
  await _supabase.from('notifications').update({ is_read: true }).eq('id', params.notifId || params.id);
  return ok(null, 'Notifikasi dibaca');
};

bridge._actions['getOwnerNotifBadge'] = async () => {
  const profile = await getCurrentProfile();
  const { data: notifs } = await _supabase.from('notifications').select('id').eq('user_id', profile.id).eq('is_read', false);
  const { data: pending } = await _supabase.from('payments').select('id').eq('status', 'MENUNGGU');
  var total = (notifs || []).length + (pending || []).length;
  return ok({ total: total, unread_notif: (notifs || []).length, pending_setoran: (pending || []).length });
};

bridge._actions['requestTitipAwal'] = async (params) => {
  const profile = await getCurrentProfile();
  const d = params?.data || params;
  const customerId = d.customer_id;
  if (!customerId) return fail('Customer ID diperlukan');

  const { data: existing } = await _supabase.from('notifications')
    .select('id').eq('tipe', 'REQUEST_TITIP_AWAL').eq('is_read', false)
    .filter('pesan', 'like', `%${customerId}%`).limit(1).maybeSingle();
  if (existing) return fail('Sudah pernah minta titip awal untuk toko ini, tunggu Owner proses');

  const { data: cust } = await _supabase.from('customers').select('store_name').eq('id', customerId).maybeSingle();
  if (!cust) return fail('Customer tidak ditemukan');

  const { data: owners } = await _supabase.from('users').select('id').eq('role', 'OWNER');
  if (!owners || owners.length === 0) return fail('Tidak ada Owner terdaftar');

  const pesan = `Sales ${profile.full_name || profile.username} meminta titip awal untuk ${cust.store_name} (${customerId})`;
  const link = `?page=titipan&customer_id=${customerId}`;

  for (const owner of owners) {
    await _supabase.from('notifications').insert({
      user_id: owner.id, tipe: 'REQUEST_TITIP_AWAL',
      judul: '📦 Request Titip Awal', pesan, link,
      is_read: false, created_at: new Date()
    });
  }
  return ok(null, '✅ Permintaan titip awal sudah dikirim ke Owner');
};

bridge._actions['fulfillTitipRequest'] = async (params) => {
  const d = params?.data || params;
  const customerId = d.customer_id;
  if (!customerId) return ok(null);
  await _supabase.from('notifications')
    .update({ is_read: true })
    .eq('tipe', 'REQUEST_TITIP_AWAL').eq('is_read', false)
    .filter('pesan', 'like', `%${customerId}%`);
  return ok(null, 'Permintaan titip terpenuhi');
};

// ═══════════════════════════════════════════════════════════════════
// GAS COMPATIBILITY LAYER — google.script.run polyfill
// ═══════════════════════════════════════════════════════════════════
(function() {
  if (typeof window.google !== 'undefined' && google.script && google.script.run) {
    return; // already defined (e.g. running inside GAS)
  }
  window.google = window.google || {};
  google.script = google.script || {};

  function createRunProxy() {
    const state = { _successHandler: null, _failureHandler: null };

    return new Proxy(state, {
      get(target, prop) {
        if (prop === 'withSuccessHandler' || prop === 'withFailureHandler') {
          return function(fn) {
            target['_' + prop] = fn;
            return google.script.run;
          };
        }
        // Any other property call is the final method invocation
        return function(...args) {
          const successHandler = target._withSuccessHandler;
          const failureHandler = target._withFailureHandler;
          target._withSuccessHandler = null;
          target._withFailureHandler = null;

          const directMap = {
            authenticate: 'authenticate',
            destroySession: 'destroySession',
            checkSystemReady: 'checkSystemReady',
            setupOwner: 'setupOwner',
            validateSession: 'validateSession',
            getProdukDirect: 'getProdukDirect',
          };

          async function execute() {
            if (directMap[prop]) {
              return bridge.direct(directMap[prop], ...args);
            }
            if (prop === 'doPost' || prop === 'handleApi') {
              return bridge.handleApi(args[0]);
            }
            // Fallback: treat as API action
            const params = typeof args[0] === 'string' ? JSON.parse(args[0]) : (args[0] || {});
            return bridge._routeAction(prop, params);
          }

          execute().then(result => {
            if (successHandler) successHandler(result);
          }).catch(err => {
            if (failureHandler) failureHandler(err);
            else console.error('[GAS polyfill]', prop, err);
          });
        };
      }
    });
  }

  google.script.run = createRunProxy();
})();

// Init customer photo bucket on load
setTimeout(function() {
  bridge._actions['ensureCustomerPhotoBucket']().catch(function(){});
}, 1000);

// window.api NOT overridden here — the build script replaces
// google.script.run calls in the main api() function with
// direct bridge._routeAction calls at build time.
