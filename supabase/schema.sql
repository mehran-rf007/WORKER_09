-- =============================================================
-- Journal Photo Studio — Supabase Schema (Phase 1)
-- در Supabase SQL Editor اجرا کنید. ترتیب: schema.sql → functions.sql → policies.sql
-- =============================================================

-- اکستنشن UUID
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- جدول پروفایل کاربر (متصل به auth.users)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free','starter','pro','business')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- کیف پول کردیت (هر کاربر یک ردیف)
-- -------------------------------------------------------------
create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- تراکنش‌های کردیت (شارژ/کسر/هدیه)
-- -------------------------------------------------------------
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,                       -- مثبت = شارژ، منفی = کسر
  reason text not null,                          -- 'purchase' | 'generation' | 'bonus' | 'refund'
  ref_id uuid,                                   -- ارجاع اختیاری به تصویر/پرداخت
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_tx_user on public.credit_transactions(user_id, created_at desc);

-- -------------------------------------------------------------
-- تصاویر تولیدشده
-- -------------------------------------------------------------
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_path text,                             -- مسیر عکس محصول در Storage
  model_ref text,                                -- id مدل آماده یا مسیر مدل آپلودی
  output_path text,                              -- مسیر خروجی در Storage
  style text not null check (style in ('studio','editorial','lifestyle')),
  quality text not null check (quality in ('standard','pro')),
  prompt text,                                   -- پرامپت نهایی استفاده‌شده
  status text not null default 'pending' check (status in ('pending','done','failed')),
  provider text,                                 -- gemini | wrapper
  created_at timestamptz not null default now()
);
create index if not exists idx_images_user on public.images(user_id, created_at desc);

-- -------------------------------------------------------------
-- لاگ تولید (برای دیباگ و تحلیل هزینه)
-- -------------------------------------------------------------
create table if not exists public.generation_logs (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references public.images(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  model text,
  latency_ms integer,
  success boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- مدل‌های آماده‌ی گالری (داده‌ی عمومی)
-- -------------------------------------------------------------
create table if not exists public.preset_models (
  id text primary key,                           -- مثلاً 'female-01'
  title text not null,
  gender text check (gender in ('female','male','neutral')),
  hijab boolean not null default false,          -- مدل با حجاب (بازار ایران)
  thumbnail_path text not null,                  -- تصویر بندانگشتی در Storage
  image_path text not null,                      -- تصویر اصلی مدل
  active boolean not null default true,
  sort_order integer not null default 0
);

-- -------------------------------------------------------------
-- تریگر: با ساخت کاربر جدید، پروفایل + کیف پول (۱۰ کردیت هدیه) بساز
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name) values (new.id, new.email);
  insert into public.credit_wallets(user_id, balance) values (new.id, 10);
  insert into public.credit_transactions(user_id, amount, reason)
    values (new.id, 10, 'bonus');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
