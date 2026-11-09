-- Charlie's Chairs: website database + file storage.
-- Run once in Supabase > SQL Editor on a NEW project.
-- Security model:
--   * The website calls only the functions below (no direct table access from browsers).
--   * Visitors can read PUBLISHED content and submit inquiries. That's all.
--   * Customer photos go to a PRIVATE bucket. Visitors can upload into a fresh random folder
--     but can never list or view any file. Only admins can view them (short-lived signed links).
--   * Admins are the users listed in public.admins. Every admin function checks that.
-- Errors use the format "CODE|message".

-- ------------------------------------------------------------------ settings
create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Charlie''s Chairs',
  owner_name text not null default 'Charles Parks',
  phone text not null default '616-655-5225',
  email text not null default 'parkscharles838@gmail.com',
  address_line text not null default '436 Northpark NE',
  city_state_zip text not null default 'Grand Rapids, MI 49525',
  address_confirmed boolean not null default false,   -- map link appears only after Charles confirms
  hours text not null default '',
  service_area text not null default '',
  youtube_channel_url text not null default '' check (youtube_channel_url = '' or youtube_channel_url ~ '^https://(www\.)?youtube\.com/'),
  pickup_delivery_note text not null default '',
  payment_note text not null default '',
  policy_privacy text not null default '',
  policy_terms text not null default '',
  policy_returns text not null default '',
  policy_shipping text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ inquiries (private)
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  kind text not null default 'project' check (kind in ('project', 'piece', 'fabric', 'contact')),
  item_ref text not null default '' check (length(item_ref) <= 200),
  first_name text not null check (length(first_name) between 1 and 60),
  last_name text not null default '' check (length(last_name) <= 60),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 160),
  phone text not null default '' check (length(phone) <= 30),
  contact_method text not null default 'email' check (contact_method in ('email', 'phone', 'text')),
  project_type text not null default '' check (length(project_type) <= 40),
  furniture_type text not null default '' check (length(furniture_type) <= 40),
  pieces int check (pieces between 1 and 100),
  description text not null default '' check (length(description) <= 3000),
  condition text not null default '' check (length(condition) <= 2000),
  style text not null default '' check (length(style) <= 1000),
  dimensions text not null default '' check (length(dimensions) <= 300),
  budget text not null default '' check (length(budget) <= 40),
  timing text not null default '' check (length(timing) <= 200),
  quantity text not null default '' check (length(quantity) <= 60),
  photo_paths text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'in_review', 'needs_info', 'quote_sent', 'approved', 'in_progress', 'complete', 'closed')),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inquiries (created_at desc);
create index on public.inquiries (lower(email), created_at);

create table public.inquiry_notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  note text not null check (length(note) between 1 and 3000),
  author uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ public content
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  category text not null default '' check (length(category) <= 40),
  description text not null default '' check (length(description) <= 3000),
  materials text not null default '' check (length(materials) <= 500),
  before_images text[] not null default '{}',
  after_images text[] not null default '{}',
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  category text not null default '' check (length(category) <= 40),
  sku text not null default '' check (length(sku) <= 40),
  description text not null default '' check (length(description) <= 3000),
  images text[] not null default '{}',
  dimensions text not null default '' check (length(dimensions) <= 200),
  condition text not null default '' check (length(condition) <= 300),
  materials text not null default '' check (length(materials) <= 300),
  finish text not null default '' check (length(finish) <= 200),
  price_cents int check (price_cents between 0 and 100000000),
  quantity int not null default 1 check (quantity between 0 and 1000),
  status text not null default 'draft' check (status in ('draft', 'available', 'reserved', 'sold')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  code text not null default '' check (length(code) <= 40),
  images text[] not null default '{}',
  brand text not null default '' check (length(brand) <= 80),
  color_family text not null default '' check (length(color_family) <= 40),
  pattern text not null default '' check (length(pattern) <= 40),
  composition text not null default '' check (length(composition) <= 200),
  use_type text not null default '' check (length(use_type) <= 80),
  care text not null default '' check (length(care) <= 1000),
  price_cents int check (price_cents between 0 and 10000000),
  price_unit text not null default 'per yard' check (price_unit in ('per yard', 'per sample', 'per roll', 'per piece')),
  min_qty text not null default '' check (length(min_qty) <= 40),
  available_qty text not null default '' check (length(available_qty) <= 40),
  stock_state text not null default 'in_stock' check (stock_state in ('in_stock', 'low_stock', 'special_order', 'unavailable')),
  swatch_available boolean not null default false,
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 1000),
  featured boolean not null default false,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(question) between 1 and 300),
  answer text not null check (length(answer) between 1 and 3000),
  published boolean not null default true,
  sort int not null default 0
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text not null default '',
  created_at timestamptz not null default now()
);

