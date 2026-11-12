import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { maxUploadBytes, priceForBytes } from "@/lib/pricing";
import { createQuoteToken } from "@/lib/quote";
import { assertSameOrigin, BodyLimitError, isRecord, noStore, rateLimit, readJsonBody, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return noStore(NextResponse.json({ error: "Origen no autorizado" }, { status: 403 }));
  const user = await currentUser();
  if (!user) return noStore(NextResponse.json({ error: "Tu sesión ha caducado" }, { status: 401 }));
  const limit = rateLimit(`quote:${user.id}`, 90, 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: Record<string, unknown>;
  try {
    const parsed = await readJsonBody(req, 2048);
    if (!isRecord(parsed)) throw new Error("shape");
    body = parsed;
  } catch (error) {
    return noStore(NextResponse.json(
      { error: error instanceof BodyLimitError ? "Petición demasiado grande" : "Petición inválida" },
      { status: error instanceof BodyLimitError ? 413 : 400 },
    ));
  }

  const size = Number(body.size);
  const max = maxUploadBytes();
  if (!Number.isSafeInteger(size) || size <= 0) return noStore(NextResponse.json({ error: "Tamaño no válido" }, { status: 400 }));
  if (size > max) {
    return noStore(NextResponse.json({ error: `El máximo por archivo son ${Math.round(max / 1024 / 1024)} MB` }, { status: 413 }));
  }

  try {
    const price = await priceForBytes(size);
    const balance = Number(user.credits_clp);
    const quote = createQuoteToken(user.id, size, price.costClp);
    return noStore(NextResponse.json({
      costClp: price.costClp,
      balanceClp: balance,
      sufficient: balance >= price.costClp,
      minApplied: price.minApplied,
      multiplier: price.multiplier,
      liveRate: price.liveRate,
      quoteToken: quote.token,
      expiresAt: quote.expiresAt,
    }));
  } catch (error) {
    console.error("quote failed", error);
    return noStore(NextResponse.json({ error: "No se pudo calcular el precio" }, { status: 502 }));
  }
}
