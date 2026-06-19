# Journal Photo Studio — مونوریپو پروژه

سرویس تولید عکس ژورنالی محصول برای فروشنده‌های اینستاگرام. این مخزن شامل دو برنامه‌ی مستقل و اسکیمای دیتابیس است.

```text
journal-photo-studio/
├── README.md                  ← همین فایل
├── docs/
│   └── PROJECT_PLAN.md        ← نقشه‌ی کامل پروژه (معماری، درآمد، رودمپ)
├── worker/                    ← فاز ۰: لایه‌ی واسط API (سرور خارج از ایران)
│   ├── src/ (index, config, auth, types, prompt, providers)
│   └── ...
├── supabase/                  ← فاز ۱: اسکیما + منطق کردیت + RLS
│   ├── schema.sql
│   ├── functions.sql
│   ├── policies.sql
│   └── seed_preset_models.sql
└── web/                       ← فاز ۱: اپلیکیشن Next.js
    ├── app/ (صفحات + API routes)
    ├── components/ (UploadDropzone, ModelGallery, StyleSelector)
    └── lib/ (promptEngine, credits, backgroundRemoval, models, supabase, callWorker)
```

---

## جریان کلی (اجزا چگونه کار می‌کنند)

1. کاربر در `web` (Next.js) عکس محصول را آپلود می‌کند → `/api/upload` پس‌زمینه را حذف/استاندارد کرده و در Supabase Storage ذخیره می‌کند.
2. کاربر یک مدل از گالری (`/api/models`) و سبک/کیفیت انتخاب می‌کند.
3. `/api/generate`: ابتدا **موتور پرامپت پیشرفته** (`lib/promptEngine`) پرامپت با «قفل محصول» می‌سازد → کردیت به صورت اتمیک کسر می‌شود (RPC دیتابیس) → درخواست با امضای HMAC به `worker` فرستاده می‌شود.
4. `worker` روی سرور خارج از ایران با Provider Abstraction (Gemini → سرویس واسط) تصویر تولید می‌کند.
5. خروجی در Storage ذخیره و در جدول `images` ثبت می‌شود. در صورت خطا، کردیت **خودکار بازگردانده** می‌شود.

---

## راه‌اندازی

### ۱) دیتابیس (Supabase)
در SQL Editor به ترتیب اجرا کنید:
```text
supabase/schema.sql  →  supabase/functions.sql  →  supabase/policies.sql  →  supabase/seed_preset_models.sql
```
دو باکت Storage بسازید: `uploads` (خصوصی) و `models` (عمومی).

### ۲) Worker (سرور خارج از ایران)
```bash
cd worker
npm install
cp .env.example .env   # کلیدها و WORKER_SHARED_SECRET
npm run dev
```

### ۳) اپلیکیشن وب (Next.js)
```bash
cd web
npm install
cp .env.local.example .env.local   # کلیدهای Supabase + WORKER_URL + WORKER_SHARED_SECRET
npm run dev   # http://localhost:3000
```

> ⚠️ `WORKER_SHARED_SECRET` باید در `web` و `worker` **دقیقاً یکسان** باشد.
