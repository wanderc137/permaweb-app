const TTL = 5 * 60 * 1000;
const RETRY = 60 * 1000;

type Cache = { value: number; at: number; live: boolean };
let cache: Cache | null = null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(4500),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FX ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Cotización AR → CLP del momento: precio de AR en USD por CoinGecko y
 * dólar observado en CLP por mindicador.cl. Si falla, usa CLP_PER_AR.
 */
export async function getArClp(): Promise<{ value: number; live: boolean }> {
  if (cache && Date.now() - cache.at < TTL) {
    return { value: cache.value, live: cache.live };
  }

  try {
    const [ar, fx] = await Promise.all([
      getJson<{ arweave?: { usd?: number } }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd",
      ),
      getJson<{ serie?: Array<{ valor?: number }> }>("https://mindicador.cl/api/dolar"),
    ]);

    const arUsd = Number(ar?.arweave?.usd);
    const usdClp = Number(fx?.serie?.[0]?.valor);

    if (Number.isFinite(arUsd) && arUsd > 0 && Number.isFinite(usdClp) && usdClp > 0) {
      const value = Math.round(arUsd * usdClp);
      cache = { value, at: Date.now(), live: true };
      return { value, live: true };
    }
  } catch {
    /* sin conexión o API caída: se usa la referencia */
  }

  const fallback = Number(process.env.CLP_PER_AR || 10000);
  const value = Number.isFinite(fallback) && fallback > 0 ? fallback : 10000;
  // Reintenta en un minuto en vez de esperar el TTL completo.
  cache = { value, at: Date.now() - TTL + RETRY, live: false };
  return { value, live: false };
}
