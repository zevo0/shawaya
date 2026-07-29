/**
 * admin-api.js — Single Supabase client + every CRUD helper the admin
 * dashboard needs. Uses the SAME public anon key as the storefront; write
 * access is granted only because the admin is authenticated (see RLS
 * policies in supabase/schema.sql: `auth.role() = 'authenticated'`).
 */
const AdminAPI = (() => {
  const cfg = window.SHAWAYA_CONFIG?.supabase || {};
  const configured = Boolean(cfg.url && cfg.anonKey && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  function requireClient() {
    if (!client) throw new Error('Supabase غير مُهيأ بعد. أضف الرابط والمفتاح في config.js');
    return client;
  }

  /* ---- Auth --------------------------------------------------------- */
  async function signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() { await requireClient().auth.signOut(); }
  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session;
  }
  function onAuthChange(cb) { client?.auth.onAuthStateChange((_event, session) => cb(session)); }

  /* ---- Generic table helpers ----------------------------------------- */
  const table = (name) => requireClient().from(name);

  async function listAll(name, orderBy = 'sort_order') {
    const { data, error } = await table(name).select('*').order(orderBy, { ascending: true });
    if (error) throw error;
    return data;
  }

  /* ---- Settings -------------------------------------------------------*/
  async function getSettings() {
    const { data, error } = await table('settings').select('*').eq('id', 1).single();
    if (error) throw error;
    return data;
  }
  async function updateSettings(patch) {
    const { data, error } = await table('settings').update(patch).eq('id', 1).select().single();
    if (error) throw error;
    return data;
  }
  async function toggleOpen(isOpen) { return updateSettings({ is_open: isOpen }); }

  /* ---- Categories -------------------------------------------------- */
  async function listCategories() { return listAll('categories'); }
  async function upsertCategory(row) {
    const { data, error } = await table('categories').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteCategory(id) {
    const { error } = await table('categories').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---- Products (+ nested option groups/options) ---------------------*/
  async function listProducts() {
    const { data, error } = await table('products')
      .select('*, categories(name_ar), option_groups(*, product_options(*))')
      .order('sort_order');
    if (error) throw error;
    return data;
  }
  async function upsertProduct(row) {
    const { data, error } = await table('products').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteProduct(id) {
    const { error } = await table('products').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---- Option groups / options ----------------------------------------*/
  async function upsertOptionGroup(row) {
    const { data, error } = await table('option_groups').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteOptionGroup(id) {
    const { error } = await table('option_groups').delete().eq('id', id);
    if (error) throw error;
  }
  async function upsertOption(row) {
    const { data, error } = await table('product_options').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteOption(id) {
    const { error } = await table('product_options').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---- Offers ---------------------------------------------------------*/
  async function listOffers() { return listAll('offers'); }
  async function upsertOffer(row) {
    const { data, error } = await table('offers').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteOffer(id) {
    const { error } = await table('offers').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---- Orders ---------------------------------------------------------*/
  async function listOrders(limit = 100) {
    const { data, error } = await table('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
  async function updateOrderStatus(id, status) {
    const { error } = await table('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }

  /* ---- Media library (Supabase Storage bucket: media) ------------------*/
  async function listMedia() {
    const { data, error } = await table('media').select('*').order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  /**
   * Converts any uploaded image (jpg/png/etc.) to WebP in the browser
   * before it ever reaches Supabase Storage, so only WebP files are
   * ever saved. Falls back to the original file if conversion fails
   * (e.g. already WebP, or an unsupported/broken image).
   */
  async function toWebp(file, quality = 0.9) {
    if (file.type === 'image/webp') return file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (!blob) return file;
      const base = file.name.replace(/\.[^.]+$/, '');
      return new File([blob], `${base}.webp`, { type: 'image/webp' });
    } catch {
      return file;
    }
  }

  async function uploadMedia(file) {
    const webpFile = await toWebp(file);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const { error: upErr } = await requireClient().storage.from('media').upload(path, webpFile, { upsert: false, contentType: 'image/webp' });
    if (upErr) throw upErr;
    const { data: pub } = requireClient().storage.from('media').getPublicUrl(path);
    const { data, error } = await table('media').insert({ url: pub.publicUrl, path, filename: webpFile.name }).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteMedia(item) {
    await requireClient().storage.from('media').remove([item.path]);
    const { error } = await table('media').delete().eq('id', item.id);
    if (error) throw error;
  }

  /* ---- Dashboard stats --------------------------------------------------*/
  async function dashboardStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayOrders, error: e1 } = await table('orders')
      .select('*, order_items(*)')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false });
    if (e1) throw e1;

    const { data: recentOrders, error: e2 } = await table('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(8);
    if (e2) throw e2;

    const productCounts = {};
    (todayOrders || []).forEach(o => {
      (o.order_items || []).forEach(it => {
        productCounts[it.product_name] = (productCounts[it.product_name] || 0) + it.qty;
      });
    });
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      todayOrderCount: (todayOrders || []).length,
      todayRevenue: (todayOrders || []).reduce((sum, o) => sum + Number(o.total), 0),
      topProduct: topProduct ? { name: topProduct[0], qty: topProduct[1] } : null,
      recentOrders: recentOrders || [],
    };
  }

  return {
    configured, client,
    signIn, signOut, getSession, onAuthChange,
    getSettings, updateSettings, toggleOpen,
    listCategories, upsertCategory, deleteCategory,
    listProducts, upsertProduct, deleteProduct,
    upsertOptionGroup, deleteOptionGroup, upsertOption, deleteOption,
    listOffers, upsertOffer, deleteOffer,
    listOrders, updateOrderStatus,
    listMedia, uploadMedia, deleteMedia,
    dashboardStats,
  };
})();