-- Launch-safe FAQ starters (owner should review). Nothing here promises timing, price or delivery.
insert into public.faqs (question, answer, sort) values
 ('How do I get started?', 'Send a quote request with a few photos of your piece and a short description of what you would like done. Charles reviews every request and follows up with you directly.', 1),
 ('What photos should I send?', 'One photo of the whole piece from the front, one from the side, and close-ups of any worn, torn or damaged areas. If you have a fabric or style you love, add a picture of that too.', 2),
 ('Is the quote automatic?', 'No. Every request is reviewed by Charles personally. Your photos help him understand the piece before he contacts you to talk through options.', 3),
 ('Will my photos be posted online?', 'No. Photos sent with a quote request are private and only used to review your project.', 4),
 ('Can every piece be restored?', 'Not always. It depends on the frame, the springs and the condition of the piece. Charles will give you an honest assessment.', 5);

-- ------------------------------------------------------------------ security: no direct table access
alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.inquiries enable row level security;
alter table public.inquiry_notes enable row level security;
alter table public.projects enable row level security;
alter table public.products enable row level security;
alter table public.fabrics enable row level security;
alter table public.videos enable row level security;
alter table public.faqs enable row level security;
alter table public.audit_log enable row level security;
revoke all on all tables in schema public from anon, authenticated;

-- ------------------------------------------------------------------ storage buckets + rules
-- inquiry-photos: PRIVATE. 10 MB per file, images only.
-- site-media: PUBLIC read (portfolio, shop and fabric photos). Only admins can upload/change.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('inquiry-photos', 'inquiry-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('site-media', 'site-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- Visitors may only ADD a photo inside a random folder: "<uuid>/<name>.(jpg|jpeg|png|webp)". No list, read, update or delete.
create policy "visitors upload quote photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'inquiry-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,60}\.(jpg|jpeg|png|webp)$');
create policy "admins view quote photos" on storage.objects for select to authenticated
  using (bucket_id = 'inquiry-photos' and public.is_admin());
create policy "admins remove quote photos" on storage.objects for delete to authenticated
  using (bucket_id = 'inquiry-photos' and public.is_admin());
create policy "admins manage site media" on storage.objects for all to authenticated
  using (bucket_id = 'site-media' and public.is_admin())
  with check (bucket_id = 'site-media' and public.is_admin());

-- ------------------------------------------------------------------ helpers
create function public._require_admin() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH|Please sign in.'; end if;
  if not public.is_admin() then raise exception 'FORBIDDEN|Admin access only.'; end if;
end $$;

create function public._log(p_action text, p_target text) returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, action, target) values (auth.uid(), p_action, left(coalesce(p_target, ''), 200)) $$;

create function public._txt(p jsonb, k text, maxlen int) returns text language sql immutable set search_path = public as $$
  select left(trim(coalesce(p ->> k, '')), maxlen) $$;

