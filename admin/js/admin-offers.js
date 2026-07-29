/**
 * admin-offers.js — Offers CRUD: create, activate/deactivate, date range,
 * image (from media library).
 */
const AdminOffers = (() => {
  let cache = [];

  async function refresh() {
    cache = await AdminAPI.listOffers();
    render();
  }

  function render() {
    const tbody = document.querySelector('#offers-table tbody');
    const empty = document.getElementById('offers-empty');
    tbody.innerHTML = cache.map(o => `
      <tr data-id="${o.id}">
        <td>${o.image_url ? `<img class="thumb" src="${o.image_url}" alt="">` : '—'}</td>
        <td>${AdminUI.escapeHtml(o.title_ar)}</td>
        <td>${AdminUI.currency(o.price)}</td>
        <td>${o.starts_at || '—'}</td>
        <td>${o.ends_at || '—'}</td>
        <td>${o.is_active ? '<span class="chip chip-available">مفعّل</span>' : '<span class="chip chip-hidden">متوقف</span>'}</td>
        <td class="row-actions">
          <button type="button" class="icon-action-btn" data-edit="${o.id}">${icon('edit')}</button>
          <button type="button" class="icon-action-btn danger" data-delete="${o.id}">${icon('x')}</button>
        </td>
      </tr>`).join('');
    empty.classList.toggle('hidden', cache.length > 0);

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(cache.find(o => o.id === b.dataset.edit))));
    tbody.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
  }

  function openForm(offer = null) {
    document.getElementById('offer-modal-title').textContent = offer ? 'تعديل عرض' : 'إنشاء عرض';
    document.getElementById('of-id').value = offer?.id || '';
    document.getElementById('of-title').value = offer?.title_ar || '';
    document.getElementById('of-desc').value = offer?.description_ar || '';
    document.getElementById('of-price').value = offer?.price ?? '';
    document.getElementById('of-active').checked = offer ? offer.is_active : true;
    document.getElementById('of-start').value = offer?.starts_at || '';
    document.getElementById('of-end').value = offer?.ends_at || '';
    document.getElementById('of-image-preview').src = offer?.image_url || '';
    document.getElementById('of-image-url').value = offer?.image_url || '';
    AdminUI.openModal('offer-modal-overlay');
  }

  async function submit(e) {
    e.preventDefault();
    const row = {
      id: document.getElementById('of-id').value || undefined,
      title_ar: document.getElementById('of-title').value.trim(),
      description_ar: document.getElementById('of-desc').value.trim(),
      price: Number(document.getElementById('of-price').value) || 0,
      is_active: document.getElementById('of-active').checked,
      starts_at: document.getElementById('of-start').value || null,
      ends_at: document.getElementById('of-end').value || null,
      image_url: document.getElementById('of-image-url').value || null,
    };
    try {
      await AdminAPI.upsertOffer(row);
      AdminUI.toast('تم حفظ العرض');
      AdminUI.closeModal('offer-modal-overlay');
      await refresh();
    } catch (err) { AdminUI.toast(err.message || 'تعذر حفظ العرض', true); }
  }

  async function remove(id) {
    if (!AdminUI.confirmDelete('حذف هذا العرض؟')) return;
    try { await AdminAPI.deleteOffer(id); AdminUI.toast('تم الحذف'); await refresh(); }
    catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
  }

  function init() {
    document.getElementById('add-offer-btn').addEventListener('click', () => openForm());
    document.getElementById('offer-form').addEventListener('submit', submit);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh };
})();
