import { q } from "@/lib/db";
import { slugifyRef } from "@/lib/format";
import { rateLimit, requestIp } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INLINE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "application/pdf", "text/plain", "text/csv", "text/markdown", "application/json",
  "video/mp4", "video/webm", "audio/mpeg", "audio/ogg", "audio/wav", "audio/mp4",
]);

function disposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const limit = rateLimit(`view:${requestIp(req)}`, 300, 60);
  if (!limit.ok) return new Response("Demasiadas solicitudes", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const { slug } = await ctx.params;
  const ref = slugifyRef(decodeURIComponent(slug));
  if (ref.length < 3) return new Response("Etiqueta no válida", { status: 400 });

  const { rows } = await q<{ txid: string; filename: string; content_type: string; status: string }>(
    "select txid, filename, content_type, status from uploads where slug = $1",
    [ref],
  );
  const file = rows[0];
  if (!file || file.status === "failed" || file.status === "publishing") {
    return new Response("Archivo no encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const range = req.headers.get("range");
  if (range?.includes(",")) return new Response("Rangos múltiples no admitidos", { status: 400 });
  let upstream: Response;
  try {
    upstream = await fetch(`https://arweave.net/${file.txid}`, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    return new Response("El servicio de contenido no está disponible temporalmente.", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const validContent = upstream.status === 200 || upstream.status === 206;
  if (!validContent || !upstream.body) {
    const pending = upstream.status === 202 || upstream.status === 404 || upstream.status === 416;
    return new Response(
      pending ? "El archivo todavía no está disponible. Inténtalo de nuevo en unos minutos." : "El servicio de contenido no está disponible temporalmente.",
      { status: upstream.status === 416 ? 416 : pending ? 404 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const type = (file.content_type || "application/octet-stream").split(";")[0].trim().toLowerCase();
  const inline = INLINE_TYPES.has(type);
  const headers = new Headers({
    "Content-Type": inline ? type : "application/octet-stream",
    "Content-Disposition": disposition(file.filename, inline),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": upstream.headers.get("accept-ranges") || "bytes",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
