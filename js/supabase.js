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
  // persistSession/detectSessionInUrl: false — the public storefront never
  // logs a user in, so there's no session to persist. This also sidesteps
  // a real compatibility gap in some in-app browsers (Instagram/Facebook's
  // included) that restrict or throw on localStorage access, which is
  // what supabase-js's default auth storage adapter relies on.
  const client = isLive
    ? window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, detectSessionInUrl: false } })
    : null;

  /* ---- Menu (categories + products + option groups/options) ------------ */
  async function fetchMenu() {
    if (!isLive) return { ...window.SHAWAYA_SAMPLE_DATA, isLive: false };
    try {
      const [{ data: categories, error: e1 }, { data: products, error: e2 }] = await Promise.all([
        client.from('categories').select('*').eq('is_active', true).order('sort_order'),
        client.from('products').select('*, option_groups(*, product_options(*))').eq('is_available', true).order('sort_order'),
      ]);
      if (e1 || e2) throw (e1 || e2);

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
              options: (g.product_options || [])
                .filter((o) => o.is_active !== false)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(o => ({ id: o.id, label_ar: o.label_ar, price_delta: Number(o.price_delta) })),
            })),
        }));

      return {
        categories: (categories || []).map(c => ({ id: c.id, name_ar: c.name_ar, icon: c.icon })),
        products: shapedProducts,
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
    const notify = (table) => (payload) => onChange({ table, payload });
    const channel = client.channel('public-site-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, notify('settings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, notify('products'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, notify('categories'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'option_groups' }, notify('option_groups'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_options' }, notify('product_options'))
      .subscribe();
    return () => client.removeChannel(channel);
  }

  /* ---- Orders (written at checkout so the admin dashboard sees them) --*/
  function withTimeout(promise, ms = 6000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('order-log-timeout')), ms)),
    ]);
  }

  async function createOrder({ lines, generalNotes, subtotal, total }) {
    if (!isLive) return { ok: false, reason: 'offline' };
    try {
      const { data: order, error: orderErr } = await withTimeout(
        client.from('orders').insert({ subtotal, total, general_notes: generalNotes || null }).select().single()
      );
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
      const { error: itemsErr } = await withTimeout(client.from('order_items').insert(items));
      if (itemsErr) throw itemsErr;

      return { ok: true, orderId: order.id };
    } catch (err) {
      console.warn('Supabase createOrder failed (WhatsApp checkout still proceeds):', err);
      return { ok: false, reason: 'error' };
    }
  }

  return { isLive, client, fetchMenu, fetchSettings, subscribeToChanges, createOrder };
})();
