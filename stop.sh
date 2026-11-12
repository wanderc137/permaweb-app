#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUN_DIR="$ROOT/.run"

stop_one() {
  local name="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    echo "$name: sin PID registrado."
    return
  fi

  local pid
  pid="$(cat "$file" 2>/dev/null || true)"

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "Deteniendo $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true

    for _ in $(seq 1 12); do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 1
    done

    if kill -0 "$pid" 2>/dev/null; then
      echo "$name no terminó con SIGTERM; forzando..."
      kill -9 "$pid" 2>/dev/null || true
    fi
  else
    echo "$name: el proceso ya no estaba corriendo."
  fi

  rm -f "$file"
}

stop_one "Next" "$RUN_DIR/next.pid"
stop_one "Postgres (PGlite)" "$RUN_DIR/pglite.pid"

sleep 1

if curl -fsS -o /dev/null "http://127.0.0.1:3000" 2>/dev/null; then
  echo "Aviso: el puerto 3000 sigue respondiendo (¿lo arrancaste a mano?)."
else
  echo "Next detenido."
fi

if ss -ltn 2>/dev/null | grep -q ':5432 '; then
  echo "Aviso: el puerto 5432 sigue ocupado (¿hay otro Postgres?)."
else
  echo "Base de datos detenida."
fi
