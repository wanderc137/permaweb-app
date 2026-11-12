import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/activity";
import { assertSameOrigin, BodyLimitError, isRecord, noStore, rateLimit, readJsonBody, requestIp, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return noStore(NextResponse.json({ error: "Origen no autorizado" }, { status: 403 }));
  const limit = rateLimit(`register:${requestIp(req)}`, 5, 60 * 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return noStore(NextResponse.json({ error: "Email no válido" }, { status: 400 }));
  }
  if (password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return noStore(NextResponse.json(
      { error: "Usa entre 12 y 128 caracteres, incluyendo letras y números" },
      { status: 400 },
    ));
  }

  const id = randomUUID();
  const hash = await hashPassword(password);
  const bonusClp = Math.max(0, Math.min(1000000, Number(process.env.SIGNUP_CREDITS_CLP || 0)));
  const client = await db().connect();

  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(730194)");
    const count = await client.query<{ count: string }>("select count(*)::text as count from users");
    const role = count.rows[0]?.count === "0" ? "admin" : "user";
    await client.query(
      "insert into users (id, email, password_hash, credits_clp, role, last_login_at) values ($1, $2, $3, $4::bigint, $5, now())",
      [id, email, hash, String(bonusClp), role],
    );
    if (bonusClp > 0) {
      await client.query(
        "insert into credit_ledger (id, user_id, delta_clp, reason) values ($1, $2, $3, 'signup')",
        [randomUUID(), id, String(bonusClp)],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      return noStore(NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 }));
    }
    console.error("register failed", error);
    return noStore(NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 }));
  } finally {
    client.release();
  }

  await createSession(id);
  await recordActivity({ userId: id, actorId: id, action: "register", req });
  return noStore(NextResponse.json({ ok: true }));
}
