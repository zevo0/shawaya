/**
 * admin-options.js — Product customization builder (section 4):
 * choose a product, then add/edit/delete option groups (single/multiple,
 * required/optional) and the options inside each group with price deltas.
 */
const AdminOptions = (() => {
  let currentProductId = null;
  let groups = [];

  function populateProductSelect() {
    const select = document.getElementById('options-product-select');
    const products = AdminProducts.getAll();
    select.innerHTML = products.map(p => `<option value="${p.id}">${AdminUI.escapeHtml(p.name_ar)}</option>`).join('');
    if (products.length && !currentProductId) currentProductId = products[0].id;
    if (currentProductId) { select.value = currentProductId; loadGroupsForCurrent(); }
  }

  function loadGroupsForCurrent() {
    const product = AdminProducts.getAll().find(p => p.id === currentProductId);
    groups = (product?.option_groups || []).sort((a, b) => a.sort_order - b.sort_order);
    render();
  }

  function render() {
    const wrap = document.getElementById('option-groups-wrap');
    if (!groups.length) {
      wrap.innerHTML = `<div class="panel"><div class="empty-state">لا توجد مجموعات خيارات لهذا المنتج بعد</div></div>`;
    } else {
      wrap.innerHTML = groups.map(groupTemplate).join('');
    }
    wrap.innerHTML += `<button type="button" class="btn btn-outline btn-sm" id="add-group-btn">+ إضافة مجموعة خيارات</button>`;
    bindGroupEvents();
  }

  function groupTemplate(g) {
    const options = (g.product_options || []).sort((a, b) => a.sort_order - b.sort_order);
    return `
    <div class="option-group-editor" data-group-id="${g.id}">
      <div class="option-group-editor-header">
        <div class="field" style="flex:1;min-width:180px;margin:0">
          <label>عنوان المجموعة</label>
          <input type="text" class="grp-title" value="${AdminUI.escapeHtml(g.title_ar)}" placeholder="مثال: نوع الخبز">
        </div>
        <div class="field" style="width:150px;margin:0">
          <label>النوع</label>
          <select class="grp-type">
            <option value="single" ${g.type === 'single' ? 'selected' : ''}>اختيار واحد</option>
            <option value="multiple" ${g.type === 'multiple' ? 'selected' : ''}>متعدد</option>
          </select>
        </div>
        <label class="checkbox-row" style="margin-bottom:9px"><input type="checkbox" class="grp-required" ${g.required ? 'checked' : ''}> إجباري</label>
        <button type="button" class="icon-action-btn danger" data-delete-group="${g.id}" title="حذف المجموعة">${icon('x')}</button>
      </div>

      <div class="group-options-list">
        ${options.map(o => optionRowTemplate(o)).join('')}
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-add-option="${g.id}" style="margin-top:6px">+ إضافة خيار</button>
      <div class="admin-modal-footer" style="margin-top:14px;justify-content:flex-start">
        <button type="button" class="btn btn-primary btn-sm" data-save-group="${g.id}">حفظ المجموعة</button>
      </div>
    </div>`;
  }

  function optionRowTemplate(o) {
    return `
    <div class="option-editor-row" data-option-id="${o.id || ''}" data-temp="${o.id ? '' : 'true'}">
      <input type="text" class="opt-label" value="${AdminUI.escapeHtml(o.label_ar || '')}" placeholder="مثال: صوص ثوم">
      <input type="number" step="0.001" class="opt-price" value="${o.price_delta ?? 0}" placeholder="+0.300">
      <button type="button" class="icon-action-btn danger" data-remove-option-row title="حذف">${icon('x')}</button>
    </div>`;
  }

  function bindGroupEvents() {
    document.getElementById('add-group-btn')?.addEventListener('click', async () => {
      try {
        const newGroup = await AdminAPI.upsertOptionGroup({ product_id: currentProductId, title_ar: 'مجموعة جديدة', type: 'single', required: false, sort_order: groups.length });
        groups.push({ ...newGroup, product_options: [] });
        render();
      } catch (err) { AdminUI.toast(err.message || 'تعذر إنشاء المجموعة', true); }
    });

    document.querySelectorAll('[data-delete-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!AdminUI.confirmDelete('حذف هذه المجموعة وكل خياراتها؟')) return;
        try {
          await AdminAPI.deleteOptionGroup(btn.dataset.deleteGroup);
          AdminUI.toast('تم الحذف');
          await AdminProducts.refresh();
          loadGroupsForCurrent();
        } catch (err) { AdminUI.toast(err.message || 'تعذر الحذف', true); }
      });
    });

    document.querySelectorAll('[data-add-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        const editor = document.querySelector(`.option-group-editor[data-group-id="${btn.dataset.addOption}"] .group-options-list`);
        editor.insertAdjacentHTML('beforeend', optionRowTemplate({ label_ar: '', price_delta: 0 }));
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
    const type = editor.querySelector('.grp-type').value;
    const required = editor.querySelector('.grp-required').checked;

    try {
      await AdminAPI.upsertOptionGroup({ id: groupId, product_id: currentProductId, title_ar: title, type, required, sort_order: groups.findIndex(g => g.id === groupId) });

      const rows = [...editor.querySelectorAll('.option-editor-row')];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const label = row.querySelector('.opt-label').value.trim();
        if (!label) continue;
        const priceDelta = Number(row.querySelector('.opt-price').value) || 0;
        const optionId = row.dataset.optionId || undefined;
        await AdminAPI.upsertOption({ id: optionId, group_id: groupId, label_ar: label, price_delta: priceDelta, sort_order: i });
      }

      AdminUI.toast('تم حفظ مجموعة الخيارات');
      await AdminProducts.refresh();
      loadGroupsForCurrent();
    } catch (err) { AdminUI.toast(err.message || 'تعذر الحفظ', true); }
  }

  function init() {
    document.getElementById('options-product-select').addEventListener('change', (e) => {
      currentProductId = e.target.value;
      loadGroupsForCurrent();
    });
    document.addEventListener('admin:products-changed', populateProductSelect);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { populateProductSelect };
})();
