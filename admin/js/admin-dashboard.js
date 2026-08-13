/**
 * admin-dashboard.js — الصفحة الرئيسية: إحصاءات اليوم، حالة المطعم، وآخر طلبات اليوم.
 * لا توجد صفحة طلبات مستقلة؛ الطلبات الحية تظهر هنا فقط وتختفي عند بداية يوم جديد.
 */
const AdminDashboard = (() => {
  const DAY_ORDER_LIMIT = 20;
  let ordersCache = [];
  let openOrderId = null;
  let unsubscribeOrders = null;
  let refreshTimer = null;

  const statusLabel = (status) => status === 'completed' ? 'تم التسليم' : 'بانتظار التسليم';
  const statusClass = (status) => status === 'completed' ? 'completed' : 'new';

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

    ordersCache = (stats.recentOrders || []).slice(0, DAY_ORDER_LIMIT);
    renderRecentOrders();
  }

  function renderRecentOrders() {
    const tbody = document.querySelector('#recent-orders-table tbody');
    const empty = document.getElementById('recent-orders-empty');
    if (!tbody || !empty) return;

    tbody.innerHTML = ordersCache.map((order) => {
      const delivered = order.status === 'completed';
      const items = (order.order_items || [])
        .map((item) => `${AdminUI.escapeHtml(item.product_name)} ×${item.qty}`)
        .join('، ') || 'جارٍ تحميل الأصناف…';

      return `
        <tr data-order-id="${order.id}" class="recent-order-row" style="cursor:pointer">
          <td>${new Date(order.created_at).toLocaleString('ar-OM', { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${items}</td>
          <td>${AdminUI.currency(order.total)}</td>
          <td><span class="chip chip-status-${statusClass(order.status)}">${statusLabel(order.status)}</span></td>
          <td>${delivered ? '—' : `<button type="button" class="btn btn-primary btn-sm order-delivered-btn" data-order-id="${order.id}">تم التسليم</button>`}</td>
        </tr>`;
    }).join('');

    empty.classList.toggle('hidden', ordersCache.length > 0);

    tbody.querySelectorAll('.recent-order-row').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('.order-delivered-btn')) return;
        openDetail(row.dataset.orderId);
      });
    });
    tbody.querySelectorAll('.order-delivered-btn').forEach((button) => {
      button.addEventListener('click', () => markDelivered(button.dataset.orderId));
    });
  }

  function openDetail(id) {
    const order = ordersCache.find((item) => String(item.id) === String(id));
    if (!order) return;

    openOrderId = id;
    const delivered = order.status === 'completed';
    const body = document.getElementById('order-detail-body');
    body.innerHTML = `
      <p class="text-muted" style="font-size:var(--fs-sm);margin-bottom:10px">
        ${new Date(order.created_at).toLocaleString('ar-OM')}
      </p>
      ${(order.order_items || []).map((item) => `
        <div class="order-item-row">
          <span>${AdminUI.escapeHtml(item.product_name)} ×${item.qty}${item.options_snapshot?.length ? ` <span class="text-muted">(${item.options_snapshot.map(AdminUI.escapeHtml).join('، ')})</span>` : ''}${item.notes ? `<br><span class="text-muted">ملاحظة: ${AdminUI.escapeHtml(item.notes)}</span>` : ''}</span>
          <span>${AdminUI.currency(item.unit_price * item.qty)}</span>
        </div>`).join('') || '<p class="text-muted">جارٍ تحميل أصناف الطلب…</p>'}
      ${order.general_notes ? `<p style="margin-top:12px;font-size:var(--fs-sm)"><strong>ملاحظات عامة:</strong> ${AdminUI.escapeHtml(order.general_notes)}</p>` : ''}
      <p style="margin-top:14px;font-weight:800;font-size:var(--fs-md)">الإجمالي: ${AdminUI.currency(order.total)}</p>
    `;

    const button = document.getElementById('order-mark-delivered');
    const note = document.getElementById('order-delivered-note');
    button.disabled = delivered;
    button.textContent = 'تم التسليم';
    note.textContent = delivered ? 'تم تسجيل تسليم هذا الطلب.' : 'اضغط بعد تسليم الطلب للعميل.';
    AdminUI.openModal('order-modal-overlay');
  }

  async function markDelivered(id = openOrderId) {
    if (!id) return;
    try {
      await AdminAPI.markOrderDelivered(id);
      AdminUI.toast('تم تسجيل تسليم الطلب');
      AdminUI.closeModal('order-modal-overlay');
      await refresh();
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر تحديث الطلب', true);
    }
  }

  function renderOpenToggle(isOpen) {
    const btn = document.getElementById('open-toggle-btn');
    const text = document.getElementById('open-toggle-text');
    btn.classList.toggle('is-closed', !isOpen);
    text.textContent = isOpen ? 'مفعّل' : 'متوقف';
    btn.dataset.state = isOpen ? 'open' : 'closed';
  }

  async function toggleOpenState() {
    const btn = document.getElementById('open-toggle-btn');
    const nextIsOpen = btn.dataset.state !== 'open';
    btn.disabled = true;
    try {
      await AdminAPI.toggleOpen(nextIsOpen);
      renderOpenToggle(nextIsOpen);
      AdminUI.toast(nextIsOpen ? 'تم تفعيل استقبال الطلبات — يُطبّق الموقع ساعات العمل تلقائياً' : 'تم إيقاف استقبال الطلبات — يظهر التغيير على الموقع فوراً');
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر تحديث الحالة', true);
    } finally {
      btn.disabled = false;
    }
  }

  function queueRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      if (!document.getElementById('page-dashboard')?.classList.contains('hidden')) refresh();
    }, 250);
  }

  function activate() {
    if (!unsubscribeOrders) unsubscribeOrders = AdminAPI.subscribeToOrders(queueRefresh);
    return refresh();
  }

  function deactivate() {
    window.clearTimeout(refreshTimer);
    if (unsubscribeOrders) unsubscribeOrders();
    unsubscribeOrders = null;
  }

  function init() {
    document.getElementById('open-toggle-btn').addEventListener('click', toggleOpenState);
    document.getElementById('order-mark-delivered').addEventListener('click', () => markDelivered());
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh, activate, deactivate };
})();
