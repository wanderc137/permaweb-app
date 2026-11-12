const WINC = 10n ** 12n;

export function wincToAr(winc: bigint | string): string {
  const value = typeof winc === "bigint" ? winc : BigInt(winc);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / WINC;
  const fraction = (abs % WINC).toString().padStart(12, "0").slice(0, 6).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? "." + fraction : ""}`;
}

export function arToWinc(ar: string | number): bigint {
  const raw = String(ar).trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Cantidad de AR inválida: ${raw}`);
  const [whole, fraction = ""] = raw.split(".");
  const padded = (fraction + "0".repeat(12)).slice(0, 12);
  return BigInt(whole || "0") * WINC + BigInt(padded || "0");
}

export function slugifyRef(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatBytes(bytes: number | string): string {
  let value = Number(bytes);
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value < 10 ? value.toFixed(2) : value.toFixed(1)} ${units[unit]}`;
}

export function formatClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}
