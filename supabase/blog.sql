-- =============================================================
-- جدول بلاگ (برای سئو و محتوا)
-- در Supabase SQL Editor اجرا کنید.
-- =============================================================

create table if not exists public.blog_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  excerpt     text default '',
  content     text default '',
  cover_path  text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists blog_posts_published_idx
  on public.blog_posts (published, created_at desc);
create index if not exists blog_posts_slug_idx
  on public.blog_posts (slug);

-- فعال‌سازی RLS
alter table public.blog_posts enable row level security;

-- هرکس فقط می‌تواند پست‌های منتشرشده را ببیند (خواندن عمومی)
drop policy if exists "blog public read published" on public.blog_posts;
create policy "blog public read published"
  on public.blog_posts
  for select
  using (published = true);

-- توجه: درج/ویرایش/حذف فقط از طریق service role (سرور) انجام می‌شود
-- که RLS را دور می‌زند؛ بنابراین هیچ policy برای کاربر عادی تعریف نمی‌کنیم.

-- به‌روزرسانی خودکار updated_at
create or replace function public.touch_blog_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch
  before update on public.blog_posts
  for each row execute function public.touch_blog_updated_at();
