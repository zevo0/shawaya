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
    msg += `\n📝 ملاحظات عامة: \n${generalNotes?.trim() || 'لا يوجد'}\n`;
    msg += `\n💰إجمالي المبلغ: \n${Menu.currency(totals.total)}\n`;
    msg += `\n⏱️ يرجى إفادتي بالوقت المتوقع لجاهزية الطلب.`;
    return msg;
  }

  function isRestaurantOpen() {
    const s = window.SHAWAYA_SETTINGS;
    if (!s) return true; // settings not loaded yet — fail open rather than block a real customer
    const hour = new Date().getHours();
    return Boolean(s.is_open) && hour >= s.open_hour && hour < s.close_hour;
  }

  async function send() {
    const { lines, generalNotes, totals } = Cart.getState();
    if (!lines.length) { Toast.show('السلة فارغة'); return; }

    if (!isRestaurantOpen()) {
      Toast.show('عذراً، المطعم مغلق حالياً. لا يمكن إتمام الطلب.');
      return;
    }

    // Log the order in Supabase (best-effort — WhatsApp send proceeds even offline)
    const orderLines = lines.map(l => ({
      product: l.product,
      qty: l.qty,
      unitPrice: Cart.lineUnitPrice(l.product, l.selections),
      optionLabels: Cart.lineOptionLabels(l.product, l.selections),
      notes: l.notes,
    }));
    ShawayaData.createOrder({ lines: orderLines, generalNotes, subtotal: totals.subtotal, total: totals.total });

    const number = window.SHAWAYA_SETTINGS?.whatsapp_number || window.SHAWAYA_CONFIG.fallback.whatsapp_number;
    const text = encodeURIComponent(buildMessage());
    const url = `https://wa.me/${number}?text=${text}`;
    window.open(url, '_blank', 'noopener');
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
