/**
 * admin-options.js — Option-group editor, now embedded directly inside the
 * product edit modal (no longer a standalone page). Renders into two
 * separate containers using the SAME option_groups/product_options data
 * and CRUD calls as before, split only by `type`:
 *   - type "single"   -> "خيارات المنتج" section (pf-option-groups-wrap)
 *   - type "multiple" -> "الإضافات" section (pf-addon-groups-wrap), where
 *     each option row also gets an "is_active" (حالة) toggle.
 */
const AdminOptions = (() => {
  let currentProductId = null;
  let allGroups = [];

  function loadForProduct(product) {
    currentProductId = product?.id || null;
    allGroups = (product?.option_groups || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    render();
  }

  function render() {
    const singleWrap = document.getElementById('pf-option-groups-wrap');
    const addonWrap = document.getElementById('pf-addon-groups-wrap');
    const optionsLockedNote = document.getElementById('pf-options-locked-note');
    const addonsLockedNote = document.getElementById('pf-addons-locked-note');

    const locked = !currentProductId;
    optionsLockedNote.classList.toggle('hidden', !locked);
    addonsLockedNote.classList.toggle('hidden', !locked);

    if (locked) {
      singleWrap.innerHTML = '';
      addonWrap.innerHTML = '';
      return;
    }

    const singleGroups = allGroups.filter(g => g.type === 'single');
    const multipleGroups = allGroups.filter(g => g.type === 'multiple');

    singleWrap.innerHTML = singleGroups.map(g => groupTemplate(g, false)).join('')
      + `<button type="button" class="btn btn-outline btn-sm" data-add-group="single">+ إضافة مجموعة خيارات</button>`;
    addonWrap.innerHTML = multipleGroups.map(g => groupTemplate(g, true)).join('')
      + `<button type="button" class="btn btn-outline btn-sm" data-add-group="multiple">+ إضافة مجموعة إضافات</button>`;

    bindGroupEvents();
  }

  function groupTemplate(g, isAddon) {
    const options = (g.product_options || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    return `
    <div class="option-group-editor" data-group-id="${g.id}">
      <div class="option-group-editor-header">
        <div class="field" style="flex:1;min-width:160px;margin:0">
          <label>${isAddon ? 'عنوان مجموعة الإضافات' : 'عنوان المجموعة'}</label>
          <input type="text" class="grp-title" value="${AdminUI.escapeHtml(g.title_ar)}" placeholder="${isAddon ? 'مثال: إضافات' : 'مثال: الحجم'}">
        </div>
        ${isAddon ? '' : `
        <label class="checkbox-row" style="margin-bottom:9px"><input type="checkbox" class="grp-required" ${g.required ? 'checked' : ''}> إجباري</label>`}
        <button type="button" class="icon-action-btn danger" data-delete-group="${g.id}" title="حذف المجموعة">${icon('x')}</button>
      </div>

      <div class="group-options-list">
        ${options.map(o => optionRowTemplate(o, isAddon)).join('')}
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-add-option="${g.id}" style="margin-top:6px">+ ${isAddon ? 'إضافة عنصر' : 'إضافة خيار'}</button>
      <div class="admin-modal-footer" style="margin-top:14px;justify-content:flex-start;position:static;background:none;padding:0">
        <button type="button" class="btn btn-primary btn-sm" data-save-group="${g.id}" data-is-addon="${isAddon}">${isAddon ? 'حفظ الإضافات' : 'حفظ المجموعة'}</button>
      </div>
    </div>`;
  }

  function optionRowTemplate(o, isAddon) {
    return `
    <div class="option-editor-row ${isAddon ? 'is-addon-row' : ''}" data-option-id="${o.id || ''}">
      <input type="text" class="opt-label" value="${AdminUI.escapeHtml(o.label_ar || '')}" placeholder="${isAddon ? 'مثال: جبن إضافي' : 'مثال: كبير'}">
      <input type="number" step="0.001" class="opt-price" value="${o.price_delta ?? 0}" placeholder="+0.300">
      ${isAddon ? `<label class="checkbox-row opt-active-row"><input type="checkbox" class="opt-active" ${o.is_active !== false ? 'checked' : ''}> مفعّل</label>` : ''}
      <button type="button" class="icon-action-btn danger" data-remove-option-row title="حذف">${icon('x')}</button>
    </div>`;
  }

  function bindGroupEvents() {
    document.querySelectorAll('[data-add-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.addGroup;
        try {
          const newGroup = await AdminAPI.upsertOptionGroup({
            product_id: currentProductId,
            title_ar: type === 'multiple' ? 'إضافات' : 'مجموعة جديدة',
            type,
            required: false,
            sort_order: allGroups.filter(g => g.type === type).length,
          });
          allGroups.push({ ...newGroup, product_options: [] });
          render();
        } catch (err) { AdminUI.toast(err.message || 'تعذر إنشاء المجموعة', true); }
      });
    });

    document.querySelectorAll('[data-delete-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!AdminUI.confirmDelete('حذف هذه المجموعة وكل عناصرها؟')) return;
        try {
          await AdminAPI.deleteOptionGroup(btn.dataset.deleteGroup);
          AdminUI.toast('تم الحذف');
          await AdminProducts.refreshCurrentProductOptions();
        } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
      });
    });

    document.querySelectorAll('[data-add-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const editor = document.querySelector(`.option-group-editor[data-group-id="${btn.dataset.addOption}"]`);
        const isAddon = editor.querySelector('[data-save-group]').dataset.isAddon === 'true';
        editor.querySelector('.group-options-list').insertAdjacentHTML('beforeend', optionRowTemplate({ label_ar: '', price_delta: 0, is_active: true }, isAddon));
        bindRemoveOptionRows();
      });
    });

    document.querySelectorAll('[data-save-group]').forEach(btn => {
      btn.addEventListener('click', () => saveGroup(btn.dataset.saveGroup));
    });

    bindRemoveOptionRows();
  }

  function bindRemoveOptionRows() {
    document.querySelectorAll('[data-remove-option-row]').forEach(btn => {
      btn.onclick = async () => {
        const row = btn.closest('.option-editor-row');
        const optionId = row.dataset.optionId;
        if (optionId) {
          try { await AdminAPI.deleteOption(optionId); } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); return; }
        }
        row.remove();
      };
    });
  }

  async function saveGroup(groupId) {
    const editor = document.querySelector(`.option-group-editor[data-group-id="${groupId}"]`);
    const title = editor.querySelector('.grp-title').value.trim();
    const requiredEl = editor.querySelector('.grp-required');
    const group = allGroups.find(g => g.id === groupId);

    try {
      await AdminAPI.upsertOptionGroup({
        id: groupId,
        product_id: currentProductId,
        title_ar: title,
        type: group.type,
        required: requiredEl ? requiredEl.checked : false,
        sort_order: allGroups.filter(g => g.type === group.type).findIndex(g => g.id === groupId),
      });

      const rows = [...editor.querySelectorAll('.option-editor-row')];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const label = row.querySelector('.opt-label').value.trim();
        if (!label) continue;
        const priceDelta = Number(row.querySelector('.opt-price').value) || 0;
        const activeEl = row.querySelector('.opt-active');
        const optionId = row.dataset.optionId || undefined;
        await AdminAPI.upsertOption({
          id: optionId,
          group_id: groupId,
          label_ar: label,
          price_delta: priceDelta,
          is_active: activeEl ? activeEl.checked : true,
          sort_order: i,
        });
      }

      AdminUI.toast(group.type === 'multiple' ? 'تم حفظ الإضافات' : 'تم حفظ مجموعة الخيارات');
      await AdminProducts.refreshCurrentProductOptions();
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحفظ', true); }
  }

  return { loadForProduct };
})();