-- Image paths stored for public content must be site-media paths like "projects/abc.jpg".
create function public._media_paths(p jsonb) returns text[] language plpgsql immutable set search_path = public as $$
declare out text[] := '{}'; v text;
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  if jsonb_array_length(p) > 20 then raise exception 'INVALID|Up to 20 photos per item.'; end if;
  for v in select jsonb_array_elements_text(p) loop
    if v !~ '^[a-z]+/[A-Za-z0-9_-]{1,80}\.(jpg|jpeg|png|webp)$' then raise exception 'INVALID|Photo path not allowed: %', left(v, 80); end if;
    out := out || v;
  end loop;
  return out;
end $$;

create function public._cents(p jsonb, k text) returns int language plpgsql immutable set search_path = public as $$
begin
  if p ->> k is null or trim(p ->> k) = '' then return null; end if;
  if (p ->> k) !~ '^\d{1,9}$' then raise exception 'INVALID|Price must be a whole number of cents.'; end if;
  return (p ->> k)::int;
end $$;

-- ------------------------------------------------------------------ public reads (anyone)
create function public.get_site() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('business_name', business_name, 'owner_name', owner_name, 'phone', phone, 'email', email,
    'address_line', address_line, 'city_state_zip', city_state_zip, 'address_confirmed', address_confirmed,
    'hours', hours, 'service_area', service_area, 'youtube_channel_url', youtube_channel_url,
    'pickup_delivery_note', pickup_delivery_note, 'payment_note', payment_note,
    'policy_privacy', policy_privacy, 'policy_terms', policy_terms, 'policy_returns', policy_returns, 'policy_shipping', policy_shipping)
  from public.settings $$;

create function public.list_projects() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'category', category, 'description', description,
    'materials', materials, 'before_images', before_images, 'after_images', after_images) order by sort, created_at desc), '[]')
  from public.projects where published $$;

create function public.list_products() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'category', category, 'sku', sku, 'description', description,
    'images', images, 'dimensions', dimensions, 'condition', condition, 'materials', materials, 'finish', finish,
    'price_cents', price_cents, 'status', status) order by (status = 'sold'), sort, created_at desc), '[]')
  from public.products where status <> 'draft' $$;

create function public.list_fabrics() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', code, 'images', images, 'brand', brand,
    'color_family', color_family, 'pattern', pattern, 'composition', composition, 'use_type', use_type, 'care', care,
    'price_cents', price_cents, 'price_unit', price_unit, 'min_qty', min_qty, 'available_qty', available_qty,
    'stock_state', stock_state, 'swatch_available', swatch_available) order by sort, name), '[]')
  from public.fabrics where published $$;

create function public.list_videos() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'youtube_id', youtube_id, 'title', title, 'description', description, 'featured', featured)
    order by featured desc, sort, created_at desc), '[]')
  from public.videos where published $$;

create function public.list_faqs() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('question', question, 'answer', answer) order by sort), '[]')
  from public.faqs where published $$;

-- ------------------------------------------------------------------ submit an inquiry (anyone)
-- p_upload_folder: the random folder the browser uploaded photos into (or null for no photos).
create function public.submit_inquiry(p jsonb, p_upload_folder uuid default null) returns text
language plpgsql security definer set search_path = public, storage as $$
declare
  v_ref text; v_paths text[] := '{}'; v_email text := lower(public._txt(p, 'email', 160));
  v_kind text := coalesce(nullif(public._txt(p, 'kind', 20), ''), 'project'); v_pieces int;
