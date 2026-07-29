/**
 * menu.js — Sample dataset (stand-in for Supabase tables) + menu rendering.
 * Swap in real Supabase data via config.js without touching this file's
 * render logic — ShawayaData.fetchMenu() returns the same shape either way.
 */

/* ---------------------------------------------------------------------- */
/* SAMPLE DATA (mirrors categories / products / option_groups / offers)    */
/* ---------------------------------------------------------------------- */
window.SHAWAYA_SAMPLE_DATA = {
  categories: [
    { id: 'popular', name_ar: 'الأكثر طلباً', icon: 'star' },
    { id: 'grill', name_ar: 'مشويات الفحم', icon: 'flame' },
    { id: 'offers', name_ar: 'العروض والبوكسات', icon: 'gift' },
    { id: 'starters', name_ar: 'المقبلات والسلطات', icon: 'salad' },
    { id: 'drinks', name_ar: 'المشروبات والصوصات', icon: 'cup' },
  ],

  products: [
    {
      id: 'p1', category_id: 'popular',
      name_ar: 'مشكل شواية مشاوي', description_ar: 'تشكيلة فاخرة من الكباب واللحم والدجاج المشوي على الفحم، تقدم مع الأرز والخبز الطازج.',
      price: 6.900, image_url: 'assets/images/hero.webp',
      badges: ['popular', 'chef'],
      option_groups: [
        { id: 'og1', title_ar: 'درجة التتبيل', type: 'single', required: true,
          options: [{ id:'o1', label_ar:'عادي', price_delta:0 }, { id:'o2', label_ar:'حار', price_delta:0 }] },
        { id: 'og2', title_ar: 'إضافات', type: 'multiple', required: false,
          options: [{ id:'o3', label_ar:'أرز إضافي', price_delta:0.800 }, { id:'o4', label_ar:'خبز إضافي', price_delta:0.300 }] },
      ],
    },
    {
      id: 'p2', category_id: 'popular',
      name_ar: 'شاورما لحم ملفوف مقرمش', description_ar: 'لفائف شاورما اللحم المقرمشة، محشوة بالصوص الخاص والمخللات، تقدم مع البطاطا وأربعة صوصات.',
      price: 3.200, image_url: 'assets/images/dish-wrap-box.webp',
      badges: ['popular'],
      option_groups: [
        { id: 'og3', title_ar: 'الحجم', type: 'single', required: true,
          options: [{ id:'o5', label_ar:'فردي', price_delta:0 }, { id:'o6', label_ar:'بوكس عائلي', price_delta:2.500 }] },
      ],
    },
    {
      id: 'p3', category_id: 'popular',
      name_ar: 'كريسبي تشيكن رول جبنة', description_ar: 'قطع دجاج كرسبي مقرمشة مع طبقات جبن ذائب وخس وخيار مخلل، ملفوفة في خبز طازج.',
      price: 2.400, image_url: 'assets/images/dish-crispy-wrap.webp',
      badges: ['hot', 'new'],
      option_groups: [
        { id: 'og4', title_ar: 'مستوى الحرارة', type: 'single', required: true,
          options: [{ id:'o7', label_ar:'عادي', price_delta:0 }, { id:'o8', label_ar:'حار جداً', price_delta:0 }] },
      ],
    },
    {
      id: 'p4', category_id: 'grill',
      name_ar: 'كباب لحم فحم', description_ar: 'كباب لحم غنم طازج متبل بالبهارات البيتية، مشوي على الفحم حتى القرمشة.',
      price: 4.500, image_url: '', badges: ['popular'],
      option_groups: [
        { id: 'og5', title_ar: 'عدد الأسياخ', type: 'single', required: true,
          options: [{ id:'o9', label_ar:'٣ أسياخ', price_delta:0 }, { id:'o10', label_ar:'٥ أسياخ', price_delta:1.800 }] },
      ],
    },
    {
      id: 'p5', category_id: 'grill',
      name_ar: 'ريش غنم مشوية', description_ar: 'ريش غنم طرية متبلة بخلطة الأعشاب والفحم، تقدم مع صلصة الطحينة.',
      price: 7.200, image_url: '', badges: ['chef'],
      option_groups: [],
    },
    {
      id: 'p6', category_id: 'grill',
      name_ar: 'دجاج نص فحم كامل', description_ar: 'نصف دجاجة مشوية بالفحم متبلة بالليمون والثوم، مقرمشة من الخارج وطرية من الداخل.',
      price: 3.500, image_url: '', badges: [],
      option_groups: [
        { id: 'og6', title_ar: 'الصلصة المرافقة', type: 'single', required: false,
          options: [{ id:'o11', label_ar:'ثومية', price_delta:0 }, { id:'o12', label_ar:'شطة', price_delta:0 }] },
      ],
    },
    {
      id: 'p7', category_id: 'grill',
      name_ar: 'كفتة مشوية بالفحم', description_ar: 'كفتة لحم مفروم طازج مع البقدونس والبصل، مشوية على الفحم مباشرة.',
      price: 4.100, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p8', category_id: 'grill',
      name_ar: 'أجنحة دجاج مشوية', description_ar: 'أجنحة دجاج متبلة بخلطة الفحم الحارة، مشوية حتى الذهبية.',
      price: 2.900, image_url: '', badges: ['hot'],
      option_groups: [],
    },
    {
      id: 'p9', category_id: 'offers',
      name_ar: 'بوكس شواية العائلي', description_ar: 'وجبة عائلية تكفي ٤ أشخاص: تشكيلة مشاوي، أرز، سلطة، وخبز طازج.',
      price: 14.900, image_url: '', badges: ['offer', 'limited'],
      option_groups: [],
    },
    {
      id: 'p10', category_id: 'offers',
      name_ar: 'عرض الغداء السريع', description_ar: 'ساندويش شاورما أو كريسبي + بطاطا + مشروب، بسعر مميز حتى الساعة ٤ عصراً.',
      price: 2.200, image_url: '', badges: ['offer'],
      option_groups: [],
    },
    {
      id: 'p11', category_id: 'starters',
      name_ar: 'حمص بزيت الزيتون', description_ar: 'حمص كريمي مقدم مع زيت الزيتون البكر وحبات الحمص الكاملة.',
      price: 1.600, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p12', category_id: 'starters',
      name_ar: 'تبولة طازجة', description_ar: 'بقدونس مفروم ناعم مع الطماطم والبرغل وعصير الليمون الطازج.',
      price: 1.800, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p13', category_id: 'starters',
      name_ar: 'ورق عنب بالزيت', description_ar: 'ورق عنب محشو بالأرز والخضار، يقدم بارداً مع زيت الزيتون.',
      price: 2.100, image_url: '', badges: ['new'],
      option_groups: [],
    },
    {
      id: 'p14', category_id: 'starters',
      name_ar: 'فتوش بيت شواية', description_ar: 'خضار طازجة مقرمشة مع رقائق الخبز المحمص ودبس الرمان.',
      price: 1.900, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p15', category_id: 'drinks',
      name_ar: 'عصير ليمون نعناع', description_ar: 'عصير ليمون طازج مع النعناع، منعش ومثالي مع المشويات.',
      price: 1.200, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p16', category_id: 'drinks',
      name_ar: 'صوص ثوم بيتي', description_ar: 'صوص الثوم الكريمي الخاص بشواية، تحضير يومي طازج.',
      price: 0.500, image_url: '', badges: [],
      option_groups: [],
    },
    {
      id: 'p17', category_id: 'drinks',
      name_ar: 'مشروب غازي', description_ar: 'مشروبات غازية باردة متنوعة.',
      price: 0.500, image_url: '', badges: [],
      option_groups: [
        { id: 'og7', title_ar: 'النوع', type: 'single', required: true,
          options: [{ id:'o13', label_ar:'كولا', price_delta:0 }, { id:'o14', label_ar:'برتقال', price_delta:0 }, { id:'o15', label_ar:'سفن أب', price_delta:0 }] },
      ],
    },
    {
      id: 'p18', category_id: 'drinks',
      name_ar: 'شاي كرك', description_ar: 'شاي كرك بالحليب والهيل، يحضر طازجاً عند الطلب.',
      price: 0.700, image_url: '', badges: ['popular'],
      option_groups: [],
    },
  ],

  offers: [
    { id: 'of1', title_ar: 'بوكس شواية العائلي', description_ar: 'يكفي ٤ أشخاص، تشكيلة مشاوي كاملة', price: 14.900, image_url: 'assets/images/dish-wrap-box.webp' },
    { id: 'of2', title_ar: 'صندوق الشاورما المزدوج', description_ar: 'شاورما لحم + كريسبي رول بطاطا وصوصات', price: 5.200, image_url: 'assets/images/dish-crispy-wrap.webp' },
  ],
};

