import type { GenerateRequest, GenerateResult } from "../types.js";

export interface ImageProvider {
  readonly name: string;
  // آیا این ارائه‌دهنده الان قابل استفاده است؟ (کلید دارد؟)
  isConfigured(): boolean;
  generate(req: GenerateRequest, prompt: string): Promise<GenerateResult>;
}
