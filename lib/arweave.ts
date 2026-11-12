import fs from "node:fs";
import Arweave from "arweave";

type Jwk = {
  kty: string;
  e: string;
  n: string;
  d: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
};

type Client = ReturnType<typeof Arweave.init>;

let client: Client | null = null;
let cachedJwk: Jwk | null = null;

export function arweave(): Client {
  if (!client) {
    client = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
      timeout: 120000,
      logging: false,
    });
  }
  return client;
}

export function loadJwk(): Jwk {
  if (cachedJwk) return cachedJwk;

  const inline = process.env.ARWEAVE_JWK;
  if (inline) {
    cachedJwk = JSON.parse(inline) as Jwk;
  } else {
    const file = process.env.ARWEAVE_JWK_PATH || "./wallet.json";
    cachedJwk = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ file, "utf8"),
    ) as Jwk;
  }

  if (!cachedJwk.kty || !cachedJwk.n || !cachedJwk.e || !cachedJwk.d) {
    throw new Error("El JWK de Arweave no es válido (faltan kty/n/e/d)");
  }
  return cachedJwk;
}

export async function serviceAddress(): Promise<string> {
  return arweave().wallets.jwkToAddress(loadJwk());
}

export async function walletBalanceWinston(): Promise<string> {
  return arweave().wallets.getBalance(await serviceAddress());
}

export class PublicationError extends Error {
  constructor(
    message: string,
    readonly publicationId: string,
    readonly ambiguous: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "PublicationError";
  }
}

/**
 * Publica el archivo como una transacción L1 propia y devuelve su txid.
 * Hasta 8 MiB se envía de una vez; por encima se trocea con el uploader
 * (chunks de 256 KiB), manteniendo una sola transacción y un solo txid.
 */
export async function uploadL1(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const jwk = loadJwk();
  const data = new Uint8Array(buffer);

  const tx = await arweave().createTransaction({ data }, jwk);
  tx.addTag("Content-Type", contentType);
  tx.addTag("App-Name", "PermaDrop");
  tx.addTag("App-Version", "1.0.0");
  tx.addTag("File-Name", filename);

  await arweave().transactions.sign(tx, jwk);

  const reward = BigInt(tx.reward);
  const balance = BigInt(await walletBalanceWinston());
  if (balance < reward) throw new PublicationError("SALDO_INSUFICIENTE", tx.id, false);

  if (data.byteLength <= 8 * 1024 * 1024) {
    let res: { status: number; statusText: string };
    try {
      res = await arweave().transactions.post(tx);
    } catch (error) {
      throw new PublicationError("RESULTADO_DESCONOCIDO", tx.id, true, { cause: error });
    }
    if (res.status >= 400) {
      throw new PublicationError(`PUBLICACION_RECHAZADA_${res.status}`, tx.id, false);
    }
  } else {
    try {
      const uploader = await arweave().transactions.getUploader(tx);
      while (!uploader.isComplete) await uploader.uploadChunk();
    } catch (error) {
      throw new PublicationError("RESULTADO_DESCONOCIDO", tx.id, true, { cause: error });
    }
  }

  return tx.id;
}
