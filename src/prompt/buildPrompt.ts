import type { GenerateRequest } from "../types.js";

const STYLE_MAP: Record<GenerateRequest["style"], string> = {
  studio:
    "clean professional studio product photography, seamless background, soft diffused lighting, sharp focus",
  editorial:
    "high-end editorial fashion photography, dramatic lighting, magazine-quality composition, cinematic mood",
  lifestyle:
    "natural lifestyle photography, realistic environment, warm ambient light, candid feel",
};

export function buildPrompt(req: GenerateRequest): string {
  const hasModel = Boolean(req.modelImageBase64);
  const subject = hasModel
    ? "Place the provided product naturally on the provided model"
    : "Place the provided product on a suitable professional model";

  // تکنیک «قفل محصول»: تأکید روی حفظ دقیق جزئیات محصول
  const lockProduct =
    "CRITICAL: keep the product's exact shape, color, texture, logo, and all details unchanged. Do not redesign or alter the product.";

  const notes = req.userNotes ? `Additional direction: ${req.userNotes}.` : "";

  return [
    subject + ".",
    STYLE_MAP[req.style] + ".",
    lockProduct,
    "Photorealistic, high resolution, commercially usable.",
    notes,
  ]
    .filter(Boolean)
    .join(" ");
}
