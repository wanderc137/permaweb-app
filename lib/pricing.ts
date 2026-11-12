import { arweave } from "./arweave";
import { getArClp } from "./currency";

const MULTIPLIER = Number(process.env.PRICE_MULTIPLIER || 4);
const MIN_CLP = Number(process.env.MIN_PRICE_CLP || 500);

type CacheEntry = { winston: string; expiresAt: number };
const cache = new Map<number, CacheEntry>();

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB || 25);
  return Math.max(1, mb) * 1024 * 1024;
}

async function l1FeeWinston(bytes: number): Promise<string> {
  const hit = cache.get(bytes);
  if (hit && hit.expiresAt > Date.now()) return hit.winston;

  const winston = await arweave().transactions.getPrice(bytes);
  cache.set(bytes, { winston, expiresAt: Date.now() + 60_000 });
  if (cache.size > 200) cache.clear();
  return winston;
}

export type Price = {
  costClp: number;
  realClp: number;
  arClp: number;
  liveRate: boolean;
  minApplied: boolean;
  multiplier: number;
  feeWinston: string;
  feeAr: number;
};

/**
 * Precio para el usuario: 4 × comisión real de la transacción L1, en CLP
 * al cambio del día, con un mínimo por subida.
 */
export async function priceForBytes(bytes: number): Promise<Price> {
  const [{ value: arClp, live }, winston] = await Promise.all([
    getArClp(),
    l1FeeWinston(bytes),
  ]);

  const feeAr = Number(arweave().ar.winstonToAr(winston));
  const realClp = feeAr * arClp;
  const raw = realClp * MULTIPLIER;
  const minApplied = Math.round(raw) < MIN_CLP;

  return {
    costClp: minApplied ? MIN_CLP : Math.round(raw),
    realClp,
    arClp,
    liveRate: live,
    minApplied,
    multiplier: MULTIPLIER,
    feeWinston: winston,
    feeAr,
  };
}
