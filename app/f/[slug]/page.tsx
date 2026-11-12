import Link from "next/link";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import FilePreview from "@/components/FilePreview";
import Topbar from "@/components/Topbar";
import { q } from "@/lib/db";
import { formatBytes, slugifyRef } from "@/lib/format";
import { refreshStatus, statusLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

type Upload = {
  slug: string; txid: string; filename: string; content_type: string; size_bytes: string;
  status: string; created_at: Date;
};

function FileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" /><path d="M13.5 3v5.5H19" strokeLinecap="round" /></svg>;
}

export default async function FilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = slugifyRef(decodeURIComponent(slug));
  if (ref.length < 3) notFound();
  const { rows } = await q<Upload>(
    `select slug, txid, filename, content_type, size_bytes, status, created_at
       from uploads where slug = $1`,
    [ref],
  );
  const file = rows[0];
  if (!file) notFound();
  const status = await refreshStatus(file.slug, file.txid, file.status);
  const ready = status === "confirmed";

  return (
    <div className="shell file-shell">
      <Topbar />
      <main className="main">
        <div className="file-layout">
          <section className="card dl">
            <div className="dl-head">
              <div className="fico big"><FileIcon /></div>
              <div className="dl-title">
                <div className="dl-title-row"><h1>{file.filename}</h1><span className={`badge ${status}`}>{statusLabel(status)}</span></div>
                <p className="fsize">{formatBytes(file.size_bytes)} · {file.content_type}</p>
              </div>
            </div>

            <dl className="meta">
              <div><dt>Etiqueta</dt><dd className="mono">/{file.slug}</dd></div>
              <div><dt>Publicado</dt><dd>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(file.created_at))}</dd></div>
              <div><dt>Formato</dt><dd>{file.content_type}</dd></div>
            </dl>

            <div className="actions">
              {ready ? <>
                <a className="btn primary" href={`/api/download/${file.slug}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5" /><path d="M5 19.5h14" /></svg>Descargar archivo</a>
                <a className="btn" href={`/v/${file.slug}`} target="_blank" rel="noopener noreferrer">Abrir original</a>
              </> : <>
                <span className="btn primary disabled" aria-disabled="true">Descargar archivo</span>
                <span className="btn disabled" aria-disabled="true">Abrir original</span>
              </>}
            </div>
            <p className="hint">{ready ? "Enlace permanente verificado. La descarga y la vista previa se sirven desde este dominio." : status === "failed" ? "La publicación no pudo completarse y el importe fue devuelto al saldo del usuario." : "La publicación está siendo verificada. Esta página se actualizará automáticamente al finalizar."}</p>
          </section>

          {status !== "failed" ? <aside className="card qr-card">
            <div className="qr-frame"><img src={`/api/qr/${file.slug}`} alt={`Código QR para abrir ${file.filename}`} width="180" height="180" /></div>
            <h2>Acceso mediante QR</h2>
            <p>Escanea el código para abrir esta ficha desde cualquier dispositivo.</p>
            <a className="btn small" href={`/api/qr/${file.slug}`} download={`qr-${file.slug}.png`}>Descargar QR</a>
          </aside> : null}
        </div>

        {ready ? <FilePreview key={file.slug} slug={file.slug} filename={file.filename} contentType={file.content_type} sizeBytes={Number(file.size_bytes)} /> : null}
      </main>
      <footer className="footer"><p>PermaDrop · Acceso permanente mediante etiqueta.</p><nav><Link href="/">Inicio</Link></nav></footer>
      {status === "pending" || status === "publishing" ? <AutoRefresh seconds={20} /> : null}
    </div>
  );
}
