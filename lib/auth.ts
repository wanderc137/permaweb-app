import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { cookies } from "next/headers";
import { q } from "./db";

const COOKIE = "pd_session";
export const SESSION_IDLE_SECONDS = 30 * 60;
export const SESSION_ABSOLUTE_SECONDS = 12 * 60 * 60;
const PASSWORD_MAX = 128;
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS: ScryptOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type CurrentUser = {
  id: string;
  email: string;
  credits_clp: string;
  role: "user" | "admin";
};

function derive(password: string, salt: string, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEYLEN, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length > PASSWORD_MAX) throw new Error("Contraseña demasiado larga");
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!password || password.length > PASSWORD_MAX) return false;
  const parts = stored.split("$");
  let options: ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
  let salt: string;
  let hex: string;

  if (parts.length === 3 && parts[0] === "scrypt") {
    [, salt, hex] = parts;
  } else if (parts.length === 6 && parts[0] === "scrypt") {
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isSafeInteger(N) || N < 16384 || N > 1048576 || (N & (N - 1)) !== 0) return false;
    if (!Number.isSafeInteger(r) || r < 1 || r > 16 || !Number.isSafeInteger(p) || p < 1 || p > 4) return false;
    options = { N, r, p, maxmem: Math.max(64 * 1024 * 1024, 256 * N * r) };
    [, , , , salt, hex] = parts;
  } else {
    return false;
  }

  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]+$/.test(hex)) return false;
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== SCRYPT_KEYLEN) return false;

  try {
    const actual = await derive(password, salt, options);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(randomBytes(24).toString("base64url"));
  return dummyHashPromise;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  await q(
    `insert into sessions (id, token_hash, user_id, expires_at)
     values ($1, $2, $3, now() + ($4::text || ' seconds')::interval)`,
    [id, tokenHash(token), userId, String(SESSION_ABSOLUTE_SECONDS)],
  );

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: (() => {
      try { return process.env.APP_URL ? new URL(process.env.APP_URL.trim()).protocol === "https:" : process.env.NODE_ENV === "production"; }
      catch { return process.env.NODE_ENV === "production"; }
    })(),
    path: "/",
    maxAge: SESSION_ABSOLUTE_SECONDS,
    priority: "high",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await q("update sessions set revoked_at = now() where token_hash = $1 and revoked_at is null", [tokenHash(token)]);
  }
  store.delete(COOKIE);
}

export async function currentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const hash = tokenHash(token);

  const { rows } = await q<CurrentUser & { session_id: string; idle_expired: boolean }>(
    `select u.id, u.email, u.credits_clp, u.role, s.id as session_id,
            (s.last_seen_at <= now() - ($2::text || ' seconds')::interval) as idle_expired
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and u.banned_at is null
      limit 1`,
    [hash, String(SESSION_IDLE_SECONDS)],
  );

  const session = rows[0];
  if (!session || session.idle_expired) {
    if (session) await q("update sessions set revoked_at = now() where id = $1", [session.session_id]);
    return null;
  }

  // Evita escribir en cada petición sin renunciar al límite de inactividad del servidor.
  await q(
    `update sessions set last_seen_at = now()
      where id = $1 and last_seen_at < now() - interval '60 seconds'`,
    [session.session_id],
  );

  return { id: session.id, email: session.email, credits_clp: session.credits_clp, role: session.role };
}

export async function sessionUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}
