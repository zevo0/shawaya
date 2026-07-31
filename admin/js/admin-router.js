/**
 * admin-router.js — Hash-based navigation between the 8 dashboard
 * sections. Each route lazily refreshes its module's data on entry so
 * the admin always sees current data without a full page reload.
 */
const AdminRouter = (() => {
  const ROUTES = {
    dashboard: () => AdminDashboard.refresh(),
    products: async () => { await AdminCategories.refresh(); await AdminProducts.refresh(); },
    categories: () => AdminCategories.refresh(),
    options: async () => { await AdminCategories.refresh(); await AdminProducts.refresh(); AdminOptions.populateProductSelect(); },
    orders: () => AdminOrders.refresh(),
    settings: () => AdminSettings.refresh(),
    media: () => AdminMedia.refresh(),
    seo: () => AdminSEO.refresh(),
  };

  function currentRoute() {
    const hash = location.hash.replace('#', '');
    return ROUTES[hash] ? hash : 'dashboard';
  }

  async function render() {
    AdminUI.closeMobileNav();
    const route = currentRoute();
    document.querySelectorAll('.admin-page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${route}`)?.classList.remove('hidden');
    document.querySelectorAll('.admin-nav-link').forEach(a => a.classList.toggle('is-active', a.dataset.route === route));
    try { await ROUTES[route](); } catch (err) { AdminUI.toast(err.message || 'تعذر تحميل البيانات', true); }
  }

  function init() {
    window.addEventListener('hashchange', render);
  }

  return { init, render };
})();
