export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
export const monthStart = (d = today()) => d.slice(0, 8) + "01";

const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => fmt.format(Number(n) || 0);
export const num = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
export const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
export const cn = (...c) => c.filter(Boolean).join(" ");
export const inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);
