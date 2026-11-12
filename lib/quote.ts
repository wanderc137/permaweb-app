import { createHmac, timingSafeEqual } from "node:crypto";

const QUOTE_TTL_SECONDS = 5 * 60;
type QuotePayload = { userId: string; size: number; cost: number; expires: number };

function signature(payload: string): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET no configurado");
  return createHmac("sha256", secret).update(payload).digest();
}

export function createQuoteToken(userId: string, size: number, cost: number): { token: string; expiresAt: string } {
  const expires = Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ userId, size, cost, expires })).toString("base64url");
  return {
    token: `${payload}.${signature(payload).toString("base64url")}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  };
}

export function verifyQuoteToken(token: string, userId: string, size: number, currentCost: number): "ok" | "expired" | "changed" | "invalid" {
  if (!token || token.length > 2048) return "invalid";
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return "invalid";
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = signature(payload);
    actual = Buffer.from(supplied, "base64url");
  } catch {
    return "invalid";
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "invalid";
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as QuotePayload;
    if (data.userId !== userId || data.size !== size) return "invalid";
    if (!Number.isSafeInteger(data.expires) || data.expires < Math.floor(Date.now() / 1000)) return "expired";
    if (data.cost !== currentCost) return "changed";
    return "ok";
  } catch {
    return "invalid";
  }
}
