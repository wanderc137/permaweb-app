"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugifyRef } from "@/lib/format";

export default function Lookup() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const ref = slugifyRef(input);
  const valid = ref.length >= 3;

  return (
    <section className="card">
      <h2 className="cardtitle">Bajar un archivo</h2>
      <p className="cardsub">
        Escribe la etiqueta que se le dio al archivo al subirlo. Te llevaremos a la ficha con el
        botón de descarga.
      </p>

      <form
        className="lookup"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) router.push(`/f/${ref}`);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="mi-informe"
          aria-label="Etiqueta del archivo"
          autoComplete="off"
          maxLength={60}
        />
        <button className="btn primary" type="submit" disabled={!valid}>
          Buscar
        </button>
      </form>

      {input && ref !== input.trim() ? (
        <p className="hint left">
          Se buscará como <code>{ref || "…"}</code>
        </p>
      ) : null}

      <p className="hint">
        La etiqueta es el identificador breve y único que eligió quien publicó el archivo.
      </p>
    </section>
  );
}
