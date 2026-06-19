import { GoogleGenAI } from "@google/genai";
import type { ImageProvider } from "./Provider.js";
import type { GenerateRequest, GenerateResult, GeneratedImage } from "../types.js";
import { config } from "../config.js";

export class GeminiProvider implements ImageProvider {
  readonly name = "gemini";
  private client: GoogleGenAI | null = null;

  isConfigured(): boolean {
    return Boolean(config.gemini.apiKey);
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    }
    return this.client;
  }

  async generate(req: GenerateRequest, prompt: string): Promise<GenerateResult> {
    const model =
      req.quality === "pro" ? config.gemini.modelPro : config.gemini.modelStandard;

    // ساخت ورودی چندتصویری: محصول (+ مدل اختیاری) + پرامپت متنی
    const parts: any[] = [
      { inlineData: { mimeType: req.productMimeType, data: req.productImageBase64 } },
    ];
    if (req.modelImageBase64 && req.modelMimeType) {
      parts.push({
        inlineData: { mimeType: req.modelMimeType, data: req.modelImageBase64 },
      });
    }
    parts.push({ text: prompt });

    const response = await this.getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts }],
    });

    const images: GeneratedImage[] = [];
    const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        images.push({
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
        });
      }
    }

    if (images.length === 0) throw new Error("Gemini هیچ تصویری برنگرداند");
    return { images, provider: this.name, model };
  }
}
