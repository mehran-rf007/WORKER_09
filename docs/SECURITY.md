# گزارش و چک‌لیست امنیتی — ژورینو (Jorino)

این سند خلاصه‌ی اقدامات امنیتی اعمال‌شده و توصیه‌های باقی‌مانده است.

## ✅ انجام شده

### احراز هویت و دسترسی
- تمام مسیرهای مدیریتی (`/api/admin/*`) با `getAdminUser()` محافظت می‌شوند — ابتدا احراز هویت Supabase و سپس بررسی `profiles.is_admin`.
- مسیرهای کاربری (`/api/generate`, `/api/upload`) نیازمند لاگین هستند (بررسی `getUser()`).
- کلید `SUPABASE_SERVICE_ROLE_KEY` فقط در سرور (`createServiceSupabase`) استفاده می‌شود و هرگز به مرورگر نمی‌رود. فقط کلید `ANON`/`publishable` در سمت کلاینت.

### Row Level Security (RLS)
- جدول `blog_posts`: خواندن عمومی فقط برای `published = true`؛ نوشتن فقط از طریق service role (پنل مدیر).
- باکت `uploads` خصوصی است و خروجی‌ها با signed URL سرو می‌شوند.

### اعتبارسنجی آپلود فایل (جدید)
- `/api/admin/upload`: فقط تصویر (PNG/JPG/WEBP/GIF/SVG)، حداکثر ۸ مگابایت، بررسی همزمان MIME و پسوند، پاک‌سازی نام مسیر.
- `/api/upload`: فقط تصویر (PNG/JPG/WEBP)، حداکثر ۱۲ مگابایت.

### هدرهای امنیتی (در `next.config.mjs`)
- `X-Frame-Options: SAMEORIGIN` (ضد clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (غیرفعال کردن دوربین/میکروفون/مکان)
- `Strict-Transport-Security` (HSTS اجبار HTTPS)
- `X-XSS-Protection`

### پرداخت
- تأیید پرداخت فقط در سرور با فراخوانی verify زرین‌پال انجام می‌شود (مبلغ از سمت کلاینت قابل دستکاری نیست)؛ شارژ کردیت با RPC امن `add_credits`.

## ⚠️ توصیه‌های بعدی (در سرور/داشبورد)
1. **متغیرهای محیطی:** هرگز `SUPABASE_SERVICE_ROLE_KEY` و `WORKER_SHARED_SECRET` را در گیت‌هاب قرار ندهید (در `.gitignore` باشند) — فقط در Render Environment.
2. **محدود‌سازی نرخ (Rate limiting):** روی لاگین و تولید عکس برای جلوگیری از سوءاستفاده.
3. **تأیید ایمیل و بازیابی رمز:** در تنظیمات Supabase Auth فعال شود.
4. **دامنه و SSL:** دامنه‌ی اختصاصی با HTTPS (Render خودکار SSL می‌دهد).
5. **پشتیبان‌گیری:** بک‌آپ خودکار دیتابیس Supabase.
6. **صفحات حقوقی:** قوانین، حریم خصوصی و استرداد وجه (برای تأیید درگاه زرین‌پال اغلب لازم است).
