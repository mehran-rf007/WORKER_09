-- =============================================================
-- منطق مدیریت کردیت (اتمیک و امن)
-- این توابع را از سمت سرور (service role) فراخوانی کنید.
-- =============================================================

-- کسر کردیت به‌صورت اتمیک: اگر موجودی کافی نباشد false برمی‌گرداند
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default 'generation',
  p_ref_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'مقدار کسر باید مثبت باشد';
  end if;

  -- قفل ردیف کیف پول برای جلوگیری از race condition
  select balance into v_balance
  from public.credit_wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    return false;
  end if;

  if v_balance < p_amount then
    return false; -- کردیت کافی نیست
  end if;

  update public.credit_wallets
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id;

  insert into public.credit_transactions(user_id, amount, reason, ref_id)
    values (p_user_id, -p_amount, p_reason, p_ref_id);

  return true;
end;
$$;

-- شارژ کردیت (خرید یا هدیه)
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default 'purchase',
  p_ref_id uuid default null
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'مقدار شارژ باید مثبت باشد';
  end if;

  insert into public.credit_wallets(user_id, balance)
    values (p_user_id, p_amount)
  on conflict (user_id)
    do update set balance = public.credit_wallets.balance + p_amount, updated_at = now()
  returning balance into v_new_balance;

  insert into public.credit_transactions(user_id, amount, reason, ref_id)
    values (p_user_id, p_amount, p_reason, p_ref_id);

  return v_new_balance;
end;
$$;

-- هزینه‌ی کردیتی هر کیفیت (منبع حقیقت سمت دیتابیس)
create or replace function public.credit_cost(p_quality text)
returns integer
language sql
immutable
as $$
  select case p_quality
    when 'pro' then 3        -- خروجی HD گران‌تر
    else 1                   -- draft استاندارد
  end;
$$;