begin
  if public._txt(p, 'website', 200) <> '' then raise exception 'SPAM|Submission blocked.'; end if;   -- honeypot
  if public._txt(p, 'first_name', 60) = '' then raise exception 'INVALID|Please enter your first name.'; end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID|Please enter a valid email address.'; end if;
  if coalesce((p ->> 'consent')::boolean, false) is not true then raise exception 'INVALID|Please agree to be contacted.'; end if;
  if v_kind not in ('project', 'piece', 'fabric', 'contact') then raise exception 'INVALID|Unknown request type.'; end if;
  if v_kind = 'project' and public._txt(p, 'description', 3000) = '' then raise exception 'INVALID|Please describe the piece and the work you would like.'; end if;
  if public._txt(p, 'contact_method', 10) not in ('', 'email', 'phone', 'text') then raise exception 'INVALID|Unknown contact method.'; end if;
  if public._txt(p, 'contact_method', 10) in ('phone', 'text') and public._txt(p, 'phone', 30) !~ '\d{3}.*\d{4}' then raise exception 'INVALID|Please add a phone number so Charles can reach you that way.'; end if;
  if (p ->> 'pieces') is not null and (p ->> 'pieces') <> '' then
    if (p ->> 'pieces') !~ '^\d{1,3}$' or (p ->> 'pieces')::int not between 1 and 100 then raise exception 'INVALID|Number of pieces must be between 1 and 100.'; end if;
    v_pieces := (p ->> 'pieces')::int;
  end if;
  -- rate limits: 5 per email per day, 60 site-wide per hour
  if (select count(*) from public.inquiries where lower(email) = v_email and created_at > now() - interval '1 day') >= 5 then
    raise exception 'LIMIT|You have sent several requests today. Charles will be in touch; you can also call or email directly.'; end if;
  if (select count(*) from public.inquiries where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'LIMIT|We are receiving a lot of requests right now. Please try again shortly or call.'; end if;
  if p_upload_folder is not null then
    select coalesce(array_agg(o.name order by o.name), '{}') into v_paths from storage.objects o
     where o.bucket_id = 'inquiry-photos' and o.name like p_upload_folder::text || '/%';
    if array_length(v_paths, 1) > 10 then raise exception 'INVALID|Up to 10 photos per request.'; end if;
    if exists (select 1 from public.inquiries i where i.photo_paths && v_paths) then raise exception 'INVALID|Those photos were already submitted.'; end if;
  end if;
  loop
    v_ref := 'CC-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from public.inquiries where ref = v_ref);
  end loop;
  insert into public.inquiries (ref, kind, item_ref, first_name, last_name, email, phone, contact_method, project_type, furniture_type,
    pieces, description, condition, style, dimensions, budget, timing, quantity, photo_paths, consent)
  values (v_ref, v_kind, public._txt(p, 'item_ref', 200), public._txt(p, 'first_name', 60), public._txt(p, 'last_name', 60), v_email,
    public._txt(p, 'phone', 30), coalesce(nullif(public._txt(p, 'contact_method', 10), ''), 'email'), public._txt(p, 'project_type', 40),
    public._txt(p, 'furniture_type', 40), v_pieces, public._txt(p, 'description', 3000), public._txt(p, 'condition', 2000),
    public._txt(p, 'style', 1000), public._txt(p, 'dimensions', 300), public._txt(p, 'budget', 40), public._txt(p, 'timing', 200),
    public._txt(p, 'quantity', 60), v_paths, true);
  return v_ref;
end $$;

-- ------------------------------------------------------------------ admin
create function public.admin_me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('signed_in', auth.uid() is not null, 'is_admin', public.is_admin()) $$;

create function public.admin_overview() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return jsonb_build_object(
    'inquiries', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'ref', ref, 'kind', kind, 'item_ref', item_ref, 'name', trim(first_name || ' ' || last_name),
        'email', email, 'phone', phone, 'project_type', project_type, 'furniture_type', furniture_type, 'status', status,
        'photos', coalesce(array_length(photo_paths, 1), 0), 'created_at', created_at) order by created_at desc) from public.inquiries), '[]'),
    'projects', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.created_at desc) from public.projects x), '[]'),
    'products', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.created_at desc) from public.products x), '[]'),
    'fabrics', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.name) from public.fabrics x), '[]'),
    'videos', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort, x.created_at desc) from public.videos x), '[]'),
    'faqs', coalesce((select jsonb_agg(to_jsonb(x) order by x.sort) from public.faqs x), '[]'),
    'settings', (select to_jsonb(s) - 'id' from public.settings s));
