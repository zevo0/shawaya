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
      if (e.key === 'Escape' && modalEl.classList.contains('is-open')) close();
    });
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
      if (g.required && g.type === 'single') {
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
    updateTotal();
  }

  function updateTotal() {
    const total = unitPrice(currentProduct) * qty;
    modalEl.querySelector('#modal-total-price').innerHTML = Menu.priceHtml(total);
  }

  function open(product) {
    currentProduct = product;
    lastFocused = document.activeElement;
    render();
    overlay.classList.add('is-open');
    modalEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modalEl.querySelector('.modal-close').focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    modalEl.classList.remove('is-open');
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
      const notes = modalEl.querySelector('#modal-notes-input').value.trim();
      Cart.addItem({ product: currentProduct, qty, selections: { ...selections }, notes });
      close();
      Toast.show('تمت الإضافة إلى السلة');
    });
  }

  document.addEventListener('DOMContentLoaded', () => { init(); bindFooterControls(); });

  return { open, close };
})();
