import { inRange, sum } from "./utils";

export function summarize({ sales, expenses, payments, movements }, from, to) {
  const s = sales.filter((x) => inRange(x.date, from, to));
  const e = expenses.filter((x) => inRange(x.date, from, to));
  const p = payments.filter((x) => inRange(x.date, from, to));
  const m = movements.filter((x) => x.type === "purchase" && inRange(x.date, from, to));

  const revenue = sum(s, (x) => x.total);
  const cogs = sum(s, (x) => x.cost);
  const expenseTotal = sum(e, (x) => x.amount);
  const purchases = sum(m, (x) => x.qty * x.unitCost);
  const cashIn = sum(s, (x) => x.paid) + sum(p, (x) => x.amount);
  const cashOut = purchases + expenseTotal;
  return {
    revenue, cogs, grossProfit: revenue - cogs, expenses: expenseTotal,
    netProfit: revenue - cogs - expenseTotal, purchases, cashIn, cashOut,
    netCash: cashIn - cashOut, salesCount: s.length,
  };
}

/** Outstanding balance per customer id: credit sales not yet paid minus later payments. */
export function balances({ sales, payments }) {
  const b = {};
  sales.forEach((x) => { if (x.customerId) b[x.customerId] = (b[x.customerId] || 0) + (x.total - x.paid); });
  payments.forEach((x) => { b[x.customerId] = (b[x.customerId] || 0) - x.amount; });
  return b;
}

export const stockValue = (products) => sum(products, (p) => p.stock * p.cost);
