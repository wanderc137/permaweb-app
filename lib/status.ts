import { arweave } from "./arweave";
import { q } from "./db";

/**
 * Consulta el estado de la transacción L1 y, si ya está minada, la marca
 * como confirmada guardando el bloque.
 */
export async function refreshStatus(
  slug: string,
  txid: string,
  status: string,
): Promise<string> {
  if (status !== "pending") return status;

  try {
    const res = await arweave().transactions.getStatus(txid);
    if (res.status === 200 && res.confirmed) {
      await q(
        `update uploads
            set status = 'confirmed', confirmed_at = now(), block_height = $2::bigint
          where slug = $1 and status = 'pending'`,
        [slug, String(res.confirmed.block_height)],
      );
      return "confirmed";
    }
  } catch (error) {
    console.error("status check failed", slug, error);
  }

  return "pending";
}

export function statusLabel(status: string): string {
  if (status === "confirmed") return "Confirmado";
  if (status === "failed") return "Error";
  if (status === "publishing") return "Publicando";
  return "Confirmando";
}
