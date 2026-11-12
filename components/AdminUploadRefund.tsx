"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUploadRefund({ uploadId }: { uploadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="refund-control">
      <button
        className="btn small danger-outline"
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Marca la publicación como fallida y devuelve su importe. Usa esta acción solo tras revisar su estado. ¿Continuar?")) return;
          setBusy(true);
          setError("");
          try {
            const response = await fetch(`/api/admin/uploads/${uploadId}/refund`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm: true }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) setError(data.error || "No se pudo resolver");
            else router.refresh();
          } catch {
            setError("Error de red");
          } finally {
            setBusy(false);
          }
        }}
      >{busy ? "Resolviendo…" : "Resolver y devolver"}</button>
      {error ? <small className="refund-error" role="alert">{error}</small> : null}
    </div>
  );
}
