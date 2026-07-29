/**
 * admin-auth.js — Supabase Auth login/logout gate. Only an authenticated
 * session can see the dashboard shell (RLS on every table also requires
 * `auth.role() = 'authenticated'` for writes, so this is enforced on the
 * server, not just hidden in the UI).
 */
(function () {
  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-shell').classList.add('hidden');
  }

  function showDashboard(session) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-shell').classList.remove('hidden');
    document.getElementById('admin-user-email').textContent = session?.user?.email || '';
    AdminRouter.render();
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit');
    errorEl.classList.remove('is-visible');
    btn.disabled = true;
    btn.textContent = 'جارٍ الدخول...';
    try {
      const { session } = await AdminAPI.signIn(email, password);
      showDashboard(session);
    } catch (err) {
      errorEl.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      errorEl.classList.add('is-visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'تسجيل الدخول';
    }
  }

  async function handleLogout() {
    await AdminAPI.signOut();
    showLogin();
  }

  async function bootstrap() {
    if (!AdminAPI.configured) {
      document.getElementById('login-config-notice').innerHTML =
        'لم يتم ربط Supabase بعد. أضف رابط المشروع والمفتاح العام (anon key) في <code>config.js</code>، ثم أنشئ مستخدم إدارة من Supabase Auth.';
      document.getElementById('login-submit').disabled = true;
      return;
    }
    const session = await AdminAPI.getSession();
    if (session) showDashboard(session); else showLogin();

    AdminAPI.onAuthChange((session) => {
      if (session) showDashboard(session); else showLogin();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    AdminRouter.init();
    bootstrap();
  });
})();
