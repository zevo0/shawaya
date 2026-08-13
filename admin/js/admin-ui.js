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
    { key: 'popular', label: 'الأكثر طلباً', img: 'best-seller.svg' },
    { key: 'hot', label: 'حار', img: 'spicy.svg' },
    { key: 'new', label: 'جديد', img: 'new.svg' },
    { key: 'limited', label: 'كمية محدودة', img: 'limited.svg' },
    { key: 'offer', label: 'عرض', img: 'offers.svg' },
    { key: 'chef', label: 'اختيار الشيف', img: 'chef-choice.svg' },
  ];

  function renderBadgePicker(container, selected = []) {
    container.innerHTML = BADGE_OPTIONS.map(b => `
      <label class="badge-pick ${selected.includes(b.key) ? 'is-selected' : ''}" data-badge="${b.key}">
        <img src="../assets/icons/${b.img}" alt="" width="15" height="15">
        <span>${b.label}</span>
      </label>`).join('');
    container.querySelectorAll('.badge-pick').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('is-selected'));
    });
  }
  function getSelectedBadges(container) {
    return [...container.querySelectorAll('.badge-pick.is-selected')].map(el => el.dataset.badge);
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

  /* ---- Mobile sidebar drawer ------------------------------------------- */
  let mobileNavLastFocused = null;
  const isMobileViewport = () => window.matchMedia('(max-width: 900px)').matches;
  function isMobileNavOpen() {
    return document.getElementById('admin-sidebar').classList.contains('is-open');
  }
  function syncMobileNavAccessibility() {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (!isMobileViewport()) {
      sidebar.removeAttribute('aria-hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      return;
    }
    const open = isMobileNavOpen();
    sidebar.setAttribute('aria-hidden', String(!open));
    backdrop.setAttribute('aria-hidden', String(!open));
  }
  function openMobileNav() {
    if (!isMobileViewport()) return;
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    mobileNavLastFocused = document.activeElement;
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.getElementById('admin-hamburger-btn').setAttribute('aria-expanded', 'true');
    document.getElementById('admin-hamburger-btn').setAttribute('aria-label', 'إغلاق القائمة');
    document.body.classList.add('admin-nav-open');
    syncMobileNavAccessibility();
    requestAnimationFrame(() => document.getElementById('admin-sidebar-close-btn')?.focus());
  }
  function closeMobileNav({ restoreFocus = false } = {}) {
    const wasOpen = isMobileNavOpen();
    document.getElementById('admin-sidebar').classList.remove('is-open');
    document.getElementById('admin-sidebar-backdrop').classList.remove('is-open');
    document.getElementById('admin-hamburger-btn')?.setAttribute('aria-expanded', 'false');
    document.getElementById('admin-hamburger-btn')?.setAttribute('aria-label', 'فتح القائمة');
    document.body.classList.remove('admin-nav-open');
    syncMobileNavAccessibility();
    if (restoreFocus && wasOpen) mobileNavLastFocused?.focus();
  }
  function toggleMobileNav() {
    if (isMobileNavOpen()) closeMobileNav({ restoreFocus: true }); else openMobileNav();
  }
  function bindMobileNav() {
    document.getElementById('admin-hamburger-btn').addEventListener('click', toggleMobileNav);
    document.getElementById('admin-sidebar-close-btn').addEventListener('click', () => closeMobileNav({ restoreFocus: true }));
    document.getElementById('admin-sidebar-backdrop').addEventListener('click', () => closeMobileNav({ restoreFocus: true }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isMobileNavOpen()) closeMobileNav({ restoreFocus: true }); });
    window.addEventListener('resize', () => { closeMobileNav(); syncMobileNavAccessibility(); });
    syncMobileNavAccessibility();
  }

  return {
    toast, escapeHtml, currency, openModal, closeModal, bindModalClosers,
    BADGE_OPTIONS, renderBadgePicker, getSelectedBadges,
    bindImagePickers, resolveImagePick, confirmDelete,
    bindMobileNav, openMobileNav, closeMobileNav, toggleMobileNav,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AdminUI.bindModalClosers();
  AdminUI.bindImagePickers();
  AdminUI.bindMobileNav();
});
