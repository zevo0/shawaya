/**
 * admin-categories.js — Categories CRUD (add/edit/delete/reorder).
 */
const AdminCategories = (() => {
  let cache = [];

  async function refresh() {
    cache = await AdminAPI.listCategories();
    render();
    return cache;
  }

  function render() {
    const tbody = document.querySelector('#categories-table tbody');
    const empty = document.getElementById('categories-empty');
    tbody.innerHTML = cache.map(c => `
      <tr data-id="${c.id}">
        <td>${AdminUI.escapeHtml(c.name_ar)}</td>
        <td>${c.sort_order}</td>
        <td>${c.is_active ? '<span class="chip chip-available">نشط</span>' : '<span class="chip chip-hidden">غير نشط</span>'}</td>
        <td class="row-actions">
          <button type="button" class="icon-action-btn" data-edit="${c.id}">${icon('edit')}</button>
          <button type="button" class="icon-action-btn danger" data-delete="${c.id}">${icon('x')}</button>
        </td>
      </tr>`).join('');
    empty.classList.toggle('hidden', cache.length > 0);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(cache.find(c => c.id === b.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
  }

  function openForm(category = null) {
    document.getElementById('category-modal-title').textContent = category ? 'تعديل تصنيف' : 'إضافة تصنيف';
    document.getElementById('cf-id').value = category?.id || '';
    document.getElementById('cf-name').value = category?.name_ar || '';
    document.getElementById('cf-sort').value = category?.sort_order ?? cache.length;
    document.getElementById('cf-active').checked = category ? category.is_active : true;
    AdminUI.openModal('category-modal-overlay');
  }

  async function submit(e) {
    e.preventDefault();
    const row = {
      id: document.getElementById('cf-id').value || undefined,
      name_ar: document.getElementById('cf-name').value.trim(),
      sort_order: Number(document.getElementById('cf-sort').value) || 0,
      is_active: document.getElementById('cf-active').checked,
    };
    try {
      await AdminAPI.upsertCategory(row);
      AdminUI.toast('تم حفظ التصنيف');
      AdminUI.closeModal('category-modal-overlay');
      await refresh();
      document.dispatchEvent(new CustomEvent('admin:categories-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر حفظ التصنيف', true); }
  }

  async function remove(id) {
    if (!AdminUI.confirmDelete('حذف هذا التصنيف؟ سيتم فك ارتباط منتجاته.')) return;
    try {
      await AdminAPI.deleteCategory(id);
      AdminUI.toast('تم حذف التصنيف');
      await refresh();
      document.dispatchEvent(new CustomEvent('admin:categories-changed'));
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
  }

  function init() {
    document.getElementById('add-category-btn').addEventListener('click', () => openForm());
    document.getElementById('category-form').addEventListener('submit', submit);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh, getAll: () => cache };
})();
