/**
 * whatsapp.js — Builds the formatted order message and hands the customer
 * directly to WhatsApp.
 *
 * IMPORTANT:
 * - No window.open() / popup / about:blank is used.
 * - No Supabase request is awaited before navigating to WhatsApp.
 * - The WhatsApp FAB is a real <a href="https://wa.me/..."> link when
 *   the cart is empty, which is the most reliable path inside in-app browsers.
 * - If the cart contains items, the click builds the pre-filled message and
 *   navigates directly to wa.me. Supabase order logging is best-effort and
 *   never blocks the WhatsApp handoff.
 *
 * IN-APP BROWSER FALLBACK (Instagram / Facebook bio link):
 * - Instagram/Facebook's embedded browser (WKWebView on iOS especially)
 *   deliberately blocks the https → whatsapp:// handoff that wa.me relies
 *   on. There is no reliable JS API to force it through — the realistic
 *   fix is: detect it, attempt navigation anyway, and if the tap doesn't
 *   leave the page within ~700ms, show a guidance dialog (steps to open in
 *   the real browser + a "copy order" fallback that always works).
 */
const WhatsAppCheckout = (() => {
  let helpOverlay, helpDialog, helpLastFocused;

  function isInAppBrowser() {
    const ua = navigator.userAgent || '';
    return /Instagram/i.test(ua) || /FBAN|FBAV/i.test(ua);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function copyText(str) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(str);
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = str;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) { reject(err); }
    });
  }

  function androidChromeIntentUrl(url) {
    const stripped = url.replace(/^https?:\/\//, '');
    return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  function createHelpDialog() {
    helpOverlay = document.createElement('div');
    helpOverlay.className = 'cart-confirm-overlay';
    helpOverlay.setAttribute('aria-hidden', 'true');
    helpOverlay.innerHTML = `
      <section class="cart-confirm-dialog iab-help-dialog" role="dialog" aria-modal="true" aria-labelledby="iab-help-title" aria-describedby="iab-help-desc">
        <button type="button" class="iab-help-close" data-iab-close aria-label="إغلاق">${icon('x')}</button>
        <div class="iab-help-icon">${icon('instagram')}</div>
        <h2 id="iab-help-title">تعذّر فتح واتساب تلقائياً</h2>
        <p id="iab-help-desc">أنت تتصفح من داخل التطبيق، وهو يمنع فتح واتساب مباشرة. اتبع الخطوات:</p>
        <ol class="iab-help-steps">
          <li>اضغط على زر <strong>⋯</strong> في أعلى الشاشة</li>
          <li>اختر <strong>"فتح في المتصفح"</strong></li>
          <li>أكمل الطلب من هناك، أو الصق التفاصيل المنسوخة مباشرة في واتساب</li>
        </ol>
        <div class="cart-confirm-actions iab-help-actions" data-iab-actions></div>
      </section>`;
    document.body.appendChild(helpOverlay);
    helpDialog = helpOverlay.querySelector('.iab-help-dialog');
    helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) closeHelp(); });
    helpOverlay.querySelector('[data-iab-close]').addEventListener('click', closeHelp);
  }

  function openHelp({ url, copyLabel, copyValue }) {
    if (!helpOverlay) createHelpDialog();
    const actions = helpDialog.querySelector('[data-iab-actions]');
    actions.innerHTML = '';

    if (copyValue) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-outline btn-sm';
      copyBtn.innerHTML = `${icon('copy')} ${copyLabel || 'نسخ التفاصيل'}`;
      copyBtn.addEventListener('click', () => {
        copyText(copyValue).then(() => {
          Toast.show('تم النسخ ✅');
        }).catch(() => Toast.show('تعذر النسخ، حاول يدوياً'));
      });
      actions.appendChild(copyBtn);
    }

    if (isAndroid()) {
      const chromeBtn = document.createElement('button');
      chromeBtn.type = 'button';
      chromeBtn.className = 'btn btn-outline btn-sm';
      chromeBtn.textContent = 'فتح في Chrome';
      chromeBtn.addEventListener('click', () => {
        window.location.href = androidChromeIntentUrl(url);
      });
      actions.appendChild(chromeBtn);
    }

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary btn-sm';
    retryBtn.innerHTML = `${icon('refresh')} إعادة المحاولة`;
    retryBtn.addEventListener('click', () => { window.location.href = url; });
    actions.appendChild(retryBtn);

    helpLastFocused = document.activeElement;
    helpOverlay.classList.add('is-open');
    helpOverlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => helpOverlay.querySelector('[data-iab-close]')?.focus());
  }

  function closeHelp() {
    if (!helpOverlay?.classList.contains('is-open')) return;
    helpOverlay.classList.remove('is-open');
    helpOverlay.setAttribute('aria-hidden', 'true');
    helpLastFocused?.focus();
  }

  // Navigates to `url`. If the in-app browser silently swallows the
  // handoff (page is still here and still visible a moment later), shows
  // the guidance dialog instead of leaving the customer stuck.
  function navigateWithFallback(url, { copyLabel, copyValue } = {}) {
    if (!isInAppBrowser()) {
      window.location.href = url;
      return;
    }
    let left = false;
    const markLeft = () => { left = true; };
    window.addEventListener('pagehide', markLeft, { once: true });
    window.location.href = url;
    setTimeout(() => {
      window.removeEventListener('pagehide', markLeft);
      if (!left && !document.hidden) openHelp({ url, copyLabel, copyValue });
    }, 700);
  }

  // For plain <a href="wa.me/..."> taps we don't own (header icon, empty-cart
  // FAB): the real click still does its thing untouched (no preventDefault);
  // this just watches whether it actually worked and steps in if not.
  function watchOnce(url, copyLabel, copyValue) {
    if (!isInAppBrowser()) return;
    let left = false;
    const markLeft = () => { left = true; };
    window.addEventListener('pagehide', markLeft, { once: true });
    setTimeout(() => {
      window.removeEventListener('pagehide', markLeft);
      if (!left && !document.hidden) openHelp({ url, copyLabel, copyValue });
    }, 700);
  }

  function watchAnchor(el) {
    if (!el) return;
    el.addEventListener('click', () => watchOnce(el.href, 'نسخ الرقم', getNumber()));
  }

  function getNumber() {
    return String(
      window.SHAWAYA_SETTINGS?.whatsapp_number ||
      window.SHAWAYA_CONFIG?.fallback?.whatsapp_number ||
      ''
    ).replace(/[^0-9]/g, '');
  }

  function getBaseUrl() {
    const number = getNumber();
    return number ? `https://wa.me/${number}` : '';
  }

  function buildMessage() {
    const { lines, generalNotes, totals } = Cart.getState();
    let msg = `🏃 طلب استلام من الفرع - ${window.SHAWAYA_SETTINGS?.restaurant_name || 'شواية'}\n\n`;
    msg += `🍽️ تفاصيل الطلب\n`;
    lines.forEach((line, i) => {
      const unit = Cart.lineUnitPrice(line.product, line.selections);
      const opts = Cart.lineOptionLabels(line.product, line.selections);
      msg += `\n${i + 1}️⃣ ${line.product.name_ar}\n`;
      msg += `   الكمية: ${line.qty}\n`;
      if (opts.length) msg += `   الخيارات: ${opts.join('، ')}\n`;
      if (line.notes) msg += `   الملاحظات: ${line.notes}\n`;
      msg += `   السعر: ${Menu.currency(unit * line.qty)}\n`;
    });
    msg += `\n📝 ملاحظات عامة:\n${generalNotes?.trim() || 'لا يوجد'}\n`;
    msg += `\n💰 إجمالي المبلغ:\n${Menu.currency(totals.total)}\n`;
    msg += `\n⏱️ يرجى إفادتي بالوقت المتوقع لجاهزية الطلب.`;
    return msg;
  }

  function buildOrderLines(lines) {
    return lines.map(l => ({
      product: l.product,
      qty: l.qty,
      unitPrice: Cart.lineUnitPrice(l.product, l.selections),
      optionLabels: Cart.lineOptionLabels(l.product, l.selections),
      notes: l.notes,
    }));
  }

  function isRestaurantOpen() {
    const settings = window.SHAWAYA_SETTINGS;
    return Boolean(settings) && RestaurantState.isOpen(settings);
  }

  function navigateToWhatsApp(url, fallbackOptions) {
    if (!url) {
      Toast.show('رقم واتساب غير متوفر حالياً');
      return;
    }

    // Direct top-level navigation. Do not replace this with window.open().
    // It keeps the navigation tied to the user's click and avoids popup
    // restrictions commonly encountered in in-app browsers. Inside a known
    // in-app browser (Instagram/Facebook) we additionally watch whether the
    // handoff actually left the page, and show guidance if it didn't.
    navigateWithFallback(url, fallbackOptions);
  }

  function send() {
    const { lines, generalNotes, totals } = Cart.getState();
    if (!lines.length) {
      Toast.show('السلة فارغة');
      return;
    }

    if (!isRestaurantOpen()) {
      Toast.show('عذراً، المطعم مغلق حالياً. لا يمكن إتمام الطلب.');
      return;
    }

    const number = getNumber();
    if (!number) {
      Toast.show('رقم واتساب غير متوفر حالياً');
      return;
    }

    const orderLines = buildOrderLines(lines);
    const message = buildMessage();
    const text = encodeURIComponent(message);
    const url = `https://wa.me/${number}?text=${text}`;

    // Start dashboard logging as best-effort, but NEVER wait for it before
    // sending the customer to WhatsApp. The customer order handoff has priority.
    try {
      void ShawayaData.createOrder({
        lines: orderLines,
        generalNotes,
        subtotal: totals.subtotal,
        total: totals.total,
      }).then((saved) => {
        if (!saved?.ok) {
          console.warn('Order log failed — WhatsApp checkout already proceeded:', saved?.reason);
        }
      }).catch((err) => {
        console.warn('Order log failed — WhatsApp checkout already proceeded:', err);
      });
    } catch (err) {
      console.warn('Could not start order logging — WhatsApp checkout proceeding:', err);
    }

    navigateToWhatsApp(url, { copyLabel: 'نسخ تفاصيل الطلب', copyValue: message });
  }

  function init() {
    const checkoutButton = document.getElementById('checkout-whatsapp');
    if (checkoutButton) checkoutButton.addEventListener('click', send);

    const fab = document.getElementById('whatsapp-fab');
    if (fab) {
      fab.addEventListener('click', (e) => {
        const { lines } = Cart.getState();

        // With an active cart we need the pre-filled order message, so the
        // JavaScript flow takes over. With an empty cart we intentionally do
        // nothing here: the element remains a normal <a> and the browser
        // follows its real wa.me href directly from the user's click — we
        // just watch (without preventDefault) in case that tap gets blocked.
        if (lines.length) {
          e.preventDefault();
          send();
        } else {
          watchOnce(fab.href, 'نسخ الرقم', getNumber());
        }
      });
    }

    watchAnchor(document.getElementById('whatsapp-fab-header'));
  }

  document.addEventListener('DOMContentLoaded', init);
  return { buildMessage, send, isRestaurantOpen };
})();
