import { randomUUID } from "node:crypto";
import { q } from "./db";
import { ipFingerprint } from "./security";

export async function recordActivity(input: {
  userId?: string | null;
  actorId?: string | null;
  action: string;
  metadata?: Record<string, string | number | boolean | null>;
  req?: Request;
}): Promise<void> {
  try {
    await q(
      `insert into activity_log (id, user_id, actor_id, action, metadata, ip_hash)
       values ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        randomUUID(),
        input.userId ?? null,
        input.actorId ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
        input.req ? ipFingerprint(input.req) : null,
      ],
    );
  } catch (error) {
    console.error("activity log failed", input.action, error);
  }
}
