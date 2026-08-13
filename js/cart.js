/**
 * cart.js — In-memory cart state, drawer rendering, upsell suggestions.
 */
const Cart = (() => {
  const MAX_ITEM_QTY = 20;
  let lines = []; // { lineId, product, qty, selections, notes }
  let generalNotes = '';

  function lineOptionLabels(product, selections) {
    const labels = [];
    (product.option_groups || []).forEach(g => {
      const sel = selections[g.id];
      if (!sel) return;
      const ids = Array.isArray(sel) ? sel : [sel];
      ids.forEach(id => {
        const opt = g.options.find(o => o.id === id);
        if (opt) labels.push(opt.label_ar);
      });
    });
    return labels;
  }

  function lineUnitPrice(product, selections) {
    let total = product.price;
    (product.option_groups || []).forEach(g => {
      const sel = selections[g.id];
      if (!sel) return;
      const ids = Array.isArray(sel) ? sel : [sel];
      ids.forEach(id => {
        const opt = g.options.find(o => o.id === id);
        if (opt) total += opt.price_delta;
      });
    });
    return total;
  }

  // عناصر السلة تتطابق فقط إذا كان المنتج والخيارات والملاحظة متساوية.
  // اختلاف أي خيار أو ملاحظة يعني أن الوجبتين طلبان منفصلان.
  function selectionSignature(selections = {}) {
    return Object.entries(selections)
      .map(([groupId, selected]) => [
        String(groupId),
        (Array.isArray(selected) ? selected : [selected]).map(String).sort(),
      ])
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupId, optionIds]) => `${groupId}:${optionIds.join(',')}`)
      .join('|');
  }

  function addItem({ product, qty, selections = {}, notes = '' }) {
    const safeQty = Math.min(MAX_ITEM_QTY, Math.max(1, Number(qty) || 1));
    const normalizedNotes = String(notes).trim();
    const signature = selectionSignature(selections);
    const existingLine = lines.find((line) =>
      String(line.product.id) === String(product.id) &&
      selectionSignature(line.selections) === signature &&
      String(line.notes || '').trim() === normalizedNotes
    );

    if (existingLine) {
      const nextQty = Math.min(MAX_ITEM_QTY, existingLine.qty + safeQty);
      if (nextQty === existingLine.qty) {
        Toast.show(`الحد الأقصى لهذا الصنف هو ${MAX_ITEM_QTY}`);
        return;
      }
      existingLine.qty = nextQty;
      render();
      bumpFab();
      Toast.show(`تمت زيادة كمية ${product.name_ar}`);
      return;
    }

    lines.push({
      lineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product, qty: safeQty, selections, notes: normalizedNotes,
    });
    render();
    bumpFab();
    Toast.show(`تمت إضافة ${product.name_ar}`);
  }

  function removeLine(lineId) {
    lines = lines.filter(l => l.lineId !== lineId);
    render();
  }

  function updateQty(lineId, delta) {
    const line = lines.find(l => l.lineId === lineId);
    if (!line) return;
    const nextQty = Math.min(MAX_ITEM_QTY, Math.max(1, line.qty + delta));
    if (delta > 0 && nextQty === line.qty) {
      Toast.show(`الحد الأقصى لهذا الصنف هو ${MAX_ITEM_QTY}`);
      return;
    }
    line.qty = nextQty;
    render();
  }

  function clear() {
    lines = [];
    render();
  }

  function totals() {
    const subtotal = lines.reduce((sum, l) => sum + lineUnitPrice(l.product, l.selections) * l.qty, 0);
    return { subtotal, total: subtotal };
  }

  function count() {
    return lines.reduce((n, l) => n + l.qty, 0);
  }

  function renderStickyBar(n) {
    const bar = document.getElementById('sticky-cart-bar');
    const fab = document.getElementById('whatsapp-fab');
    if (!bar) return;
    bar.hidden = n === 0;
    fab?.classList.toggle('is-shifted', n > 0);
    if (n > 0) {
      document.getElementById('sticky-cart-bar-count').textContent = n;
      document.getElementById('sticky-cart-bar-total').innerHTML = Menu.priceHtml(totals().total, true);
    }
  }

  function bumpFab() {
    const badge = document.getElementById('cart-count');
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }

  function render() {
    const badge = document.getElementById('cart-count');
    const n = count();
    badge.textContent = n;
    badge.hidden = n === 0;

    renderStickyBar(n);

    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');

    if (!lines.length) {
      body.innerHTML = `
        <div class="cart-empty">
          ${icon('empty')}
          <p>سلتك فارغة الآن.<br>أضف صنفاً من المنيو لتبدأ طلبك.</p>
          <button class="btn btn-outline btn-sm" id="cart-browse-menu">تصفح المنيو</button>
        </div>`;
      footer.style.display = 'none';
      document.getElementById('cart-browse-menu')?.addEventListener('click', () => {
        CartDrawer.close();
        document.getElementById('menu-sections').scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    footer.style.display = 'flex';
    body.innerHTML = `
      <div class="cart-lines">
        ${lines.map(lineTemplate).join('')}
      </div>
      <div class="cart-notes">
        <label for="cart-general-notes">ملاحظات عامة على الطلب</label>
        <textarea id="cart-general-notes" placeholder="مثال: الرجاء تقليل الملح، أو أي طلب خاص...">${generalNotes}</textarea>
      </div>
      <div class="upsell-block" id="upsell-block"></div>
    `;

    body.querySelector('#cart-general-notes').addEventListener('input', (e) => { generalNotes = e.target.value; });
    bindLineEvents();
    renderUpsell();
    renderTotals();
  }

  function lineTemplate(line) {
    const { product, selections, qty } = line;
    const unit = lineUnitPrice(product, selections);
    const optLabels = lineOptionLabels(product, selections);
    return `
    <div class="cart-line" data-line="${line.lineId}">
      <img src="${product.image_url || 'assets/images/hero.webp'}" alt="" loading="lazy">
      <div>
        <div class="cart-line-name">${Menu.escapeHtml(product.name_ar)}</div>
        ${optLabels.length ? `<div class="cart-line-opts">${optLabels.join('، ')}</div>` : ''}
        ${line.notes ? `<div class="cart-line-opts">ملاحظة: ${Menu.escapeHtml(line.notes)}</div>` : ''}
        <div class="cart-line-bottom">
          <div class="qty-stepper">
            <button type="button" data-qty-minus="${line.lineId}" aria-label="إنقاص الكمية">${icon('minus')}</button>
            <span>${qty}</span>
            <button type="button" data-qty-plus="${line.lineId}" aria-label="زيادة الكمية" ${qty >= MAX_ITEM_QTY ? 'disabled aria-disabled="true"' : ''}>${icon('plus')}</button>
          </div>
          <button type="button" class="cart-line-remove" data-remove="${line.lineId}">إزالة</button>
        </div>
      </div>
      <div class="cart-line-price">${Menu.priceHtml(unit * qty)}</div>
    </div>`;
  }

  function bindLineEvents() {
    document.querySelectorAll('[data-qty-plus]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyPlus, 1)));
    document.querySelectorAll('[data-qty-minus]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyMinus, -1)));
    document.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeLine(b.dataset.remove)));
  }

  function renderUpsell() {
    const excludeIds = lines.map(l => l.product.id);
    const suggestions = Menu.suggestUpsell(excludeIds, 6);
    const block = document.getElementById('upsell-block');
    if (!block || !suggestions.length) { if (block) block.innerHTML = ''; return; }
    block.innerHTML = `
      <h3>أشخاص طلبوا أيضاً</h3>
      <div class="upsell-scroller">
        ${suggestions.map(p => `
          <div class="upsell-card">
            <img src="${p.image_url || 'assets/images/hero.webp'}" alt="" loading="lazy">
            <span>${Menu.escapeHtml(p.name_ar)}</span>
            <span class="price">${Menu.priceHtml(p.price)}</span>
            <button type="button" data-upsell-add="${p.id}">أضف</button>
          </div>`).join('')}
      </div>`;
    block.querySelectorAll('[data-upsell-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = Menu.findProduct(btn.dataset.upsellAdd);
        if (product.option_groups?.some(g => g.required)) { CartDrawer.close(); Modal.open(product); return; }
        addItem({ product, qty: 1, selections: {}, notes: '' });
      });
    });
  }

  function renderTotals() {
    const { subtotal, total } = totals();
    document.getElementById('cart-subtotal').innerHTML = Menu.priceHtml(subtotal);
    document.getElementById('cart-total').innerHTML = Menu.priceHtml(total);
  }

  function getState() { return { lines, generalNotes, totals: totals() }; }

  return { addItem, removeLine, updateQty, clear, render, count, getState, lineUnitPrice, lineOptionLabels };
})();

