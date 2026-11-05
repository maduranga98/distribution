// Single fixed owner path (no login).
export const OWNER = "owner";
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
export const monthStart = (d = today()) => d.slice(0, 8) + "01";

const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => fmt.format(Number(n) || 0);
export const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
export const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
export const cn = (...c) => c.filter(Boolean).join(" ");
export const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

/** Stock is always stored in pieces. caseSize = pieces per case (0/1 = sold loose only). */
export function fmtQty(n, caseSize, unit = "pcs") {
  n = Math.round((Number(n) || 0) * 1000) / 1000;
  const cs = Number(caseSize) || 0;
  if (cs <= 1) return `${n} ${unit}`;
  const sign = n < 0 ? "-" : "", a = Math.abs(n);
  const c = Math.floor(a / cs), r = Math.round((a - c * cs) * 1000) / 1000;
  const parts = [c && `${c} cs`, (r || !c) && `${r} ${unit}`].filter(Boolean).join(" ");
  return sign + parts;
}

/** Default profit margin (% of retail sales) when a business has none set. */
export const DEFAULT_MARGIN = 6;

/** Batch id for one save, e.g. 20261105-143015 (same format as the sheet). */
export function batchId() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
