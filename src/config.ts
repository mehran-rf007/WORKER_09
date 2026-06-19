import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`متغیر محیطی ${key} تعریف نشده است`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  sharedSecret: required("WORKER_SHARED_SECRET"),
  providerOrder: (process.env.PROVIDER_ORDER ?? "gemini")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    modelStandard: process.env.GEMINI_MODEL_STANDARD ?? "gemini-2.5-flash-image",
    modelPro: process.env.GEMINI_MODEL_PRO ?? "gemini-3-pro-image-preview",
  },

  // AvalAI (آوال‌آی) — واسط ایرانی سازگار با SDK بومی Google GenAI، با پرداخت ریالی.
  avalai: {
    apiKey: process.env.AVALAI_API_KEY ?? "",
    // baseUrl مخصوص مسیر بومی Gemini در AvalAI؛ در صورت تغییر مستندات، از env قابل اصلاح است.
    baseUrl: process.env.AVALAI_BASE_URL ?? "https://api.avalai.ir",
    apiVersion: process.env.AVALAI_API_VERSION ?? "v1beta",
    modelStandard:
      process.env.AVALAI_MODEL_STANDARD ?? "gemini-3.1-flash-image-preview",
    modelPro: process.env.AVALAI_MODEL_PRO ?? "gemini-3-pro-image-preview",
    // رزولوشن خروجی: 1K | 2K | 4K (خالی = پیش‌فرض مدل)
    imageSizeStandard: process.env.AVALAI_IMAGE_SIZE_STANDARD ?? "1K",
    imageSizePro: process.env.AVALAI_IMAGE_SIZE_PRO ?? "2K",
    // سقف زمان انتظار برای پاسخ AvalAI (میلی‌ثانیه)
    timeoutMs: Number(process.env.AVALAI_TIMEOUT_MS ?? 150000),
  },

  wrapper: {
    baseUrl: process.env.WRAPPER_BASE_URL ?? "",
    apiKey: process.env.WRAPPER_API_KEY ?? "",
    modelStandard: process.env.WRAPPER_MODEL_STANDARD ?? "nano-banana",
    modelPro: process.env.WRAPPER_MODEL_PRO ?? "nano-banana-pro",
  },
};