/* ---- Cart drawer open/close controller ---------------------------------*/
const CartDrawer = (() => {
  let overlay, drawer, lastFocused, confirmOverlay, confirmDialog, confirmLastFocused;
  const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(event, container) {
    const focusable = [...container.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function createClearConfirm() {
    confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'cart-confirm-overlay';
    confirmOverlay.setAttribute('aria-hidden', 'true');
    confirmOverlay.innerHTML = `
      <section class="cart-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-confirm-title" aria-describedby="cart-confirm-description">
        <h2 id="cart-confirm-title">تفريغ السلة؟</h2>
        <p id="cart-confirm-description">سيتم حذف جميع الأصناف والملاحظات من طلبك الحالي.</p>
        <div class="cart-confirm-actions">
          <button type="button" class="btn btn-outline btn-sm" data-cancel-clear>إلغاء</button>
          <button type="button" class="btn btn-primary btn-sm" data-confirm-clear>نعم، أفرغ السلة</button>
        </div>
      </section>`;
    document.body.appendChild(confirmOverlay);
    confirmDialog = confirmOverlay.querySelector('.cart-confirm-dialog');
    confirmOverlay.addEventListener('click', (event) => { if (event.target === confirmOverlay) closeClearConfirm(); });
    confirmOverlay.querySelector('[data-cancel-clear]').addEventListener('click', closeClearConfirm);
    confirmOverlay.querySelector('[data-confirm-clear]').addEventListener('click', () => {
      Cart.clear();
      closeClearConfirm();
      Toast.show('تم تفريغ السلة');
    });
  }

  function openClearConfirm() {
    if (!Cart.count()) return;
    confirmLastFocused = document.activeElement;
    confirmOverlay.classList.add('is-open');
    confirmOverlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => confirmOverlay.querySelector('[data-cancel-clear]')?.focus());
  }

  function closeClearConfirm() {
    if (!confirmOverlay?.classList.contains('is-open')) return;
    confirmOverlay.classList.remove('is-open');
    confirmOverlay.setAttribute('aria-hidden', 'true');
    confirmLastFocused?.focus();
  }

  function init() {
    overlay = document.getElementById('cart-overlay');
    drawer = document.getElementById('cart-drawer');
    createClearConfirm();
    document.getElementById('cart-fab').addEventListener('click', open);
    document.getElementById('sticky-cart-bar')?.addEventListener('click', open);
    document.getElementById('cart-close').addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.getElementById('clear-cart-btn').addEventListener('click', openClearConfirm);
    document.addEventListener('keydown', (event) => {
      if (confirmOverlay.classList.contains('is-open')) {
        if (event.key === 'Escape') { closeClearConfirm(); return; }
        if (event.key === 'Tab') trapFocus(event, confirmDialog);
        return;
      }
      if (!drawer.classList.contains('is-open')) return;
      if (event.key === 'Escape') { close(); return; }
      if (event.key === 'Tab') trapFocus(event, drawer);
    });
  }

  function open() {
    lastFocused = document.activeElement;
    overlay.classList.add('is-open');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('sticky-cart-bar')?.setAttribute('hidden', '');
    drawer.querySelector('#cart-close').focus();
  }
  function close() {
    closeClearConfirm();
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (Cart.count() > 0) document.getElementById('sticky-cart-bar')?.removeAttribute('hidden');
    lastFocused?.focus();
  }

  document.addEventListener('DOMContentLoaded', init);

  document.addEventListener('shawaya:open-state', (e) => {
    const btn = document.getElementById('checkout-whatsapp');
    const banner = document.getElementById('cart-closed-banner');
    if (!btn || !banner) return;
    const isOpen = e.detail.isOpen;
    btn.disabled = !isOpen;
    btn.style.opacity = isOpen ? '1' : '.5';
    btn.style.pointerEvents = isOpen ? '' : 'none';
    banner.style.display = isOpen ? 'none' : 'block';
  });

  return { open, close };
})();

/* ---- Toast ---------------------------------------------------------- */
const Toast = (() => {
  let el;
  function init() { el = document.getElementById('toast'); }
  function show(message) {
    if (!el) init();
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(show.timer);
    show.timer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }
  document.addEventListener('DOMContentLoaded', init);
  return { show };
})();
