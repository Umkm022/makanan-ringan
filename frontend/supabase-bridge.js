// ═══════════════════════════════════════════════════════════════════
// SUPABASE BRIDGE — replaces google.script.run with Supabase SDK
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://byuocfavyxlotmoslihv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nf3b87N70ut3fPWwDeeBUQ_XvJ15S0Q';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

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
const settingMap = {
  setting_id: 'id', key: 'key', value: 'value', description: 'description'
};

// ── Helper: get user session ───────────────────────────────────────
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session;
}

// ── Helper: get current user with profile ──────────────────────────
async function getCurrentProfile() {
  const session = await requireAuth();
  const { data: users, error } = await _supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();
  if (error) throw new Error('User profile not found');
  return users;
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

async function _handleLogout() {
  await _supabase.auth.signOut();
  return ok(null, 'Logout berhasil');
}

async function _handleCheckSystemReady() {
  const { count } = await _supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  return { success: true, data: { ready: count > 0 } };
}

async function _handleSetupOwner(params) {
  // Register with Supabase Auth
  const { data: authData, error: authErr } = await _supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });
  if (authErr) return fail(authErr.message);

  // Create user record
  const { error: insertErr } = await _supabase.from('users').insert({
    auth_id: authData.user.id,
    username: params.username,
    email: params.email,
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
  const { data } = await _supabase.from('customers').select('*, sales(full_name)');
  const mapped = (data || []).map(c => {
    const m = mapFields(c, customerMap);
    m.sales_name = c.sales ? c.sales.full_name : null;
    return m;
  });
  return ok(mapped);
};

bridge._actions['getCustomer'] = async (params) => {
  const { data } = await _supabase.from('customers').select('*, sales(full_name)').eq('id', params.id).single();
  if (data) {
    const m = mapFields(data, customerMap);
    m.sales_name = data.sales ? data.sales.full_name : null;
    return ok(m);
  }
  return ok(null);
};

bridge._actions['createCustomer'] = async (params) => {
  const { data, error } = await _supabase.from('customers').insert({
    sales_id: params.sales_id || null,
    store_name: params.store_name,
    owner_name: params.owner_name,
    phone: params.phone,
    address: params.address,
    city: params.kota,
    district: params.kecamatan,
    status: params.status || 'AKTIF',
    store_type: params.tipe_toko,
    credit_limit: params.limit_piutang || 0,
    payment_term: params.tempo_pembayaran || 30,
    notes: params.notes,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Customer berhasil dibuat');
};

bridge._actions['updateCustomer'] = async (params) => {
  const { data, error } = await _supabase.from('customers').update({
    store_name: params.store_name,
    owner_name: params.owner_name,
    phone: params.phone,
    address: params.address,
    city: params.kota,
    district: params.kecamatan,
    store_type: params.tipe_toko,
    credit_limit: params.limit_piutang,
    payment_term: params.tempo_pembayaran,
    notes: params.notes,
  }).eq('id', params.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Customer berhasil diupdate');
};

bridge._actions['deleteCustomer'] = async (params) => {
  const { error } = await _supabase.from('customers').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Customer berhasil dihapus');
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
  const { data, error } = await _supabase.from('products').insert({
    category_id: params.kategori_id,
    code: params.kode_produk,
    name: params.nama_produk,
    variant: params.varian,
    description: params.deskripsi,
    packaging: params.kemasan,
    unit: params.satuan,
    price: params.harga_jual,
    retail_price: params.harga_ecer,
    hpp: params.hpp,
    target_display: params.target_display,
    min_stock: params.stok_minimum,
    is_active: true,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Produk berhasil dibuat');
};

bridge._actions['updateProduk'] = async (params) => {
  const { data, error } = await _supabase.from('products').update({
    category_id: params.kategori_id,
    code: params.kode_produk,
    name: params.nama_produk,
    variant: params.varian,
    description: params.deskripsi,
    packaging: params.kemasan,
    unit: params.satuan,
    price: params.harga_jual,
    retail_price: params.harga_ecer,
    hpp: params.hpp,
    target_display: params.target_display,
    min_stock: params.stok_minimum,
  }).eq('id', params.id).select().single();
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
  const { data, error } = await _supabase.from('categories').insert({
    name: params.nama_kategori,
    description: params.deskripsi,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Kategori berhasil dibuat');
};

// ═══════════════════════════════════════════════════════════════════
// SALES ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getSales'] = bridge._actions['getSalesList'] = async () => {
  const { data } = await _supabase.from('sales').select('*, users(*)');
  const mapped = (data || []).map(s => mapFields(s, salesMap));
  return ok(mapped);
};

bridge._actions['getSalesById'] = async (params) => {
  const { data } = await _supabase.from('sales').select('*').eq('id', params.id).single();
  return ok(data ? mapFields(data, salesMap) : null);
};

bridge._actions['createSales'] = async (params) => {
  const { data, error } = await _supabase.from('sales').insert({
    code: params.sales_code,
    full_name: params.full_name,
    phone: params.phone,
    address: params.address,
    city: params.kota,
    komisi_rate: params.komisi_rate,
    target_bulanan: params.target_bulanan,
    status: params.status || 'AKTIF',
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Sales berhasil dibuat');
};

bridge._actions['updateSales'] = async (params) => {
  const { data, error } = await _supabase.from('sales').update({
    full_name: params.full_name,
    phone: params.phone,
    address: params.address,
    city: params.kota,
    komisi_rate: params.komisi_rate,
    target_bulanan: params.target_bulanan,
    status: params.status,
  }).eq('id', params.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Sales berhasil diupdate');
};

bridge._actions['deleteSales'] = async (params) => {
  const { error } = await _supabase.from('sales').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Sales berhasil dihapus');
};

// ═══════════════════════════════════════════════════════════════════
// VISIT / KUNJUNGAN ACTIONS  (partial — main ones)
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getAllKunjungan'] = async (params) => {
  let query = _supabase.from('visits').select('*, customers(*), sales(*)');
  if (params?.status) query = query.eq('status', params.status);
  if (params?.sales_id) query = query.eq('sales_id', params.sales_id);
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getRiwayatKunjungan'] = async (params) => {
  const { data } = await _supabase
    .from('visits')
    .select('*, sales(full_name)')
    .eq('customer_id', params.customer_id)
    .order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getRiwayatSales'] = async (params) => {
  const { data } = await _supabase
    .from('visits')
    .select('*, customers(store_name)')
    .eq('sales_id', params.sales_id)
    .order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getAllRiwayatKunjungan'] = async () => {
  const { data } = await _supabase
    .from('visits')
    .select('*, customers(*), sales(*)')
    .order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['startKunjungan'] = async (params) => {
  const session = await requireAuth();
  const { data: customer } = await _supabase.from('customers').select('*, sales(full_name)').eq('id', params.customerId).single();
  if (!customer) return fail('Customer tidak ditemukan');
  if (session.role === 'SALES' && customer.sales_id !== (session.user?.user_metadata?.sales_id || '')) return fail('Akses ditolak: bukan customer Anda');
  const { data: visit, error } = await _supabase.from('visits').insert({
    customer_id: customer.id, sales_id: customer.sales_id,
    visit_date: new Date().toISOString().substring(0, 10), start_time: new Date().toISOString(),
    status: 'DRAFT', latitude: params.latitude || '', longitude: params.longitude || '',
  }).select().single();
  if (error) return fail(error.message);
  const { data: stokAll } = await _supabase.from('consignment_stock').select('*').eq('customer_id', customer.id);
  const { data: allProduk } = await _supabase.from('products').select('*').eq('is_active', true);
  var produk = (allProduk || []).map(function(p) {
    var sk = (stokAll || []).filter(function(s) { return s.produk_id === p.id; })[0] || {};
    return { produk_id: p.id, nama_produk: p.name, stok_awal: sk.qty_sisa || 0, target_display: sk.target_display || p.target_display || 20, harga_jual: p.selling_price || 0, hpp: p.hpp || 0 };
  });
  return ok({ kunjungan_id: visit.kunjungan_id || visit.id, customer: { customer_id: customer.id, store_name: customer.store_name, owner_name: customer.owner_name, address: customer.address, kota: customer.city }, produk: produk, last_visit: customer.last_visit });
};

bridge._actions['saveSisaStok'] = async (params) => {
  var items = params.items || [];
  if (!items.length) return fail('Tidak ada data produk');
  var totalTerjual = 0, totalRetur = 0, totalInvoice = 0;
  await _supabase.from('visit_details').delete().eq('kunjungan_id', params.kunjunganId);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var terjual = Math.max(0, item.stok_awal - item.sisa_fisik - (item.rusak || 0) - (item.retur || 0));
    var restock = Math.max(0, item.target_display - item.sisa_fisik);
    var subtotal = terjual * item.harga_jual;
    var { error } = await _supabase.from('visit_details').insert({
      kunjungan_id: params.kunjunganId, produk_id: item.produk_id, stok_awal: item.stok_awal, sisa_fisik: item.sisa_fisik,
      rusak: item.rusak || 0, retur: item.retur || 0, terjual: terjual, target_display: item.target_display,
      rekomendasi_restock: restock, harga_jual: item.harga_jual, subtotal: subtotal,
    });
    if (error) return fail(error.message);
    totalTerjual += terjual; totalRetur += (item.retur || 0); totalInvoice += subtotal;
  }
  await _supabase.from('visits').update({ total_sold: totalTerjual, total_return: totalRetur, total_invoice: totalInvoice }).eq('kunjungan_id', params.kunjunganId);
  return ok({ total_terjual: totalTerjual, total_retur: totalRetur, total_invoice: totalInvoice });
};

bridge._actions['resumeKunjungan'] = async (params) => {
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', params.kunjunganId).single();
  if (!visit || visit.status !== 'DRAFT') return fail('Kunjungan tidak ditemukan atau bukan DRAFT');
  const { data: details } = await _supabase.from('visit_details').select('*').eq('kunjungan_id', visit.kunjungan_id || visit.id);
  const { data: allProduk } = await _supabase.from('products').select('*');
  var customer = visit.customers ? { customer_id: visit.customers.customer_id, store_name: visit.customers.store_name, owner_name: visit.customers.owner_name, address: visit.customers.address, kota: visit.customers.city } : {};
  var produk = (details || []).map(function(d) {
    var pr = (allProduk || []).filter(function(p) { return p.id === d.produk_id; })[0] || {};
    return { produk_id: d.produk_id, nama_produk: pr.name || d.produk_id, stok_awal: d.stok_awal, sisa_fisik: d.sisa_fisik, rusak: d.rusak, retur: d.retur, terjual: d.terjual, target_display: d.target_display, rekomendasi_restock: d.rekomendasi_restock, harga_jual: d.harga_jual };
  });
  return ok({ kunjungan_id: visit.kunjungan_id || visit.id, customer: customer, produk: produk, last_visit: visit.visit_date });
};

bridge._actions['finalizeKunjungan'] = async (params) => {
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('kunjungan_id', params.kunjunganId).single();
  if (!visit) return fail('Kunjungan tidak ditemukan');
  if (visit.status !== 'DRAFT') return fail('Kunjungan sudah difinalisasi');
  var customerId = visit.customer_id, salesId = visit.sales_id, invoiceTotal = visit.total_invoice || 0;
  const { data: details } = await _supabase.from('visit_details').select('*').eq('kunjungan_id', visit.kunjungan_id || visit.id);
  for (var d of details || []) {
    if (d.terjual > 0 || d.rusak > 0 || d.retur > 0) {
      var { data: existing } = await _supabase.from('consignment_stock').select('*').eq('customer_id', customerId).eq('produk_id', d.produk_id).single();
      if (existing) { await _supabase.from('consignment_stock').update({ qty_terjual: (existing.qty_terjual || 0) + (d.terjual || 0), qty_retur: (existing.qty_retur || 0) + (d.retur || 0), qty_rusak: (existing.qty_rusak || 0) + (d.rusak || 0), qty_sisa: d.sisa_fisik }).eq('id', existing.id); }
      else { await _supabase.from('consignment_stock').insert({ customer_id: customerId, produk_id: d.produk_id, sales_id: salesId, qty_titip_awal: 0, qty_terjual: d.terjual, qty_retur: d.retur, qty_rusak: d.rusak, qty_sisa: d.sisa_fisik, target_display: d.target_display }); }
    }
    if (d.retur > 0) {
      await _supabase.from('returns').insert({ kunjungan_id: visit.kunjungan_id || visit.id, customer_id: customerId, sales_id: salesId, produk_id: d.produk_id, qty_retur: d.retur, alasan: 'TIDAK_LAKU', tujuan: 'MASUK_GUDANG' });
      var { data: gudang } = await _supabase.from('warehouse_stock').select('*').eq('produk_id', d.produk_id).single();
      if (gudang) { await _supabase.from('warehouse_stock').update({ qty_in: (gudang.qty_in || 0) + (d.retur || 0), qty_remaining: (gudang.qty_remaining || 0) + (d.retur || 0) }).eq('id', gudang.id); }
      else { await _supabase.from('warehouse_stock').insert({ produk_id: d.produk_id, qty_in: d.retur, qty_out: 0, qty_remaining: d.retur, unit: 'PCS' }); }
    }
  }
  var invoiceId = null;
  if (invoiceTotal > 0) {
    var tempo = 30;
    var { data: cust } = await _supabase.from('customers').select('payment_term').eq('customer_id', customerId).single();
    if (cust?.payment_term) tempo = parseInt(cust.payment_term) || 30;
    var jatuhTempo = new Date(); jatuhTempo.setDate(jatuhTempo.getDate() + tempo);
    var { data: inv, error: invErr } = await _supabase.from('invoices').insert({ kunjungan_id: visit.kunjungan_id || visit.id, customer_id: customerId, sales_id: salesId, total: invoiceTotal, status_pembayaran: 'OPEN', tanggal_invoice: new Date().toISOString(), tanggal_jatuh_tempo: jatuhTempo.toISOString() }).select().single();
    if (!invErr && inv) {
      invoiceId = inv.id;
      for (var dd of details || []) {
        if (dd.terjual > 0) {
          var { data: prod } = await _supabase.from('products').select('hpp').eq('id', dd.produk_id).single();
          var hpp = prod?.hpp || 0;
          await _supabase.from('invoice_details').insert({ invoice_id: inv.id, produk_id: dd.produk_id, qty: dd.terjual, harga_jual: dd.harga_jual, subtotal: dd.subtotal, hpp_satuan: hpp, laba: dd.subtotal - (dd.terjual * hpp) });
        }
      }
      await _supabase.from('receivables').insert({ invoice_id: inv.id, customer_id: customerId, sales_id: salesId, total_piutang: invoiceTotal, sisa_piutang: invoiceTotal, status: 'OPEN', tanggal_invoice: new Date().toISOString(), tanggal_jatuh_tempo: jatuhTempo.toISOString() });
    }
  }
  await _supabase.from('visits').update({ status: 'COMPLETED', end_time: new Date().toISOString() }).eq('kunjungan_id', visit.kunjungan_id || visit.id);
  var { data: allProduk } = await _supabase.from('products').select('*');
  var restockItems = (details || []).filter(function(dd) { return dd.rekomendasi_restock > 0; }).map(function(dd) {
    var pr = (allProduk || []).filter(function(p) { return p.id === dd.produk_id; })[0] || {};
    return { produk_id: dd.produk_id, produk_nama: pr.name || dd.produk_id, qty: dd.rekomendasi_restock };
  });
  return ok({ kunjungan_id: visit.kunjungan_id || visit.id, invoice_id: invoiceId, total_terjual: visit.total_sold, total_invoice: invoiceTotal, has_restock_recommendation: restockItems.length > 0, restock_items: restockItems }, 'Kunjungan berhasil difinalisasi');
};

bridge._actions['cancelKunjungan'] = async (params) => {
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*').eq('kunjungan_id', params.kunjunganId).single();
  if (!visit) return fail('Kunjungan tidak ditemukan');
  if (session.role === 'SALES' && visit.sales_id !== (session.user?.user_metadata?.sales_id || '')) return fail('Akses ditolak');
  if (visit.status === 'DRAFT') { await _supabase.from('visits').update({ status: 'CANCELLED', end_time: new Date().toISOString() }).eq('kunjungan_id', params.kunjunganId); return ok(null, 'Kunjungan draft dibatalkan'); }
  if (visit.status === 'COMPLETED') {
    if (visit.total_invoice > 0) {
      var { data: invoices } = await _supabase.from('invoices').select('*').eq('kunjungan_id', visit.kunjungan_id || visit.id);
      for (var inv of invoices || []) { await _supabase.from('invoices').update({ status_pembayaran: 'VOID' }).eq('id', inv.id); await _supabase.from('receivables').update({ status: 'VOID' }).eq('invoice_id', inv.id); }
    }
    await _supabase.from('visits').update({ status: 'CANCELLED', end_time: new Date().toISOString() }).eq('kunjungan_id', params.kunjunganId);
    return ok(null, 'Kunjungan dibatalkan, invoice & piutang dibatalkan');
  }
  return fail('Kunjungan sudah ' + visit.status + ', tidak bisa dibatalkan');
};

bridge._actions['restockFromKunjungan'] = async (params) => {
  const session = await requireAuth();
  const { data: visit } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('kunjungan_id', params.kunjunganId).single();
  if (!visit || visit.status !== 'COMPLETED') return fail('Kunjungan harus difinalisasi dulu');
  const { data: details } = await _supabase.from('visit_details').select('*').eq('kunjungan_id', visit.kunjungan_id || visit.id);
  var items = (details || []).filter(function(d) { return d.rekomendasi_restock > 0; }).map(function(d) { return { produk_id: d.produk_id, qty: d.rekomendasi_restock }; });
  if (!items.length) return fail('Tidak ada rekomendasi restock');
  var { data: shp, error: shpErr } = await _supabase.from('shipments').insert({ customer_id: visit.customer_id, sales_id: visit.sales_id, type: 'RESTOCK', status: 'SHIPPED', total_items: items.length, total_qty: items.reduce(function(s, i) { return s + i.qty; }, 0), notes: 'Restock otomatis dari kunjungan ' + (visit.kunjungan_id || visit.id) }).select().single();
  if (shpErr) return fail(shpErr.message);
  for (var item of items) {
    await _supabase.from('shipment_details').insert({ shipment_id: shp.id, produk_id: item.produk_id, qty: item.qty });
    var { data: cs } = await _supabase.from('consignment_stock').select('*').eq('customer_id', visit.customer_id).eq('produk_id', item.produk_id).single();
    if (cs) { await _supabase.from('consignment_stock').update({ qty_titip_awal: (cs.qty_titip_awal || 0) + item.qty, qty_sisa: (cs.qty_sisa || 0) + item.qty }).eq('id', cs.id); }
    else { await _supabase.from('consignment_stock').insert({ customer_id: visit.customer_id, produk_id: item.produk_id, sales_id: visit.sales_id, qty_titip_awal: item.qty, qty_terjual: 0, qty_sisa: item.qty }); }
  }
  return ok(null, 'Restock berhasil');
};

bridge._actions['uploadFotoKunjungan'] = async (params) => {
  var kunjunganId = params.kunjunganId, tipe = params.tipe || 'sebelum', dataUrl = params.dataUrl;
  if (!kunjunganId || !dataUrl) return fail('Parameter kurang');
  var { data: visit } = await _supabase.from('visits').select('photos').eq('kunjungan_id', kunjunganId).single();
  var arr = []; try { arr = JSON.parse(visit?.photos || '[]'); } catch(e) { arr = []; } if (!Array.isArray(arr)) arr = [];
  var entry = { url: dataUrl }; if (params.latitude && params.longitude) { entry.lat = params.latitude; entry.lng = params.longitude; }
  if (tipe === 'sesudah') { arr[1] = entry; if (arr.length < 2) arr.push(entry); } else { arr[0] = entry; if (arr.length < 1) arr.push(entry); }
  await _supabase.from('visits').update({ photos: JSON.stringify(arr) }).eq('kunjungan_id', kunjunganId);
  return ok(null, 'Foto berhasil diupload');
};

// ═══════════════════════════════════════════════════════════════════
// STOCK ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getStokGudang'] = async () => {
  const { data } = await _supabase.from('warehouse_stock').select('*, products(*)');
  return ok(data);
};

bridge._actions['updateStokGudang'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('warehouse_stock').update({
    batch_number: d.batch_number,
    qty_in: d.qty_masuk,
    qty_out: d.qty_keluar,
    qty_remaining: d.qty_sisa,
    unit: d.satuan,
  }).eq('id', params.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Stok berhasil diupdate');
};

bridge._actions['deleteStokGudang'] = async (params) => {
  const { error } = await _supabase.from('warehouse_stock').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Stok berhasil dihapus');
};

bridge._actions['getStokKonsinyasi'] = async () => {
  const { data } = await _supabase.from('consignment_stock').select('*, customers(*), sales(*), products(*)');
  return ok(data);
};

bridge._actions['updateStokKonsinyasi'] = async (params) => {
  const d = params.data || params;
  const { data, error } = await _supabase.from('consignment_stock').update({
    qty_titip_awal: d.qty_titip,
    qty_terjual: d.qty_terjual,
    qty_retur: d.qty_retur,
    qty_sisa: d.qty_sisa,
    target_display: d.target_display,
  }).eq('id', params.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Stok konsinyasi berhasil diupdate');
};

bridge._actions['deleteStokKonsinyasi'] = async (params) => {
  const { error } = await _supabase.from('consignment_stock').delete().eq('id', params.id);
  if (error) return fail(error.message);
  return ok(null, 'Stok konsinyasi berhasil dihapus');
};

// ═══════════════════════════════════════════════════════════════════
// INVOICE / PIUTANG ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getInvoices'] = async (params) => {
  let query = _supabase.from('invoices').select('*, customers(*), sales(*)');
  if (params?.customer_id) query = query.eq('customer_id', params.customer_id);
  if (params?.sales_id) query = query.eq('sales_id', params.sales_id);
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['getPiutang'] = async () => {
  const { data } = await _supabase.from('receivables').select('*, customers(*), sales(*), invoices(*)');
  return ok(data);
};

bridge._actions['getAgingPiutang'] = async () => {
  const { data } = await _supabase.from('receivables').select('*, customers(*), sales(*)');
  return ok(data);
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['createPembayaran'] = async (params) => {
  const { data, error } = await _supabase.from('payments').insert({
    invoice_id: params.invoice_id,
    customer_id: params.customer_id,
    sales_id: params.sales_id,
    amount: params.amount,
    payment_method: params.metode,
    notes: params.notes,
    payment_date: new Date().toISOString(),
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Pembayaran berhasil');
};

// ═══════════════════════════════════════════════════════════════════
// COMMISSION ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getKomisi'] = async (params) => {
  let query = _supabase.from('commissions').select('*, customers(*), sales(*), invoices(*)');
  if (params?.sales_id) query = query.eq('sales_id', params.sales_id);
  const { data } = await query.order('created_at', { ascending: false });
  return ok(data);
};

bridge._actions['cairkanKomisi'] = async (params) => {
  const { data, error } = await _supabase.from('commissions').update({
    status: 'PAID',
    paid_date: new Date().toISOString(),
  }).eq('id', params.id).select().single();
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
  const session = await requireAuth();
  const { data, error } = await _supabase.from('expenses').insert({
    category: params.kategori,
    description: params.deskripsi,
    amount: params.jumlah,
    date: params.tanggal || new Date().toISOString(),
    payment_method: params.metode,
    notes: params.catatan,
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
  return ok(data);
};

bridge._actions['createProduksi'] = async (params) => {
  const session = await requireAuth();
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
    created_by: session.user.id,
  }).select().single();
  if (error) return fail(error.message);
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
    await _supabase.from('shipment_details').insert({ shipment_id: shp.id, produk_id: item.produk_id, qty: item.qty });
    var { data: cs } = await _supabase.from('consignment_stock').select('*').eq('customer_id', d.customer_id).eq('produk_id', item.produk_id).single();
    if (cs) { await _supabase.from('consignment_stock').update({ qty_titip_awal: (cs.qty_titip_awal || 0) + item.qty, qty_sisa: (cs.qty_sisa || 0) + item.qty }).eq('id', cs.id); }
    else { await _supabase.from('consignment_stock').insert({ customer_id: d.customer_id, produk_id: item.produk_id, sales_id: salesId, qty_titip_awal: item.qty, qty_terjual: 0, qty_retur: 0, qty_sisa: item.qty }); }
  }
  return ok(shp, 'Titipan berhasil');
};

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['getOwnerDashboard'] = async () => {
  const [sales, customers, products, visits, unpaidInv, piutang, produksi, stok, konsinyasi] = await Promise.all([
    safeCount('sales'), safeCount('customers'), safeCount('products'),
    safeCount('visits'), safeCount('invoices', { status: 'UNPAID' }),
    safeCount('receivables'), safeCount('productions'),
    safeList('warehouse_stock'), safeCount('consignment_stock'),
  ]);

  return ok({
    kpi: {
      omzet_hari_ini: 0,
      omzet_bulan_ini: 0,
      laba_kotor: 0,
      laba_bersih: 0,
      piutang_aktif: piutang.count || 0,
      stok_gudang: (stok.data || []).length,
      stok_konsinyasi: konsinyasi.count || 0,
      komisi_bulan_ini: 0,
    },
    top_produk: [],
    top_sales: [],
    chart_harian: [],
    chart_bulanan: [],
    // Keep original fields for backward compat
    total_sales: sales.count,
    total_customers: customers.count,
    total_products: products.count,
    total_visits: visits.count,
    total_unpaid_invoices: unpaidInv.count,
    total_piutang: piutang.count,
    total_productions: produksi.count,
    warehouse_stock: stok.data || [],
  });
};

bridge._actions['getSalesDashboard'] = async () => {
  const profile = await getCurrentProfile();
  const [visits, customers, invoices] = await Promise.all([
    _supabase.from('visits').select('*', { count: 'exact', head: true }).eq('sales_id', profile.sales_id),
    _supabase.from('customers').select('*').eq('sales_id', profile.sales_id),
    _supabase.from('invoices').select('*').eq('sales_id', profile.sales_id),
  ]);

  return ok({
    kpi: {
      omzet_bulan_ini: 0,
      piutang_aktif: 0,
      stok_konsinyasi: 0,
      komisi_bulan_ini: 0,
    },
    total_visits: visits.count,
    customers: (customers.data || []).map(c => mapFields(c, customerMap)),
    invoices: invoices.data || [],
    top_produk: [],
    chart_harian: [],
    chart_bulanan: [],
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
  const { data, error } = await _supabase.from('settings').update({
    value: String(params.value),
  }).eq('id', params.id).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Setting berhasil diupdate');
};

// ═══════════════════════════════════════════════════════════════════
// REPORT ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['generateReport'] = async (params) => {
  switch (params.type) {
    // ── 1. Penjualan Harian (7 hari terakhir) ────────────────────
    case 'penjualan_harian': {
      const { data: invoices } = await _supabase.from('invoices').select('total, tanggal_invoice');
      const result = [];
      for (let d = 6; d >= 0; d--) {
        const tgl = new Date(); tgl.setDate(tgl.getDate() - d);
        const tglStr = tgl.toISOString().substring(0, 10);
        const filtered = (invoices || []).filter(function(inv) {
          return inv.tanggal_invoice && inv.tanggal_invoice.substring(0, 10) === tglStr;
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
      const { data: invoices } = await _supabase.from('invoices').select('total, tanggal_invoice');
      const result = [];
      for (let m = 11; m >= 0; m--) {
        const d = new Date(); d.setMonth(d.getMonth() - m);
        const bulan = d.getMonth() + 1;
        const tahun = d.getFullYear();
        const filtered = (invoices || []).filter(function(inv) {
          if (!inv.tanggal_invoice) return false;
          const id = new Date(inv.tanggal_invoice);
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
      const { data: invoices } = await _supabase.from('invoices').select('total, tanggal_invoice');
      const data = {};
      (invoices || []).forEach(function(inv) {
        if (!inv.tanggal_invoice) return;
        const tgl = new Date(inv.tanggal_invoice);
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
        data[pid].laba += d.laba || 0;
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
          piutang_id: p.piutang_id || p.id,
          customer_nama: c.store_name || c.name || p.customer_id,
          total_piutang: p.total_piutang || 0,
          sisa_piutang: p.sisa_piutang || 0,
          status: p.status || ''
        };
      });
      return ok(result);
    }
    // ── 8. Pembayaran ───────────────────────────────────────────
    case 'pembayaran': {
      const { data } = await _supabase.from('payments').select('*, customers(*)');
      const result = (data || []).map(function(p) {
        const c = p.customers || {};
        return {
          pembayaran_id: p.pembayaran_id || p.id,
          customer_nama: c.store_name || c.name || p.customer_id,
          jumlah_bayar: p.amount || 0,
          metode_bayar: p.payment_method || '',
          tanggal: p.payment_date || p.created_at || ''
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
          komisi_id: k.komisi_id || k.id,
          sales_nama: s.full_name || s.name || k.sales_id,
          nilai_komisi: k.nilai_komisi || 0,
          periode_bulan: k.periode_bulan || 0,
          periode_tahun: k.periode_tahun || 0,
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
          retur_id: r.retur_id || r.id,
          produk_nama: p.name || r.product_id,
          customer_id: r.customer_id || '',
          qty_retur: r.qty_retur || 0,
          alasan: r.alasan_retur || r.alasan || ''
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
        data[key].total_hpp += (d.hpp_satuan || 0) * (d.qty || 0);
        data[key].laba_kotor += d.laba || 0;
      });
      return ok(Object.values(data).sort(function(a, b) { return a.periode < b.periode ? -1 : 1; }));
    }
    // ── 12. Laba Bersih ──────────────────────────────────────────
    case 'laba_bersih': {
      const [detailsRes, expensesRes, commissionsRes] = await Promise.all([
        _supabase.from('invoice_details').select('subtotal, laba'),
        _supabase.from('expenses').select('amount'),
        _supabase.from('commissions').select('nilai_komisi'),
      ]);
      const details = detailsRes.data || [];
      const expenses = expensesRes.data || [];
      const commissions = commissionsRes.data || [];
      const totalPenjualan = details.reduce(function(s, d) { return s + (d.subtotal || 0); }, 0);
      const totalLabaKotor = details.reduce(function(s, d) { return s + (d.laba || 0); }, 0);
      const totalBiaya = expenses.reduce(function(s, b) { return s + (b.amount || 0); }, 0);
      const totalKomisi = commissions.reduce(function(s, k) { return s + (k.nilai_komisi || 0); }, 0);
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
      const { data: invoices } = await _supabase.from('invoices').select('total, status_pembayaran, tanggal_invoice');
      const now = new Date();
      const startDate = params.tanggal_mulai || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = params.tanggal_selesai || now.toISOString();
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      var totalOmzet = 0, totalLunas = 0, totalPiutang = 0;
      (invoices || []).forEach(function(inv) {
        if (!inv.tanggal_invoice) return;
        const t = new Date(inv.tanggal_invoice).getTime();
        if (t >= startMs && t <= endMs) {
          totalOmzet += inv.total || 0;
          if (inv.status_pembayaran === 'PAID') totalLunas += inv.total || 0;
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
          qty_titip_awal: s.qty_titip_awal || 0,
          qty_terjual: s.qty_terjual || 0,
          qty_retur: s.qty_retur || 0,
          qty_sisa: s.qty_sisa || 0
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
        const sisa = s.qty_sisa || 0;
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
    default:
      return fail('Unknown report type: ' + params.type);
  }
};

// ═══════════════════════════════════════════════════════════════════
// OTHER ACTIONS
// ═══════════════════════════════════════════════════════════════════

bridge._actions['ping'] = async () => ok(null, 'pong');
bridge._actions['changePassword'] = async (params) => {
  const { error } = await _supabase.auth.updateUser({ password: params.password_baru });
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
bridge._actions['getNotifikasi'] = async () => ok([]);
bridge._actions['getVisitReminders'] = async () => ok([]);
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
bridge._actions['getAllRiwayatKunjungan'] = async () => {
  const { data } = await _supabase.from('visits').select('*, customers(*), sales(*)').order('created_at', { ascending: false });
  return ok(data || []);
};
bridge._actions['getStockPredictions'] = async () => ok([]);
bridge._actions['getKunjunganData'] = async (params) => {
  const { data } = await _supabase.from('visits').select('*, customers(*), sales(*)').eq('id', params.kunjunganId).single();
  return ok(data);
};
bridge._actions['getLogs'] = async () => {
  const { data } = await _supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
  return ok(data || []);
};

bridge._actions['updateProfile'] = async (params) => {
  const profile = await getCurrentProfile();
  const { data, error } = await _supabase.from('users').update({
    full_name: params.full_name,
    phone: params.phone,
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
  const { data, error } = await _supabase.from('bank_accounts').insert({
    bank_name: params.nama_bank,
    account_number: params.no_rekening,
    account_name: params.atas_nama,
    initial_balance: params.saldo_awal || 0,
    current_balance: params.saldo_awal || 0,
  }).select().single();
  if (error) return fail(error.message);
  return ok(data, 'Rekening berhasil dibuat');
};

bridge._actions['updateRekening'] = async (params) => {
  const { data, error } = await _supabase.from('bank_accounts').update({
    bank_name: params.nama_bank,
    account_number: params.no_rekening,
    account_name: params.atas_nama,
  }).eq('id', params.id).select().single();
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
  const { data } = await _supabase.from('cash_transactions')
    .select('*')
    .eq('bank_account_id', params.rekening_id)
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
  await _supabase.from('notifications').update({ is_read: true }).eq('id', params.id);
  return ok(null, 'Notifikasi dibaca');
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

// window.api NOT overridden here — the build script replaces
// google.script.run calls in the main api() function with
// direct bridge._routeAction calls at build time.
