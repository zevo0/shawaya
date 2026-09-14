/**
 * whatsapp.js
 * -----------------------------------------------------------------------
 * WhatsApp is the PRIMARY customer handoff.
 *
 * IMPORTANT:
 * - WhatsApp navigation must NOT depend on Supabase.
 * - No window.open()
 * - No about:blank
 * - No await before WhatsApp navigation
 * - No popup that needs to be redirected later
 *
 * Order logging is best-effort only and must never block the customer.
 * -----------------------------------------------------------------------
 */

const WhatsAppCheckout = (() => {

  /**
   * Get the restaurant WhatsApp number.
   */
  function getNumber() {
    return (
      window.SHAWAYA_SETTINGS?.whatsapp_number ||
      window.SHAWAYA_CONFIG?.fallback?.whatsapp_number ||
      ''
    );
  }

  /**
   * Build the WhatsApp URL.
   *
   * This function is completely synchronous.
   * No Supabase. No fetch. No await.
   */
  function buildWhatsAppUrl() {
    const number = getNumber();

    if (!number) {
      console.error('WhatsApp number is missing.');
      return null;
    }

    const { lines } = Cart.getState();

    // Normal WhatsApp contact from the floating button.
    if (!lines.length) {
      return `https://wa.me/${number}`;
    }

    const text = encodeURIComponent(buildMessage());

    return `https://wa.me/${number}?text=${text}`;
  }

  /**
   * Build the formatted order message.
   */
  function buildMessage() {
    const { lines, generalNotes, totals } = Cart.getState();

    let msg =
      `🏃 طلب استلام من الفرع - ${
        window.SHAWAYA_SETTINGS?.restaurant_name || 'شواية'
      }\n\n`;

    msg += `🍽️ تفاصيل الطلب\n`;

    lines.forEach((line, i) => {
      const unit = Cart.lineUnitPrice(
        line.product,
        line.selections
      );

      const opts = Cart.lineOptionLabels(
        line.product,
        line.selections
      );

      msg += `\n${i + 1}️⃣ ${line.product.name_ar}\n`;
      msg += `   الكمية: ${line.qty}\n`;

      if (opts.length) {
        msg += `   الخيارات: ${opts.join('، ')}\n`;
      }

      if (line.notes) {
        msg += `   الملاحظات: ${line.notes}\n`;
      }

      msg += `   السعر: ${Menu.currency(unit * line.qty)}\n`;
    });

    msg += `\n📝 ملاحظات عامة:\n${
      generalNotes?.trim() || 'لا يوجد'
    }\n`;

    msg += `\n💰 إجمالي المبلغ:\n${Menu.currency(totals.total)}\n`;

    msg += `\n⏱️ يرجى إفادتي بالوقت المتوقع لجاهزية الطلب.`;

    return msg;
  }

  /**
   * Check whether restaurant is currently open.
   */
  function isRestaurantOpen() {
    const settings = window.SHAWAYA_SETTINGS;

    return Boolean(settings) &&
      RestaurantState.isOpen(settings);
  }

  /**
   * Best-effort dashboard logging.
   *
   * IMPORTANT:
   * This function is NEVER awaited by the WhatsApp navigation path.
   */
  function logOrderInBackground() {
    try {
      const { lines, generalNotes, totals } = Cart.getState();

      if (!lines.length) return;

      const orderLines = lines.map((l) => ({
        product: l.product,
        qty: l.qty,
        unitPrice: Cart.lineUnitPrice(
          l.product,
          l.selections
        ),
        optionLabels: Cart.lineOptionLabels(
          l.product,
          l.selections
        ),
        notes: l.notes,
      }));

      // Intentionally NOT awaited.
      // WhatsApp must remain independent.
      ShawayaData.createOrder({
        lines: orderLines,
        generalNotes,
        subtotal: totals.subtotal,
        total: totals.total,
      }).catch((err) => {
        console.warn(
          'Background order logging failed:',
          err
        );
      });

    } catch (err) {
      console.warn(
        'Could not start background order logging:',
        err
      );
    }
  }

  /**
   * Navigate directly to WhatsApp.
   *
   * NO window.open()
   * NO popup
   * NO await
   * NO Supabase before navigation
   */
  function navigateToWhatsApp(url) {
    if (!url) {
      Toast.show('رقم الواتساب غير متوفر حالياً.');
      return;
    }

    /*
     * Direct navigation is intentional.
     *
     * We do NOT use:
     * window.open()
     * about:blank
     * location.replace() on another window
     *
     * The navigation happens directly inside the user's click event.
     */
    window.location.href = url;
  }

  /**
   * Send the current cart order to WhatsApp.
   */
  function send(e) {
    if (e) {
      e.preventDefault();
    }

    const { lines } = Cart.getState();

    if (!lines.length) {
      Toast.show('السلة فارغة');
      return;
    }

    /*
     * Keep the restaurant-open check.
     *
     * This is unrelated to WhatsApp itself, but orders should not
     * be submitted while the restaurant is closed.
     */
    if (!isRestaurantOpen()) {
      Toast.show(
        'عذراً، المطعم مغلق حالياً. لا يمكن إتمام الطلب.'
      );
      return;
    }

    /*
     * Build URL synchronously.
     */
    const url = buildWhatsAppUrl();

    if (!url) {
      Toast.show('تعذر فتح واتساب حالياً.');
      return;
    }

    /*
     * Start dashboard logging without waiting for it.
     *
     * This is deliberately AFTER the URL has been built and immediately
     * before navigation. It must never control the customer's checkout.
     */
    logOrderInBackground();

    /*
     * Direct navigation.
     */
    navigateToWhatsApp(url);
  }

  /**
   * Open normal WhatsApp contact from FAB.
   */
  function openContact(e) {
    if (e) {
      e.preventDefault();
    }

    const url = buildWhatsAppUrl();

    /*
     * If cart has items, buildWhatsAppUrl() produces the order message.
     * If cart is empty, it produces a normal wa.me URL.
     */
    navigateToWhatsApp(url);
  }

  function init() {
    const checkoutButton =
      document.getElementById('checkout-whatsapp');

    const whatsappFab =
      document.getElementById('whatsapp-fab');

    if (checkoutButton) {
      checkoutButton.addEventListener(
        'click',
        send
      );
    } else {
      console.warn(
        'WhatsApp checkout button #checkout-whatsapp not found.'
      );
    }

    if (whatsappFab) {
      whatsappFab.addEventListener(
        'click',
        openContact
      );
    } else {
      console.warn(
        'WhatsApp FAB #whatsapp-fab not found.'
      );
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

  return {
    buildMessage,
    buildWhatsAppUrl,
    send,
    isRestaurantOpen,
  };

})();
