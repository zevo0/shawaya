/**
 * supabase.js — Shared data-access layer for the public site.
 * -----------------------------------------------------------------------
 * When SHAWAYA_CONFIG.supabase.url/anonKey are set, every read/write in
 * this file talks to real Supabase tables through the public anon key
 * (RLS enforces that anon can only read published content + insert
 * orders — see supabase/schema.sql). Until then, everything falls back
 * to the local sample dataset in js/menu.js so the site stays fully
 * functional.
 *
 * This is the ONLY file that talks to Supabase on the public site, so
 * the admin dashboard and the storefront are guaranteed to always agree
 * on shape — no duplicated data, nothing hardcoded past this layer.
 * -----------------------------------------------------------------------
 */
const ShawayaData = (() => {
  const cfg = window.SHAWAYA_CONFIG?.supabase || {};
  const isLive = Boolean(cfg.url && cfg.anonKey && window.supabase);
  const client = isLive ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  /* ---- Menu (categories + products + option groups/options + offers) - */
  async function fetchMenu() {
    if (!isLive) return { ...window.SHAWAYA_SAMPLE_DATA, isLive: false };
    try {
      const [{ data: categories, error: e1 }, { data: products, error: e2 }, { data: offers, error: e3 }] = await Promise.all([
        client.from('categories').select('*').eq('is_active', true).order('sort_order'),
        client.from('products').select('*, option_groups(*, product_options(*))').eq('is_available', true).order('sort_order'),
        client.from('offers').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (e1 || e2 || e3) throw (e1 || e2 || e3);

      const now = new Date().toISOString().slice(0, 10);
      const shapedProducts = (products || [])
        .filter(p => !p.track_stock || (p.stock_qty ?? 0) > 0)
        .map(p => ({
          id: p.id,
          category_id: p.category_id,
          name_ar: p.name_ar,
          description_ar: p.description_ar || '',
          price: Number(p.price),
          image_url: p.image_url || '',
          badges: p.badges || [],
          option_groups: (p.option_groups || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(g => ({
              id: g.id, title_ar: g.title_ar, type: g.type, required: g.required,
              options: (g.product_options || []).sort((a, b) => a.sort_order - b.sort_order)
                .map(o => ({ id: o.id, label_ar: o.label_ar, price_delta: Number(o.price_delta) })),
            })),
        }));

      const shapedOffers = (offers || [])
        .filter(o => (!o.starts_at || o.starts_at <= now) && (!o.ends_at || o.ends_at >= now))
        .map(o => ({ id: o.id, title_ar: o.title_ar, description_ar: o.description_ar || '', price: Number(o.price), image_url: o.image_url || '' }));

      return {
        categories: (categories || []).map(c => ({ id: c.id, name_ar: c.name_ar, icon: c.icon })),
        products: shapedProducts,
        offers: shapedOffers,
        isLive: true,
      };
    } catch (err) {
      console.warn('Supabase fetchMenu failed, using sample data:', err);
      return { ...window.SHAWAYA_SAMPLE_DATA, isLive: false };
    }
  }

  /* ---- Settings (single source of truth for branding/hours/open state) */
  async function fetchSettings() {
    if (!isLive) return { ...window.SHAWAYA_CONFIG.fallback, isLive: false };
    try {
      const { data, error } = await client.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return { ...data, isLive: true };
    } catch (err) {
      console.warn('Supabase fetchSettings failed, using fallback:', err);
      return { ...window.SHAWAYA_CONFIG.fallback, isLive: false };
    }
  }

  function subscribeToChanges(onChange) {
    if (!isLive) return () => {};
    const channel = client.channel('public-site-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'option_groups' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_options' }, onChange)
      .subscribe();
    return () => client.removeChannel(channel);
  }

  /* ---- Orders (written at checkout so the admin dashboard sees them) --*/
  async function createOrder({ lines, generalNotes, subtotal, total }) {
    if (!isLive) return { ok: false, reason: 'offline' };
    try {
      const { data: order, error: orderErr } = await client
        .from('orders')
        .insert({ subtotal, total, general_notes: generalNotes || null })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const items = lines.map(l => ({
        order_id: order.id,
        product_id: l.product.id,
        product_name: l.product.name_ar,
        qty: l.qty,
        unit_price: l.unitPrice,
        options_snapshot: l.optionLabels || [],
        notes: l.notes || null,
      }));
      const { error: itemsErr } = await client.from('order_items').insert(items);
      if (itemsErr) throw itemsErr;

      return { ok: true, orderId: order.id };
    } catch (err) {
      console.warn('Supabase createOrder failed (WhatsApp checkout still proceeds):', err);
      return { ok: false, reason: 'error' };
    }
  }

  return { isLive, client, fetchMenu, fetchSettings, subscribeToChanges, createOrder };
})();
