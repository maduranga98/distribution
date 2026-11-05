import { DEFAULT_MARGIN, inRange, sum } from "./utils";
import { isDone } from "./runs";

/** Profit & loss from unloaded runs (net of market returns), GRN purchases and expenses. */
export function summarize({ runs, expenses, grns, margin = DEFAULT_MARGIN }, from, to) {
  const r = runs.filter((x) => isDone(x) && inRange(x.date, from, to));
  const e = expenses.filter((x) => inRange(x.date, from, to));
  const g = grns.filter((x) => inRange(x.date, from, to));

  const gross = sum(r, (x) => x.totals?.gross ?? 0);
  const marketReturns = sum(r, (x) => x.totals?.marketValue ?? 0);
  const revenue = sum(r, (x) => x.totals?.sales ?? 0);
  const cogs = revenue * (1 - margin / 100); // profit is margin % of retail sales, the rest is cost
  const expenseTotal = sum(e, (x) => x.amount);
  return {
    gross, marketReturns, revenue, cogs, grossProfit: revenue - cogs, expenses: expenseTotal,
    netProfit: revenue - cogs - expenseTotal, purchases: sum(g, (x) => x.total), runCount: r.length,
  };
}

export const stockValue = (products) => sum(products, (p) => p.stock * p.cost);

/** Qty currently on vehicles (loaded, not yet unloaded) per product id. */
export function onVehicle(runs) {
  const m = {};
  runs.filter((r) => !isDone(r)).forEach((r) => r.items.forEach((i) => (m[i.productId] = (m[i.productId] || 0) + i.loaded)));
  return m;
}
