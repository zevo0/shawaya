/**
 * admin-products.js — Products CRUD: add/edit/delete/hide, image (from
 * media library), price, description, category, badges, sort order,
 * auto-hide when stock runs out.
 */
const AdminProducts = (() => {
  let cache = [];

  async function refresh() {
    cache = await AdminAPI.listProducts();
    render();
    populateCategorySelect();
    return cache;
  }

  function populateCategorySelect() {
    const select = document.getElementById('pf-category');
    const categories = AdminCategories.getAll();
    select.innerHTML = categories.map(c => `<option value="${c.id}">${AdminUI.escapeHtml(c.name_ar)}</option>`).join('');
  }

  function render() {
    const tbody = document.querySelector('#products-table tbody');
    const empty = document.getElementById('products-empty');
    tbody.innerHTML = cache.map(p => `
      <tr data-id="${p.id}">
        <td>${p.image_url ? `<img class="thumb" src="${p.image_url}" alt="">` : '<span class="text-muted">—</span>'}</td>
        <td>${AdminUI.escapeHtml(p.name_ar)}</td>
        <td>${AdminUI.escapeHtml(p.categories?.name_ar || '—')}</td>
        <td>${AdminUI.currency(p.price)}</td>
        <td>${(p.badges || []).map(b => `<span class="chip chip-available">${AdminUI.BADGE_OPTIONS.find(o => o.key === b)?.label || b}</span>`).join(' ')}</td>
        <td>${availabilityChip(p)}</td>
        <td class="row-actions">
          <button type="button" class="icon-action-btn" data-toggle-visible="${p.id}" title="إخفاء/إظهار">${icon(p.is_available ? 'eye' : 'eyeOff')}</button>
          <button type="button" class="icon-action-btn" data-edit="${p.id}">${icon('edit')}</button>
          <button type="button" class="icon-action-btn danger" data-delete="${p.id}">${icon('x')}</button>
        </td>
      </tr>`).join('');
    empty.classList.toggle('hidden', cache.length > 0);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(cache.find(p => p.id === b.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
    tbody.querySelectorAll('[data-toggle-visible]').forEach(b => b.addEventListener('click', () => toggleVisible(b.dataset.toggleVisible)));
  }

  function availabilityChip(p) {
    const outOfStock = p.track_stock && (p.stock_qty ?? 0) <= 0;
    if (!p.is_available) return '<span class="chip chip-hidden">مخفي</span>';
    if (outOfStock) return '<span class="chip chip-hidden">نفدت الكمية</span>';
    return '<span class="chip chip-available">متاح</span>';
  }

  async function toggleVisible(id) {
    const p = cache.find(x => x.id === id);
    try {
      await AdminAPI.upsertProduct({ id, is_available: !p.is_available });
      AdminUI.toast(!p.is_available ? 'أصبح المنتج مرئياً' : 'تم إخفاء المنتج');
      await refresh();
    } catch (err) { AdminUI.toast(err.message || 'تعذر التحديث', true); }
  }

  function openForm(product = null) {
    document.getElementById('product-modal-title').textContent = product ? 'تعديل منتج' : 'إضافة منتج';
    document.getElementById('pf-id').value = product?.id || '';
    document.getElementById('pf-name').value = product?.name_ar || '';
    document.getElementById('pf-desc').value = product?.description_ar || '';
    document.getElementById('pf-price').value = product?.price ?? '';
    document.getElementById('pf-sort').value = product?.sort_order ?? cache.length;
    document.getElementById('pf-available').checked = product ? product.is_available : true;
    document.getElementById('pf-track-stock').checked = product?.track_stock || false;
    document.getElementById('pf-stock-qty').value = product?.stock_qty ?? '';
    document.getElementById('pf-stock-qty-field').classList.toggle('hidden', !(product?.track_stock));
    document.getElementById('pf-category').value = product?.category_id || AdminCategories.getAll()[0]?.id || '';

    const preview = document.getElementById('pf-image-preview');
    preview.src = product?.image_url || '';
    document.getElementById('pf-image-url').value = product?.image_url || '';

    AdminUI.renderBadgePicker(document.getElementById('pf-badges'), product?.badges || []);
    AdminUI.openModal('product-modal-overlay');
  }

  async function submit(e) {
    e.preventDefault();
    const trackStock = document.getElementById('pf-track-stock').checked;
    const row = {
      id: document.getElementById('pf-id').value || undefined,
      name_ar: document.getElementById('pf-name').value.trim(),
      description_ar: document.getElementById('pf-desc').value.trim(),
      price: Number(document.getElementById('pf-price').value) || 0,
      category_id: document.getElementById('pf-category').value,
      sort_order: Number(document.getElementById('pf-sort').value) || 0,
      is_available: document.getElementById('pf-available').checked,
      track_stock: trackStock,
      stock_qty: trackStock ? (Number(document.getElementById('pf-stock-qty').value) || 0) : null,
      image_url: document.getElementById('pf-image-url').value || null,
      badges: AdminUI.getSelectedBadges(document.getElementById('pf-badges')),
    };
    try {
      await AdminAPI.upsertProduct(row);
      AdminUI.toast('تم حفظ المنتج');
      AdminUI.closeModal('product-modal-overlay');
      await refresh();
      document.dispatchEvent(new CustomEvent('admin:products-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر حفظ المنتج', true); }
  }

  async function remove(id) {
    if (!AdminUI.confirmDelete('حذف هذا المنتج نهائياً؟ سيُحذف معه خيارات التخصيص الخاصة به.')) return;
    try {
      await AdminAPI.deleteProduct(id);
      AdminUI.toast('تم حذف المنتج');
      await refresh();
      document.dispatchEvent(new CustomEvent('admin:products-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
  }

  function init() {
    document.getElementById('add-product-btn').addEventListener('click', () => openForm());
    document.getElementById('product-form').addEventListener('submit', submit);
    document.getElementById('pf-track-stock').addEventListener('change', (e) => {
      document.getElementById('pf-stock-qty-field').classList.toggle('hidden', !e.target.checked);
    });
    document.addEventListener('admin:categories-changed', populateCategorySelect);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh, getAll: () => cache };
})();
