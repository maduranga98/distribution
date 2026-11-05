import { analyze } from "./analytics";
import { summarize } from "./accounts";
import { inRange, sum } from "./utils";
import { isDone } from "./runs";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n) => String(n).padStart(2, "0");
/** First and last day of month m (0-11) of year y, as YYYY-MM-DD. */
export const monthRange = (y, m) => [`${y}-${p2(m + 1)}-01`, `${y}-${p2(m + 1)}-${p2(new Date(y, m + 1, 0).getDate())}`];

/** One month: sales, cash split, expenses by category, profit (margin model), distance. */
export function monthSummary(d, y, m) {
  const [from, to] = monthRange(y, m);
  const a = analyze(d, from, to), s = summarize(d, from, to);
  const byCategory = {};
  d.expenses.filter((e) => inRange(e.date, from, to)).forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.amount));
  const days = new Set(d.runs.filter((r) => isDone(r) && inRange(r.date, from, to)).map((r) => r.date)).size;
  return { from, to, a, s, byCategory, days, free: sum(d.runs.filter((r) => isDone(r) && inRange(r.date, from, to)), (r) => r.totals?.freeValue || 0) };
}

/** Twelve months of a year, plus a total row. */
export function yearTracker(d, y) {
  const months = MONTHS.map((label, m) => {
    const { a, s } = monthSummary(d, y, m);
    const c = (k) => a.pie.find((x) => x.key === k)?.value || 0;
    return { label, m, gross: a.gross, returns: a.marketValue, net: a.net, expenses: s.expenses, grossProfit: s.grossProfit, netProfit: s.netProfit, cash: c("cash"), cheques: c("cheques"), credit: c("credit"), km: a.distance, runs: a.runCount, purchases: s.purchases };
  });
  const keys = ["gross", "returns", "net", "expenses", "grossProfit", "netProfit", "cash", "cheques", "credit", "km", "runs", "purchases"];
  return { months, total: Object.fromEntries(keys.map((k) => [k, sum(months, (x) => x[k])])) };
}

/** One row per day: sales, collections, expenses, expected vs counted cash. */
export function cashLog(runs, from, to) {
  const days = {};
  runs.filter((r) => isDone(r) && inRange(r.date, from, to)).forEach((r) => {
    const c = r.collection, t = r.totals || {};
    const d = (days[r.date] ||= { date: r.date, net: 0, returns: 0, credit: 0, cheques: 0, oldCash: 0, oldCheque: 0, expenses: 0, expected: 0, counted: 0, difference: 0, hasCash: false, recorded: false });
    d.net += t.sales || 0; d.returns += t.marketValue || 0;
    if (!c) return;
    d.recorded = true; d.credit += c.credit; d.cheques += c.cheques; d.oldCash += c.oldCash; d.oldCheque += c.oldCheque; d.expenses += c.expenses; d.expected += c.expected;
    if (c.counted != null) { d.hasCash = true; d.counted += c.counted; d.difference += c.difference; }
  });
  return Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
}
