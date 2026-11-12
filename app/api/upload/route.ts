import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugifyRef } from "@/lib/format";
import { PublicationError, uploadL1, walletBalanceWinston } from "@/lib/arweave";
import { maxUploadBytes, priceForBytes } from "@/lib/pricing";
import { verifyQuoteToken } from "@/lib/quote";
import { recordActivity } from "@/lib/activity";
import { appOrigin, assertSameOrigin, BodyLimitError, noStore, rateLimit, readLimitedBody, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILENAME = 180;

type Failure = { status: number; body: Record<string, unknown> };

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) return noStore(NextResponse.json({ error: "Origen no autorizado" }, { status: 403 }));
  const user = await currentUser();
  if (!user) return noStore(NextResponse.json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, { status: 401 }));
  const limit = rateLimit(`upload:${user.id}`, 20, 10 * 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const max = maxUploadBytes();
  let form: FormData;
  try {
    const raw = await readLimitedBody(req, max + 1024 * 1024);
    form = await new Response(new Uint8Array(raw), {
      headers: { "Content-Type": req.headers.get("content-type") || "application/octet-stream" },
    }).formData();
  } catch (error) {
    return noStore(NextResponse.json(
      { error: error instanceof BodyLimitError ? "El archivo supera el límite permitido" : "No se pudo leer el archivo" },
      { status: error instanceof BodyLimitError ? 413 : 400 },
    ));
  }

  const file = form.get("file");
  if (!(file instanceof File)) return noStore(NextResponse.json({ error: "Falta el archivo" }, { status: 400 }));
  if (file.size <= 0) return noStore(NextResponse.json({ error: "El archivo está vacío" }, { status: 400 }));
  if (file.size > max) {
    return noStore(NextResponse.json(
      { error: `El máximo por archivo son ${Math.round(max / 1024 / 1024)} MB` },
      { status: 413 },
    ));
  }

  const ref = slugifyRef(String(form.get("ref") || file.name || "archivo"));
  if (ref.length < 3) {
    return noStore(NextResponse.json({ error: "La etiqueta debe tener al menos 3 caracteres válidos" }, { status: 400 }));
  }

  const quoteToken = String(form.get("quoteToken") || "");
  let price: Awaited<ReturnType<typeof priceForBytes>>;
  try {
    price = await priceForBytes(file.size);
    const quoteState = verifyQuoteToken(quoteToken, user.id, file.size, price.costClp);
    if (quoteState !== "ok") {
      return noStore(NextResponse.json(
        { error: quoteState === "changed" ? "La cotización cambió. Revisa el nuevo importe antes de publicar." : "La cotización caducó. Se calculará de nuevo antes de publicar.", quoteExpired: true },
        { status: 409 },
      ));
    }
    const serviceBalance = await walletBalanceWinston();
    if (BigInt(serviceBalance) < BigInt(price.feeWinston)) {
      return noStore(NextResponse.json(
        { error: "El servicio no tiene capacidad de publicación suficiente. Avisa al administrador." },
        { status: 503 },
      ));
    }
  } catch (error) {
    console.error("publication preflight failed", error);
    return noStore(NextResponse.json({ error: "El servicio de publicación no está disponible" }, { status: 503 }));
  }

  const cost = price.costClp;
  const uploadId = randomUUID();
  const filename = (file.name || "archivo")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, MAX_FILENAME) || "archivo";
  const declaredType = (file.type || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const contentType = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(declaredType)
    ? declaredType.slice(0, 120)
    : "application/octet-stream";

  const buffer = Buffer.from(await file.arrayBuffer());
  const client = await db().connect();
  let failure: Failure | null = null;
  let balanceAfter = 0;

  try {
    await client.query("begin");
    const account = await client.query<{ credits_clp: string; banned_at: Date | null }>(
      "select credits_clp, banned_at from users where id = $1 for update",
      [user.id],
    );
    if (!account.rows[0] || account.rows[0].banned_at) {
      failure = { status: 403, body: { error: "La cuenta no está habilitada" } };
    } else {
      const occupied = await client.query("select 1 from uploads where slug = $1", [ref]);
      if (occupied.rowCount) {
        failure = { status: 409, body: { error: `La etiqueta "${ref}" ya está en uso. Elige otra.` } };
      } else {
        const debit = await client.query<{ credits_clp: string }>(
          `update users set credits_clp = credits_clp - $1::bigint
            where id = $2 and credits_clp >= $1::bigint and banned_at is null
            returning credits_clp`,
          [String(cost), user.id],
        );
        if (!debit.rows[0]) {
          failure = {
            status: 402,
            body: {
              error: "Saldo insuficiente",
              costClp: cost,
              balanceClp: Number(account.rows[0].credits_clp),
            },
          };
        } else {
          balanceAfter = Number(debit.rows[0].credits_clp);
          await client.query(
            `insert into uploads (id, user_id, slug, txid, filename, content_type, size_bytes, cost_clp, status)
             values ($1, $2, $3, $4, $5, $6, $7::bigint, $8::bigint, 'publishing')`,
            [uploadId, user.id, ref, `publishing:${uploadId}`, filename, contentType, String(file.size), String(cost)],
          );
          await client.query(
            `insert into credit_ledger (id, user_id, delta_clp, reason, upload_id)
             values ($1, $2, $3, 'upload', $4)`,
            [randomUUID(), user.id, String(-cost), uploadId],
          );
        }
      }
    }

    if (failure) await client.query("rollback");
    else await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error("upload reservation failed", error);
    failure = (error as { code?: string }).code === "23505"
      ? { status: 409, body: { error: `La etiqueta "${ref}" acaba de ocuparse. Elige otra.` } }
      : { status: 500, body: { error: "No se pudo reservar la publicación" } };
  } finally {
    client.release();
  }

  if (failure) return noStore(NextResponse.json(failure.body, { status: failure.status }));

  let publicationId: string;
  let uncertain = false;
  try {
    publicationId = await uploadL1(buffer, filename, contentType);
  } catch (error) {
    if (error instanceof PublicationError && error.ambiguous) {
      // La red pudo aceptarla antes del corte: se conserva el identificador y
      // nunca se reembolsa una operación cuyo resultado es desconocido.
      publicationId = error.publicationId;
      uncertain = true;
    } else {
      console.error("upload failed; refunding", uploadId, error);
      const refund = await db().connect();
      let refunded = false;
      try {
        await refund.query("begin");
        await refund.query("update uploads set status = 'failed' where id = $1 and status = 'publishing'", [uploadId]);
        await refund.query("update users set credits_clp = credits_clp + $1::bigint where id = $2", [String(cost), user.id]);
        await refund.query(
          `insert into credit_ledger (id, user_id, delta_clp, reason, upload_id)
           values ($1, $2, $3, 'refund', $4)`,
          [randomUUID(), user.id, String(cost), uploadId],
        );
        await refund.query("commit");
        refunded = true;
      } catch (refundError) {
        await refund.query("rollback");
        console.error("CRITICAL: refund failed", uploadId, refundError);
      } finally {
        refund.release();
      }
      await recordActivity({
        userId: user.id,
        action: refunded ? "upload_failed" : "upload_refund_failed",
        metadata: { slug: ref },
        req,
      });
      return noStore(NextResponse.json(
        { error: refunded
          ? "No se pudo completar la publicación. El importe ha sido devuelto a tu saldo."
          : "La publicación falló y la devolución quedó pendiente de revisión administrativa." },
        { status: refunded ? 502 : 500 },
      ));
    }
  }

  try {
    await db().query(
      "update uploads set txid = $2, status = 'pending' where id = $1 and status = 'publishing'",
      [uploadId, publicationId],
    );
  } catch (error) {
    console.error("CRITICAL: publication saved but state update failed", uploadId, error);
    return noStore(NextResponse.json(
      { error: "La publicación se envió, pero su seguimiento requiere revisión administrativa." },
      { status: 500 },
    ));
  }

  await recordActivity({
    userId: user.id,
    actorId: user.id,
    action: uncertain ? "upload_uncertain" : "upload",
    metadata: { slug: ref, sizeBytes: file.size, costClp: cost },
    req,
  });

  return noStore(NextResponse.json({
    ref,
    url: `${appOrigin(req)}/f/${ref}`,
    costClp: cost,
    status: "pending",
    minApplied: price.minApplied,
    balanceClp: balanceAfter,
  }));
}
