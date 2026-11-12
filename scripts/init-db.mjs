import { readFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL. Copia .env.example a .env.local y ajústalo.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

try {
  await pool.query(schema);
  console.log("Esquema aplicado correctamente.");
} catch (error) {
  console.error("Error aplicando el esquema:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
