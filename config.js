/**
 * config.js
 * -----------------------------------------------------------------------
 * Connection details only. Everything else (restaurant name, logo, hero,
 * WhatsApp number, hours, open/closed state, SEO, social links...) now
 * lives in Supabase's `settings` table and is managed from /admin.
 *
 * FALLBACK below is used only if Supabase isn't configured yet, or a
 * fetch fails (e.g. offline) — it keeps the site fully functional out
 * of the box and is never shown once Supabase is connected.
 * -----------------------------------------------------------------------
 */
window.SHAWAYA_CONFIG = Object.freeze({
  supabase: {
    url: "https://vlszwabzveacaoqqgaet.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsc3p3YWJ6dmVhY2FvcXFnYWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjA4MTIsImV4cCI6MjEwMDgzNjgxMn0.42XcfGuzy77-dAoEa7v_fuPCLb1aYAIfhcxdS5gJQj8",
  },

  fallback: {
    restaurant_name: "شواية",
    tagline: "نكهة الفحم الحقيقي، تحضر فوراً لتصلك طازجة ومقرمشة.",
    description: "مشاوي عربية أصيلة تُشوى على الفحم الحقيقي وتصل طازجة ومقرمشة.",
    logo_url: "assets/images/logo.webp",
    hero_url: "assets/images/hero.webp",
    whatsapp_number: "96890992253",
    map_url: "https://maps.google.com",
    open_hour: 12,
    close_hour: 24,
    is_open: true,
    instagram_url: "",
    seo_title: "شواية | Shawaya — أصل المشاوي العربية على الفحم",
    seo_description: "مشاوي عربية أصيلة تُشوى على الفحم الحقيقي وتصل طازجة ومقرمشة. اطلب الآن للاستلام من الفرع عبر واتساب.",
    seo_keywords: "شواية, مشاوي, مطعم مشاوي, شاورما, كباب, مشاوي فحم",
    seo_og_image: "assets/images/hero.webp",
    favicon_url: "assets/images/logo.webp",
  },
});
