import { num } from "./utils";

/**
 * Per-item maths for one loading/unloading.
 *   sold   = loaded − unloaded (what came back on the vehicle)
 *   gross  = sold × selling price
 *   net    = gross − (market returns × selling price)
 */
export function calcLine(l) {
  const loaded = num(l.loaded), returned = num(l.returned), mr = num(l.marketReturn);
  const price = num(l.price);
  const sold = loaded - returned;
  const gross = sold * price;
  const marketValue = mr * price;
  return {
    sold, gross, marketValue, sales: gross - marketValue, cost: sold * num(l.cost),
    error: returned < 0 || mr < 0 ? "Negative quantity" : sold < 0 ? `Unloaded more than loaded (${l.name})` : "",
  };
}

export function calcRun(lines) {
  const rows = lines.map((l) => ({ ...l, ...calcLine(l) }));
  const t = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    rows, loaded: t("loaded"), sold: t("sold"), gross: t("gross"), marketValue: t("marketValue"),
    sales: t("sales"), cost: t("cost"), error: rows.find((r) => r.error)?.error || "",
  };
}

export const isDone = (r) => r.status !== "loaded";
