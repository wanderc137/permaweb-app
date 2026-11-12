import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error("Uso: npm run admin -- usuario@email.com");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(
    "update users set role = 'admin', banned_at = null where email = $1 returning email",
    [email],
  );
  if (!rows[0]) throw new Error("No existe una cuenta con ese email");
  console.log(`${rows[0].email} ahora tiene acceso de administración.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
