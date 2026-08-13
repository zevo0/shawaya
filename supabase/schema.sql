-- ============================================================================
-- شواية | Shawaya — Schema كامل لقاعدة بيانات جديدة
-- الاستخدام: شغّل هذا الملف مرة واحدة في Supabase SQL Editor على مشروع جديد.
-- لا تستخدمه على قاعدة قائمة فيها بيانات؛ استخدم ملفات migrations بدلاً منه.
-- ============================================================================

-- توليد UUID تلقائياً للجداول التي تحتاجه.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) إعدادات المطعم: صف واحد فقط يتحكم في بيانات الموقع وحالة الطلبات.
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  restaurant_name text not null default 'شواية',
  tagline text not null default 'نكهة الفحم الحقيقي، تحضر فوراً لتصلك طازجة ومقرمشة.',
  description text default 'مشاوي عربية أصيلة تُشوى على الفحم الحقيقي وتصل طازجة ومقرمشة.',
  logo_url text,
  hero_url text,
  whatsapp_number text not null default '96890000000',
  map_url text default 'https://maps.google.com',
  open_hour int not null default 12 check (open_hour between 0 and 23),
  close_hour int not null default 24 check (close_hour between 1 and 24),
  is_open boolean not null default true,
  instagram_url text,
  seo_title text default 'شواية | Shawaya — أصل المشاوي العربية على الفحم',
  seo_description text default 'مشاوي عربية أصيلة تُشوى على الفحم الحقيقي وتصل طازجة ومقرمشة. اطلب الآن للاستلام من الفرع عبر واتساب.',
  seo_keywords text default 'شواية, مشاوي, مطعم مشاوي, شاورما, كباب, مشاوي فحم',
  seo_og_image text,
  favicon_url text,
  updated_at timestamptz not null default now()
);

-- ينشئ صف الإعدادات الأساسي إن لم يكن موجوداً.
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2) التصنيفات والمنتجات.
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  icon text not null default 'flame',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name_ar text not null,
  description_ar text default '',
  price numeric(10,3) not null default 0,
  image_url text,
  badges text[] not null default '{}',
  sort_order int not null default 0,
  is_available boolean not null default true,
  track_stock boolean not null default false,
  stock_qty int,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);

-- ----------------------------------------------------------------------------
-- 3) مجموعات خيارات المنتج والإضافات.
-- required = المجموعة إجبارية، وis_active = الإضافة ظاهرة للعميل أم لا.
-- ----------------------------------------------------------------------------
create table if not exists public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title_ar text not null,
  type text not null default 'single' check (type in ('single', 'multiple')),
  required boolean not null default false,
  sort_order int not null default 0
);

create index if not exists option_groups_product_idx on public.option_groups(product_id);

create table if not exists public.product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  label_ar text not null,
  price_delta numeric(10,3) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index if not exists product_options_group_idx on public.product_options(group_id);

-- ----------------------------------------------------------------------------
-- 4) الطلبات: completed هي القيمة الداخلية المقابلة لزر «تم التسليم».
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  subtotal numeric(10,3) not null default 0,
  total numeric(10,3) not null default 0,
  general_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  qty int not null default 1 check (qty > 0),
  unit_price numeric(10,3) not null default 0,
  options_snapshot jsonb not null default '[]'::jsonb,
  notes text
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ----------------------------------------------------------------------------
-- 5) مكتبة الوسائط: تسجل الملفات المرفوعة إلى Storage bucket باسم media.
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  path text not null,
  filename text not null,
  uploaded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6) RLS: العميل يقرأ المحتوى وينشئ الطلبات فقط؛ الإدارة المسجلة تدير كل شيء.
-- ----------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.media enable row level security;

