import Link from "next/link";
import { redirect } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import Topbar from "@/components/Topbar";
import { sessionUserId } from "@/lib/auth";
import { q } from "@/lib/db";
import { formatBytes, formatClp } from "@/lib/format";
import { refreshStatus, statusLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

type Upload = {
  slug: string;
  txid: string;
  filename: string;
  content_type: string;
  size_bytes: string;
  cost_clp: string;
  status: string;
  block_height: string | null;
  created_at: Date;
};

const LIST_QUERY = `select slug, txid, filename, content_type, size_bytes, cost_clp, status, block_height, created_at
  from uploads where user_id = $1 order by created_at desc limit 200`;

export default async function HistoryPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/");

  let { rows } = await q<Upload>(LIST_QUERY, [userId]);

  // Refresca como máximo 10 pendientes por carga, en paralelo.
  const pending = rows.filter((row) => row.status === "pending").slice(0, 10);
  if (pending.length > 0) {
    await Promise.allSettled(
      pending.map((row) => refreshStatus(row.slug, row.txid, row.status)),
    );
    ({ rows } = await q<Upload>(LIST_QUERY, [userId]));
  }

  const hasPending = rows.some((row) => row.status === "pending" || row.status === "publishing");

  return (
    <div className="shell">
      <Topbar />

      <main className="main">
        <div className="pagehead">
          <div>
            <h1>Mis archivos</h1>
            <p>Historial de publicaciones y seguimiento de cada confirmación.</p>
          </div>
          <Link className="btn" href="/">
            Subir archivo
          </Link>
        </div>

        {rows.length === 0 ? (
          <section className="card empty">
            <div className="fico big" style={{ margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
                <path d="M13.5 3v5.5H19" strokeLinecap="round" />
              </svg>
            </div>
            <p>Todavía no has subido ningún archivo.</p>
            <Link className="btn primary" href="/">
              Subir el primero
            </Link>
          </section>
        ) : (
          <div className="hist">
            {rows.map((row) => (
              <Link key={row.slug} href={`/f/${row.slug}`} className="hist-item">
                <div className="fico small">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                    <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
                    <path d="M13.5 3v5.5H19" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="hist-main">
                  <span className="hist-name">{row.filename}</span>
                  <span className="hist-meta">
                    /{row.slug} · {formatBytes(row.size_bytes)} ·{" "}
                    {formatClp(Number(row.cost_clp))}
                    {row.block_height ? ` · bloque ${row.block_height}` : ""} ·{" "}
                    {new Intl.DateTimeFormat("es", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "UTC",
                    }).format(new Date(row.created_at))}{" "}
                    UTC
                  </span>
                </div>

                <span className={`badge ${row.status}`}>{statusLabel(row.status)}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="note">
          Las publicaciones pendientes se verifican automáticamente. El estado y el enlace se actualizan en esta misma página sin que tengas que volver a subir el archivo.
        </p>
      </main>

      <footer className="footer">
        <p>PermaDrop · almacenamiento permanente con enlaces cortos.</p>
        <nav>
          <Link href="/">Inicio</Link>
        </nav>
      </footer>

      {hasPending ? <AutoRefresh seconds={25} /> : null}
    </div>
  );
}
