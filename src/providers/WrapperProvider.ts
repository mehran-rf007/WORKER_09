import { request } from "undici";
import type { ImageProvider } from "./Provider.js";
import type { GenerateRequest, GenerateResult, GeneratedImage } from "../types.js";
import { config } from "../config.js";

export class WrapperProvider implements ImageProvider {
  readonly name = "wrapper";

  isConfigured(): boolean {
    return Boolean(config.wrapper.baseUrl && config.wrapper.apiKey);
  }

  async generate(req: GenerateRequest, prompt: string): Promise<GenerateResult> {
    const model =
      req.quality === "pro" ? config.wrapper.modelPro : config.wrapper.modelStandard;

    const inputImages = [
      `data:${req.productMimeType};base64,${req.productImageBase64}`,
    ];
    if (req.modelImageBase64 && req.modelMimeType) {
      inputImages.push(`data:${req.modelMimeType};base64,${req.modelImageBase64}`);
    }

    const res = await request(`${config.wrapper.baseUrl}/images/generate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.wrapper.apiKey}`,
      },
      body: JSON.stringify({ model, prompt, images: inputImages }),
    });

    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new Error(`خطای سرویس واسط (${res.statusCode}): ${text}`);
    }

    const data = (await res.body.json()) as any;
    // فرض: خروجی به شکل { data: [{ b64: "...", mime: "image/png" }] }
    const images: GeneratedImage[] = (data.data ?? []).map((d: any) => ({
      imageBase64: d.b64,
      mimeType: d.mime ?? "image/png",
    }));

    if (images.length === 0) throw new Error("سرویس واسط هیچ تصویری برنگرداند");
    return { images, provider: this.name, model };
  }
}
