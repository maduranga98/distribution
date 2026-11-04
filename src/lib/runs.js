import { num } from "./utils";

/** Per-line maths, mirroring the sheet: Sold = Loaded - Returned - Free. */
export function calcLine(l) {
  const loaded = num(l.loaded), returned = num(l.returned), free = num(l.free);
  const specialQty = num(l.specialQty), marketReturns = num(l.marketReturns);
  const price = num(l.price);
  const special = l.specialPrice > 0 ? num(l.specialPrice) : price;
  const sold = loaded - returned - free;
  const gross = sold * price;
  const concession = specialQty * Math.max(price - special, 0);
  const marketValue = marketReturns * price;
  return {
    sold, gross, concession, marketValue, freeValue: free * price,
    sales: gross - concession - marketValue,
    cost: (sold + free) * num(l.cost),
    error:
      returned < 0 || free < 0 || specialQty < 0 || marketReturns < 0 ? "Negative quantity"
      : sold < 0 ? "Returned + free exceeds loaded"
      : specialQty > sold ? "Special qty exceeds sold"
      : marketReturns > sold ? "Market returns exceed sold" : "",
  };
}

export function calcRun(lines) {
  const rows = lines.map((l) => ({ ...l, ...calcLine(l) }));
  const t = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    rows, sold: t("sold"), gross: t("gross"), concession: t("concession"),
    marketValue: t("marketValue"), freeValue: t("freeValue"), sales: t("sales"), cost: t("cost"),
    error: rows.find((r) => r.error)?.error || "",
  };
}
