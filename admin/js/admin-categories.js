/**
 * admin-categories.js — إدارة التصنيفات مع سحب وترتيب محفوظ في قاعدة البيانات.
 */
const AdminCategories = (() => {
  let cache = [];
  let draggedId = null;
  let dragBound = false;

  async function refresh() {
    cache = await AdminAPI.listCategories();
    render();
    return cache;
  }

  function render() {
    const tbody = document.querySelector('#categories-table tbody');
    const empty = document.getElementById('categories-empty');
    tbody.innerHTML = cache.map(c => `
      <tr data-id="${c.id}" draggable="true">
        <td class="drag-handle-cell"><span class="drag-handle" title="اسحب لإعادة الترتيب">${icon('grip')}</span></td>
        <td>${AdminUI.escapeHtml(c.name_ar)}</td>
        <td>${c.is_active ? '<span class="chip chip-available">نشط</span>' : '<span class="chip chip-hidden">غير نشط</span>'}</td>
        <td class="row-actions">
          <button type="button" class="icon-action-btn" data-edit="${c.id}">${icon('edit')}</button>
          <button type="button" class="icon-action-btn danger" data-delete="${c.id}">${icon('x')}</button>
        </td>
      </tr>`).join('');
    empty.classList.toggle('hidden', cache.length > 0);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(cache.find(c => c.id === b.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
    bindDragReorderOnce(tbody);
  }

  function bindDragReorderOnce(tbody) {
    if (dragBound) return;
    dragBound = true;

    tbody.addEventListener('dragstart', (event) => {
      const row = event.target.closest('tr[draggable]');
      if (!row) return;
      draggedId = row.dataset.id;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedId);
    });

    tbody.addEventListener('dragend', () => {
      draggedId = null;
      tbody.querySelectorAll('tr').forEach((row) => row.classList.remove('is-dragging', 'drop-above', 'drop-below'));
    });

    tbody.addEventListener('dragover', (event) => {
      const row = event.target.closest('tr[draggable]');
      if (!row || !draggedId || row.dataset.id === draggedId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      tbody.querySelectorAll('tr').forEach((item) => item.classList.remove('drop-above', 'drop-below'));
      const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.classList.add(before ? 'drop-above' : 'drop-below');
    });

    tbody.addEventListener('drop', (event) => {
      const row = event.target.closest('tr[draggable]');
      if (!row || !draggedId || row.dataset.id === draggedId) return;
      event.preventDefault();
      const draggedRow = tbody.querySelector(`tr[data-id="${draggedId}"]`);
      if (!draggedRow) return;
      const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.parentNode.insertBefore(draggedRow, before ? row : row.nextSibling);
      tbody.querySelectorAll('tr').forEach((item) => item.classList.remove('drop-above', 'drop-below'));
      persistNewOrder(tbody);
    });
  }

  async function persistNewOrder(tbody) {
    const ids = [...tbody.querySelectorAll('tr')].map((row) => row.dataset.id);
    const updates = ids.map((id, index) => ({ id, sort_order: index }));
    cache = ids.map((id, index) => ({ ...cache.find((category) => category.id === id), sort_order: index }));
    try {
      await AdminAPI.reorderCategories(updates);
      AdminUI.toast('تم حفظ ترتيب التصنيفات');
      document.dispatchEvent(new CustomEvent('admin:categories-changed'));
    } catch (err) {
      AdminUI.toast(err.message || 'تعذر حفظ الترتيب', true);
      await refresh();
    }
  }

  function openForm(category = null) {
    document.getElementById('category-modal-title').textContent = category ? 'تعديل تصنيف' : 'إضافة تصنيف';
    document.getElementById('cf-id').value = category?.id || '';
    document.getElementById('cf-name').value = category?.name_ar || '';
    document.getElementById('cf-active').checked = category ? category.is_active : true;
    AdminUI.openModal('category-modal-overlay');
  }

  async function submit(event) {
    event.preventDefault();
    const id = document.getElementById('cf-id').value || undefined;
    const row = {
      id,
      name_ar: document.getElementById('cf-name').value.trim(),
      is_active: document.getElementById('cf-active').checked,
    };
    if (!id) row.sort_order = cache.length;
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
