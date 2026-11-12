import AuthForm from "@/components/AuthForm";
import ModeSwitch from "@/components/ModeSwitch";
import Topbar from "@/components/Topbar";
import Uploader from "@/components/Uploader";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const account = await currentUser();

  return (
    <div className="shell">
      <Topbar>
        {account ? <span className="who">{account.email}</span> : <span className="who muted">Acceso privado y seguro</span>}
      </Topbar>

      <main className="main">
        <section className="hero">
          <p className="eyebrow">CUSTODIA DIGITAL PERMANENTE</p>
          <h1>Tus archivos.<br /><span>Siempre disponibles.</span></h1>
          <p className="sub">
            Publica con una etiqueta única, conoce el coste antes de confirmar y accede mediante
            un enlace permanente y un código QR.
          </p>
        </section>

        <ModeSwitch upload={account ? <Uploader initialClp={Number(account.credits_clp)} /> : <AuthForm />} />

        <p className="note">
          Al publicar, el contenido queda disponible de forma permanente y no puede modificarse ni eliminarse.
          Utiliza únicamente información que tengas derecho a compartir.
        </p>
      </main>

      <footer className="footer">
        <p>PermaDrop · Infraestructura de custodia distribuida con acceso permanente.</p>
        <nav><span>Seguridad · Permanencia · Reserva</span></nav>
      </footer>
    </div>
  );
}
