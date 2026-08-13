/**
 * admin-products.js — Products are managed category-first: pick a
 * category (shown with its product count), then add/edit/delete/hide/
 * reorder products scoped to that one category only. Options and add-ons
 * (AdminOptions) are edited inline inside the product form itself.
 */
const AdminProducts = (() => {
  let cache = [];
  let selectedCategoryId = null;

  async function refresh() {
    await AdminCategories.refresh();
    cache = await AdminAPI.listProducts();
    sortCache();
    populateCategorySelect();
    if (selectedCategoryId && AdminCategories.getAll().some(c => c.id === selectedCategoryId)) {
      renderCategoryList();
    } else {
      showCategoryPicker();
    }
    return cache;
  }

  function sortCache() {
    const catOrder = AdminCategories.getAll().map(c => c.id);
    cache.sort((a, b) => {
      const ai = catOrder.indexOf(a.category_id), bi = catOrder.indexOf(b.category_id);
      if (ai !== bi) return ai - bi;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }

  function populateCategorySelect() {
    const select = document.getElementById('pf-category');
    const categories = AdminCategories.getAll();
    select.innerHTML = categories.map(c => `<option value="${c.id}">${AdminUI.escapeHtml(c.name_ar)}</option>`).join('');
  }

  /* ---- Step 1: category picker ------------------------------------------*/
  function showCategoryPicker() {
    selectedCategoryId = null;
    document.getElementById('products-list-view').classList.add('hidden');
    document.getElementById('products-categories-view').classList.remove('hidden');
    renderCategoryPicker();
  }

  function renderCategoryPicker() {
    const grid = document.getElementById('products-category-grid');
    const empty = document.getElementById('products-categories-empty');
    const categories = AdminCategories.getAll();
    grid.innerHTML = categories.map(c => {
      const count = cache.filter(p => p.category_id === c.id).length;
      return `
      <button type="button" class="category-picker-card" data-open-category="${c.id}">
        <span class="category-picker-name">${AdminUI.escapeHtml(c.name_ar)}</span>
        <span class="category-picker-count">${count} ${count === 1 ? 'منتج' : 'منتجات'}</span>
      </button>`;
    }).join('');
    empty.classList.toggle('hidden', categories.length > 0);
    grid.querySelectorAll('[data-open-category]').forEach(btn => {
      btn.addEventListener('click', () => showCategory(btn.dataset.openCategory));
    });
  }

  /* ---- Step 2: one category's product list ------------------------------*/
  function showCategory(categoryId) {
    selectedCategoryId = categoryId;
    document.getElementById('products-categories-view').classList.add('hidden');
    document.getElementById('products-list-view').classList.remove('hidden');
    renderCategoryList();
  }

  function renderCategoryList() {
    const cat = AdminCategories.getAll().find(c => c.id === selectedCategoryId);
    document.getElementById('products-category-title').textContent = cat ? cat.name_ar : '—';
    render();
  }

  function currentCategoryProducts() {
    return cache.filter(p => p.category_id === selectedCategoryId);
  }

  function render() {
    const tbody = document.querySelector('#products-table tbody');
    const empty = document.getElementById('products-empty');
    const products = currentCategoryProducts();
    tbody.innerHTML = products.map(p => `
      <tr data-id="${p.id}" draggable="true">
        <td class="drag-handle-cell"><span class="drag-handle" title="اسحب لإعادة الترتيب">${icon('grip')}</span></td>
        <td>${p.image_url ? `<img class="thumb" src="${p.image_url}" alt="">` : '<span class="text-muted">—</span>'}</td>
        <td>${AdminUI.escapeHtml(p.name_ar)}</td>
        <td>${AdminUI.currency(p.price)}</td>
        <td>${(p.badges || []).map(b => `<span class="chip chip-available">${AdminUI.BADGE_OPTIONS.find(o => o.key === b)?.label || b}</span>`).join(' ')}</td>
        <td>${availabilityChip(p)}</td>
        <td class="row-actions">
          <button type="button" class="icon-action-btn" data-toggle-visible="${p.id}" title="إخفاء/إظهار">${icon(p.is_available ? 'eye' : 'eyeOff')}</button>
          <button type="button" class="icon-action-btn" data-edit="${p.id}">${icon('edit')}</button>
          <button type="button" class="icon-action-btn danger" data-delete="${p.id}">${icon('x')}</button>
        </td>
      </tr>`).join('');
    empty.classList.toggle('hidden', products.length > 0);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(cache.find(p => p.id === b.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
    tbody.querySelectorAll('[data-toggle-visible]').forEach(b => b.addEventListener('click', () => toggleVisible(b.dataset.toggleVisible)));
    bindDragReorderOnce(tbody);
  }

  /* ---- Drag-and-drop reordering -----------------------------------------
     The table only ever shows ONE category's products at a time now, so
     every row is always a valid drop target for every other row — no
     cross-category guard needed anymore.

     Bound ONCE via event delegation on <tbody> (not re-bound per render) —
     this is also what fixes the classic "row moves then snaps straight
     back" native drag-and-drop bug: that happens when a dragover handler
     doesn't reliably call preventDefault() on the exact hovered element,
     so the browser decides the drop is rejected and animates the row back
     to its start position regardless of what the drop handler does. */
  let draggedId = null;
  let dragBound = false;

  function bindDragReorderOnce(tbody) {
    if (dragBound) return;
    dragBound = true;

    tbody.addEventListener('dragstart', (e) => {
      const row = e.target.closest('tr[draggable]');
      if (!row) return;
      draggedId = row.dataset.id;
      row.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', row.dataset.id); // Firefox requires this to proceed at all
    });

    tbody.addEventListener('dragend', () => {
      draggedId = null;
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('is-dragging', 'drop-above', 'drop-below'));
    });

    tbody.addEventListener('dragover', (e) => {
      const row = e.target.closest('tr[draggable]');
      if (!row || !draggedId || row.dataset.id === draggedId) return;
      e.preventDefault(); // required every time, or the browser rejects the drop
      e.dataTransfer.dropEffect = 'move';
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drop-above', 'drop-below'));
      const before = e.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.classList.add(before ? 'drop-above' : 'drop-below');
    });

    tbody.addEventListener('drop', (e) => {
      const row = e.target.closest('tr[draggable]');
      if (!row || !draggedId || row.dataset.id === draggedId) return;
      e.preventDefault();
      const draggedRow = tbody.querySelector(`tr[data-id="${draggedId}"]`);
      if (!draggedRow) return;
      const before = e.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.parentNode.insertBefore(draggedRow, before ? row : row.nextSibling);
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drop-above', 'drop-below'));
      persistNewOrder(tbody);
    });
  }

  async function persistNewOrder(tbody) {
    const ids = [...tbody.querySelectorAll('tr')].map(r => r.dataset.id);
    const updates = ids.map((id, i) => ({ id, sort_order: i }));
    updates.forEach(({ id, sort_order }) => {
      const p = cache.find(x => x.id === id);
      if (p) p.sort_order = sort_order;
    });
    try {
      await AdminAPI.reorderProducts(updates);
    } catch (err) {
      console.error('reorderProducts failed:', err);
      AdminUI.toast(err.message || 'تعذر حفظ الترتيب', true);
      await refresh();
    }
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
      await refreshKeepingView();
    } catch (err) { AdminUI.toast(err.message || 'تعذر التحديث', true); }
  }

  /* Re-fetch data but stay on whichever view (picker or a category list)
     the admin is currently looking at, instead of always bouncing back
     to the category picker. */
  async function refreshKeepingView() {
    const wasViewingCategory = selectedCategoryId;
    await AdminCategories.refresh();
    cache = await AdminAPI.listProducts();
    sortCache();
    populateCategorySelect();
    if (wasViewingCategory) renderCategoryList(); else renderCategoryPicker();
  }

  function openForm(product = null) {
    document.getElementById('product-modal-title').textContent = product ? 'تعديل منتج' : 'إضافة منتج';
    document.getElementById('pf-id').value = product?.id || '';
    document.getElementById('pf-name').value = product?.name_ar || '';
    document.getElementById('pf-desc').value = product?.description_ar || '';
    document.getElementById('pf-price').value = product?.price ?? '';
    document.getElementById('pf-available').checked = product ? product.is_available : true;
    document.getElementById('pf-track-stock').checked = product?.track_stock || false;
    document.getElementById('pf-stock-qty').value = product?.stock_qty ?? '';
    document.getElementById('pf-stock-qty-field').classList.toggle('hidden', !(product?.track_stock));
    document.getElementById('pf-category').value = product?.category_id || selectedCategoryId || AdminCategories.getAll()[0]?.id || '';

    const preview = document.getElementById('pf-image-preview');
    preview.src = product?.image_url || '';
    document.getElementById('pf-image-url').value = product?.image_url || '';

    AdminUI.renderBadgePicker(document.getElementById('pf-badges'), product?.badges || []);
    AdminOptions.loadForProduct(product);
    AdminUI.openModal('product-modal-overlay');
  }

  async function submit(e) {
    e.preventDefault();
    const trackStock = document.getElementById('pf-track-stock').checked;
    const id = document.getElementById('pf-id').value || undefined;
    const categoryId = document.getElementById('pf-category').value;
    const row = {
      id,
      name_ar: document.getElementById('pf-name').value.trim(),
      description_ar: document.getElementById('pf-desc').value.trim(),
      price: Number(document.getElementById('pf-price').value) || 0,
      category_id: categoryId,
      is_available: document.getElementById('pf-available').checked,
      track_stock: trackStock,
      stock_qty: trackStock ? (Number(document.getElementById('pf-stock-qty').value) || 0) : null,
      image_url: document.getElementById('pf-image-url').value || null,
      badges: AdminUI.getSelectedBadges(document.getElementById('pf-badges')),
    };
    const isNew = !id;
    if (isNew) {
      // New product — append to the end of its category. Existing products
      // keep whatever sort_order drag-and-drop last gave them.
      row.sort_order = cache.filter(p => p.category_id === categoryId).length;
    }
    try {
      const saved = await AdminAPI.upsertProduct(row);
      AdminUI.toast('تم حفظ المنتج');
      if (isNew) {
        // Let the admin keep adding options/add-ons right away instead of
        // closing the modal on first save.
        document.getElementById('pf-id').value = saved.id;
        document.getElementById('product-modal-title').textContent = 'تعديل منتج';
        AdminOptions.loadForProduct({ ...saved, option_groups: [] });
      } else {
        AdminUI.closeModal('product-modal-overlay');
      }
      await refreshKeepingView();
      if (categoryId !== selectedCategoryId && selectedCategoryId) showCategory(categoryId);
      document.dispatchEvent(new CustomEvent('admin:products-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر حفظ المنتج', true); }
  }

  async function remove(id) {
    if (!AdminUI.confirmDelete('حذف هذا المنتج نهائياً؟ سيُحذف معه خياراته وإضافاته.')) return;
    try {
      await AdminAPI.deleteProduct(id);
      AdminUI.toast('تم حذف المنتج');
      await refreshKeepingView();
      document.dispatchEvent(new CustomEvent('admin:products-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
  }

  /* Called by AdminOptions after it saves a group/option, so the editor
     reflects the freshly-saved data without closing the product modal. */
  async function refreshCurrentProductOptions() {
    const id = document.getElementById('pf-id').value;
    if (!id) return;
    try {
      cache = await AdminAPI.listProducts();
      const product = cache.find(p => p.id === id);
      AdminOptions.loadForProduct(product);
    } catch (err) { AdminUI.toast(err.message || 'تعذر التحديث', true); }
  }

  function init() {
    document.getElementById('add-product-btn').addEventListener('click', () => openForm());
    document.getElementById('products-back-btn').addEventListener('click', showCategoryPicker);
    document.getElementById('product-form').addEventListener('submit', submit);
    document.getElementById('pf-track-stock').addEventListener('change', (e) => {
      document.getElementById('pf-stock-qty-field').classList.toggle('hidden', !e.target.checked);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh, getAll: () => cache, refreshCurrentProductOptions };
})();
