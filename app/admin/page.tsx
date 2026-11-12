import Link from "next/link";
import { redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { formatBytes, formatClp } from "@/lib/format";

export const dynamic = "force-dynamic";

type Stats = { users: string; uploads: string; credits: string; pending: string };
type UserRow = {
  id: string;
  email: string;
  role: "user" | "admin";
  credits_clp: string;
  banned_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  upload_count: string;
  total_bytes: string | null;
};

const date = (value: Date | null) => value
  ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Nunca";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const [{ rows: stats }, { rows: users }] = await Promise.all([
    q<Stats>(`select
      (select count(*)::text from users) as users,
      (select count(*)::text from uploads) as uploads,
      (select coalesce(sum(credits_clp), 0)::text from users) as credits,
      (select count(*)::text from uploads where status in ('publishing', 'pending')) as pending`),
    q<UserRow>(`select u.id, u.email, u.role, u.credits_clp, u.banned_at, u.last_login_at, u.created_at,
      coalesce(s.upload_count, 0)::text as upload_count, s.total_bytes
      from users u
      left join (
        select user_id, count(*) as upload_count, sum(size_bytes)::text as total_bytes
        from uploads group by user_id
      ) s on s.user_id = u.id
      order by u.created_at desc limit 250`),
  ]);
  const summary = stats[0];

  return (
    <div className="shell wide">
      <Topbar />
      <main className="main">
        <div className="pagehead admin-heading">
          <div>
            <p className="eyebrow left">PANEL DE CONTROL</p>
            <h1>Administración</h1>
            <p>Usuarios, actividad, publicaciones y disponibilidad de saldo.</p>
          </div>
          <span className="admin-identity">{admin.email}</span>
        </div>

        <section className="stats-grid" aria-label="Resumen">
          <div className="stat-card"><span>Usuarios</span><strong>{summary.users}</strong><small>cuentas registradas</small></div>
          <div className="stat-card"><span>Archivos</span><strong>{summary.uploads}</strong><small>publicaciones totales</small></div>
          <div className="stat-card"><span>Saldo agregado</span><strong>{formatClp(Number(summary.credits))}</strong><small>disponible en cuentas</small></div>
          <div className="stat-card"><span>En proceso</span><strong>{summary.pending}</strong><small>esperando confirmación</small></div>
        </section>

        <section className="card admin-table-card">
          <div className="section-title">
            <div><h2>Cuentas</h2><p>Selecciona un usuario para revisar su actividad y gestionar su acceso.</p></div>
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead><tr><th>Usuario</th><th>Estado</th><th>Saldo</th><th>Archivos</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><div className="user-cell"><strong>{user.email}</strong><small>{user.role === "admin" ? "Administrador" : `Desde ${date(user.created_at)}`}</small></div></td>
                    <td><span className={`status-pill ${user.banned_at ? "suspended" : "active"}`}>{user.banned_at ? "Suspendida" : "Activa"}</span></td>
                    <td className="numeric">{formatClp(Number(user.credits_clp))}</td>
                    <td><strong>{user.upload_count}</strong><small className="table-sub">{formatBytes(user.total_bytes || "0")}</small></td>
                    <td>{date(user.last_login_at)}</td>
                    <td><Link className="btn small" href={`/admin/usuarios/${user.id}`}>Gestionar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <footer className="footer"><p>PermaDrop · Consola administrativa de acceso restringido.</p></footer>
    </div>
  );
}
