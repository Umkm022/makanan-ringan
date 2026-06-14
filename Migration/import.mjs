import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'supabase-config.json'), 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.serviceRoleKey);

const EXPORT_PATH = resolve(__dirname, 'supabase-export-2026-06-13.json');
const MAPPING_PATH = resolve(__dirname, 'id-mapping.json');

// ── Load export ─────────────────────────────────────────────────────
function loadExport() {
  if (!existsSync(EXPORT_PATH)) throw new Error(`Export file not found: ${EXPORT_PATH}`);
  return JSON.parse(readFileSync(EXPORT_PATH, 'utf8'));
}

// ── Generate UUID mapping ───────────────────────────────────────────
function buildIdMap(data) {
  const map = new Map(); // oldId → { newId, table }

  // seed categories
  map.set('KAT-001', { newId: randomUUID(), table: 'categories' });
  map.set('KAT-002', { newId: randomUUID(), table: 'categories' });

  const sheets = [
    ['01_USERS',       'users',            'user_id'],
    ['02_SALES',       'sales',            'sales_id'],
    ['04_CUSTOMERS',   'customers',        'customer_id'],
    ['06_PRODUK',      'products',         'produk_id'],
    ['07_SETTING',     'settings',         'setting_id'],
    ['08_PRODUKSI',   'productions',      'produksi_id'],
    ['09_STOK_GUDANG','warehouse_stock',   'stok_gudang_id'],
    ['24_LOG_AKTIVITAS','activity_logs',   'log_id'],
    ['27_TARGET_SALES','sales_targets',    'target_id'],
  ];

  for (const [sheet, table, pkField] of sheets) {
    const rows = data[sheet];
    if (!rows) continue;
    for (const row of rows) {
      const oldId = row[pkField];
      if (oldId && oldId !== '') {
        map.set(oldId, { newId: randomUUID(), table });
      }
    }
  }

  // visits have no IDs, generate placeholders
  const visits = data['14_KUNJUNGAN_HEADER'] || [];
  for (let i = 0; i < visits.length; i++) {
    map.set(`__VISIT_${i}__`, { newId: randomUUID(), table: 'visits' });
  }

  return map;
}

// ── Field transforms ────────────────────────────────────────────────
function xform(oldRow, fieldMap) {
  const out = {};
  for (const [oldK, newK] of Object.entries(fieldMap)) {
    if (oldK in oldRow) {
      let val = oldRow[oldK];
      if (val === '' || val === undefined) val = null;
      out[newK] = val;
    }
  }
  return out;
}

