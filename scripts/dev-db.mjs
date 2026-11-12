import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

// Postgres embebido para desarrollo: no necesita Docker ni instalación.
// Uso: npm run dev:db  (en otra terminal) y DATABASE_URL apuntando a este puerto.

const db = await PGlite.create({ dataDir: ".pglite" });
const port = Number(process.env.PGLITE_PORT || 5432);

const server = new PGLiteSocketServer({
  db,
  port,
  host: "127.0.0.1",
  maxConnections: 20,
});

await server.start();
console.log(`Postgres de desarrollo escuchando en 127.0.0.1:${port}`);
console.log(`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${port}/postgres`);

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
