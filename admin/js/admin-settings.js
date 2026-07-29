/**
 * admin-settings.js — Site settings: logo, hero, WhatsApp number, map
 * link, hours, restaurant name/description, social links. Writes to the
 * single `settings` row that the storefront reads live via Supabase
 * realtime — no redeploy needed for any of this to show up.
 */
const AdminSettings = (() => {
  let current = null;

  async function refresh() {
    current = await AdminAPI.getSettings();
    fill(current);
  }

  function fill(s) {
    document.getElementById('settings-logo-preview').src = s.logo_url || '../assets/images/logo.webp';
    document.getElementById('settings-logo-url').value = s.logo_url || '';
    document.getElementById('settings-hero-preview').src = s.hero_url || '../assets/images/hero.webp';
    document.getElementById('settings-hero-url').value = s.hero_url || '';
    document.getElementById('settings-name').value = s.restaurant_name || '';
    document.getElementById('settings-whatsapp').value = s.whatsapp_number || '';
    document.getElementById('settings-tagline').value = s.tagline || '';
    document.getElementById('settings-description').value = s.description || '';
    document.getElementById('settings-map').value = s.map_url || '';
    document.getElementById('settings-open-hour').value = s.open_hour ?? 12;
    document.getElementById('settings-close-hour').value = s.close_hour ?? 24;
    document.getElementById('settings-prep-min').value = s.prep_time_min ?? 20;
    document.getElementById('settings-prep-max').value = s.prep_time_max ?? 30;
    document.getElementById('settings-instagram').value = s.instagram_url || '';
  }

  async function submit(e) {
    e.preventDefault();
    const patch = {
      logo_url: document.getElementById('settings-logo-url').value || null,
      hero_url: document.getElementById('settings-hero-url').value || null,
      restaurant_name: document.getElementById('settings-name').value.trim(),
      whatsapp_number: document.getElementById('settings-whatsapp').value.trim(),
      tagline: document.getElementById('settings-tagline').value.trim(),
      description: document.getElementById('settings-description').value.trim(),
      map_url: document.getElementById('settings-map').value.trim(),
      open_hour: Number(document.getElementById('settings-open-hour').value),
      close_hour: Number(document.getElementById('settings-close-hour').value),
      prep_time_min: Number(document.getElementById('settings-prep-min').value),
      prep_time_max: Number(document.getElementById('settings-prep-max').value),
      instagram_url: document.getElementById('settings-instagram').value.trim() || null,
    };
    const msg = document.getElementById('settings-save-msg');
    try {
      current = await AdminAPI.updateSettings(patch);
      msg.textContent = 'تم الحفظ — يظهر التغيير على الموقع فوراً ✓';
      msg.style.display = 'inline';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
      AdminUI.toast('تم حفظ الإعدادات');
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحفظ', true); }
  }

  function init() {
    document.getElementById('settings-form').addEventListener('submit', submit);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { refresh };
})();
