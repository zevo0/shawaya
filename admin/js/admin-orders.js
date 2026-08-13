/**
 * admin-orders.js — إدارة الطلبات الحية.
 * تعرض الطلبات الواردة مباشرة وتوفر الإجراء التشغيلي الوحيد: «تم التسليم».
 */
const AdminOrders = (() => {
  const STATUS_LABEL = { completed: 'تم التسليم' };
  let cache = [];
  let openOrderId = null;
  let unsubscribe = null;
  let refreshTimer = null;

  function statusLabel(status) {
    return STATUS_LABEL[status] || 'بانتظار التسليم';
  }

  function statusClass(status) {
    return status === 'completed' ? 'completed' : 'new';
  }

  async function refresh() {
    cache = await AdminAPI.listOrders();
    render();
  }

  function render() {
    const tbody = document.querySelector('#orders-table tbody');
    const empty = document.getElementById('orders-empty');

    tbody.innerHTML = cache.map(o => {
      const delivered = o.status === 'completed';
      return `
        <tr data-id="${o.id}" style="cursor:pointer">
          <td>${new Date(o.created_at).toLocaleString('ar-OM', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
          <td>${(o.order_items || []).map(it => `${AdminUI.escapeHtml(it.product_name)} ×${it.qty}`).join('، ') || 'جارٍ تحميل الأصناف…'}</td>
          <td>${AdminUI.currency(o.total)}</td>
          <td>${o.general_notes ? AdminUI.escapeHtml(o.general_notes).slice(0, 30) : '—'}</td>
          <td><span class="chip chip-status-${statusClass(o.status)}">${statusLabel(o.status)}</span></td>
          <td>${delivered ? '—' : `<button type="button" class="btn btn-primary btn-sm order-delivered-btn" data-order-id="${o.id}">تم التسليم</button>`}</td>
        </tr>`;
    }).join('');
    empty.classList.toggle('hidden', cache.length > 0);

    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', (event) => {
      if (event.target.closest('.order-delivered-btn')) return;
      openDetail(tr.dataset.id);
    }));
    tbody.querySelectorAll('.order-delivered-btn').forEach(btn => btn.addEventListener('click', () => markDelivered(btn.dataset.orderId)));
  }

  function openDetail(id) {
    const order = cache.find(o => o.id === id);
    if (!order) return;
    openOrderId = id;
    const delivered = order.status === 'completed';
    const body = document.getElementById('order-detail-body');
    body.innerHTML = `
      <p class="text-muted" style="font-size:var(--fs-sm);margin-bottom:10px">
        ${new Date(order.created_at).toLocaleString('ar-OM')}
      </p>
      ${(order.order_items || []).map(it => `
        <div class="order-item-row">
          <span>${AdminUI.escapeHtml(it.product_name)} ×${it.qty}${it.options_snapshot?.length ? ` <span class="text-muted">(${it.options_snapshot.map(AdminUI.escapeHtml).join('، ')})</span>` : ''}${it.notes ? `<br><span class="text-muted">ملاحظة: ${AdminUI.escapeHtml(it.notes)}</span>` : ''}</span>
          <span>${AdminUI.currency(it.unit_price * it.qty)}</span>
        </div>`).join('') || '<p class="text-muted">جارٍ تحميل أصناف الطلب…</p>'}
      ${order.general_notes ? `<p style="margin-top:12px;font-size:var(--fs-sm)"><strong>ملاحظات عامة:</strong> ${AdminUI.escapeHtml(order.general_notes)}</p>` : ''}
      <p style="margin-top:14px;font-weight:800;font-size:var(--fs-md)">الإجمالي: ${AdminUI.currency(order.total)}</p>
    `;
    const button = document.getElementById('order-mark-delivered');
    const note = document.getElementById('order-delivered-note');
    button.disabled = delivered;
    button.textContent = delivered ? 'تم التسليم' : 'تم التسليم';
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

  function queueRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      if (!document.getElementById('page-orders')?.classList.contains('hidden')) {
        refresh().catch(err => AdminUI.toast(err.message || 'تعذر تحديث الطلبات', true));
      }
    }, 250);
  }

  function activate() {
    if (!unsubscribe) unsubscribe = AdminAPI.subscribeToOrders(queueRefresh);
    return refresh();
  }

  function deactivate() {
    window.clearTimeout(refreshTimer);
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  }

  function init() {
    document.getElementById('order-mark-delivered').addEventListener('click', () => markDelivered());
  }

  document.addEventListener('DOMContentLoaded', init);
  return { activate, deactivate, refresh };
})();
