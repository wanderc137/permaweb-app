import { readFileSync } from "node:fs";
import Arweave from "arweave";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

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
const ar = arweave.ar.winstonToAr(winston);

console.log("Wallet del servicio:", address);
console.log("Saldo en Arweave (L1):", ar, "AR");
console.log("Winston:", winston);
