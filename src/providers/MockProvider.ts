import type { ImageProvider } from "./Provider.js";
import type { GenerateRequest, GenerateResult } from "../types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ارائه‌دهنده‌ی دمو/تستی: بدون هیچ هزینه‌ای کار می‌کند.
// در این حالت، همان عکس محصول به‌عنوان خروجی برگردانده می‌شود
// تا کلِ مسیر (آپلود → worker → ذخیره → نمایش) بدون خرج قابل تست باشد.
// برای تولید واقعی، کافی است PROVIDER_ORDER را به wrapper تغییر دهی.
export class MockProvider implements ImageProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true; // همیشه در دسترس؛ نیازی به کلید یا شارژ ندارد
  }

  async generate(req: GenerateRequest, _prompt: string): Promise<GenerateResult> {
    // شبیه‌سازی تأخیر پردازش واقعی
    await sleep(1200);
    const mime = req.productMimeType || "image/png";
    return {
      images: [{ imageBase64: req.productImageBase64, mimeType: mime }],
      provider: this.name,
      model: "mock-demo",
    };
  }
}
