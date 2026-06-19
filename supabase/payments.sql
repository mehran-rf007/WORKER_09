-- =============================================================
-- Journal Photo Studio — جدول پرداخت‌ها (درگاه زرین‌پال)
-- در Supabase SQL Editor بعد از schema.sql / functions.sql اجرا کنید.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- جدول پرداخت‌ها (هر تلاش خرید کردیت یک ردیف)
-- -------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null,                       -- تعداد کردیتی که خریداری می‌شود
  amount_toman integer not null,                  -- مبلغ پرداختی به تومان
  authority text,                                 -- کد Authority زرین‌پال
  ref_id text,                                    -- شماره پیگیری تراکنش موفق
  status text not null default 'pending'           -- pending | paid | failed
    check (status in ('pending','paid','failed')),
  package_label text,                             -- عنوان بسته (برای گزارش)
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists idx_payments_user on public.payments(user_id, created_at desc);
create index if not exists idx_payments_authority on public.payments(authority);

-- RLS: کاربر فقط پرداخت‌های خودش را می‌بیند؛ نوشتن فقط با service role (سمت سرور).
alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- درج/به‌روزرسانی فقط از سمت سرور با service role انجام می‌شود (RLS را دور می‌زند).
