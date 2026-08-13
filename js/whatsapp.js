/**
 * whatsapp.js — Builds the formatted order message, logs the order to
 * Supabase (so it shows up in the admin dashboard), then opens wa.me.
 * No login, no phone/name collection — pickup-only flow.
 * Blocks checkout entirely while the restaurant is marked closed.
 */
const WhatsAppCheckout = (() => {
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

  function isRestaurantOpen() {
    const settings = window.SHAWAYA_SETTINGS;
    // لا نكمل الطلب قبل وصول الإعدادات الحية؛ هذا يمنع حالة فتح افتراضية
    // تتعارض مع قرار لوحة التحكم عند حدوث تأخر في التحميل.
    return Boolean(settings) && RestaurantState.isOpen(settings);
  }

  async function send() {
    const { lines, generalNotes, totals } = Cart.getState();
    if (!lines.length) { Toast.show('السلة فارغة'); return; }

    if (!isRestaurantOpen()) {
      Toast.show('عذراً، المطعم مغلق حالياً. لا يمكن إتمام الطلب.');
      return;
    }

    // نفتح نافذة مؤقتة من نقرة المستخدم حتى لا يحجبها المتصفح بعد await.
    // لا ننتقل إلى واتساب إلا بعد نجاح تسجيل الطلب؛ بهذه الطريقة لا تفقد
    // لوحة التحكم طلباً أُرسل فعلياً إلى المطعم.
    const whatsappWindow = window.open('about:blank', '_blank');
    if (whatsappWindow) whatsappWindow.opener = null;

    const orderLines = lines.map(l => ({
      product: l.product,
      qty: l.qty,
      unitPrice: Cart.lineUnitPrice(l.product, l.selections),
      optionLabels: Cart.lineOptionLabels(l.product, l.selections),
      notes: l.notes,
    }));
    const saved = await ShawayaData.createOrder({ lines: orderLines, generalNotes, subtotal: totals.subtotal, total: totals.total });
    if (!saved.ok) {
      if (whatsappWindow) whatsappWindow.close();
      Toast.show('تعذر تسجيل الطلب حالياً. تحقق من الاتصال ثم أعد المحاولة.');
      return;
    }

    const number = window.SHAWAYA_SETTINGS?.whatsapp_number || window.SHAWAYA_CONFIG.fallback.whatsapp_number;
    const text = encodeURIComponent(buildMessage());
    const url = `https://wa.me/${number}?text=${text}`;
    if (whatsappWindow) whatsappWindow.location.replace(url);
    else window.open(url, '_blank', 'noopener');
  }

  function init() {
    document.getElementById('checkout-whatsapp').addEventListener('click', send);
    document.getElementById('whatsapp-fab').addEventListener('click', (e) => {
      e.preventDefault();
      const number = window.SHAWAYA_SETTINGS?.whatsapp_number || window.SHAWAYA_CONFIG.fallback.whatsapp_number;
      const { lines } = Cart.getState();
      if (lines.length) { send(); return; }
      window.open(`https://wa.me/${number}`, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { buildMessage, send, isRestaurantOpen };
})();
