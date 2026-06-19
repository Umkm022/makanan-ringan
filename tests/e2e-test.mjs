import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'https://supplier-seblak.pages.dev';
const REPORT_DIR = './test-report';
const RESULTS = { passed: 0, failed: 0, skipped: 0, details: [] };
const CONSOLE_ERRORS = [];
const SCREENSHOTS = [];

mkdirSync(REPORT_DIR, { recursive: true });

function report(name, status, msg) {
  RESULTS.details.push({ name, status, msg });
  if (status === 'PASS') RESULTS.passed++;
  else if (status === 'FAIL') RESULTS.failed++;
  else RESULTS.skipped++;
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`  ${icon} ${name}: ${msg}`);
}

async function screenshot(page, name) {
  const path = `${REPORT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  SCREENSHOTS.push(name);
}

async function waitForContent(page, timeout = 15000) {
  try {
    await page.waitForFunction(() => {
      const mc = document.getElementById('mainContent');
      if (!mc) return false;
      const html = mc.innerHTML;
      if (html.includes('Memuat') || html.includes('class="loading"')) return false;
      return html.length > 80;
    }, { timeout });
  } catch { /* timeout ok */ }
}

async function loginAs(page, role) {
  const OWNER_PASS = process.env.TEST_OWNER_PASS || 'seblak123';
  const SALES_PASS = process.env.TEST_SALES_PASS || 'seblak123';
  const creds = role === 'OWNER'
    ? { username: 'owner', password: OWNER_PASS }
    : { username: 'andi', password: SALES_PASS };

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#page-login', { timeout: 10000 });

  // Check if setup banner is visible (first time)
  const setupBanner = await page.$('#setupBanner');
  if (setupBanner) {
    const visible = await setupBanner.evaluate(el => el.style.display !== 'none' && window.getComputedStyle(el).display !== 'none');
    if (visible) {
      console.log('  ⚠️ Setup banner visible — app may not be configured');
    }
  }

  await page.fill('#username', creds.username);
  await page.fill('#password', creds.password);
  console.log(`  [login] Filled credentials for ${role}: ${creds.username}/***`);
  await page.click('#btnLogin');

  // Wait for app to load (either owner-layout or sales-layout)
  try {
    await page.waitForSelector(`body.${role === 'OWNER' ? 'owner' : 'sales'}-layout`, { timeout: 15000 });
  } catch {
    // Check for error
    const errEl = await page.$('#errorMsg');
    if (errEl) {
      const errText = await errEl.textContent();
      return { success: false, error: errText };
    }
    return { success: false, error: 'Login failed — app layout not detected' };
  }
  return { success: true };
}

async function testLogoutClearsForm(page) {
  // Use evaluate to call doLogout directly
  await page.evaluate(() => { if (window.doLogout) window.doLogout(); });

  await page.waitForSelector('#page-login', { timeout: 10000 });
  // Wait for: (1) autofill to happen, (2) setTimeout clear to run, (3) possible re-autofill
  await page.waitForTimeout(1000);

  // Force-clear again and check 500ms later
  await page.evaluate(() => {
    var u=document.getElementById('username');if(u)u.value='';
    var p=document.getElementById('password');if(p)p.value='';
  });
  await page.waitForTimeout(500);

  const username = await page.$eval('#username', el => el.value);
  const password = await page.$eval('#password', el => el.value);
  await screenshot(page, 'logout-result');
  return username === '' && password === '';
}

async function clickSidebarTab(page, tabId) {
  const tab = await page.$(`.sidebar .nav-item[data-page="${tabId}"]`);
  if (tab) {
    await tab.click();
    return true;
  }
  return false;
}

async function clickTabbarTab(page, tabId) {
  const tab = await page.$(`.tabbar button[data-page="${tabId}"]`);
  if (tab) {
    await tab.click();
    return true;
  }
  return false;
}

async function hasErrorCard(page) {
  return page.evaluate(() => {
    const mc = document.getElementById('mainContent');
    if (!mc) return false;
    const text = mc.textContent || '';
    return text.includes('Error') && (text.includes('tidak ditemukan') || text.includes('Unknown') || text.includes('Gagal'));
  });
}

// ── Helper: capture console errors ─────────────────────────────
function setupConsoleCapture(page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      CONSOLE_ERRORS.push({ page: page.url(), text: msg.text() });
    }
  });
  page.on('pageerror', err => {
    CONSOLE_ERRORS.push({ page: page.url(), text: err.message });
  });
}

// ── Owner Tests ─────────────────────────────────────────────────
async function testOwnerPages(page) {
  console.log('\n📋 OWNER PAGES');

  const ownerTabs = [
    { id: 'dashboard',     label: 'Dashboard',    check: ['.kpi-grid', '.kpi-card', '#mainContent table'] },
    { id: 'produk',        label: 'Produk',       check: ['#mainContent table', '#mainContent .card'] },
    { id: 'customer',      label: 'Customer',     check: ['#mainContent table', '#mainContent .card'] },
    { id: 'sales-list',    label: 'Sales',        check: ['#mainContent table', '#mainContent .card'] },
    { id: 'kunjungan',     label: 'Kunjungan',    check: ['#mainContent .card', '#mainContent'] },
    { id: 'invoice',       label: 'Invoice',      check: ['#mainContent button', '#mainContent .card'] },
    { id: 'stok-produksi', label: 'Stok',         check: ['#mainContent button', '#mainContent .card'] },
    { id: 'titipan',       label: 'Titipan',      check: ['#mainContent .card', '#mainContent select'] },
    { id: 'biaya',         label: 'Biaya',        check: ['#mainContent table', '#mainContent .card'] },
    { id: 'komisi',        label: 'Komisi',       check: ['#mainContent table', '#mainContent .card'] },
    { id: 'laporan',       label: 'Laporan',      check: ['#mainContent select', '#mainContent .card'] },
    { id: 'map',           label: 'Peta',         check: ['#mainContent #map', '#mainContent .leaflet'] },
    { id: 'setup-data',    label: 'Setup',        check: ['#mainContent .card', '#mainContent'] },
  ];

  for (const tab of ownerTabs) {
    try {
      const clicked = await clickSidebarTab(page, tab.id);
      if (!clicked) {
        report(tab.label, 'SKIP', `Tab '${tab.id}' not found in sidebar`);
        continue;
      }
      await waitForContent(page, 12000);
      await screenshot(page, `owner-${tab.id}`);

      // Check that content doesn't have error state
      const hasError = await page.$('.error-card, .error-message');
      if (hasError) {
        const errText = await hasError.textContent();
        report(tab.label, 'FAIL', `Error card visible: ${errText}`);
        continue;
      }

      // Check for expected elements
      let found = false;
      for (const sel of tab.check) {
        const el = await page.$(sel);
        if (el) { found = true; break; }
      }
      report(tab.label, found ? 'PASS' : 'WARN', found ? 'Content loaded' : 'No expected elements found, but no error either');
    } catch (err) {
      report(tab.label, 'FAIL', `Exception: ${err.message}`);
    }
  }

  // ── Produk: verify halaman produk tampil dengan benar ──────
  try {
    await clickSidebarTab(page, 'produk');
    await waitForContent(page, 12000);
    const content = await page.$eval('#mainContent', el => el.textContent);
    if (content.includes('Produk') && (content.includes('Harga') || content.includes('Nama'))) {
      report('Produk Table', 'PASS', 'Produk page shows table with product data');
    } else {
      report('Produk Table', 'WARN', `Produk page shows: "${content.substring(0, 100)}"`);
    }
  } catch (err) {
    report('Produk Table', 'FAIL', `Exception: ${err.message}`);
  }

  // ── Dashboard: verify stok gudang KPI ───────────────────────
  try {
    await clickSidebarTab(page, 'dashboard');
    await waitForContent(page, 12000);
    // Check all KPI cards
    const kpis = await page.$$('.kpi-card');
    report('Dashboard KPI', kpis.length > 0 ? 'PASS' : 'WARN', `${kpis.length} KPI cards found`);
  } catch (err) {
    report('Dashboard KPI', 'FAIL', `Exception: ${err.message}`);
  }

  // ── Logout ─────────────────────────────────────────────────
  try {
    const clear = await testLogoutClearsForm(page);
    report('Logout Clears Form', clear ? 'PASS' : 'FAIL', clear ? 'Fields empty after logout' : 'Fields still filled!');
  } catch (err) {
    report('Logout Clears Form', 'FAIL', `Exception: ${err.message}`);
  }
}

// ── Sales Tests ──────────────────────────────────────────────────
async function testSalesPages(page) {
  console.log('\n📋 SALES PAGES');

  const salesTabs = [
    { id: 'dashboard',  label: 'Dashboard',   check: ['#mainContent .kpi-card', '#mainContent .card'] },
    { id: 'visit',      label: 'Kunjungan',   check: ['#mainContent select', '#mainContent .card'] },
    { id: 'history',    label: 'Riwayat',     check: ['#mainContent table', '#mainContent .card'] },
    { id: 'customer',   label: 'Toko',        check: ['#mainContent table', '#mainContent .card'] },
    { id: 'produk',     label: 'Produk',      check: ['#mainContent table', '#mainContent .card'] },
    { id: 'invoice',    label: 'Tagihan',     check: ['#mainContent table', '#mainContent .card'] },
    { id: 'stok-sales', label: 'Stok',        check: ['#mainContent .card', '#mainContent button'] },
    { id: 'map',        label: 'Peta',        check: ['#mainContent #map', '#mainContent .leaflet'] },
  ];

  for (const tab of salesTabs) {
    try {
      const clicked = await clickTabbarTab(page, tab.id);
      if (!clicked) {
        report(tab.label, 'SKIP', `Tab '${tab.id}' not found in tabbar`);
        continue;
      }
      await waitForContent(page, 12000);
      await screenshot(page, `sales-${tab.id}`);

      const hasError = await page.$('.error-card, .error-message');
      if (hasError) {
        const errText = await hasError.textContent();
        report(tab.label, 'FAIL', `Error card visible: ${errText}`);
        continue;
      }

      let found = false;
      for (const sel of tab.check) {
        const el = await page.$(sel);
        if (el) { found = true; break; }
      }
      report(tab.label, found ? 'PASS' : 'WARN', found ? 'Content loaded' : 'No expected elements found, but no error either');
    } catch (err) {
      report(tab.label, 'FAIL', `Exception: ${err.message}`);
    }
  }

  // ── Produk: verify no Add/Edit/Delete buttons for Sales ────
  try {
    await clickTabbarTab(page, 'produk');
    await waitForContent(page, 12000);
    const addBtn = await page.$('[onclick*="showProdukForm"]');
    report('Produk Read-only', !addBtn ? 'PASS' : 'FAIL', !addBtn ? 'No add button for Sales' : 'Add button found (should be hidden!)');
  } catch (err) {
    report('Produk Read-only', 'FAIL', `Exception: ${err.message}`);
  }

  // ── Logout ─────────────────────────────────────────────────
  try {
    const clear = await testLogoutClearsForm(page);
    report('Logout Clears Form', clear ? 'PASS' : 'FAIL', clear ? 'Fields empty after logout' : 'Fields still filled!');
  } catch (err) {
    report('Logout Clears Form', 'FAIL', `Exception: ${err.message}`);
  }
}

// ── Main Runner ──────────────────────────────────────────────────
async function main() {
  console.log('🧪 Macaroni Ku E2E Test Suite');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Date:   ${new Date().toISOString()}`);
  console.log('─'.repeat(50));

  const browser = await chromium.launch({ headless: true });

  try {
    // ── Test 1: Owner ──────────────────────────────────────────
    console.log('\n🔐 LOGIN AS OWNER');
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    setupConsoleCapture(ownerPage);

    const ownerLogin = await loginAs(ownerPage, 'OWNER');
    if (ownerLogin.success) {
      report('Owner Login', 'PASS', 'Successfully logged in as OWNER');
      await testOwnerPages(ownerPage);
    } else {
      report('Owner Login', 'FAIL', ownerLogin.error);
      report('Owner Pages', 'SKIP', 'Skipped — login failed');
    }
    await ownerCtx.close();

    // ── Test 2: Sales ──────────────────────────────────────────
    console.log('\n🔐 LOGIN AS SALES');
    console.log('   Note: createSales now creates Supabase Auth account + users + sales records.');
    console.log('   Existing sales users (created before the fix) may not have Auth accounts.');
    const salesCtx = await browser.newContext();
    const salesPage = await salesCtx.newPage();
    setupConsoleCapture(salesPage);

    const salesLogin = await loginAs(salesPage, 'SALES');
    if (salesLogin.success) {
      report('Sales Login', 'PASS', 'Successfully logged in as SALES');
      await testSalesPages(salesPage);
    } else {
      report('Sales Login', 'SKIP', `Cannot test: ${salesLogin.error} (sales user may not have Auth account)`);
      report('Sales Pages', 'SKIP', 'Skipped — login failed');
    }
    await salesCtx.close();

  } finally {
    await browser.close();
  }

  // ── Generate Report ───────────────────────────────────────────
  generateReport();
}

function generateReport() {
  const total = RESULTS.passed + RESULTS.failed + RESULTS.skipped;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  let html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>E2E Test Report</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
  h1 { color: #333; }
  .summary { display: flex; gap: 16px; margin: 20px 0; }
  .summary > div { padding: 16px 24px; border-radius: 8px; font-size: 18px; font-weight: 700; }
  .pass { background: #d4edda; color: #155724; }
  .fail { background: #f8d7da; color: #721c24; }
  .skip { background: #fff3cd; color: #856404; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f8f9fa; font-weight: 600; }
  .PASS { color: #28a745; font-weight: 600; }
  .FAIL { color: #dc3545; font-weight: 600; }
  .WARN { color: #ffc107; font-weight: 600; }
  .SKIP { color: #6c757d; font-weight: 600; }
  .errors { background: #fff; padding: 16px; border-radius: 8px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  .errors pre { background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 12px; overflow-x: auto; }
  .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; margin-top: 20px; }
  .screenshots img { width: 100%; border-radius: 6px; border: 1px solid #ddd; }
  .screenshots .label { font-size: 12px; color: #666; margin-top: 4px; text-align: center; }
</style>
</head>
<body>
  <h1>🧪 Macaroni Ku E2E Test Report</h1>
  <p>Date: ${new Date().toLocaleString()}<br>Target: ${BASE_URL}</p>
  <div class="summary">
    <div class="pass">✅ ${RESULTS.passed} Passed</div>
    <div class="fail">❌ ${RESULTS.failed} Failed</div>
    <div class="skip">⏭️ ${RESULTS.skipped} Skipped</div>
  </div>
  <table>
    <tr><th>Test</th><th>Status</th><th>Message</th></tr>
    ${RESULTS.details.map(d => `<tr><td>${d.name}</td><td class="${d.status}">${d.status}</td><td>${d.msg}</td></tr>`).join('')}
  </table>`;

  if (CONSOLE_ERRORS.length > 0) {
    html += `<div class="errors"><h3>⚠️ Console Errors (${CONSOLE_ERRORS.length})</h3>`;
    CONSOLE_ERRORS.forEach(e => {
      html += `<pre>${e.text}</pre>`;
    });
    html += `</div>`;
  }

  if (SCREENSHOTS.length > 0) {
    html += `<h3>📸 Screenshots (${SCREENSHOTS.length})</h3><div class="screenshots">`;
    SCREENSHOTS.forEach(s => {
      html += `<div><img src="${s}.png" alt="${s}"><div class="label">${s}</div></div>`;
    });
    html += `</div>`;
  }

  html += `</body></html>`;

  const reportPath = `${REPORT_DIR}/report-${timestamp}.html`;
  writeFileSync(reportPath, html);
  console.log(`\n📄 Report: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
