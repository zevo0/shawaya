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
  let mobileNavBound = false;
  const mobileNavQuery = '(max-width: 900px)';
  const isMobileViewport = () => window.matchMedia(mobileNavQuery).matches;
  const getMobileNavElements = () => ({
    sidebar: document.getElementById('admin-sidebar'),
    backdrop: document.getElementById('admin-sidebar-backdrop'),
    hamburger: document.getElementById('admin-hamburger-btn'),
    closeButton: document.getElementById('admin-sidebar-close-btn'),
    main: document.querySelector('.admin-main'),
  });
  function isMobileNavOpen() {
    return Boolean(getMobileNavElements().sidebar?.classList.contains('is-open'));
  }
  function getMobileNavFocusable() {
    const { sidebar } = getMobileNavElements();
    if (!sidebar) return [];
    return [...sidebar.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getClientRects().length > 0);
  }
  function syncMobileNavAccessibility() {
    const { sidebar, backdrop, main } = getMobileNavElements();
    if (!sidebar || !backdrop) return;
    const mobile = isMobileViewport();
    if (!mobile) {
      sidebar.removeAttribute('aria-hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      if (main) main.inert = false;
      document.documentElement.classList.remove('admin-nav-open');
      document.body.classList.remove('admin-nav-open');
      return;
    }
    const open = sidebar.classList.contains('is-open');
    sidebar.setAttribute('aria-hidden', String(!open));
    backdrop.setAttribute('aria-hidden', String(!open));
    if (main) main.inert = open;
    document.documentElement.classList.toggle('admin-nav-open', open);
    document.body.classList.toggle('admin-nav-open', open);
  }
  function openMobileNav() {
    if (!isMobileViewport()) return;
    const { sidebar, backdrop, hamburger } = getMobileNavElements();
    if (!sidebar || !backdrop || !hamburger) return;
    mobileNavLastFocused = document.activeElement;
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'إغلاق القائمة');
    syncMobileNavAccessibility();
    requestAnimationFrame(() => getMobileNavElements().closeButton?.focus({ preventScroll: true }));
  }
  function closeMobileNav({ restoreFocus = false } = {}) {
    const wasOpen = isMobileNavOpen();
    const { sidebar, backdrop, hamburger } = getMobileNavElements();
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    hamburger?.setAttribute('aria-label', 'فتح القائمة');
    syncMobileNavAccessibility();
    if (restoreFocus && wasOpen && mobileNavLastFocused && typeof mobileNavLastFocused.focus === 'function') {
      mobileNavLastFocused.focus({ preventScroll: true });
    }
    mobileNavLastFocused = null;
  }
  function toggleMobileNav() {
    if (isMobileNavOpen()) closeMobileNav({ restoreFocus: true });
    else openMobileNav();
  }
  function trapMobileNavFocus(e) {
    if (e.key !== 'Tab' || !isMobileNavOpen()) return;
    const focusable = getMobileNavFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  function bindMobileNav() {
    if (mobileNavBound) return;
    const { sidebar, backdrop, hamburger, closeButton } = getMobileNavElements();
    if (!sidebar || !backdrop || !hamburger || !closeButton) return;
    mobileNavBound = true;
    hamburger.addEventListener('click', toggleMobileNav);
    closeButton.addEventListener('click', () => closeMobileNav({ restoreFocus: true }));
    backdrop.addEventListener('click', () => closeMobileNav({ restoreFocus: true }));
    sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.admin-nav-link');
      if (link) closeMobileNav();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMobileNavOpen()) closeMobileNav({ restoreFocus: true });
      else trapMobileNavFocus(e);
    });
    const mediaQuery = window.matchMedia(mobileNavQuery);
    const handleViewportChange = () => {
      if (!mediaQuery.matches) closeMobileNav();
      syncMobileNavAccessibility();
    };
    if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', handleViewportChange);
    else mediaQuery.addListener(handleViewportChange);
    window.addEventListener('resize', syncMobileNavAccessibility, { passive: true });
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
