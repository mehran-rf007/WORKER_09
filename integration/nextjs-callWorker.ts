// lib/callWorker.ts  (سمت سرور Next.js)
// این فایل روی سایت اصلی قرار می‌گیرد (می‌تواند روی هاست ایران باشد).
// کاربر هیچ‌وقت کلید یا گوگل را نمی‌بیند.
import crypto from "node:crypto";

export async function callWorker(payload: object) {
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", process.env.WORKER_SHARED_SECRET!)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const res = await fetch(`${process.env.WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-timestamp": timestamp,
      "x-signature": signature,
    },
    body,
  });

  if (!res.ok) throw new Error("Worker خطا داد");
  return res.json();
}
