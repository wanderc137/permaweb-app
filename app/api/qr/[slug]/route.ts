import QRCode from "qrcode";
import { q } from "@/lib/db";
import { appOrigin } from "@/lib/security";
import { slugifyRef } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ref = slugifyRef(decodeURIComponent(slug));
  if (ref.length < 3) return new Response("Etiqueta no válida", { status: 400 });
  const { rowCount } = await q("select 1 from uploads where slug = $1 and status <> 'failed'", [ref]);
  if (!rowCount) return new Response("Archivo no encontrado", { status: 404 });

  const png = await QRCode.toBuffer(`${appOrigin(req)}/f/${ref}`, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#111318", light: "#ffffff" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="qr-${ref}.png"`,
      "Content-Length": String(png.length),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
