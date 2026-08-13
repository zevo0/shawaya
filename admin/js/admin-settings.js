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
    document.getElementById('settings-seo-keywords').value = s.seo_keywords || '';
    document.getElementById('settings-map').value = s.map_url || '';
    document.getElementById('settings-open-hour').value = s.open_hour ?? 12;
    document.getElementById('settings-close-hour').value = s.close_hour ?? 24;
    document.getElementById('settings-instagram').value = s.instagram_url || '';
  }

  async function submit(e) {
    e.preventDefault();
    const openHour = Number(document.getElementById('settings-open-hour').value);
    const closeHour = Number(document.getElementById('settings-close-hour').value);
    const whatsappNumber = document.getElementById('settings-whatsapp').value.trim();

    if (!Number.isInteger(openHour) || openHour < 0 || openHour > 23 || !Number.isInteger(closeHour) || closeHour < 1 || closeHour > 24) {
      AdminUI.toast('أدخل ساعات عمل صحيحة: الفتح من 0 إلى 23 والإغلاق من 1 إلى 24.', true);
      return;
    }
    if (!/^\d{7,15}$/.test(whatsappNumber)) {
      AdminUI.toast('رقم واتساب يجب أن يحتوي أرقاماً فقط، من 7 إلى 15 رقماً.', true);
      return;
    }

    const patch = {
      logo_url: document.getElementById('settings-logo-url').value || null,
      hero_url: document.getElementById('settings-hero-url').value || null,
      restaurant_name: document.getElementById('settings-name').value.trim(),
      whatsapp_number: whatsappNumber,
      tagline: document.getElementById('settings-tagline').value.trim(),
      description: document.getElementById('settings-description').value.trim(),
      seo_keywords: document.getElementById('settings-seo-keywords').value.trim() || null,
      map_url: document.getElementById('settings-map').value.trim(),
      open_hour: openHour,
      close_hour: closeHour,
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
