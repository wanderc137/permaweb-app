import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AdminUserControls from "@/components/AdminUserControls";
import AdminUploadRefund from "@/components/AdminUploadRefund";
import Topbar from "@/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { formatBytes, formatClp } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { isUuid } from "@/lib/security";

export const dynamic = "force-dynamic";

type Account = {
  id: string; email: string; role: "user" | "admin"; credits_clp: string;
  banned_at: Date | null; last_login_at: Date | null; created_at: Date;
};
type Upload = {
  id: string; slug: string; filename: string; content_type: string; size_bytes: string;
  cost_clp: string; status: string; block_height: string | null; created_at: Date; refunded: boolean;
};
type Activity = {
  id: string; action: string; metadata: Record<string, unknown>; created_at: Date; actor_email: string | null;
};
type Ledger = { id: string; delta_clp: string; reason: string; created_at: Date; actor_email: string | null };

const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Nunca";

const actionLabels: Record<string, string> = {
  register: "Cuenta creada",
  login: "Inicio de sesión",
  login_blocked: "Acceso bloqueado por suspensión",
  logout: "Cierre de sesión",
  upload: "Archivo publicado",
  upload_failed: "Publicación fallida y saldo devuelto",
  upload_refund_failed: "Fallo de publicación con devolución pendiente",
  upload_uncertain: "Publicación con recepción incierta; seguimiento conservado",
  admin_refund: "Publicación resuelta y saldo devuelto por administración",
  admin_credits: "Ajuste administrativo de saldo",
  admin_ban: "Cuenta suspendida por administración",
  admin_unban: "Cuenta habilitada por administración",
};

