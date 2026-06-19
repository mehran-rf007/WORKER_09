export type Quality = "standard" | "pro";

export interface GenerateRequest {
  // عکس محصول (base64 بدون پیشوند data:)
  productImageBase64: string;
  productMimeType: string; // مثل "image/png"

  // عکس مدل (اختیاری؛ اگر نباشد از مدل آماده استفاده می‌شود)
  modelImageBase64?: string;
  modelMimeType?: string;

  // عکس پس‌زمینه‌ی دلخواه (اختیاری)
  backgroundImageBase64?: string;
  backgroundMimeType?: string;

  style: "studio" | "editorial" | "lifestyle";
  quality: Quality;
  // یادداشت دلخواه کاربر (مثلاً «نور گرم، پس‌زمینه بژ»)
  userNotes?: string;
  // پرامپت ساخته‌شده توسط موتور پرامپت پیشرفته‌ی سمت وب.
  // اگر ارسال شود، بر buildPrompt داخلی Worker اولویت دارد.
  promptOverride?: string;
}

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
}

export interface GenerateResult {
  images: GeneratedImage[];
  provider: string; // کدام ارائه‌دهنده پاسخ داد
  model: string;
}
