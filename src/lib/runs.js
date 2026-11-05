import { num } from "./utils";

/**
 * Per-item maths for one loading/unloading.
 *   sold   = loaded − unloaded (what came back on the vehicle)
 *   free   = pieces given free (part of sold, not paid for; valued at retail price for information)
 *   gross  = (sold − free) × retail price
 *   net    = gross − (market returns × retail price)
 */
export function calcLine(l) {
  const loaded = num(l.loaded), returned = num(l.returned), mr = num(l.marketReturn), free = num(l.free);
  const price = num(l.price);
  const sold = loaded - returned; // pieces that left the vehicle, free issues included
  const gross = (sold - free) * price; // only paid pieces earn sale value
  const marketValue = mr * price;
  return {
    sold, free, freeValue: free * price, gross, marketValue, sales: gross - marketValue, cost: sold * num(l.cost),
    error: returned < 0 || mr < 0 || free < 0 ? "Negative quantity" : sold < 0 ? `Unloaded more than loaded (${l.name})` : free > sold ? `Free issues more than sold (${l.name})` : "",
  };
}

export function calcRun(lines) {
  const rows = lines.map((l) => ({ ...l, ...calcLine(l) }));
  const t = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    rows, loaded: t("loaded"), sold: t("sold"), free: t("free"), freeValue: t("freeValue"), gross: t("gross"), marketValue: t("marketValue"),
    sales: t("sales"), cost: t("cost"), error: rows.find((r) => r.error)?.error || "",
  };
}

export const isDone = (r) => r.status !== "loaded";

/** Distance from the vehicle meter. Null until both readings are entered. */
export function calcDistance(start, end) {
  if (start === "" || start == null || end === "" || end == null) return null;
  return num(end) - num(start);
}

/**
 * Evening cash check for one run.
 *   expected cash = net sales − credit given − cheques received + old credit collected in cash − expenses paid
 *   difference    = cash counted − expected (negative = short)
 */
export function calcCash(netSales, c, expenseTotal) {
  const credit = num(c.credit), cheques = num(c.cheques), oldCash = num(c.oldCash), oldCheque = num(c.oldCheque);
  const counted = c.cashCounted === "" || c.cashCounted == null ? null : num(c.cashCounted);
  const expected = netSales - credit - cheques + oldCash - expenseTotal;
  return {
    credit, cheques, oldCash, oldCheque, expenses: expenseTotal, expected, counted,
    difference: counted == null ? null : counted - expected,
    cashSales: netSales - credit - cheques, // part of today's net sale actually paid in cash
    chequesInHand: cheques + oldCheque,
  };
}
