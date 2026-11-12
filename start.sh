#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

RUN_DIR="$ROOT/.run"
LOG_DIR="$ROOT/logs"
mkdir -p "$RUN_DIR" "$LOG_DIR"

if [ ! -f ".env.local" ]; then
  echo "Falta .env.local. Copia .env.example y ajusta DATABASE_URL y AUTH_SECRET."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias..."
  npm install --no-audit --no-fund
fi

if curl -fsS -o /dev/null "http://127.0.0.1:3000" 2>/dev/null; then
  echo "La app ya está corriendo en http://localhost:3000"
  exit 0
fi

if ss -ltn 2>/dev/null | grep -q ':3000 '; then
  echo "El puerto 3000 está ocupado por otro proceso. Libéralo antes de arrancar."
  exit 1
fi

echo "=== $(date -Is) start ===" >> "$LOG_DIR/next.log"
echo "=== $(date -Is) start ===" >> "$LOG_DIR/pglite.log"

if ss -ltn 2>/dev/null | grep -q ':5432 '; then
  echo "Postgres ya escucha en 5432; se usa esa base de datos."
else
  echo "Iniciando Postgres de desarrollo (PGlite)..."
  nohup node scripts/dev-db.mjs >> "$LOG_DIR/pglite.log" 2>&1 &
  echo $! > "$RUN_DIR/pglite.pid"

  for _ in $(seq 1 30); do
    ss -ltn 2>/dev/null | grep -q ':5432 ' && break
    sleep 1
  done

  if ! ss -ltn 2>/dev/null | grep -q ':5432 '; then
    echo "La base de datos no arrancó. Revisa $LOG_DIR/pglite.log"
    exit 1
  fi
fi

echo "Compilando..."
if ! npm run build > "$LOG_DIR/build.log" 2>&1; then
  echo "Falló el build. Revisa $LOG_DIR/build.log"
  exit 1
fi

echo "Iniciando Next..."
nohup ./node_modules/.bin/next start >> "$LOG_DIR/next.log" 2>&1 &
echo $! > "$RUN_DIR/next.pid"

for _ in $(seq 1 40); do
  if curl -fsS -o /dev/null "http://127.0.0.1:3000" 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS -o /dev/null "http://127.0.0.1:3000" 2>/dev/null; then
  echo "Next no respondió. Revisa $LOG_DIR/next.log"
  exit 1
fi

echo
echo "PermaDrop escuchando en http://localhost:3000"
echo "Administración: demo@example.com (contraseña privada configurada)"
echo "Logs: $LOG_DIR"
echo "Detener: ./stop.sh"
