import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

// امضای HMAC روی بدنه‌ی خام درخواست
export function verifySignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.header("x-signature");
  const timestamp = req.header("x-timestamp");

  if (!signature || !timestamp) {
    return res.status(401).json({ error: "امضا یا زمان درخواست موجود نیست" });
  }

  // جلوگیری از replay attack: درخواست قدیمی‌تر از ۵ دقیقه رد می‌شود
  const age = Math.abs(Date.now() - Number(timestamp));
  if (Number.isNaN(age) || age > 5 * 60 * 1000) {
    return res.status(401).json({ error: "درخواست منقضی شده است" });
  }

  const rawBody = (req as any).rawBody as string;
  const expected = crypto
    .createHmac("sha256", config.sharedSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!ok) return res.status(401).json({ error: "امضا نامعتبر است" });
  next();
}
