"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function AdminUserControls({
  userId,
  banned,
  protectedAccount,
}: {
  userId: string;
  banned: boolean;
  protectedAccount: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const operationRef = useRef<{ signature: string; id: string } | null>(null);

  async function request(path: string, body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "No se pudo completar la operación");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function adjust(sign: 1 | -1) {
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError("Introduce un importe entero positivo.");
      return;
    }
    const signature = `${sign}:${value}`;
    if (operationRef.current?.signature !== signature) {
      operationRef.current = { signature, id: crypto.randomUUID() };
    }
    const ok = await request(`/api/admin/users/${userId}/credits`, {
      deltaClp: value * sign,
      operationId: operationRef.current.id,
    });
    if (ok) {
      operationRef.current = null;
      setMessage(sign === 1 ? "Saldo abonado correctamente." : "Saldo descontado correctamente.");
    }
  }

  return (
    <div className="admin-controls">
      <div className="credit-editor">
        <label className="field">
          <span>Importe en CLP</span>
          <input
            type="number"
            min="1"
            max="100000000"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={busy}
          />
        </label>
        <div className="admin-control-buttons">
          <button className="btn primary" type="button" disabled={busy} onClick={() => adjust(1)}>Abonar saldo</button>
          <button className="btn" type="button" disabled={busy} onClick={() => adjust(-1)}>Descontar</button>
        </div>
      </div>

      {!protectedAccount ? (
        <button
          className={`btn ${banned ? "" : "danger-outline"}`}
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await request(`/api/admin/users/${userId}/status`, { banned: !banned });
            if (ok) setMessage(banned ? "Cuenta habilitada." : "Cuenta suspendida y sesiones revocadas.");
          }}
        >
          {banned ? "Habilitar cuenta" : "Suspender cuenta"}
        </button>
      ) : <span className="hint">Cuenta administrativa protegida</span>}

      {message ? <p className="success-message" role="status">{message}</p> : null}
      {error ? <div className="err" role="alert">{error}</div> : null}
    </div>
  );
}
