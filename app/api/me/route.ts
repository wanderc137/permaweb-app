import { NextResponse } from "next/server";
import { currentUser, SESSION_IDLE_SECONDS } from "@/lib/auth";
import { maxUploadBytes } from "@/lib/pricing";
import { noStore } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return noStore(NextResponse.json({ error: "No autenticado" }, { status: 401 }));
  return noStore(NextResponse.json({
    email: user.email,
    role: user.role,
    creditsClp: Number(user.credits_clp),
    maxUploadBytes: maxUploadBytes(),
    idleSeconds: SESSION_IDLE_SECONDS,
  }));
}
