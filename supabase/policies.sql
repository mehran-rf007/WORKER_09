-- =============================================================
-- Row Level Security (RLS) — هر کاربر فقط داده‌ی خودش را می‌بیند
-- =============================================================

alter table public.profiles            enable row level security;
alter table public.credit_wallets      enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.images              enable row level security;
alter table public.generation_logs     enable row level security;
alter table public.preset_models       enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- credit_wallets (فقط خواندن؛ تغییر فقط از طریق توابع security definer)
create policy "wallet_select_own" on public.credit_wallets
  for select using (auth.uid() = user_id);

-- credit_transactions (فقط خواندن تاریخچه‌ی خود)
create policy "tx_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- images
create policy "images_select_own" on public.images
  for select using (auth.uid() = user_id);
create policy "images_insert_own" on public.images
  for insert with check (auth.uid() = user_id);
create policy "images_update_own" on public.images
  for update using (auth.uid() = user_id);

-- generation_logs (فقط خواندن خود)
create policy "logs_select_own" on public.generation_logs
  for select using (auth.uid() = user_id);

-- preset_models (گالری عمومی: همه می‌خوانند، فقط active=true)
create policy "presets_select_active" on public.preset_models
  for select using (active = true);
