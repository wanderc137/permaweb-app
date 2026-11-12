"use client";

import { useRef, useState } from "react";
import { formatBytes, formatClp, slugifyRef } from "@/lib/format";

type Quote = {
  costClp: number;
  balanceClp: number;
  sufficient: boolean;
  minApplied: boolean;
  multiplier: number;
  liveRate: boolean;
  quoteToken: string;
  expiresAt: string;
};

type Result = {
  ref: string;
  url: string;
  costClp: number;
  balanceClp: number;
  minApplied: boolean;
  status: string;
};

export default function Uploader({ initialClp }: { initialClp: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quoteSequence = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [balanceClp, setBalanceClp] = useState(initialClp);
  const [copied, setCopied] = useState(false);

  const cleanRef = slugifyRef(ref);
  const refValid = cleanRef.length >= 3;
  const canUpload =
    !!file && !!quote && refValid && !quoting && !uploading && quote.sufficient;

  async function pick(next: File | undefined, preserveRef = false) {
    if (!next) return;
    const sequence = ++quoteSequence.current;
    setError("");
    setResult(null);
    setFile(next);
    setQuote(null);
    if (!preserveRef) setRef(slugifyRef(next.name.replace(/\.[^.]+$/, "")) || "archivo");
    setQuoting(true);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: next.size }),
      });
      const data = await res.json().catch(() => ({}));
      if (sequence !== quoteSequence.current) return;
      if (!res.ok) {
        setError(data.error || "No se pudo calcular el precio.");
        setFile(null);
        return;
      }
      setQuote(data);
      setBalanceClp(data.balanceClp);
    } catch {
      if (sequence !== quoteSequence.current) return;
      setError("Error de red al calcular el precio.");
      setFile(null);
    } finally {
      if (sequence === quoteSequence.current) setQuoting(false);
    }
  }

  function upload() {
    if (!file || !quote || !canUpload) return;

    setUploading(true);
    setProgress(0);
    setError("");

    const form = new FormData();
    form.append("ref", cleanRef);
    form.append("quoteToken", quote.quoteToken);
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: Partial<Result> & { error?: string; quoteExpired?: boolean } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no JSON */
      }

      if (xhr.status === 200) {
        const ok = data as Result;
        setResult(ok);
        setBalanceClp(ok.balanceClp);
        setFile(null);
        setQuote(null);
        setRef("");
        setProgress(0);
        if (inputRef.current) inputRef.current.value = "";
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(data.error || "La subida ha fallado.");
        if (typeof data.balanceClp === "number") setBalanceClp(data.balanceClp);
        if ((xhr.status === 402 || data.quoteExpired) && file) {
          setQuote(null);
          void pick(file, true);
        }
      }
      setUploading(false);
    };

    xhr.onerror = () => {
      setError("Error de red durante la subida.");
      setUploading(false);
    };

    xhr.send(form);
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace a mano.");
    }
  }

  function reset() {
    quoteSequence.current += 1;
    setFile(null);
    setQuote(null);
    setRef("");
    setResult(null);
    setError("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="card">
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(event) => pick(event.target.files?.[0])}
      />

      <div className={`moneyrow ${file ? "two" : ""}`}>
        <div className="money">
          <span className="money-label">Saldo disponible</span>
          <span className="money-value">
            {formatClp(balanceClp)} <em>CLP</em>
          </span>
          <span className="money-note">Crédito para subir archivos</span>
        </div>

        {file ? (
          <div className={`money ${quote && !quote.sufficient ? "danger" : "cost"}`}>
            <span className="money-label">Coste de esta subida</span>
            <span className="money-value">
              {quoting || !quote ? (
                "…"
              ) : (
                <>
                  {formatClp(quote.costClp)} <em>CLP</em>
                </>
              )}
            </span>
            <span className="money-note">
              {quoting || !quote
                ? "Calculando al cambio del día…"
                : quote.minApplied
                  ? "Tarifa mínima aplicada · precio final"
                  : quote.liveRate
                    ? `${quote.multiplier}× coste operativo · cotización actualizada`
                    : "Cotización de respaldo · precio final"}
            </span>
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="okbanner" role="status">
          <div className="okbanner-body">
            <span className="okbanner-title">Subida recibida</span>
            <a className="okbanner-url" href={result.url} target="_blank" rel="noopener noreferrer">
              {result.url}
            </a>
            <span className="okbanner-meta">
              Etiqueta <code>{result.ref}</code> · coste{" "}
              {formatClp(result.costClp)} CLP · verificación en curso
            </span>
          </div>
          <div className="result-qr">
            <img src={`/api/qr/${result.ref}`} alt={`Código QR del archivo ${result.ref}`} width="112" height="112" />
            <span>Acceso directo</span>
          </div>
          <div className="okbanner-actions">
            <button className="btn primary small" type="button" onClick={copy}>
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              className="xbtn"
              type="button"
              onClick={() => setResult(null)}
              aria-label="Cerrar aviso"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {file ? (
        <div className="filepanel">
          <div className="file">
            <div className="fico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
                <path d="M13.5 3v5.5H19" strokeLinecap="round" />
              </svg>
            </div>
            <div className="fmeta">
              <div className="fname">{file.name}</div>
              <div className="fsize">
                {formatBytes(file.size)}
                {file.type ? ` · ${file.type}` : ""}
              </div>
            </div>
            {!uploading ? (
              <button className="xbtn" type="button" onClick={reset} aria-label="Quitar archivo">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            ) : null}
          </div>

          {!uploading ? (
            <label className="field refield">
              <span>
                Etiqueta · tu enlace será <code>/f/{cleanRef || "…"}</code>
              </span>
              <input
                type="text"
                value={ref}
                onChange={(event) => setRef(event.target.value)}
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                placeholder="mi-informe"
              />
            </label>
          ) : null}

          {uploading ? (
            <>
              <div className="prow">
                <span>{progress < 100 ? "Subiendo de forma segura…" : "Generando la firma y publicando…"}</span>
                <span className="ppct">{progress}%</span>
              </div>
              <div className={`bar ${progress >= 100 ? "wait" : ""}`}>
                <i style={{ width: `${progress}%` }} />
              </div>
              <p className="hint center">
                {progress >= 100
                  ? "Esto puede tardar unos segundos. No cierres la pestaña."
                  : "El archivo se está enviando. No cierres la pestaña."}
              </p>
            </>
          ) : (
            <>
              {!quoting && quote ? (
                <p className={`moneynote ${quote.sufficient ? "" : "danger"}`}>
                  {quote.sufficient
                    ? `Al publicar te quedarán ${formatClp(
                        quote.balanceClp - quote.costClp,
                      )} CLP.`
                    : "No te llega el saldo. Pide una recarga al administrador."}
                </p>
              ) : null}

              {!refValid ? (
                <p className="hint center">La etiqueta necesita al menos 3 caracteres.</p>
              ) : null}

              <button
                className="btn primary block"
                type="button"
                onClick={upload}
                disabled={!canUpload}
              >
                Publicar archivo
              </button>
              <div className="center">
                <button className="link" type="button" onClick={() => inputRef.current?.click()}>
                  Elegir otro archivo
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div
          className={`drop ${dragging ? "drag" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Seleccionar un archivo"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files?.[0]);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
            <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
          </svg>
          <h2>Arrastra un archivo aquí</h2>
          <p>o haz clic para elegirlo</p>
          <div className="hint">Texto, imágenes, PDF, vídeo, audio y otros formatos · el límite se valida antes de publicar</div>
        </div>
      )}

      {error ? <div className="err" role="alert">{error}</div> : null}
    </section>
  );
}
