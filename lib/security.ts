import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function assertSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const configured = process.env.APP_URL;
    const expected = configured
      ? new URL(configured).origin
      : process.env.NODE_ENV === "production"
        ? null
        : new URL(req.url).origin;
    return !!expected && new URL(origin).origin === expected;
  } catch {
    return false;
  }
}

export function appOrigin(req: Request): string {
  if (process.env.APP_URL) {
    const url = new URL(process.env.APP_URL.trim());
    const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !loopback) {
      throw new Error("APP_URL debe usar HTTPS en producción");
    }
    return url.origin;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Falta APP_URL");
  return new URL(req.url).origin;
}

export function requestIp(req: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "direct";
  const real = req.headers.get("x-real-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (real || forwarded || "unknown").slice(0, 80);
}

export function ipFingerprint(req: Request): string {
  const secret = process.env.AUTH_SECRET || "development-only";
  return createHmac("sha256", secret).update(requestIp(req)).digest("hex").slice(0, 32);
}

export function rateLimit(key: string, limit: number, windowSeconds: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [name, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(name);
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return { ok: current.count <= limit, retryAfter };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

export function tooManyRequests(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Demasiados intentos. Espera unos minutos antes de reintentar." },
    { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
  );
}

export function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export class BodyLimitError extends Error {
  constructor() { super("Cuerpo demasiado grande"); }
}

export async function readLimitedBody(req: Request, maxBytes: number): Promise<Buffer> {
  const announced = Number(req.headers.get("content-length") || 0);
  if (announced > maxBytes) throw new BodyLimitError();
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BodyLimitError();
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function readJsonBody(req: Request, maxBytes = 8192): Promise<unknown> {
  const body = await readLimitedBody(req, maxBytes);
  return JSON.parse(body.toString("utf8")) as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
