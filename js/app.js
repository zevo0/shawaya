/**
 * app.js — Bootstraps the page: loading screen, header scroll behavior,
 * hero parallax, live settings from Supabase (branding/hours/open state),
 * menu data loading, realtime sync, ripple micro-interaction.
 */
(function () {
  'use strict';

  window.SHAWAYA_SETTINGS = null; // populated by loadSettings(), read by cart/whatsapp

  function initLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    window.addEventListener('load', () => {
      setTimeout(() => screen.classList.add('is-hidden'), 350);
    });
    if (document.readyState === 'complete') {
      setTimeout(() => screen.classList.add('is-hidden'), 350);
    }
  }

  function initHeaderShrink() {
    const header = document.getElementById('site-header');
    let ticking = false;
    function update() {
      header.classList.toggle('is-shrunk', window.scrollY > 40);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  function initParallax() {
    const img = document.getElementById('hero-img');
    const hero = document.querySelector('.hero');
    if (!img || !hero || window.matchMedia('(max-width: 900px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ticking = false;
    function update() {
      const rect = hero.getBoundingClientRect();
      const offset = Math.max(-100, Math.min(100, rect.top * -0.25));
      img.style.setProperty('--parallax', offset.toFixed(1));
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ---- Apply live settings from Supabase to every part of the page ---- */
  function applySettings(s) {
    window.SHAWAYA_SETTINGS = s;
    const $ = (id) => document.getElementById(id);

    // Branding — بعض الشعارات اختيارية بحسب القالب، لذلك لا نسمح لعنصر
    // غير موجود بإيقاف بقية تحديثات الإعدادات.
    const setImage = (id, url) => {
      const image = $(id);
      if (image && url) image.src = url;
    };
    if (s.logo_url) {
      setImage('brand-logo-img', s.logo_url);
      setImage('hero-logo-img', s.logo_url);
      setImage('footer-logo-img', s.logo_url);
    }
    setImage('hero-img', s.hero_url);
    $('brand-name-text').textContent = s.restaurant_name;
    $('hero-title').textContent = s.restaurant_name;
    $('hero-tagline').textContent = s.tagline;
    $('footer-description').textContent = `${s.restaurant_name} — ${s.description || ''}`;

    // SEO
    document.title = s.seo_title || `${s.restaurant_name} | Shawaya`;
    $('meta-title').textContent = document.title;
    $('meta-description').content = s.seo_description || s.description || '';
    $('meta-keywords').content = s.seo_keywords || '';
    $('og-title').content = document.title;
    $('og-description').content = s.seo_description || '';
    $('og-image').content = s.seo_og_image || s.hero_url || '';
    $('og-site-name').content = s.restaurant_name;
    $('twitter-title').content = document.title;
    $('twitter-description').content = s.seo_description || '';
    $('twitter-image').content = s.seo_og_image || s.hero_url || '';
    if (s.favicon_url) { $('favicon-link').href = s.favicon_url; $('apple-touch-icon-link').href = s.favicon_url; }

    // Contact / social
    const whatsappNumber = String(s.whatsapp_number || '').replace(/[^0-9]/g, '');
    const waLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';
    $('footer-whatsapp').href = waLink;
    $('footer-map').href = s.map_url;
    $('whatsapp-fab-header').href = waLink;
    $('whatsapp-fab').href = waLink;
    $('map-pin-btn').href = s.map_url;

    ['instagram'].forEach((key) => {
      const url = s[`${key}_url`];
      const a = $(`social-${key}`);
      if (url) { a.href = url; a.hidden = false; } else { a.hidden = true; }
    });

    renderHeroStatus(s);
  }

  function renderHeroStatus(s) {
    const el = document.getElementById('hero-status');
    const state = RestaurantState.status(s);
    el.classList.toggle('is-closed', !state.isOpen);
    el.innerHTML = `<span class="dot"></span><span>${state.isOpen ? 'مفتوح' : 'مغلق'}</span>`;
    document.dispatchEvent(new CustomEvent('shawaya:open-state', { detail: { isOpen: state.isOpen, reason: state.reason } }));
  }

  function initSmoothCategoryLinks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-cat-link], .nav-categories a');
      if (!link) return;
      const targetId = link.getAttribute('href');
      if (!targetId?.startsWith('#')) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const headerH = document.getElementById('site-header').offsetHeight;
      const catNavH = document.querySelector('.category-nav')?.offsetHeight || 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - catNavH - 14;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  function initActiveCategoryHighlight() {
    const sections = () => [...document.querySelectorAll('[data-category-section]')];
    const chips = () => [...document.querySelectorAll('[data-cat-link]')];
    let ticking = false;
    function update() {
      const headerH = document.getElementById('site-header').offsetHeight + (document.querySelector('.category-nav')?.offsetHeight || 0) + 40;
      let current = null;
      sections().forEach(sec => {
        if (sec.getBoundingClientRect().top - headerH <= 0) current = sec.dataset.categorySection;
      });
      chips().forEach(chip => chip.setAttribute('aria-current', String(chip.dataset.catLink === current)));
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  function initScrollReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  function initHeroButtons() {
    document.getElementById('hero-browse-btn')?.addEventListener('click', () => {
      document.getElementById('menu-sections').scrollIntoView({ behavior: 'smooth' });
    });
  }

  function initFooterCategories(categories) {
    const ul = document.getElementById('footer-categories');
    if (!ul) return;
    ul.innerHTML = categories.map(c => `<li><a href="#cat-${c.id}">${c.name_ar}</a></li>`).join('');
  }

  async function loadSettings() {
    const settings = await ShawayaData.fetchSettings();
    applySettings(settings);
  }

  async function loadMenu() {
    const data = await ShawayaData.fetchMenu();
    Menu.render(data);
    initFooterCategories(data.categories);
  }

  let unsubscribe = null;
  function initRealtimeSync() {
    unsubscribe = ShawayaData.subscribeToChanges(async ({ table }) => {
      if (table === 'settings') {
        await loadSettings();
        return; // no need to touch the menu grid for a settings-only change
      }
      await loadMenu();
      Toast?.show?.('تم تحديث المنيو');
    });
  }

  function initServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initServiceWorker();
    initLoadingScreen();
    initHeaderShrink();
    initParallax();
    initRipple();
    initHeroButtons();

    await Promise.all([loadSettings(), loadMenu()]);

    initSmoothCategoryLinks();
    initActiveCategoryHighlight();
    initScrollReveal();
    initRealtimeSync();

    // Re-check open/closed status every minute (hours boundary) without a full reload
    setInterval(() => { if (window.SHAWAYA_SETTINGS) renderHeroStatus(window.SHAWAYA_SETTINGS); }, 60000);
  });
})();
