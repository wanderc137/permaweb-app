"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Lookup from "./Lookup";

export default function ModeSwitch({ upload }: { upload: ReactNode }) {
  const [mode, setMode] = useState<"upload" | "download">("upload");

  return (
    <>
      <div className="modes" role="tablist" aria-label="Subir o descargar">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          className={mode === "upload" ? "on" : ""}
          onClick={() => setMode("upload")}
        >
          Subir archivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "download"}
          className={mode === "download" ? "on" : ""}
          onClick={() => setMode("download")}
        >
          Consultar
        </button>
      </div>

      {mode === "upload" ? upload : <Lookup />}
    </>
  );
}
