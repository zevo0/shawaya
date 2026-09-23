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
 */
const WhatsAppCheckout = (() => {
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

  function navigateToWhatsApp(url) {
    if (!url) {
      Toast.show('رقم واتساب غير متوفر حالياً');
      return;
    }

    // Direct top-level navigation. Do not replace this with window.open().
    // It keeps the navigation tied to the user's click and avoids popup
    // restrictions commonly encountered in in-app browsers.
    window.location.href = url;
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
    const text = encodeURIComponent(buildMessage());
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

    navigateToWhatsApp(url);
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
        // follows its real wa.me href directly from the user's click.
        if (lines.length) {
          e.preventDefault();
          send();
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { buildMessage, send, isRestaurantOpen };
})();
