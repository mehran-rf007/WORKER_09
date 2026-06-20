import { GoogleGenAI } from "@google/genai";
import type { ImageProvider } from "./Provider.js";
import type { GenerateRequest, GenerateResult, GeneratedImage } from "../types.js";
import { config } from "../config.js";

// AvalAI (آوال‌آی) — واسط ایرانی سازگار با SDK بومی Google GenAI.
// از همان کلاینت @google/genai استفاده می‌کنیم ولی baseUrl را به AvalAI می‌زنیم.
// مزیت: دسترسی مستقیم از ایران + پرداخت ریالی (بدون نیاز به دور زدن تحریم).
export class AvalaiProvider implements ImageProvider {
  readonly name = "avalai";
  private client: GoogleGenAI | null = null;

  isConfigured(): boolean {
    return Boolean(config.avalai.apiKey);
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: config.avalai.apiKey,
        httpOptions: {
          baseUrl: config.avalai.baseUrl,
          apiVersion: config.avalai.apiVersion,
          timeout: config.avalai.timeoutMs,
        },
      });
    }
    return this.client;
  }

  async generate(req: GenerateRequest, prompt: string): Promise<GenerateResult> {
    const isPro = req.quality === "pro";
    const model = isPro ? config.avalai.modelPro : config.avalai.modelStandard;
    const imageSize = isPro
      ? config.avalai.imageSizePro
      : config.avalai.imageSizeStandard;

    // ورودی چندتصویری: محصول (+ مدل اختیاری) (+ پس‌زمینه اختیاری) + پرامپت متنی
    const parts: any[] = [
      { inlineData: { mimeType: req.productMimeType, data: req.productImageBase64 } },
    ];
    if (req.modelImageBase64 && req.modelMimeType) {
      parts.push({
        inlineData: { mimeType: req.modelMimeType, data: req.modelImageBase64 },
      });
    }
    if (req.backgroundImageBase64 && req.backgroundMimeType) {
      parts.push({
        inlineData: {
          mimeType: req.backgroundMimeType,
          data: req.backgroundImageBase64,
        },
      });
    }
    parts.push({ text: prompt });

    const ai = this.getClient();
    // مدل پرو (Nano Banana Pro) فرایند Thinking دارد و باید هر دو مدالیته TEXT+IMAGE فعال باشد؛
    // در غیر این صورت finishReason=STOP می‌دهد و هیچ تصویری برنمی‌گرداند.
    const makeConfig = (withSize: boolean) => ({
      responseModalities: ["TEXT", "IMAGE"],
      // کنترل رزولوشن (1K / 2K / 4K) — از طریق SDK بومی قابل اعتمادتر از مسیر سازگار با OpenAI است.
      imageConfig: withSize && imageSize ? { imageSize } : undefined,
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: makeConfig(true) as any,
      });
    } catch (err: any) {
      // برخی مسیرهای AvalAI روی پارامتر رزولوشن (2K/4K) خطا می‌دهند؛
      // یک بار دیگر بدون imageConfig تلاش می‌کنیم تا تولید از دست نرود.
      if (imageSize) {
        console.warn(
          `[AvalAI] تلاش با imageSize=${imageSize} ناموفق بود (${err?.message}); تلاش مجدد بدون رزولوشن.`,
        );
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: makeConfig(false) as any,
        });
      } else {
        throw err;
      }
    }

    const images: GeneratedImage[] = [];
    const textChunks: string[] = [];
    const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        images.push({
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
        });
      } else if (typeof part.text === "string" && part.text.trim()) {
        textChunks.push(part.text.trim());
      }
    }

    if (images.length === 0) {
      // جمع‌آوری جزئیات تشخیصی تا بفهمیم چرا تصویری نیامد.
      const finishReason = response.candidates?.[0]?.finishReason ?? "?";
      const blockReason = (response as any)?.promptFeedback?.blockReason ?? "";
      const modelText = textChunks.join(" | ").slice(0, 500);
      let rawSnippet = "";
      try {
        rawSnippet = JSON.stringify(response).slice(0, 800);
      } catch {
        rawSnippet = String(response).slice(0, 800);
      }
      const diag = [
        `model=${model}`,
        `finishReason=${finishReason}`,
        blockReason ? `blockReason=${blockReason}` : "",
        modelText ? `متن مدل=«${modelText}»` : "",
        `raw=${rawSnippet}`,
      ]
        .filter(Boolean)
        .join(" · ");
      console.error("[AvalAI] بدون تصویر:", diag);
      throw new Error(`AvalAI هیچ تصویری برنگرداند — ${diag}`);
    }
    return { images, provider: this.name, model };
  }
}
