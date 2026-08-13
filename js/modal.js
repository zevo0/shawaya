/**
 * modal.js — Item customization modal (opens in-place, no page reload).
 */
const Modal = (() => {
  let overlay, modalEl, currentProduct, qty, selections, lastFocused;

  function init() {
    overlay = document.getElementById('modal-overlay');
    modalEl = document.getElementById('item-modal');
    overlay.addEventListener('click', close);
    modalEl.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (!modalEl.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') trapFocus(e);
    });

    const scrollEl = modalEl.querySelector('.modal-scroll');
    const cue = document.getElementById('modal-scroll-cue');
    scrollEl.addEventListener('scroll', () => {
      if (scrollEl.scrollTop > 16) cue.classList.add('is-hidden');
    }, { passive: true });
    cue.addEventListener('click', () => {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
    });
  }

  function trapFocus(event) {
    const focusable = [...modalEl.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function unitPrice(product) {
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

  function render() {
    const p = currentProduct;
    modalEl.querySelector('.modal-media img').src = p.image_url || 'assets/images/hero.webp';
    modalEl.querySelector('.modal-media img').alt = p.name_ar;
    modalEl.querySelector('#modal-title').textContent = p.name_ar;
    modalEl.querySelector('#modal-desc').textContent = p.description_ar;
    modalEl.querySelector('#modal-base-price').innerHTML = Menu.priceHtml(p.price);
    modalEl.querySelector('#modal-badges').innerHTML = Menu.badgeMarkup(p.badges);

    const groupsWrap = modalEl.querySelector('#modal-option-groups');
    groupsWrap.innerHTML = (p.option_groups || []).map(g => `
      <div class="option-group" data-group="${g.id}">
        <div class="option-group-title">
          <span>${g.title_ar}</span>
          ${g.required ? '<span class="req">مطلوب</span>' : '<span class="text-muted">اختياري</span>'}
        </div>
        ${g.options.map(o => `
          <label class="option-row" data-option-row="${o.id}">
            <span class="option-row-label">
              <input type="${g.type === 'single' ? 'radio' : 'checkbox'}" name="group-${g.id}" value="${o.id}" ${g.type === 'single' && g.required && g === p.option_groups.find(gr=>gr.required) && o === g.options[0] ? '' : ''}>
              ${o.label_ar}
            </span>
            <span class="option-row-price">${o.price_delta > 0 ? '+' + Menu.priceHtml(o.price_delta) : ''}</span>
          </label>`).join('')}
      </div>`).join('');

    // default-select first option of required single groups
    selections = {};
    (p.option_groups || []).forEach(g => {
      if (g.required && g.type === 'single' && g.options.length) {
        selections[g.id] = g.options[0].id;
        const input = groupsWrap.querySelector(`[data-group="${g.id}"] input[value="${g.options[0].id}"]`);
        if (input) { input.checked = true; input.closest('.option-row').classList.add('is-selected'); }
      }
    });

    groupsWrap.querySelectorAll('.option-row input').forEach(input => {
      input.addEventListener('change', () => onOptionChange(input));
    });

    qty = 1;
    modalEl.querySelector('#modal-qty').textContent = qty;
    modalEl.querySelector('#modal-notes-input').value = '';
    updateTotal();

    const cue = document.getElementById('modal-scroll-cue');
    cue.classList.toggle('is-hidden', !(p.option_groups || []).length);
  }

  function onOptionChange(input) {
    const groupEl = input.closest('.option-group');
    const groupId = groupEl.dataset.group;
    const group = currentProduct.option_groups.find(g => g.id === groupId);

    if (group.type === 'single') {
      selections[groupId] = input.value;
      groupEl.querySelectorAll('.option-row').forEach(r => r.classList.remove('is-selected'));
      input.closest('.option-row').classList.add('is-selected');
    } else {
      const set = new Set(selections[groupId] || []);
      if (input.checked) set.add(input.value); else set.delete(input.value);
      selections[groupId] = [...set];
      input.closest('.option-row').classList.toggle('is-selected', input.checked);
    }
    groupEl.classList.remove('is-invalid');
    updateTotal();
  }

  function validateRequiredSelections() {
    const missing = (currentProduct.option_groups || []).filter((group) => {
      if (!group.required) return false;
      const selected = selections[group.id];
      return Array.isArray(selected) ? selected.length === 0 : !selected;
    });

    document.querySelectorAll('#modal-option-groups .option-group').forEach((groupEl) => {
      groupEl.classList.toggle('is-invalid', missing.some((group) => group.id === groupEl.dataset.group));
    });

    if (!missing.length) return true;
    const first = document.querySelector(`#modal-option-groups [data-group="${missing[0].id}"]`);
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    Toast.show(`اختر ${missing.map((group) => group.title_ar).join('، ')} قبل الإضافة إلى السلة.`);
    return false;
  }

  function updateTotal() {
    const total = unitPrice(currentProduct) * qty;
    modalEl.querySelector('#modal-total-price').innerHTML = Menu.priceHtml(total, true);
  }

  function open(product) {
    currentProduct = product;
    lastFocused = document.activeElement;
    render();
    modalEl.querySelector('.modal-scroll').scrollTop = 0;
    overlay.classList.add('is-open');
    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalEl.querySelector('.modal-close').focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus();
  }

  function bindFooterControls() {
    modalEl.querySelector('#modal-qty-minus').addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      modalEl.querySelector('#modal-qty').textContent = qty;
      updateTotal();
    });
    modalEl.querySelector('#modal-qty-plus').addEventListener('click', () => {
      qty = Math.min(20, qty + 1);
      modalEl.querySelector('#modal-qty').textContent = qty;
      updateTotal();
    });
    modalEl.querySelector('#modal-add-to-cart').addEventListener('click', () => {
      if (!validateRequiredSelections()) return;
      const notes = modalEl.querySelector('#modal-notes-input').value.trim();
      Cart.addItem({ product: currentProduct, qty, selections: { ...selections }, notes });
      close();
      Toast.show('تمت الإضافة إلى السلة');
    });
  }

  document.addEventListener('DOMContentLoaded', () => { init(); bindFooterControls(); });

  return { open, close };
})();
