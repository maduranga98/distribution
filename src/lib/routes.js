import { inRange, money, sum } from "./utils";
import { isDone } from "./runs";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday-first display order
export const dow = (date) => new Date(`${date}T00:00:00`).getDay();

const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);

/** Planned numbers for the weekly plan. */
export function planSummary(routes) {
  const days = routes.map((r) => r.days || []);
  return {
    routes: routes.length,
    slots: sum(days, (d) => d.length), // route-days per week
    target: sum(routes, (r) => (r.target || 0) * (r.days?.length || 0)), // weekly sales target
    km: sum(routes, (r) => (r.plannedKm || 0) * (r.days?.length || 0)),
    unscheduled: routes.filter((r) => !r.days?.length).length,
    emptyDays: WEEK.filter((d) => !routes.some((r) => r.days?.includes(d))).length,
  };
}

/** Historical average net sale per run for each weekday (all unloaded runs). */
export function weekdayAverages(runs) {
  const w = Array.from({ length: 7 }, () => ({ runs: 0, net: 0 }));
  for (const r of runs) if (isDone(r)) { const x = w[dow(r.date)]; x.runs++; x.net += r.totals?.sales || 0; }
  return w.map((x) => ({ ...x, avg: x.runs ? x.net / x.runs : null }));
}

/** Per-route performance over unloaded runs in [from, to], plus plain-language insights. */
export function analyzeRoutes({ runs, routes }, from, to) {
  const rs = runs.filter((r) => isDone(r) && inRange(r.date, from, to)).sort((a, b) => a.date.localeCompare(b.date));
  const map = {};
  const blank = (id, name, route) => ({
    id, name, route, runs: 0, dates: new Set(), gross: 0, net: 0, returns: 0, km: 0, kmRuns: 0, expenses: 0, difference: 0, nets: [],
    byDay: Array.from({ length: 7 }, () => ({ runs: 0, net: 0 })),
  });
  routes.forEach((r) => (map[r.id] = blank(r.id, r.name, r)));

  for (const r of rs) {
    const m = (map[r.routeId] ||= blank(r.routeId, r.routeName, null)), t = r.totals || {}, net = t.sales || 0;
    m.runs++; m.dates.add(r.date); m.gross += t.gross || 0; m.net += net; m.returns += t.marketValue || 0;
    if (r.distance > 0) { m.km += r.distance; m.kmRuns++; }
    m.expenses += r.collection?.expenses || 0; m.difference += r.collection?.difference || 0;
    m.nets.push(net);
    const d = m.byDay[dow(r.date)]; d.runs++; d.net += net;
  }

  const list = Object.values(map).map((m) => {
    const avg = m.runs ? m.net / m.runs : null;
    const half = Math.floor(m.nets.length / 2);
    const early = m.nets.slice(0, half), late = m.nets.slice(m.nets.length - half);
    const trend = half >= 2 && sum(early, (x) => x) > 0 ? (sum(late, (x) => x) / half / (sum(early, (x) => x) / half) - 1) * 100 : null;
    const best = m.byDay.map((d, i) => ({ i, avg: d.runs ? d.net / d.runs : -1 })).sort((a, b) => b.avg - a.avg)[0];
    const target = m.route?.target || 0;
    return {
      ...m, days: m.dates.size, avg, trend, perKm: m.km > 0 ? m.net / m.km : null,
      returnRate: pct(m.returns, m.gross), expRate: pct(m.expenses, m.net),
      vsTarget: target > 0 && avg != null ? (avg / target) * 100 : null, target,
      bestDay: best && best.avg >= 0 && m.runs >= 2 ? best.i : null,
    };
  }).sort((a, b) => b.net - a.net);

  const active = list.filter((r) => r.runs > 0);
  const net = sum(active, (r) => r.net), gross = sum(active, (r) => r.gross);
  const pick = (key, dir = 1) => [...active].filter((r) => r[key] != null).sort((a, b) => dir * (b[key] - a[key]))[0];

  const insights = [];
  const top = pick("net"), eff = pick("perKm"), ret = pick("returnRate");
  if (top && active.length > 1) insights.push({ tone: "good", text: `${top.name} brings the most sales — ${money(top.net)} (${pct(top.net, net).toFixed(0)}% of the total).` });
  if (eff && active.filter((r) => r.perKm != null).length > 1) insights.push({ tone: "good", text: `${eff.name} is the most efficient: ${money(eff.perKm)} sales per km.` });
  if (ret && ret.returnRate >= 5) insights.push({ tone: "bad", text: `${ret.name} has the highest market returns — ${ret.returnRate.toFixed(1)}% of its sale value.` });
  active.filter((r) => r.difference < 0).forEach((r) => insights.push({ tone: "bad", text: `${r.name} is ${money(-r.difference)} short on cash in this period.` }));
  active.filter((r) => r.vsTarget != null && r.vsTarget < 80).forEach((r) => insights.push({ tone: "warn", text: `${r.name} averages ${r.vsTarget.toFixed(0)}% of its ${money(r.target)} target.` }));
  active.filter((r) => r.trend != null && r.trend <= -15).forEach((r) => insights.push({ tone: "warn", text: `${r.name} sales are down ${Math.abs(r.trend).toFixed(0)}% compared with earlier in this period.` }));
  list.filter((r) => r.runs === 0 && r.route).forEach((r) => insights.push({ tone: "warn", text: `${r.name} had no runs in this period.` }));

  return {
    list, active, net, gross, runs: rs.length, insights,
    km: sum(active, (r) => r.km), expenses: sum(active, (r) => r.expenses),
    weekday: weekdayAverages(rs),
  };
}
