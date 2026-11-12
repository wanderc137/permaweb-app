import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const { Pool } = pg;

function formatClp(amount) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

const [email, amount] = process.argv.slice(2);
const clp = Math.round(Number(amount));

if (!email || !Number.isFinite(clp) || clp <= 0) {
  console.error("Uso: npm run grant -- usuario@email.com 30000");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("begin");
  const { rows } = await client.query(
    `update users set credits_clp = credits_clp + $1::bigint
      where email = $2
      returning id, credits_clp`,
    [String(clp), email.trim().toLowerCase()],
  );

  if (!rows[0]) {
    throw new Error(`No existe ningún usuario con el email ${email}`);
  }

  await client.query(
    `insert into credit_ledger (id, user_id, delta_clp, reason)
     values ($1, $2, $3, $4)`,
    [randomUUID(), rows[0].id, String(clp), "manual grant"],
  );

  await client.query("commit");
  console.log(
    `Añadidos ${formatClp(clp)} a ${email}. Saldo nuevo: ${formatClp(
      Number(rows[0].credits_clp),
    )}`,
  );
} catch (error) {
  await client.query("rollback");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
