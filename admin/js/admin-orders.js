/**
 * admin-orders.js — Orders management: list, filter by status, view
 * detail (items/options/notes/total), update status.
 */
const AdminOrders = (() => {
  const STATUS_LABEL = { new: 'جديد', preparing: 'قيد التحضير', ready: 'جاهز', completed: 'مكتمل', cancelled: 'ملغي' };
  let cache = [];
  let openOrderId = null;

  async function refresh() {
    cache = await AdminAPI.listOrders();
    render();
  }

  function render() {
    const filter = document.getElementById('orders-status-filter').value;
    const rows = filter ? cache.filter(o => o.status === filter) : cache;
    const tbody = document.querySelector('#orders-table tbody');
    const empty = document.getElementById('orders-empty');

    tbody.innerHTML = rows.map(o => `
      <tr data-id="${o.id}" style="cursor:pointer">
        <td>${new Date(o.created_at).toLocaleString('ar-OM', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
        <td>${(o.order_items || []).map(it => `${AdminUI.escapeHtml(it.product_name)} ×${it.qty}`).join('، ')}</td>
        <td>${AdminUI.currency(o.total)}</td>
        <td>${o.general_notes ? AdminUI.escapeHtml(o.general_notes).slice(0, 30) : '—'}</td>
        <td><span class="chip chip-status-${o.status}">${STATUS_LABEL[o.status] || o.status}</span></td>
      </tr>`).join('');
    empty.classList.toggle('hidden', rows.length > 0);

    tbody.querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => openDetail(tr.dataset.id)));
  }

  function openDetail(id) {
    const order = cache.find(o => o.id === id);
    if (!order) return;
    openOrderId = id;
    const body = document.getElementById('order-detail-body');
    body.innerHTML = `
      <p class="text-muted" style="font-size:var(--fs-sm);margin-bottom:10px">
        ${new Date(order.created_at).toLocaleString('ar-OM')}
      </p>
      ${(order.order_items || []).map(it => `
        <div class="order-item-row">
          <span>${AdminUI.escapeHtml(it.product_name)} ×${it.qty}${it.options_snapshot?.length ? ` <span class="text-muted">(${it.options_snapshot.join('، ')})</span>` : ''}${it.notes ? `<br><span class="text-muted">ملاحظة: ${AdminUI.escapeHtml(it.notes)}</span>` : ''}</span>
          <span>${AdminUI.currency(it.unit_price * it.qty)}</span>
        </div>`).join('')}
      ${order.general_notes ? `<p style="margin-top:12px;font-size:var(--fs-sm)"><strong>ملاحظات عامة:</strong> ${AdminUI.escapeHtml(order.general_notes)}</p>` : ''}
      <p style="margin-top:14px;font-weight:800;font-size:var(--fs-md)">الإجمالي: ${AdminUI.currency(order.total)}</p>
    `;
    document.getElementById('order-status-select').value = order.status;
    AdminUI.openModal('order-modal-overlay');
  }

  async function saveStatus() {
    const status = document.getElementById('order-status-select').value;
    try {
      await AdminAPI.updateOrderStatus(openOrderId, status);
      AdminUI.toast('تم تحديث حالة الطلب');
      AdminUI.closeModal('order-modal-overlay');
      await refresh();
    } catch (err) { AdminUI.toast(err.message || 'تعذر التحديث', true); }
  }

  function init() {
    document.getElementById('orders-status-filter').addEventListener('change', render);
    document.getElementById('order-status-save').addEventListener('click', saveStatus);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh };
})();
