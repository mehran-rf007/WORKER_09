// اسکریپت تست سریع اتصال AvalAI (تولید تصویر با Gemini)
//
// نحوه‌ی اجرا:
//   cd worker
//   npm install
//   AVALAI_API_KEY=aa-xxxx node scripts/test-avalai.mjs
//
// در صورت موفقیت، یک فایل test-output.png کنار همین اسکریپت ساخته می‌شود.

import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "node:fs";

const apiKey = process.env.AVALAI_API_KEY;
if (!apiKey) {
  console.error("❌ متغیر AVALAI_API_KEY تعریف نشده. مثال: AVALAI_API_KEY=aa-xxxx node scripts/test-avalai.mjs");
  process.exit(1);
}

const baseUrl = process.env.AVALAI_BASE_URL ?? "https://api.avalai.ir";
const apiVersion = process.env.AVALAI_API_VERSION ?? "v1beta";
const model = process.env.AVALAI_MODEL_STANDARD ?? "gemini-3.1-flash-image-preview";
const imageSize = process.env.AVALAI_IMAGE_SIZE_STANDARD ?? "1K";

console.log(`⏳ تست AvalAI...\n   baseUrl=${baseUrl}\n   apiVersion=${apiVersion}\n   model=${model}\n   imageSize=${imageSize}\n`);

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: { baseUrl, apiVersion },
});

try {
  const res = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "A clean studio product photo of a small amber glass perfume bottle on a soft beige background, soft diffused lighting, high detail.",
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: imageSize ? { imageSize } : undefined,
    },
  });

  const parts = res.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    console.error("❌ پاسخ آمد ولی هیچ تصویری برنگرداند. پاسخ خام:");
    console.error(JSON.stringify(res, null, 2).slice(0, 2000));
    process.exit(2);
  }

  const buf = Buffer.from(img.inlineData.data, "base64");
  const out = new URL("./test-output.png", import.meta.url);
  writeFileSync(out, buf);
  console.log(`✅ موفق! تصویر ذخیره شد: ${out.pathname} (${buf.length} بایت)`);
} catch (err) {
  console.error("❌ خطا در اتصال به AvalAI:");
  console.error(err?.message ?? err);
  console.error("\n⚠️  اگر خطای 404/مسیر بود، احتمالاً baseUrl/apiVersion باید اصلاح شود.");
  console.error("   مقادیر مختلف را امتحان کن، مثلاً: AVALAI_API_VERSION=v1 یا baseUrl=https://api.avalai.ir/v1");
  process.exit(3);
}
