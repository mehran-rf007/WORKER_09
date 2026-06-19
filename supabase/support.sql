-- =============================================================
-- Journal Photo Studio — تیکت پشتیبانی + اعلان‌ها
-- پس از schema.sql → functions.sql → policies.sql اجرا کنید.
-- (نیازمند ستون profiles.is_admin از admin.sql)
-- =============================================================

-- -------------------------------------------------------------
-- تیکت‌های پشتیبانی
-- -------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'general',           -- general | payment | technical | other
  status text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_user on public.tickets(user_id, updated_at desc);
create index if not exists idx_tickets_status on public.tickets(status, updated_at desc);

-- پیام‌های هر تیکت (گفتگوی کاربر و پشتیبانی)
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  sender text not null check (sender in ('user','admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_msgs on public.ticket_messages(ticket_id, created_at);

-- -------------------------------------------------------------
-- اعلان‌ها / اعلامیه‌های مدیریت
-- -------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  kind text not null default 'info' check (kind in ('info','success','warning','promo')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_active on public.notifications(active, created_at desc);

-- وضعیت خوانده‌شدن اعلان توسط هر کاربر
create table if not exists public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

-- -------------------------------------------------------------
-- تریگر به‌روزرسانی updated_at تیکت با هر پیام جدید
-- -------------------------------------------------------------
create or replace function public.touch_ticket()
returns trigger
language plpgsql
as $$
begin
  update public.tickets
    set updated_at = now(),
        status = case when new.sender = 'admin' then 'answered' else 'open' end
    where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists on_ticket_message on public.ticket_messages;
create trigger on_ticket_message
  after insert on public.ticket_messages
  for each row execute function public.touch_ticket();

-- -------------------------------------------------------------
-- RLS
-- -------------------------------------------------------------
alter table public.tickets            enable row level security;
alter table public.ticket_messages    enable row level security;
alter table public.notifications      enable row level security;
alter table public.notification_reads enable row level security;

-- تیکت‌ها: کاربر فقط مال خودش را می‌بیند و می‌سازد
create policy "tickets_select_own" on public.tickets
  for select using (auth.uid() = user_id);
create policy "tickets_insert_own" on public.tickets
  for insert with check (auth.uid() = user_id);

-- پیام‌ها: کاربر پیام‌های تیکت‌های خودش را می‌بیند و فقط پیام user اضافه می‌کند
create policy "ticket_msgs_select_own" on public.ticket_messages
  for select using (
    exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );
create policy "ticket_msgs_insert_own" on public.ticket_messages
  for insert with check (
    sender = 'user'
    and exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

-- اعلان‌ها: همه‌ی کاربران اعلان‌های فعال را می‌خوانند
create policy "notifications_select_active" on public.notifications
  for select using (active = true);

-- وضعیت خواندن: هر کاربر مال خودش
create policy "notif_reads_select_own" on public.notification_reads
  for select using (auth.uid() = user_id);
create policy "notif_reads_upsert_own" on public.notification_reads
  for insert with check (auth.uid() = user_id);

-- نکته: تمام عملیات مدیریت (پاسخ به تیکت، ساخت اعلان، تغییر وضعیت)
-- از سمت سرور با service role انجام می‌شود که RLS را دور می‌زند.