end $$;

create function public.admin_get_inquiry(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.inquiries;
begin
  perform public._require_admin();
  select * into r from public.inquiries where id = p_id;
  if r.id is null then raise exception 'NOT_FOUND|Inquiry not found.'; end if;
  return to_jsonb(r) || jsonb_build_object('notes', coalesce((select jsonb_agg(jsonb_build_object('note', n.note, 'created_at', n.created_at) order by n.created_at)
    from public.inquiry_notes n where n.inquiry_id = r.id), '[]'));
end $$;

create function public.admin_set_inquiry_status(p_id uuid, p_status text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_status not in ('new', 'in_review', 'needs_info', 'quote_sent', 'approved', 'in_progress', 'complete', 'closed') then raise exception 'INVALID|Unknown status.'; end if;
  update public.inquiries set status = p_status, updated_at = now() where id = p_id;
  if not found then raise exception 'NOT_FOUND|Inquiry not found.'; end if;
  perform public._log('inquiry.status:' || p_status, p_id::text);
end $$;

create function public.admin_add_note(p_id uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'INVALID|Write a note first.'; end if;
  if not exists (select 1 from public.inquiries where id = p_id) then raise exception 'NOT_FOUND|Inquiry not found.'; end if;
  insert into public.inquiry_notes (inquiry_id, note, author) values (p_id, left(trim(p_note), 3000), auth.uid());
end $$;

create function public.admin_export_inquiries() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public._require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('ref', ref, 'date', created_at, 'status', status, 'kind', kind, 'item', item_ref,
    'first_name', first_name, 'last_name', last_name, 'email', email, 'phone', phone, 'contact_method', contact_method,
    'project_type', project_type, 'furniture_type', furniture_type, 'pieces', pieces, 'description', description,
    'condition', condition, 'style', style, 'dimensions', dimensions, 'budget', budget, 'timing', timing, 'quantity', quantity,
    'photos', coalesce(array_length(photo_paths, 1), 0)) order by created_at desc) from public.inquiries), '[]');
end $$;

