import { readFileSync } from "node:fs";
import Arweave from "arweave";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

function formatClp(amount) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function arClp() {
  try {
    const [ar, fx] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd").then((r) => r.json()),
      fetch("https://mindicador.cl/api/dolar").then((r) => r.json()),
    ]);
    const value = Number(ar?.arweave?.usd) * Number(fx?.serie?.[0]?.valor);
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  } catch {
    /* usa la referencia */
  }
  return Number(process.env.CLP_PER_AR || 10000);
}

const jwk = JSON.parse(
  process.env.ARWEAVE_JWK ||
    readFileSync(process.env.ARWEAVE_JWK_PATH || "./wallet.json", "utf8"),
);

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
});

const address = await arweave.wallets.jwkToAddress(jwk);
const winston = await arweave.wallets.getBalance(address);
const ar = Number(arweave.ar.winstonToAr(winston));
const rate = await arClp();

console.log("Wallet del servicio:", address);
console.log("Saldo L1:", ar.toFixed(6), "AR");
console.log("Equivalente:", formatClp(Math.round(ar * rate)), `(1 AR = ${formatClp(rate)})`);
