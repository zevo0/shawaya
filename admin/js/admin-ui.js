/**
 * admin-ui.js — Small shared UI helpers used across every admin module:
 * toasts, modal open/close, currency/escaping, badge & icon pickers,
 * and the "pick from media library" wiring used by every image field.
 */
const AdminUI = (() => {
  function toast(msg, isError = false) {
    const el = document.getElementById('admin-toast');
    el.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    el.style.background = isError ? '#c0392b' : 'var(--color-dark)';
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function currency(n) { return `${Number(n).toFixed(3)} ر.ع`; }

  function openModal(id) { document.getElementById(id).classList.add('is-open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('is-open'); }

  function bindModalClosers() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('is-open'); });
    });
  }

  const BADGE_OPTIONS = [
    { key: 'popular', label: 'الأكثر طلباً', icon: 'star' },
    { key: 'hot', label: 'حار', icon: 'hot' },
    { key: 'new', label: 'جديد', icon: 'sparkle' },
    { key: 'limited', label: 'كمية محدودة', icon: 'clock' },
    { key: 'offer', label: 'عرض', icon: 'gift' },
    { key: 'chef', label: 'اختيار الشيف', icon: 'chefHat' },
  ];

  function renderBadgePicker(container, selected = []) {
    container.innerHTML = BADGE_OPTIONS.map(b => `
      <label class="badge-pick ${selected.includes(b.key) ? 'is-selected' : ''}" data-badge="${b.key}">
        ${icon(b.icon)}<span>${b.label}</span>
      </label>`).join('');
    container.querySelectorAll('.badge-pick').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('is-selected'));
    });
  }
  function getSelectedBadges(container) {
    return [...container.querySelectorAll('.badge-pick.is-selected')].map(el => el.dataset.badge);
  }

  const ICON_OPTIONS = ['flame', 'drumstick', 'salad', 'cup', 'star', 'gift', 'chefHat', 'sparkle', 'hot'];

  function renderIconPicker(container, hiddenInput, selected = 'flame') {
    container.innerHTML = ICON_OPTIONS.map(key => `
      <span class="icon-pick ${key === selected ? 'is-selected' : ''}" data-icon="${key}">${icon(key)}</span>
    `).join('');
    container.querySelectorAll('.icon-pick').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.icon-pick').forEach(x => x.classList.remove('is-selected'));
        el.classList.add('is-selected');
        hiddenInput.value = el.dataset.icon;
      });
    });
  }

  /* ---- Image picker: click a button -> open media library -> fills a
     hidden input + preview <img> with the chosen URL. ------------------- */
  let pendingImageTarget = null;
  function bindImagePickers() {
    document.querySelectorAll('[data-pick-image]').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingImageTarget = btn.dataset.pickImage; // id of the hidden input to fill
        AdminMedia.openPicker();
      });
    });
  }
  function resolveImagePick(url) {
    if (!pendingImageTarget) return;
    const input = document.getElementById(pendingImageTarget);
    input.value = url;
    const preview = document.getElementById(pendingImageTarget.replace('-url', '-preview'));
    if (preview) { preview.src = url; preview.classList.remove('empty'); }
    pendingImageTarget = null;
  }

  function confirmDelete(message) {
    return window.confirm(message);
  }

  return {
    toast, escapeHtml, currency, openModal, closeModal, bindModalClosers,
    BADGE_OPTIONS, renderBadgePicker, getSelectedBadges,
    ICON_OPTIONS, renderIconPicker,
    bindImagePickers, resolveImagePick, confirmDelete,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.bindModalClosers();
  AdminUI.bindImagePickers();
});