-- الإعدادات.
drop policy if exists "settings_select_all" on public.settings;
create policy "settings_select_all" on public.settings for select using (true);
drop policy if exists "settings_write_admin" on public.settings;
create policy "settings_write_admin" on public.settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- التصنيفات.
drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories for select using (true);
drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin" on public.categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- المنتجات.
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products for select using (true);
drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin" on public.products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- مجموعات الخيارات.
drop policy if exists "option_groups_select_all" on public.option_groups;
create policy "option_groups_select_all" on public.option_groups for select using (true);
drop policy if exists "option_groups_write_admin" on public.option_groups;
create policy "option_groups_write_admin" on public.option_groups for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- الإضافات.
drop policy if exists "product_options_select_all" on public.product_options;
create policy "product_options_select_all" on public.product_options for select using (true);
drop policy if exists "product_options_write_admin" on public.product_options;
create policy "product_options_write_admin" on public.product_options for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- الطلبات: العميل ينشئ فقط، والإدارة المسجلة تقرأ وتعدل وتحذف.
drop policy if exists "orders_insert_anon" on public.orders;
create policy "orders_insert_anon" on public.orders for insert with check (true);
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "order_items_insert_anon" on public.order_items;
create policy "order_items_insert_anon" on public.order_items for insert with check (true);
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- مكتبة الوسائط.
drop policy if exists "media_select_all" on public.media;
create policy "media_select_all" on public.media for select using (true);
drop policy if exists "media_write_admin" on public.media;
create policy "media_write_admin" on public.media for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 7) Realtime: تحديث المنيو والطلبات مباشرة من دون تحديث الصفحة.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'settings',
    'categories',
    'products',
    'option_groups',
    'product_options',
    'orders',
    'order_items'
  ]
  loop
    begin
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 8) Supabase Storage: مجلد media للصور، والرفع محصور بالإدارة المسجلة.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_bucket_public_read" on storage.objects;
create policy "media_bucket_public_read" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media_bucket_admin_write" on storage.objects;
create policy "media_bucket_admin_write" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "media_bucket_admin_update" on storage.objects;
create policy "media_bucket_admin_update" on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "media_bucket_admin_delete" on storage.objects;
create policy "media_bucket_admin_delete" on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 9) بيانات بداية اختيارية: تعمل فقط إذا كانت التصنيفات فارغة.
-- ----------------------------------------------------------------------------
do $$
declare
  c_grill uuid;
  c_offers uuid;
  c_starters uuid;
  c_drinks uuid;
  p_id uuid;
  g_id uuid;
begin
  if (select count(*) from public.categories) = 0 then
    insert into public.categories (name_ar, icon, sort_order)
      values ('مشويات الفحم', 'flame', 1)
      returning id into c_grill;
    insert into public.categories (name_ar, icon, sort_order)
      values ('العروض والبوكسات', 'gift', 2)
      returning id into c_offers;
    insert into public.categories (name_ar, icon, sort_order)
      values ('المقبلات والسلطات', 'salad', 3)
      returning id into c_starters;
    insert into public.categories (name_ar, icon, sort_order)
      values ('المشروبات والصوصات', 'cup', 4)
      returning id into c_drinks;

    insert into public.products
      (category_id, name_ar, description_ar, price, badges, sort_order)
    values
      (c_grill, 'مشكل شواية مشاوي', 'تشكيلة فاخرة من الكباب واللحم والدجاج المشوي على الفحم، تقدم مع الأرز والخبز الطازج.', 6.900, array['popular', 'chef'], 1)
      returning id into p_id;

    insert into public.option_groups (product_id, title_ar, type, required, sort_order)
      values (p_id, 'درجة التتبيل', 'single', true, 1)
      returning id into g_id;
    insert into public.product_options (group_id, label_ar, price_delta, sort_order)
      values (g_id, 'عادي', 0, 1), (g_id, 'حار', 0, 2);

    insert into public.products
      (category_id, name_ar, description_ar, price, badges, sort_order)
    values
      (c_grill, 'شاورما لحم ملفوف مقرمش', 'لفائف شاورما اللحم المقرمشة، محشوة بالصوص الخاص والمخللات.', 3.200, array['popular'], 2),
      (c_grill, 'كباب لحم فحم', 'كباب لحم غنم طازج متبل بالبهارات البيتية، مشوي على الفحم.', 4.500, array['popular'], 3),
      (c_grill, 'دجاج نص فحم كامل', 'نصف دجاجة مشوية بالفحم متبلة بالليمون والثوم.', 3.500, '{}', 4),
      (c_offers, 'بوكس شواية العائلي', 'وجبة عائلية تكفي ٤ أشخاص: تشكيلة مشاوي، أرز، سلطة، وخبز طازج.', 14.900, array['offer', 'limited'], 1),
      (c_starters, 'حمص بزيت الزيتون', 'حمص كريمي مقدم مع زيت الزيتون البكر.', 1.600, '{}', 1),
      (c_drinks, 'عصير ليمون نعناع', 'عصير ليمون طازج مع النعناع.', 1.200, '{}', 1);
  end if;
end $$;

-- نهاية الملف.
