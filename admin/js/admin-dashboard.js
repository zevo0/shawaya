/**
 * admin-dashboard.js — Dashboard home: today's stats, top product,
 * recent orders, and the open/closed toggle (writes directly to
 * settings.is_open, which the storefront reads in realtime and uses
 * to block checkout).
 */
const AdminDashboard = (() => {
  const STATUS_LABEL = { new: 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' };

  async function refresh() {
    try {
      const [stats, settings] = await Promise.all([AdminAPI.dashboardStats(), AdminAPI.getSettings()]);
      renderStats(stats);
      renderOpenToggle(settings.is_open);
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر تحميل بيانات اللوحة', true);
    }
  }

  function renderStats(stats) {
    document.getElementById('stat-orders-today').textContent = stats.todayOrderCount;
    document.getElementById('stat-revenue-today').textContent = AdminUI.currency(stats.todayRevenue);
    document.getElementById('stat-top-product').textContent = stats.topProduct ? `${stats.topProduct.name} (${stats.topProduct.qty})` : 'لا يوجد بعد';

    const tbody = document.querySelector('#recent-orders-table tbody');
    const empty = document.getElementById('recent-orders-empty');
    tbody.innerHTML = stats.recentOrders.map(o => `
      <tr>
        <td>${new Date(o.created_at).toLocaleString('ar-OM', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
        <td>${(o.order_items || []).map(it => `${it.product_name} ×${it.qty}`).join('، ')}</td>
        <td>${AdminUI.currency(o.total)}</td>
        <td><span class="chip chip-status-${o.status}">${STATUS_LABEL[o.status] || o.status}</span></td>
      </tr>`).join('');
    empty.classList.toggle('hidden', stats.recentOrders.length > 0);
  }

  function renderOpenToggle(isOpen) {
    const btn = document.getElementById('open-toggle-btn');
    const text = document.getElementById('open-toggle-text');
    btn.classList.toggle('is-closed', !isOpen);
    text.textContent = isOpen ? 'المطعم مفتوح' : 'المطعم مغلق';
    btn.dataset.state = isOpen ? 'open' : 'closed';
  }

  async function toggleOpenState() {
    const btn = document.getElementById('open-toggle-btn');
    const nextIsOpen = btn.dataset.state !== 'open';
    btn.disabled = true;
    try {
      await AdminAPI.toggleOpen(nextIsOpen);
      renderOpenToggle(nextIsOpen);
      AdminUI.toast(nextIsOpen ? 'تم فتح المطعم — يظهر التغيير على الموقع فوراً' : 'تم إغلاق المطعم — سيتم منع الطلبات الجديدة على الموقع');
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر تحديث الحالة', true);
    } finally {
      btn.disabled = false;
    }
  }

  function init() {
    document.getElementById('open-toggle-btn').addEventListener('click', toggleOpenState);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh };
})();
