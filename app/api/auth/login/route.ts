import { NextResponse } from "next/server";
import { createSession, dummyPasswordHash, verifyPassword } from "@/lib/auth";
import { q } from "@/lib/db";
import { recordActivity } from "@/lib/activity";
import { assertSameOrigin, BodyLimitError, isRecord, noStore, rateLimit, readJsonBody, requestIp, resetRateLimit, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return noStore(NextResponse.json({ error: "Origen no autorizado" }, { status: 403 }));
  const ipKey = `login:ip:${requestIp(req)}`;
  const ipLimit = rateLimit(ipKey, 30, 15 * 60);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  let body: Record<string, unknown>;
  try {
    const parsed = await readJsonBody(req);
    if (!isRecord(parsed)) throw new Error("shape");
    body = parsed;
  } catch (error) {
    return noStore(NextResponse.json(
      { error: error instanceof BodyLimitError ? "Petición demasiado grande" : "Petición inválida" },
      { status: error instanceof BodyLimitError ? 413 : 400 },
    ));
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof body.password === "string" ? body.password : "";
  const accountKey = `login:account:${requestIp(req)}:${email}`;
  const accountLimit = rateLimit(accountKey, 8, 15 * 60);
  if (!accountLimit.ok) return tooManyRequests(accountLimit.retryAfter);

  const { rows } = await q<{ id: string; password_hash: string; banned_at: Date | null }>(
    "select id, password_hash, banned_at from users where email = $1",
    [email],
  );

  const user = rows[0];
  const valid = await verifyPassword(password, user?.password_hash || (await dummyPasswordHash()));
  if (!user || !valid) {
    return noStore(NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 }));
  }
  if (user.banned_at) {
    await recordActivity({ userId: user.id, action: "login_blocked", req });
    return noStore(NextResponse.json({ error: "Esta cuenta está suspendida. Contacta con el administrador." }, { status: 403 }));
  }

  resetRateLimit(accountKey);
  await q("update users set last_login_at = now() where id = $1", [user.id]);
  await createSession(user.id);
  await recordActivity({ userId: user.id, actorId: user.id, action: "login", req });
  return noStore(NextResponse.json({ ok: true }));
}
