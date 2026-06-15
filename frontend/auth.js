// ═══════════════════════════════════════════════════════════════════
// SUPABASE AUTH — replaces GAS session management
// MUST be loaded AFTER supabase-bridge.js
// ═══════════════════════════════════════════════════════════════════

// ── Override login ────────────────────────────────────────────────
window.doLogin = async function doLogin() {
  const username = document.getElementById('username')?.value?.trim();
  const password = document.getElementById('password')?.value?.trim();
  const btn = document.getElementById('btnLogin');
  const errorEl = document.getElementById('errorMsg');
  const loadingEl = document.getElementById('loadingSpinner');

  if (!username || !password) {
    if (typeof showError === 'function') showError('Silakan isi username dan password');
    return;
  }

  if (btn) btn.disabled = true;
  if (loadingEl) loadingEl.style.display = 'block';
  if (errorEl) errorEl.style.display = 'none';

  try {
    const result = await bridge.direct('authenticate', username, password);
    if (result.success) {
      sessionStorage.setItem('seblak_token', result.data.token);
      sessionStorage.setItem('seblak_user', JSON.stringify(result.data.user));
      if (typeof redirectByRole === 'function') {
        redirectByRole(result.data.user.role);
      } else if (typeof enterApp === 'function') {
        enterApp(result.data.user);
      } else {
        window.location.href = '?page=' + (result.data.user.role === 'OWNER' ? 'owner' : 'sales');
      }
    } else {
      if (btn) btn.disabled = false;
      if (loadingEl) loadingEl.style.display = 'none';
      if (typeof showError === 'function') showError(result.message);
      else if (errorEl) { errorEl.textContent = result.message; errorEl.style.display = 'block'; }
    }
  } catch (err) {
    if (btn) btn.disabled = false;
    if (loadingEl) loadingEl.style.display = 'none';
    if (typeof showError === 'function') showError('Koneksi error: ' + err.message);
    else if (errorEl) { errorEl.textContent = 'Error: ' + err.message; errorEl.style.display = 'block'; }
  }
};

// ── Override logout ───────────────────────────────────────────────
let _doLoggingOut = false;
window.doLogout = async function doLogout() {
  if (_doLoggingOut) return;
  _doLoggingOut = true;
  try {
    await bridge.direct('destroySession');
  } catch {}
  sessionStorage.clear();
  if (typeof showPage === 'function') {
    showPage('login');
    setTimeout(function(){
      var u=document.getElementById('username');if(u)u.value='';
      var p=document.getElementById('password');if(p)p.value='';
    },50);
  } else {
    window.location.href = '?page=login';
  }
  setTimeout(function() { _doLoggingOut = false; }, 2000);
};

// ── Override setup ────────────────────────────────────────────────
window.doSetup = async function doSetup() {
  const fullName = document.getElementById('setupFullName')?.value?.trim();
  const username = document.getElementById('setupUsername')?.value?.trim().toLowerCase();
  const email = document.getElementById('setupEmail')?.value?.trim();
  const password = document.getElementById('setupPassword')?.value;
  const passwordConfirm = document.getElementById('setupPasswordConfirm')?.value;
  const btn = document.getElementById('btnSetup');
  const errorEl = document.getElementById('setupErrorMsg');
  const successEl = document.getElementById('setupSuccessMsg');
  const loadingEl = document.getElementById('setupLoadingSpinner');

  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';

  if (!fullName) { if (typeof showError === 'function') showError('Nama lengkap harus diisi.'); return; }
  if (!username || username.length < 3) { if (typeof showError === 'function') showError('Username minimal 3 karakter.'); return; }
  if (!password || password.length < 6) { if (typeof showError === 'function') showError('Password minimal 6 karakter.'); return; }
  if (password !== passwordConfirm) { if (typeof showError === 'function') showError('Konfirmasi password tidak cocok.'); return; }

  if (btn) btn.disabled = true;
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const result = await bridge.direct('setupOwner', { fullName, username, email, password });
    if (result.success) {
      if (successEl) { successEl.style.display = 'block'; successEl.textContent = result.message; }
      setTimeout(() => { window.location.href = '?page=login'; }, 2000);
    } else {
      if (btn) btn.disabled = false;
      if (loadingEl) loadingEl.style.display = 'none';
      if (typeof showError === 'function') showError(result.message);
      else if (errorEl) { errorEl.textContent = result.message; errorEl.style.display = 'block'; }
    }
  } catch (err) {
    if (btn) btn.disabled = false;
    if (loadingEl) loadingEl.style.display = 'none';
    if (typeof showError === 'function') showError('Koneksi error: ' + err.message);
    else if (errorEl) { errorEl.textContent = 'Error: ' + err.message; errorEl.style.display = 'block'; }
  }
};

// ── Go to setup page ──────────────────────────────────────────────
window.goSetup = function goSetup() {
  window.location.href = '?page=setup';
};

// ── Auto-auth: check session on page load ─────────────────────────
(async function initAuth() {
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
      const { data: { user } } = await _supabase.auth.getUser();
      if (user) {
        let profile = (await _supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle()).data;
        if (!profile && user.email) {
          profile = (await _supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .maybeSingle()).data;
        }

        if (profile) {
          sessionStorage.setItem('seblak_token', session.access_token);
          sessionStorage.setItem('seblak_user', JSON.stringify({
            user_id: profile.id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            full_name: profile.full_name,
            sales_id: profile.sales_id,
          }));
        }
      }
    }
  } catch (err) {
    console.warn('[auth] init failed:', err);
  }
})();
