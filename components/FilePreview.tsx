"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format";

const TEXT_TYPES = new Set(["text/plain", "text/csv", "text/markdown", "application/json"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);
const MAX_TEXT_PREVIEW = 2 * 1024 * 1024;

export default function FilePreview({
  slug,
  filename,
  contentType,
  sizeBytes,
}: {
  slug: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  const type = contentType.split(";")[0].toLowerCase();
  const source = `/v/${encodeURIComponent(slug)}`;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(TEXT_TYPES.has(type) && sizeBytes <= MAX_TEXT_PREVIEW);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!TEXT_TYPES.has(type) || sizeBytes > MAX_TEXT_PREVIEW) return;
    const controller = new AbortController();
    setLoading(true);
    setText("");
    setError("");
    fetch(source, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("preview");
        const value = await response.text();
        if (value.length > MAX_TEXT_PREVIEW) throw new Error("size");
        setText(value);
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== "AbortError") setError("No se pudo cargar la vista de texto. Puedes descargar el archivo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sizeBytes, source, type]);

  if (IMAGE_TYPES.has(type)) {
    return (
      <section className="preview-card">
        <div className="preview-heading"><h2>Vista previa</h2><span>{type.replace("image/", "").toUpperCase()}</span></div>
        <div className="image-preview"><img src={source} alt={`Vista previa de ${filename}`} loading="eager" /></div>
      </section>
    );
  }

  if (type === "application/pdf") {
    return (
      <section className="preview-card">
        <div className="preview-heading"><h2>Documento</h2><span>PDF</span></div>
        <iframe className="pdf-preview" src={`${source}#view=FitH`} title={`Documento ${filename}`} />
      </section>
    );
  }

  if (type === "video/mp4" || type === "video/webm") {
    return (
      <section className="preview-card">
        <div className="preview-heading"><h2>Reproductor de vídeo</h2><span>{type === "video/mp4" ? "MP4" : "WEBM"}</span></div>
        <video className="video-preview" controls preload="metadata" playsInline src={source}>Tu navegador no puede reproducir este vídeo.</video>
      </section>
    );
  }

  if (["audio/mpeg", "audio/ogg", "audio/wav", "audio/mp4"].includes(type)) {
    return (
      <section className="preview-card audio-card">
        <div className="preview-heading"><h2>Reproductor de audio</h2><span>{type === "audio/mpeg" ? "MP3" : "AUDIO"}</span></div>
        <div className="audio-art" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg></div>
        <audio className="audio-preview" controls preload="metadata" src={source}>Tu navegador no puede reproducir este audio.</audio>
      </section>
    );
  }

  if (TEXT_TYPES.has(type)) {
    return (
      <section className="preview-card">
        <div className="preview-heading"><h2>Contenido de texto</h2><span>{formatBytes(sizeBytes)}</span></div>
        {sizeBytes > MAX_TEXT_PREVIEW ? (
          <div className="preview-empty">El texto supera el límite de vista previa de 2 MiB. Descárgalo para consultarlo completo.</div>
        ) : loading ? <div className="preview-empty">Cargando contenido…</div>
          : error ? <div className="preview-empty">{error}</div>
            : <pre className="text-preview" tabIndex={0}>{text || "El archivo no contiene texto."}</pre>}
      </section>
    );
  }

  return (
    <section className="preview-card">
      <div className="preview-empty">Este formato no admite una vista previa segura. Utiliza la descarga para abrirlo con una aplicación de confianza.</div>
    </section>
  );
}
