-- =============================================================
-- Journal Photo Studio — Admin Panel & Site Customization
-- بعد از schema.sql / functions.sql / policies.sql اجرا کنید.
-- =============================================================

-- ستون مدیر روی پروفایل
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- -------------------------------------------------------------
-- جدول تنظیمات/محتوای سایت (key-value JSONB)
-- -------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- همه می‌توانند محتوای سایت را بخوانند (برای رندر صفحه‌ی اصلی)
drop policy if exists "site_settings_read" on public.site_settings;
create policy "site_settings_read" on public.site_settings
  for select using (true);
-- نوشتن فقط از طریق service role انجام می‌شود (RLS را دور می‌زند)

-- -------------------------------------------------------------
-- باکت عمومی برای تصاویر سایت (هیرو، گالری، ...)
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('site-assets', 'site-assets', true)
  on conflict (id) do update set public = true;

-- -------------------------------------------------------------
-- تابع آمار مدیریت (درآمد و آنالیز)
-- -------------------------------------------------------------
create or replace function public.admin_stats()
returns json
language sql
security definer set search_path = public
as $$
  select json_build_object(
    'users', (select count(*) from public.profiles),
    'images', (select count(*) from public.images),
    'generations_total', (select count(*) from public.generation_logs),
    'generations_success', (select count(*) from public.generation_logs where success),
    'credits_purchased', coalesce((select sum(amount) from public.credit_transactions where reason = 'purchase'), 0),
    'credits_consumed', coalesce((select -sum(amount) from public.credit_transactions where amount < 0), 0),
    'credits_outstanding', coalesce((select sum(balance) from public.credit_wallets), 0)
  );
$$;

-- -------------------------------------------------------------
-- بوت‌استرپ: خودت را مدیر کن (ایمیل را در صورت لزوم عوض کن)
-- -------------------------------------------------------------
update public.profiles set is_admin = true
  where id in (select id from auth.users where email = '12121212mehran.com@gmail.com');