// ── Batch upsert ────────────────────────────────────────────────────
async function upsert(table, records) {
  if (records.length === 0) return { count: 0, errors: [] };
  const { error } = await supabase.from(table).upsert(records, { ignoreDuplicates: false });
  if (error) {
    return { count: 0, errors: records.map((r, i) => `Row ${i}: ${error.message}`) };
  }
  return { count: records.length, errors: [] };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const data = loadExport();
  const idMap = buildIdMap(data);

  // Helper to resolve FK
  const resolveFk = (oldId, targetTable) => {
    if (!oldId || oldId === null) return null;
    const entry = idMap.get(oldId);
    if (!entry || entry.table !== targetTable) return null;
    return entry.newId;
  };

  const errors = [];
  let total = 0;

  // ════════════════════════════════════════════════════════════════
  // 1. categories (seed data — export has no rows)
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- Seeding: categories ---');
  const catRows = [
    { id: idMap.get('KAT-001').newId, name: 'Seblak', description: 'Seblak kering varian rasa', created_at: new Date().toISOString() },
    { id: idMap.get('KAT-002').newId, name: 'Stik Seblak', description: 'Stik seblak gurih renyah', created_at: new Date().toISOString() },
  ];
  for (const r of catRows) {
    const { error } = await supabase.from('categories').upsert(r);
    if (error) { errors.push(`categories ${r.id}: ${error.message}`); console.error(`  ✗ ${r.name}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${r.name}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 2. sales (NO FK to users; users link TO sales)
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 02_SALES → sales ---');
  for (const row of (data['02_SALES'] || [])) {
    const newId = idMap.get(row.sales_id).newId;
    // Export: sales_id, user_id, sales_code, full_name, phone, address, kota, komisi_rate, target_bulanan, status, join_date, total_kunjungan, total_omzet, total_komisi_cair, photo_url, created_at, updated_at
    // Schema: id, code, full_name, phone, address, city, komisi_rate, target_bulanan, status, join_date, total_visits, total_omzet, total_commission_paid, photo_url, created_at, updated_at
    const rec = {
      id: newId,
      code: row.sales_code,
      full_name: row.full_name,
      phone: row.phone || null,
      address: row.address || null,
      city: row.kota || null,
      komisi_rate: row.komisi_rate,
      target_bulanan: row.target_bulanan,
      status: row.status,
      join_date: row.join_date || null,
      total_visits: row.total_kunjungan || 0,
      total_omzet: row.total_omzet || 0,
      total_commission_paid: row.total_komisi_cair || 0,
      photo_url: row.photo_url || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('sales').upsert(rec);
    if (error) { errors.push(`sales ${row.sales_id}: ${error.message}`); console.error(`  ✗ ${row.sales_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.sales_id} → ${row.full_name}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 3. users (set sales_id for salespeople)
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 01_USERS → users ---');
  const salesByUserId = {};
  for (const s of (data['02_SALES'] || [])) {
    if (s.user_id) salesByUserId[s.user_id] = s.sales_id;
  }
  for (const row of (data['01_USERS'] || [])) {
    const newId = idMap.get(row.user_id).newId;
    // Export: user_id, username, email, password_hash, role, full_name, phone, is_active, last_login, created_at, updated_at
    // Schema: id, auth_id, username, email, role, full_name, phone, is_active, sales_id, last_login, created_at, updated_at
    const matchedSalesId = salesByUserId[row.user_id];
    const rec = {
      id: newId,
      auth_id: null, // will be linked to Supabase Auth later
      username: row.username,
      email: row.email,
      role: row.role,
      full_name: row.full_name,
      phone: row.phone || null,
      is_active: row.is_active !== undefined ? row.is_active : true,
      sales_id: matchedSalesId ? resolveFk(matchedSalesId, 'sales') : null,
      last_login: row.last_login || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('users').upsert(rec);
    if (error) { errors.push(`users ${row.user_id}: ${error.message}`); console.error(`  ✗ ${row.user_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.user_id} → ${row.username}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 4. customers
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 04_CUSTOMERS → customers ---');
  for (const row of (data['04_CUSTOMERS'] || [])) {
    const newId = idMap.get(row.customer_id).newId;
    // Schema: id, sales_id, store_name, owner_name, phone, address, city, district, latitude, longitude, status, store_type, credit_limit, payment_term, last_visit, visit_count, total_omzet, total_piutang, notes, created_at, updated_at
    const rec = {
      id: newId,
      sales_id: resolveFk(row.sales_id, 'sales'),
      store_name: row.store_name,
      owner_name: row.owner_name,
      phone: row.phone || null,
      address: row.address || null,
      city: row.kota || null,
      district: row.kecamatan || null,
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      status: row.status,
      store_type: row.tipe_toko || null,
      credit_limit: row.limit_piutang || 0,
      payment_term: row.tempo_pembayaran || null,
      last_visit: row.last_visit || null,
      visit_count: row.visit_count || 0,
      total_omzet: row.total_omzet || 0,
      total_piutang: row.total_piutang || 0,
      notes: row.notes || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('customers').upsert(rec);
    if (error) { errors.push(`customers ${row.customer_id}: ${error.message}`); console.error(`  ✗ ${row.customer_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.customer_id} → ${row.store_name}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 5. products
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 06_PRODUK → products ---');
  for (const row of (data['06_PRODUK'] || [])) {
    const newId = idMap.get(row.produk_id).newId;
    // Schema: id, category_id, code, name, variant, description, packaging, unit, price, retail_price, hpp, target_display, min_stock, is_active, image_url, created_at, updated_at
    const rec = {
      id: newId,
      category_id: resolveFk(row.kategori_id, 'categories'),
      code: row.kode_produk,
      name: row.nama_produk,
      variant: row.varian || null,
      description: row.deskripsi || null,
      packaging: row.kemasan || null,
      unit: row.satuan || null,
      price: row.harga_jual || 0,
      retail_price: row.harga_ecer || 0,
      hpp: row.hpp || 0,
      target_display: row.target_display || 0,
      min_stock: row.stok_minimum || 0,
      is_active: row.is_active !== undefined ? row.is_active : true,
      image_url: row.gambar_url || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('products').upsert(rec);
    if (error) { errors.push(`products ${row.produk_id}: ${error.message}`); console.error(`  ✗ ${row.produk_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.produk_id} → ${row.nama_produk}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 6. settings
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 07_SETTING → settings ---');
  for (const row of (data['07_SETTING'] || [])) {
    const newId = idMap.get(row.setting_id).newId;
    // Schema: id, group_name, key, value, data_type, description, updated_by, updated_at
    const rec = {
      id: newId,
      group_name: row.group_setting,
      key: row.key,
      value: String(row.value),
      data_type: row.tipe_data || null,
      description: row.deskripsi || null,
      updated_by: null, // 'updated_by' is UUID type; export has "SYSTEM" string, skip
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('settings').upsert(rec);
    if (error) { errors.push(`settings ${row.setting_id}: ${error.message}`); console.error(`  ✗ ${row.setting_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.setting_id} → ${row.key}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 7. productions
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 08_PRODUKSI → productions ---');
  for (const row of (data['08_PRODUKSI'] || [])) {
    const newId = idMap.get(row.produksi_id).newId;
    // Schema: id, product_id, batch_number, qty, hpp_per_unit, total_hpp, production_date, expiry_date, notes, created_by, created_at, updated_at
    const rec = {
      id: newId,
      product_id: resolveFk(row.produk_id, 'products'),
      batch_number: row.batch_number,
      qty: row.qty_produksi || 0,
      hpp_per_unit: row.hpp_per_unit || 0,
      total_hpp: row.total_hpp || 0,
      production_date: row.tanggal_produksi || null,
      expiry_date: row.tanggal_expired || null,
      notes: row.keterangan || null,
      created_by: resolveFk(row.created_by, 'users'),
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('productions').upsert(rec);
    if (error) { errors.push(`productions ${row.produksi_id}: ${error.message}`); console.error(`  ✗ ${row.produksi_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.produksi_id}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 8. warehouse_stock
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 09_STOK_GUDANG → warehouse_stock ---');
  for (const row of (data['09_STOK_GUDANG'] || [])) {
    const newId = idMap.get(row.stok_gudang_id).newId;
    // Schema: id, product_id, batch_number, qty_in, qty_out, qty_remaining, unit, updated_at, created_at
    const rec = {
      id: newId,
      product_id: resolveFk(row.produk_id, 'products'),
      batch_number: row.batch_number,
      qty_in: row.qty_masuk || 0,
      qty_out: row.qty_keluar || 0,
      qty_remaining: row.qty_sisa || 0,
      unit: row.satuan || null,
      updated_at: row.tanggal_update || null,
      created_at: row.created_at || null,
    };
    const { error } = await supabase.from('warehouse_stock').upsert(rec);
    if (error) { errors.push(`warehouse_stock ${row.stok_gudang_id}: ${error.message}`); console.error(`  ✗ ${row.stok_gudang_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.stok_gudang_id}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 9. visits (records have empty IDs — assign generated UUIDs)
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 14_KUNJUNGAN_HEADER → visits ---');
  const visitRows = data['14_KUNJUNGAN_HEADER'] || [];
  for (let i = 0; i < visitRows.length; i++) {
    const row = visitRows[i];
    const newId = idMap.get(`__VISIT_${i}__`).newId;
    // Schema: id, customer_id, sales_id, visit_date, start_time, end_time, status, total_sold, total_returned, total_invoice, notes, photo_toko, latitude, longitude, has_restock, created_at, updated_at
    const rec = {
      id: newId,
      customer_id: row.customer_id && row.customer_id !== '' ? resolveFk(row.customer_id, 'customers') : null,
      sales_id: row.sales_id && row.sales_id !== '' ? resolveFk(row.sales_id, 'sales') : null,
      visit_date: row.tanggal_kunjungan || null,
      start_time: row.waktu_mulai || null,
      end_time: row.waktu_selesai || null,
      status: row.status || null,
      total_sold: row.total_terjual && row.total_terjual !== '' ? Number(row.total_terjual) : 0,
      total_returned: row.total_retur && row.total_retur !== '' ? Number(row.total_retur) : 0,
      total_invoice: row.total_invoice && row.total_invoice !== '' ? Number(row.total_invoice) : 0,
      notes: row.notes || null,
      photo_toko: row.foto_toko || null,
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      has_restock: row.has_restock || false,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('visits').upsert(rec);
    if (error) { errors.push(`visits [${i}]: ${error.message}`); console.error(`  ✗ visit ${i}: ${error.message}`); }
    else { total++; console.log(`  ✓ visit ${i} (${rec.customer_id || 'no-customer'})`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 10. activity_logs
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 24_LOG_AKTIVITAS → activity_logs ---');
  for (const row of (data['24_LOG_AKTIVITAS'] || [])) {
    const newId = idMap.get(row.log_id).newId;
    // Schema: id, user_id, activity_type, module, source_id, description, old_data, new_data, ip_address, user_agent, created_at
    const rec = {
      id: newId,
      user_id: resolveFk(row.user_id, 'users'),
      activity_type: row.tipe_aktivitas,
      module: row.modul,
      source_id: row.source_id || null,
      description: row.deskripsi || null,
      old_data: row.data_lama || null,
      new_data: row.data_baru || null,
      ip_address: row.ip_address || null,
      user_agent: row.user_agent || null,
      created_at: row.created_at || null,
    };
    const { error } = await supabase.from('activity_logs').upsert(rec);
    if (error) { errors.push(`activity_logs ${row.log_id}: ${error.message}`); console.error(`  ✗ ${row.log_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.log_id}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 11. sales_targets
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- 27_TARGET_SALES → sales_targets ---');
  for (const row of (data['27_TARGET_SALES'] || [])) {
    const newId = idMap.get(row.target_id).newId;
    // Schema: id, sales_id, month, year, target_omzet, target_visits, target_new_customers, commission_target, achievement_omzet, achievement_visits, percentage, created_at, updated_at
    const rec = {
      id: newId,
      sales_id: resolveFk(row.sales_id, 'sales'),
      month: row.bulan,
      year: row.tahun,
      target_omzet: row.target_omzet || 0,
      target_visits: row.target_kunjungan || 0,
      target_new_customers: row.target_customer_baru || 0,
      commission_target: row.komisi_target || 0,
      achievement_omzet: row.pencapaian_omzet || 0,
      achievement_visits: row.pencapaian_kunjungan || 0,
      percentage: row.persentase_pencapaian || 0,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null,
    };
    const { error } = await supabase.from('sales_targets').upsert(rec);
    if (error) { errors.push(`sales_targets ${row.target_id}: ${error.message}`); console.error(`  ✗ ${row.target_id}: ${error.message}`); }
    else { total++; console.log(`  ✓ ${row.target_id}`); }
  }

  // ════════════════════════════════════════════════════════════════
  // 12. _migration_map
  // ════════════════════════════════════════════════════════════════
  console.log('\n--- _migration_map ---');
  let mapCount = 0;
  for (const [oldId, entry] of idMap) {
    if (oldId.startsWith('__')) continue; // skip placeholder IDs
    const { error } = await supabase.from('_migration_map').upsert({
      old_id: oldId,
      new_id: entry.newId,
      table_name: entry.table,
      migrated_at: new Date().toISOString(),
    });
    if (error) {
      console.error(`  ⚠ _migration_map ${oldId}: ${error.message}`);
    } else {
      mapCount++;
    }
  }
  console.log(`  ✓ ${mapCount} mappings saved`);

  // ════════════════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════════════════
  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`  Inserted: ${total} rows`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
    writeFileSync(resolve(__dirname, 'import-errors.json'), JSON.stringify(errors, null, 2), 'utf8');
    console.log('  Details saved to migration/import-errors.json');
    for (const e of errors.slice(0, 10)) console.log(`    - ${e}`);
  } else {
    console.log('  No errors!');
  }

  // Verify
  console.log('\n=== VERIFICATION ===');
  const tables = [
    'categories','users','sales','customers','products','settings',
    'productions','warehouse_stock','consignment_stock','stock_mutations',
    'visits','visit_details','returns','restocks','shipments','shipment_details',
    'invoices','invoice_details','receivables','payments','commissions',
    'expenses','bank_accounts','cash_transactions','sales_targets',
    'activity_logs','notifications','_migration_map',
  ];
  let grandTotal = 0;
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) console.log(`  ${t}: ERROR — ${error.message}`);
    else { console.log(`  ${t}: ${count} rows`); grandTotal += count; }
  }
  console.log(`\n  Grand total: ${grandTotal} rows`);

  // Save mapping
  const mapObj = {};
  for (const [oldId, entry] of idMap) {
    if (!oldId.startsWith('__')) mapObj[oldId] = { new_id: entry.newId, table: entry.table };
  }
  writeFileSync(MAPPING_PATH, JSON.stringify(mapObj, null, 2), 'utf8');
  console.log(`\nID mapping saved to ${MAPPING_PATH}`);
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