const BADGE_META = {
  popular: { label: 'الأكثر طلباً', img: 'best-seller.svg', cls: 'badge-popular' },
  hot: { label: 'حار', img: 'spicy.svg', cls: 'badge-hot' },
  new: { label: 'جديد', img: 'new.svg', cls: 'badge-new' },
  limited: { label: 'كمية محدودة', img: 'limited.svg', cls: 'badge-limited' },
  offer: { label: 'عرض', img: 'offers.svg', cls: 'badge-offer' },
  chef: { label: 'اختيار الشيف', img: 'chef-choice.svg', cls: 'badge-chef' },
};

const Menu = (() => {
  let data = { categories: [], products: [], offers: [] };
  const favorites = new Set(JSON.parse(sessionStorage.getItem('shawaya_favs') || '[]'));

  function currency(n) {
    return `${n.toFixed(3)} ر.ع`;
  }

  function badgeMarkup(keys = []) {
    return keys.map(k => {
      const m = BADGE_META[k];
      if (!m) return '';
      return `<span class="badge ${m.cls}"><img src="assets/icons/${m.img}" alt="" width="16" height="16" loading="lazy" decoding="async">${m.label}</span>`;
    }).join('');
  }

  function mediaMarkup(product) {
    if (product.image_url) {
      return `<img src="${product.image_url}" alt="${escapeHtml(product.name_ar)}" loading="lazy" decoding="async" width="400" height="400">`;
    }
    // Elegant placeholder using the category flame motif — avoids stock imagery.
    return `<div class="placeholder-media" role="img" aria-label="${escapeHtml(product.name_ar)}" style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(135deg,#f3e6d8,#f8f0e4);color:var(--color-primary);opacity:.55">${icon('flame', 'width="46" height="46"')}</div>`;
  }

  function escapeHtml(str = '') {
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function cardTemplate(product) {
    const isFav = favorites.has(product.id);
    return `
    <article class="item-card" data-id="${product.id}" data-category="${product.category_id}">
      <div class="item-card-media">
        <div class="badge-row">${badgeMarkup(product.badges)}</div>
        <button class="fav-btn ${isFav ? 'is-active' : ''}" aria-pressed="${isFav}" aria-label="إضافة إلى المفضلة" data-fav="${product.id}">
          ${icon('heart')}
        </button>
        <button class="card-open-trigger" data-open="${product.id}" style="all:unset;position:absolute;inset:0;cursor:pointer" aria-label="عرض تفاصيل ${escapeHtml(product.name_ar)}"></button>
        ${mediaMarkup(product)}
      </div>
      <div class="item-card-body">
        <h3>${escapeHtml(product.name_ar)}</h3>
        <div class="item-card-footer">
          <span class="item-price">${currency(product.price)}</span>
          <button class="quick-add-btn" data-quickadd="${product.id}" aria-label="إضافة سريعة لـ ${escapeHtml(product.name_ar)}">
            ${icon('plus')}<span>أضف</span>
          </button>
        </div>
      </div>
    </article>`;
  }

  function categorySectionTemplate(cat, products) {
    if (!products.length) return '';
    return `
    <section class="menu-section" id="cat-${cat.id}" data-category-section="${cat.id}">
      <div class="container">
        <button class="category-title" aria-expanded="true" data-toggle-category="${cat.id}">
          <span class="category-title-left">
            <span class="cat-icon">${icon(cat.icon)}</span>
            <h2>${cat.name_ar} <span class="cat-count">(${products.length})</span></h2>
          </span>
          <span class="chev">${icon('chevronDown')}</span>
        </button>
        <div class="category-body" data-category-body="${cat.id}">
          <div class="grid-wrap">
            <div class="menu-grid reveal-group">
              ${products.map(cardTemplate).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function render(menuData) {
    data = menuData;
    const wrap = document.getElementById('menu-sections');
    const byCategory = data.categories.map(cat => ({
      cat,
      products: data.products.filter(p => p.category_id === cat.id),
    }));

    wrap.innerHTML = byCategory.map(({ cat, products }) => categorySectionTemplate(cat, products)).join('');

    renderCategoryNav(data.categories);
    renderOffers(data.offers);
    bindAccordion();
    bindFavorites();
    bindQuickAdd();
    bindCardOpen();
    observeReveal();
  }

  function renderCategoryNav(categories) {
    const nav = document.getElementById('category-scroller');
    nav.innerHTML = categories.map((c, i) => `
      <a href="#cat-${c.id}" class="category-chip" data-cat-link="${c.id}" aria-current="${i === 0}">
        ${icon(c.icon)}<span>${c.name_ar}</span>
      </a>`).join('');

    document.getElementById('nav-categories-inline').innerHTML = categories.map(c =>
      `<a href="#cat-${c.id}">${c.name_ar}</a>`).join('');
  }

  function renderOffers(offers) {
    const el = document.getElementById('offers-scroller');
    if (!offers?.length) { document.getElementById('offers-strip')?.remove(); return; }
    el.innerHTML = offers.map(o => `
      <article class="offer-card">
        <img src="${o.image_url}" alt="${escapeHtml(o.title_ar)}" loading="lazy">
        <div class="offer-card-body">
          <h3>${escapeHtml(o.title_ar)}</h3>
          <p>${escapeHtml(o.description_ar)}</p>
          <span class="item-price">${currency(o.price)}</span>
        </div>
      </article>`).join('');
  }

  function bindAccordion() {
    document.querySelectorAll('[data-toggle-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleCategory;
        const body = document.querySelector(`[data-category-body="${id}"]`);
        const collapsed = body.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', String(!collapsed));
      });
    });
  }

  function bindFavorites() {
    document.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.fav;
        if (favorites.has(id)) { favorites.delete(id); btn.classList.remove('is-active'); btn.setAttribute('aria-pressed', 'false'); }
        else { favorites.add(id); btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true'); btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 500); }
        sessionStorage.setItem('shawaya_favs', JSON.stringify([...favorites]));
      });
    });
  }

  function bindQuickAdd() {
    document.querySelectorAll('[data-quickadd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = findProduct(btn.dataset.quickadd);
        if (!product) return;
        if (product.option_groups?.some(g => g.required)) {
          Modal.open(product);
          return;
        }
        Cart.addItem({ product, qty: 1, selections: {}, notes: '' });
        btn.classList.add('added');
        btn.innerHTML = `${icon('check')}<span>أُضيف</span>`;
        setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = `${icon('plus')}<span>أضف</span>`; }, 1200);
      });
    });
  }

  function bindCardOpen() {
    document.querySelectorAll('[data-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = findProduct(btn.dataset.open);
        if (product) Modal.open(product);
      });
    });
  }

  function observeReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal-group').forEach(el => io.observe(el));
  }

  function findProduct(id) { return data.products.find(p => p.id === id); }
  function getAll() { return data; }
  function suggestUpsell(excludeIds = [], count = 6) {
    return data.products.filter(p => !excludeIds.includes(p.id) && (p.category_id === 'drinks' || p.category_id === 'starters')).slice(0, count);
  }

  return { render, currency, findProduct, getAll, badgeMarkup, escapeHtml, suggestUpsell };
})();
