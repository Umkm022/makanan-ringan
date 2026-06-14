// ═══════════════════════════════════════════════════════════════════
// MIGRASI: Buat Supabase Auth + users record untuk semua Sales lama
// yang belum punya akun login.
// 
// Cara pakai: node tests/migrate-sales-auth.mjs
// ═══════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://byuocfavyxlotmoslihv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nf3b87N70ut3fPWwDeeBUQ_XvJ15S0Q';

const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_PASSWORD = 'seblak123';
const results = { created: [], skipped: [], errors: [] };

async function main() {
  console.log('🔍 Mencari semua sales yang belum punya akun login...\n');

  // 1. Ambil semua sales dari tabel sales
  const { data: allSales, error: salesErr } = await _supabase
    .from('sales')
    .select('*');

  if (salesErr) { console.error('❌ Gagal query sales:', salesErr.message); process.exit(1); }
  if (!allSales || allSales.length === 0) { console.log('Tidak ada data sales.'); return; }

  console.log(`   Ditemukan ${allSales.length} sales di tabel sales.\n`);

  // 2. Ambil semua users yang sudah punya role SALES
  const { data: existingUsers } = await _supabase
    .from('users')
    .select('sales_id, username, email')
    .eq('role', 'SALES');

  const existingSalesIds = new Set((existingUsers || []).map(u => u.sales_id));
  const existingUsernames = new Set((existingUsers || []).map(u => u.username));

  var pending = allSales.filter(s => !existingSalesIds.has(s.id));
  var alreadyDone = allSales.filter(s => existingSalesIds.has(s.id));

  if (alreadyDone.length > 0) {
    console.log(`   ✅ ${alreadyDone.length} sales sudah punya akun (skip).`);
    alreadyDone.forEach(s => results.skipped.push(s.full_name || s.id));
  }

  if (pending.length === 0) {
    console.log('\n✅ Semua sales sudah punya akun login. Tidak perlu migrasi.');
    printSummary();
    return;
  }

  console.log(`   ⏳ ${pending.length} sales perlu dibuatkan akun...\n`);
  console.log('─'.repeat(60));

  // 3. Buat akun untuk setiap sales yang belum punya
  for (var i = 0; i < pending.length; i++) {
    var s = pending[i];
    var nama = s.full_name || 'Sales';
    var username = generateUsername(nama, existingUsernames);
    var email = username + '@sales.local';
    var password = DEFAULT_PASSWORD;

    process.stdout.write(`   [${i + 1}/${pending.length}] ${nama.padEnd(20)} → ${username}`);

    try {
      // 3a. Buat Supabase Auth account
      var { data: authData, error: authErr } = await _supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authErr) {
        // Coba dengan username berbeda jika email sudah terdaftar
        if (authErr.message.includes('already')) {
          var altEmail = username + '_' + s.id.substring(0, 6) + '@sales.local';
          var { data: authData2, error: authErr2 } = await _supabase.auth.signUp({
            email: altEmail, password: password,
          });
          if (authErr2) { throw new Error(authErr2.message); }
          authData = authData2;
          email = altEmail;
        } else {
          throw new Error(authErr.message);
        }
      }

      // 3b. Buat users table record
      var { error: userErr } = await _supabase.from('users').insert({
        auth_id: authData.user.id,
        username: username,
        email: email,
        role: 'SALES',
        full_name: nama,
        sales_id: s.id,
        is_active: true,
      });

      if (userErr) throw new Error(userErr.message);

      existingUsernames.add(username);
      results.created.push({ nama, username, password, sales_id: s.id });
      console.log(' ✅');
    } catch (err) {
      results.errors.push({ nama, error: err.message });
      console.log(' ❌ ' + err.message);
    }
  }

  printSummary();
}

function generateUsername(nama, existing) {
  // Ambil kata pertama dari nama, lowercase, tanpa spasi
  var base = nama.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
  if (!base) base = 'sales';
  if (!existing.has(base)) return base;
  // Tambahkan angka jika sudah ada
  for (var i = 1; i < 999; i++) {
    var candidate = base + i;
    if (!existing.has(candidate)) return candidate;
  }
  return base + Date.now();
}

function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 LAPORAN MIGRASI');
  console.log('═'.repeat(60));

  if (results.created.length > 0) {
    console.log(`\n✅ ${results.created.length} akun sales BERHASIL dibuat:\n`);
    console.log('   ' + 'Nama'.padEnd(22) + 'Username'.padEnd(18) + 'Password');
    console.log('   ' + '─'.repeat(55));
    results.created.forEach(r => {
      console.log(`   ${r.nama.padEnd(22)} ${r.username.padEnd(18)} ${r.password}`);
    });
    console.log('\n   ⚠️  Password default: seblak123');
    console.log('   📌  Sales WAJIB ganti password setelah login pertama!');
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️  ${results.skipped.length} sales sudah punya akun (tidak diubah).`);
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ ${results.errors.length} sales GAGAL:\n`);
    results.errors.forEach(e => {
      console.log(`   - ${e.nama}: ${e.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
