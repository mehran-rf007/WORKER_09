# Image Worker — لایه‌ی واسط API (ضدتحریم)

این سرویس مستقل، لایه‌ی واسط بین سایت اصلی (Next.js) و مدل‌های تصویرسازی (Nano Banana / Gemini) است.
باید روی سروری **خارج از ایران** اجرا شود تا مشکل تحریم API حل شود.

معماری دارای **انتزاع ارائه‌دهنده (Provider Abstraction)** است: ابتدا Gemini مستقیم، و در صورت خطا به‌صورت خودکار سرویس واسط (Wrapper) جایگزین می‌شود.

---

## ساختار پروژه

```text
image-worker/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
├── src/
│   ├── index.ts                 # سرور Express (health + generate)
│   ├── config.ts                # خواندن متغیرهای محیطی
│   ├── auth.ts                  # بررسی امضای HMAC بین سایت و Worker
│   ├── types.ts                 # تعریف نوع درخواست/پاسخ
│   ├── prompt/buildPrompt.ts    # موتور پرامپت + قفل محصول
│   └── providers/
│       ├── Provider.ts          # اینترفیس ارائه‌دهنده
│       ├── GeminiProvider.ts    # گوگل مستقیم (@google/genai)
│       ├── WrapperProvider.ts   # سرویس واسط (OpenAI-style)
│       └── ProviderManager.ts   # fallback + تلاش مجدد با backoff
└── integration/
    └── nextjs-callWorker.ts     # نمونه فراخوانی از سمت سایت اصلی
```

---

## نصب و اجرا

```bash
# ۱) نصب وابستگی‌ها
npm install

# ۲) ساخت فایل تنظیمات و پر کردن مقادیر
cp .env.example .env
#   - WORKER_SHARED_SECRET را با  openssl rand -hex 32  بسازید
#   - GEMINI_API_KEY و/یا WRAPPER_API_KEY را وارد کنید

# ۳) اجرای حالت توسعه
npm run dev

# یا اجرای پروداکشن
npm run build && npm start
```

بررسی سلامت سرویس:

```bash
curl http://localhost:8080/health
# => {"ok":true}
```

---

## نکات دیپلوی

- این سرویس را روی سروری **خارج از ایران** اجرا کنید (مثلاً VPS اروپا یا یک سرویس ابری).
- مقدار `WORKER_SHARED_SECRET` باید **عیناً** روی سایت اصلی و Worker یکسان باشد.
- روی سایت اصلی، متغیر `WORKER_URL` را به آدرس عمومی این سرویس تنظیم کنید.
- کلید گوگل/واسط فقط روی این سرور نگهداری می‌شود؛ سایت اصلی و کاربر هرگز آن را نمی‌بینند.

---

## امنیت

هر درخواست به `/generate` باید با هدرهای زیر امضا شود (نمونه در `integration/nextjs-callWorker.ts`):

- `x-timestamp`: زمان میلی‌ثانیه‌ای
- `x-signature`: HMAC-SHA256 از `${timestamp}.${rawBody}` با کلید مشترک

درخواست‌های قدیمی‌تر از ۵ دقیقه رد می‌شوند (جلوگیری از replay attack).