create function public.admin_save_project(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform public._require_admin();
  if public._txt(p, 'title', 120) = '' then raise exception 'INVALID|Give the project a title.'; end if;
  if v_id is null then
    insert into public.projects (title) values (public._txt(p, 'title', 120)) returning id into v_id;
  end if;
  update public.projects set title = public._txt(p, 'title', 120), category = public._txt(p, 'category', 40),
    description = public._txt(p, 'description', 3000), materials = public._txt(p, 'materials', 500),
    before_images = public._media_paths(p -> 'before_images'), after_images = public._media_paths(p -> 'after_images'),
    published = coalesce((p ->> 'published')::boolean, false), sort = coalesce(nullif(p ->> 'sort', '')::int, 0), updated_at = now()
  where id = v_id;
  if not found then raise exception 'NOT_FOUND|Project not found.'; end if;
  perform public._log('project.save', v_id::text);
  return v_id;
end $$;

create function public.admin_save_product(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; v_status text := coalesce(nullif(p ->> 'status', ''), 'draft'); v_price int := public._cents(p, 'price_cents');
begin
  perform public._require_admin();
  if public._txt(p, 'title', 120) = '' then raise exception 'INVALID|Give the piece a title.'; end if;
  if v_status not in ('draft', 'available', 'reserved', 'sold') then raise exception 'INVALID|Unknown status.'; end if;
  if v_status = 'available' and v_price is null then raise exception 'INVALID|Add a price before marking a piece available (or keep it as a draft).'; end if;
  if v_id is null then insert into public.products (title) values (public._txt(p, 'title', 120)) returning id into v_id; end if;
  update public.products set title = public._txt(p, 'title', 120), category = public._txt(p, 'category', 40), sku = public._txt(p, 'sku', 40),
    description = public._txt(p, 'description', 3000), images = public._media_paths(p -> 'images'), dimensions = public._txt(p, 'dimensions', 200),
    condition = public._txt(p, 'condition', 300), materials = public._txt(p, 'materials', 300), finish = public._txt(p, 'finish', 200),
    price_cents = v_price, quantity = coalesce(nullif(p ->> 'quantity', '')::int, 1), status = v_status,
    sort = coalesce(nullif(p ->> 'sort', '')::int, 0), updated_at = now()
  where id = v_id;
  if not found then raise exception 'NOT_FOUND|Piece not found.'; end if;
  perform public._log('product.save:' || v_status, v_id::text);
  return v_id;
end $$;

create function public.admin_save_fabric(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform public._require_admin();
  if public._txt(p, 'name', 120) = '' then raise exception 'INVALID|Give the fabric a name.'; end if;
  if coalesce(nullif(p ->> 'stock_state', ''), 'in_stock') not in ('in_stock', 'low_stock', 'special_order', 'unavailable') then raise exception 'INVALID|Unknown stock state.'; end if;
  if coalesce(nullif(p ->> 'price_unit', ''), 'per yard') not in ('per yard', 'per sample', 'per roll', 'per piece') then raise exception 'INVALID|Unknown price unit.'; end if;
  if v_id is null then insert into public.fabrics (name) values (public._txt(p, 'name', 120)) returning id into v_id; end if;
  update public.fabrics set name = public._txt(p, 'name', 120), code = public._txt(p, 'code', 40), images = public._media_paths(p -> 'images'),
    brand = public._txt(p, 'brand', 80), color_family = public._txt(p, 'color_family', 40), pattern = public._txt(p, 'pattern', 40),
    composition = public._txt(p, 'composition', 200), use_type = public._txt(p, 'use_type', 80), care = public._txt(p, 'care', 1000),
    price_cents = public._cents(p, 'price_cents'), price_unit = coalesce(nullif(p ->> 'price_unit', ''), 'per yard'),
    min_qty = public._txt(p, 'min_qty', 40), available_qty = public._txt(p, 'available_qty', 40),
    stock_state = coalesce(nullif(p ->> 'stock_state', ''), 'in_stock'), swatch_available = coalesce((p ->> 'swatch_available')::boolean, false),
    published = coalesce((p ->> 'published')::boolean, false), sort = coalesce(nullif(p ->> 'sort', '')::int, 0), updated_at = now()
  where id = v_id;
  if not found then raise exception 'NOT_FOUND|Fabric not found.'; end if;
  perform public._log('fabric.save', v_id::text);
  return v_id;
end $$;

-- Accepts a full YouTube link or an 11-character video ID.
create function public.admin_save_video(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid; v_raw text := public._txt(p, 'youtube', 300); v_yt text;
begin
  perform public._require_admin();
  v_yt := coalesce(substring(v_raw from '(?:youtu\.be/|[?&]v=|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})'), case when v_raw ~ '^[A-Za-z0-9_-]{11}$' then v_raw end);
  if v_yt is null then raise exception 'INVALID|Paste a YouTube video link (for example https://www.youtube.com/watch?v=...).'; end if;
  if public._txt(p, 'title', 160) = '' then raise exception 'INVALID|Give the video a title.'; end if;
  if v_id is null then
    insert into public.videos (youtube_id, title) values (v_yt, public._txt(p, 'title', 160)) returning id into v_id;
  end if;
  if coalesce((p ->> 'featured')::boolean, false) then update public.videos set featured = false where id <> v_id; end if;
  update public.videos set youtube_id = v_yt, title = public._txt(p, 'title', 160), description = public._txt(p, 'description', 1000),
    featured = coalesce((p ->> 'featured')::boolean, false), published = coalesce((p ->> 'published')::boolean, true),
    sort = coalesce(nullif(p ->> 'sort', '')::int, 0) where id = v_id;
  if not found then raise exception 'NOT_FOUND|Video not found.'; end if;
  perform public._log('video.save', v_id::text);
  return v_id;
end $$;

create function public.admin_save_faq(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform public._require_admin();
  if public._txt(p, 'question', 300) = '' or public._txt(p, 'answer', 3000) = '' then raise exception 'INVALID|Add both a question and an answer.'; end if;
  if v_id is null then insert into public.faqs (question, answer) values (public._txt(p, 'question', 300), public._txt(p, 'answer', 3000)) returning id into v_id; end if;
  update public.faqs set question = public._txt(p, 'question', 300), answer = public._txt(p, 'answer', 3000),
    published = coalesce((p ->> 'published')::boolean, true), sort = coalesce(nullif(p ->> 'sort', '')::int, 0) where id = v_id;
  if not found then raise exception 'NOT_FOUND|FAQ not found.'; end if;
  perform public._log('faq.save', v_id::text);
  return v_id;
end $$;

create function public.admin_delete(p_kind text, p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if p_kind = 'project' then delete from public.projects where id = p_id;
  elsif p_kind = 'product' then delete from public.products where id = p_id;
  elsif p_kind = 'fabric' then delete from public.fabrics where id = p_id;
  elsif p_kind = 'video' then delete from public.videos where id = p_id;
  elsif p_kind = 'faq' then delete from public.faqs where id = p_id;
  else raise exception 'INVALID|Unknown item type.'; end if;
  if not found then raise exception 'NOT_FOUND|Item not found.'; end if;
  perform public._log(p_kind || '.delete', p_id::text);
end $$;

create function public.admin_save_settings(p jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_admin();
  if public._txt(p, 'youtube_channel_url', 300) <> '' and public._txt(p, 'youtube_channel_url', 300) !~ '^https://(www\.)?youtube\.com/' then
    raise exception 'INVALID|The channel link must start with https://www.youtube.com/'; end if;
  if public._txt(p, 'email', 160) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID|Enter a valid email address.'; end if;
  update public.settings set business_name = coalesce(nullif(public._txt(p, 'business_name', 80), ''), business_name),
    owner_name = public._txt(p, 'owner_name', 80), phone = public._txt(p, 'phone', 30), email = public._txt(p, 'email', 160),
    address_line = public._txt(p, 'address_line', 120), city_state_zip = public._txt(p, 'city_state_zip', 120),
    address_confirmed = coalesce((p ->> 'address_confirmed')::boolean, false), hours = public._txt(p, 'hours', 500),
    service_area = public._txt(p, 'service_area', 300), youtube_channel_url = public._txt(p, 'youtube_channel_url', 300),
    pickup_delivery_note = public._txt(p, 'pickup_delivery_note', 1000), payment_note = public._txt(p, 'payment_note', 1000),
    policy_privacy = public._txt(p, 'policy_privacy', 20000), policy_terms = public._txt(p, 'policy_terms', 20000),
    policy_returns = public._txt(p, 'policy_returns', 20000), policy_shipping = public._txt(p, 'policy_shipping', 20000), updated_at = now();
  perform public._log('settings.save', '');
end $$;

-- ------------------------------------------------------------------ who can call what
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_site(), public.list_projects(), public.list_products(), public.list_fabrics(),
  public.list_videos(), public.list_faqs(), public.submit_inquiry(jsonb, uuid), public.is_admin() to anon, authenticated;
grant execute on function public.admin_me(), public.admin_overview(), public.admin_get_inquiry(uuid), public.admin_set_inquiry_status(uuid, text),
  public.admin_add_note(uuid, text), public.admin_export_inquiries(), public.admin_save_project(jsonb), public.admin_save_product(jsonb),
  public.admin_save_fabric(jsonb), public.admin_save_video(jsonb), public.admin_save_faq(jsonb), public.admin_delete(text, uuid),
  public.admin_save_settings(jsonb) to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
