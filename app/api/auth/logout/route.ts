import { NextResponse } from "next/server";
import { currentUser, destroySession } from "@/lib/auth";
import { recordActivity } from "@/lib/activity";
import { assertSameOrigin, noStore } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return noStore(NextResponse.json({ error: "Origen no autorizado" }, { status: 403 }));
  const user = await currentUser();
  await destroySession();
  if (user) await recordActivity({ userId: user.id, actorId: user.id, action: "logout", req });
  return noStore(NextResponse.json({ ok: true }));
}
