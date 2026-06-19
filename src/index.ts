import express from "express";
import { config } from "./config.js";
import { verifySignature } from "./auth.js";
import { buildPrompt } from "./prompt/buildPrompt.js";
import { generateWithFallback } from "./providers/ProviderManager.js";
import type { GenerateRequest } from "./types.js";

const app = express();

// نگه‌داشتن بدنه‌ی خام برای بررسی امضا
app.use(
  express.json({
    limit: "25mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString("utf8");
    },
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/generate", verifySignature, async (req, res) => {
  try {
    const body = req.body as GenerateRequest;

    if (!body.productImageBase64 || !body.productMimeType) {
      return res.status(400).json({ error: "عکس محصول الزامی است" });
    }

    // اولویت با پرامپت موتور پیشرفته‌ی سمت وب؛ وگرنه buildPrompt داخلی
    const prompt = body.promptOverride?.trim() || buildPrompt(body);
    const result = await generateWithFallback(body, prompt);

    res.json({
      images: result.images,
      provider: result.provider,
      model: result.model,
    });
  } catch (err: any) {
    console.error("خطای تولید:", err.message);
    res.status(502).json({ error: "تولید تصویر ناموفق بود", detail: err.message });
  }
});

app.listen(config.port, () => {
  console.log(`🚀 Image Worker روی پورت ${config.port} اجرا شد`);
});
