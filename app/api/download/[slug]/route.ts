import { q } from "@/lib/db";
import { slugifyRef } from "@/lib/format";
import { rateLimit, requestIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const limit = rateLimit(`download:${requestIp(req)}`, 120, 10 * 60);
  if (!limit.ok) return new Response("Demasiadas solicitudes", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const { slug } = await ctx.params;
  const ref = slugifyRef(decodeURIComponent(slug));
  if (ref.length < 3) return new Response("Etiqueta no válida", { status: 400 });
  const { rows } = await q<{ txid: string; filename: string; status: string }>(
    "select txid, filename, status from uploads where slug = $1",
    [ref],
  );
  const file = rows[0];
  if (!file || file.status === "failed" || file.status === "publishing") {
    return new Response("Archivo no encontrado", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://arweave.net/${file.txid}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    return new Response("El servicio de contenido no está disponible temporalmente.", { status: 502 });
  }
  if (upstream.status !== 200 || !upstream.body) {
    const pending = upstream.status === 202 || upstream.status === 404;
    return new Response(
      pending ? "El archivo todavía no está disponible. Inténtalo de nuevo en unos minutos." : "El servicio de contenido no está disponible temporalmente.",
      { status: pending ? 404 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": contentDisposition(file.filename),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}
