/**
 * admin-router.js — تنقل لوحة التحكم مع إيقاف اشتراك طلبات اليوم عند مغادرة الرئيسية.
 */
const AdminRouter = (() => {
  const ROUTES = {
    dashboard: () => AdminDashboard.activate(),
    products: () => AdminProducts.refresh(),
    categories: () => AdminCategories.refresh(),
    settings: () => AdminSettings.refresh(),
    media: () => AdminMedia.refresh(),
  };
  let activeRoute = null;

  function currentRoute() {
    const hash = location.hash.replace('#', '');
    return ROUTES[hash] ? hash : 'dashboard';
  }

  async function render() {
    AdminUI.closeMobileNav();
    const route = currentRoute();

    // طلبات اليوم تستمع للتحديثات فقط أثناء ظهور الصفحة الرئيسية.
    if (activeRoute === 'dashboard' && route !== 'dashboard') AdminDashboard.deactivate();

    document.querySelectorAll('.admin-page').forEach((page) => page.classList.add('hidden'));
    document.getElementById(`page-${route}`)?.classList.remove('hidden');
    document.querySelectorAll('.admin-nav-link').forEach((link) => link.classList.toggle('is-active', link.dataset.route === route));
    activeRoute = route;

    try {
      await ROUTES[route]();
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر تحميل البيانات', true);
    }
  }

  function init() {
    window.addEventListener('hashchange', render);
  }

  return { init, render };
})();
