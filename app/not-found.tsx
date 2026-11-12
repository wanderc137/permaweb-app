import Link from "next/link";
import Topbar from "@/components/Topbar";

export default function NotFound() {
  return (
    <div className="shell">
      <Topbar />

      <main className="main">
        <section className="card notfound">
          <div className="nfcode">404</div>
          <h2>No existe esa etiqueta</h2>
          <p>
            No hay ningún archivo guardado con esa etiqueta. Revisa que esté bien escrita o pide
            el enlace a quien lo subió.
          </p>
          <Link className="btn primary" href="/">
            Volver al inicio
          </Link>
        </section>
      </main>
    </div>
  );
}