function activityDetail(action: string, metadata: Record<string, unknown>): string {
  if (action === "admin_credits") return `${Number(metadata.deltaClp) > 0 ? "Abono" : "Descuento"} de ${formatClp(Math.abs(Number(metadata.deltaClp)))}`;
  if (action === "upload") return `/${String(metadata.slug || "")} · ${formatBytes(Number(metadata.sizeBytes || 0))} · ${formatClp(Number(metadata.costClp || 0))}`;
  if (["upload_failed", "upload_refund_failed", "upload_uncertain", "admin_refund"].includes(action)) return `Etiqueta /${String(metadata.slug || "")}`;
  return "Registro de seguridad y auditoría";
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { rows: accounts } = await q<Account>(
    "select id, email, role, credits_clp, banned_at, last_login_at, created_at from users where id = $1",
    [id],
  );
  const account = accounts[0];
  if (!account) notFound();

  const [{ rows: uploads }, { rows: activity }, { rows: ledger }] = await Promise.all([
    q<Upload>(`select u.id, u.slug, u.filename, u.content_type, u.size_bytes, u.cost_clp, u.status, u.block_height, u.created_at,
      exists(select 1 from credit_ledger l where l.upload_id = u.id and l.reason = 'refund') as refunded
      from uploads u where u.user_id = $1 order by u.created_at desc limit 150`, [id]),
    q<Activity>(`select a.id, a.action, a.metadata, a.created_at, actor.email as actor_email
      from activity_log a left join users actor on actor.id = a.actor_id
      where a.user_id = $1 order by a.created_at desc limit 100`, [id]),
    q<Ledger>(`select l.id, l.delta_clp, l.reason, l.created_at, actor.email as actor_email
      from credit_ledger l left join users actor on actor.id = l.actor_id
      where l.user_id = $1 order by l.created_at desc limit 50`, [id]),
  ]);

  const totalBytes = uploads.reduce((sum, item) => sum + Number(item.size_bytes), 0);
  const totalSpent = uploads.reduce((sum, item) => item.status === "failed" ? sum : sum + Number(item.cost_clp), 0);

  return (
    <div className="shell wide">
      <Topbar />
      <main className="main">
        <Link href="/admin" className="backlink">← Volver a administración</Link>
        <div className="pagehead admin-heading">
          <div><p className="eyebrow left">EXPEDIENTE DE USUARIO</p><h1>{account.email}</h1><p>Cuenta creada el {date(account.created_at)}</p></div>
          <span className={`status-pill ${account.banned_at ? "suspended" : "active"}`}>{account.banned_at ? "Suspendida" : "Activa"}</span>
        </div>

        <section className="stats-grid user-stats">
          <div className="stat-card"><span>Saldo disponible</span><strong>{formatClp(Number(account.credits_clp))}</strong><small>crédito actual</small></div>
          <div className="stat-card"><span>Archivos</span><strong>{uploads.length}</strong><small>{formatBytes(totalBytes)} en este listado</small></div>
          <div className="stat-card"><span>Invertido</span><strong>{formatClp(totalSpent)}</strong><small>en publicaciones listadas</small></div>
          <div className="stat-card"><span>Último acceso</span><strong className="stat-date">{date(account.last_login_at)}</strong><small>{account.role === "admin" ? "Administrador" : "Usuario"}</small></div>
        </section>

        <section className="card admin-manage">
          <div className="section-title"><div><h2>Gestión de cuenta</h2><p>Los cambios de saldo y acceso quedan registrados en la auditoría.</p></div></div>
          <AdminUserControls userId={account.id} banned={!!account.banned_at} protectedAccount={account.role === "admin" || account.id === admin.id} />
        </section>

        <section className="card admin-table-card">
          <div className="section-title"><div><h2>Archivos publicados</h2><p>Contenido, estado de confirmación y coste de cada operación.</p></div></div>
          {uploads.length ? (
            <div className="table-scroll"><table className="admin-table">
              <thead><tr><th>Archivo</th><th>Etiqueta</th><th>Estado</th><th>Tamaño</th><th>Coste</th><th>Fecha</th><th>Revisión</th></tr></thead>
              <tbody>{uploads.map((file) => (
                <tr key={file.id}>
                  <td><Link className="file-link" href={`/f/${file.slug}`}>{file.filename}</Link><small className="table-sub">{file.content_type}</small></td>
                  <td><Link className="mono" href={`/f/${file.slug}`}>/{file.slug}</Link></td>
                  <td><span className={`badge ${file.status}`}>{statusLabel(file.status)}</span>{file.block_height ? <small className="table-sub">Bloque {file.block_height}</small> : null}</td>
                  <td>{formatBytes(file.size_bytes)}</td><td className="numeric">{formatClp(Number(file.cost_clp))}</td><td>{date(file.created_at)}</td>
                  <td>{file.status === "confirmed" ? <span className="hint">—</span> : file.refunded ? <span className="status-pill suspended">Devuelto</span> : <AdminUploadRefund uploadId={file.id} />}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="empty-copy">Este usuario todavía no ha publicado archivos.</p>}
        </section>

        <div className="admin-columns">
          <section className="card">
            <div className="section-title"><div><h2>Actividad</h2><p>Últimos eventos de la cuenta.</p></div></div>
            {activity.length ? <ol className="timeline">{activity.map((event) => (
              <li key={event.id}><span className="timeline-dot" /><div><strong>{actionLabels[event.action] || event.action}</strong><p>{activityDetail(event.action, event.metadata)}</p><small>{date(event.created_at)}{event.actor_email && event.actor_email !== account.email ? ` · por ${event.actor_email}` : ""}</small></div></li>
            ))}</ol> : <p className="empty-copy">Sin actividad registrada.</p>}
          </section>

          <section className="card">
            <div className="section-title"><div><h2>Movimientos de saldo</h2><p>Libro mayor de la cuenta.</p></div></div>
            {ledger.length ? <div className="ledger-list">{ledger.map((entry) => (
              <div className="ledger-row" key={entry.id}><div><strong>{entry.reason === "admin_adjustment" ? "Ajuste administrativo" : entry.reason === "upload" ? "Publicación" : entry.reason === "refund" ? "Devolución" : "Crédito inicial"}</strong><small>{date(entry.created_at)}</small></div><span className={Number(entry.delta_clp) >= 0 ? "credit-positive" : "credit-negative"}>{Number(entry.delta_clp) >= 0 ? "+" : ""}{formatClp(Number(entry.delta_clp))}</span></div>
            ))}</div> : <p className="empty-copy">Sin movimientos registrados.</p>}
          </section>
        </div>
      </main>
      <footer className="footer"><p>PermaDrop · Información confidencial de administración.</p></footer>
    </div>
  );
}
