/**
 * admin-media.js — Media Library page + the reusable "picker" modal that
 * every image field (products/categories/settings/SEO) opens.
 */
const AdminMedia = (() => {
  let cache = [];

  async function refresh() {
    cache = await AdminAPI.listMedia();
    renderLibraryGrid();
    renderPickerGrid();
  }

  function tileTemplate(item, selectable) {
    return `
      <div class="media-tile" data-media-id="${item.id}" data-url="${item.url}">
        <img src="${item.url}" alt="${AdminUI.escapeHtml(item.filename)}" loading="lazy">
        ${selectable ? '' : `<button type="button" class="media-remove" data-remove-media="${item.id}">${icon('x')}</button>`}
      </div>`;
  }

  function renderLibraryGrid() {
    const grid = document.getElementById('media-grid');
    const empty = document.getElementById('media-empty');
    if (!grid) return;
    grid.innerHTML = cache.map(item => tileTemplate(item, false)).join('');
    empty.classList.toggle('hidden', cache.length > 0);
    grid.querySelectorAll('[data-remove-media]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = cache.find(m => m.id === btn.dataset.removeMedia);
        if (!AdminUI.confirmDelete(`حذف الصورة "${item.filename}"؟`)) return;
        try { await AdminAPI.deleteMedia(item); AdminUI.toast('تم حذف الصورة'); await refresh(); }
        catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
      });
    });
  }

  function renderPickerGrid() {
    const grid = document.getElementById('media-picker-grid');
    if (!grid) return;
    grid.innerHTML = cache.map(item => tileTemplate(item, true)).join('');
    grid.querySelectorAll('.media-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        AdminUI.resolveImagePick(tile.dataset.url);
        AdminUI.closeModal('media-picker-overlay');
      });
    });
  }

  async function handleFiles(fileList) {
    const files = [...fileList].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    AdminUI.toast(`جارٍ رفع ${files.length} صورة...`);
    for (const file of files) {
      try { await AdminAPI.uploadMedia(file); }
      catch (err) { AdminUI.toast(err.message || 'فشل رفع إحدى الصور', true); }
    }
    AdminUI.toast('تم رفع الصور بنجاح');
    await refresh();
  }

  function bindUploadZone(zoneId, inputId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
    ['dragover', 'dragenter'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('is-dragover'); }));
    zone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
  }

  function openPicker() {
    AdminUI.openModal('media-picker-overlay');
  }

  function init() {
    bindUploadZone('media-upload-zone', 'media-file-input');
    bindUploadZone('picker-upload-zone', 'picker-file-input');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh, openPicker, getAll: () => cache };
})();
