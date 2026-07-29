/**
 * admin-seo.js — SEO settings: title, description, keywords, OG image,
 * favicon. Also stored in the `settings` row (same live-sync guarantee).
 */
const AdminSEO = (() => {
  async function refresh() {
    const s = await AdminAPI.getSettings();
    document.getElementById('seo-title').value = s.seo_title || '';
    document.getElementById('seo-description').value = s.seo_description || '';
    document.getElementById('seo-keywords').value = s.seo_keywords || '';
    document.getElementById('seo-og-preview').src = s.seo_og_image || s.hero_url || '../assets/images/hero.webp';
    document.getElementById('seo-og-url').value = s.seo_og_image || '';
    document.getElementById('seo-favicon-preview').src = s.favicon_url || '../assets/images/logo.webp';
    document.getElementById('seo-favicon-url').value = s.favicon_url || '';
  }

  async function submit(e) {
    e.preventDefault();
    const patch = {
      seo_title: document.getElementById('seo-title').value.trim(),
      seo_description: document.getElementById('seo-description').value.trim(),
      seo_keywords: document.getElementById('seo-keywords').value.trim(),
      seo_og_image: document.getElementById('seo-og-url').value || null,
      favicon_url: document.getElementById('seo-favicon-url').value || null,
    };
    const msg = document.getElementById('seo-save-msg');
    try {
      await AdminAPI.updateSettings(patch);
      msg.textContent = 'تم الحفظ — يظهر التغيير على الموقع فوراً ✓';
      msg.style.display = 'inline';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
      AdminUI.toast('تم حفظ إعدادات SEO');
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحفظ', true); }
  }

  function init() {
    document.getElementById('seo-form').addEventListener('submit', submit);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh };
})();
