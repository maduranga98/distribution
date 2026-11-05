import { inRange, sum } from "./utils";
import { isDone } from "./runs";
import { onVehicle } from "./accounts";

const bump = (m, k, init) => (m[k] ||= init());

export const UNCATEGORISED = "Uncategorised";
const PALETTE = ["#001948", "#2563eb", "#fd6b01", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];

/**
 * Inventory value (at MRP) per item and per category. Stock on vehicles still counts as inventory.
 * `category` filters the item list; shares are given against the whole stock and against the category.
 */
export function inventoryValue({ products, runs }, category = "") {
  const van = onVehicle(runs);
  const all = products.map((p) => {
    const qty = (p.stock || 0) + (van[p.id] || 0);
    return { id: p.id, name: p.name, sku: p.sku, caseSize: p.caseSize, unit: p.unit, category: p.category || UNCATEGORISED, qty, cost: p.cost || 0, value: qty * (p.cost || 0) };
  });
  const total = sum(all, (i) => i.value);
  const cats = {};
  for (const i of all) {
    const c = bump(cats, i.category, () => ({ key: i.category, label: i.category, value: 0, items: 0 }));
    c.value += i.value; c.items++;
  }
  const categories = Object.values(cats).sort((a, b) => b.value - a.value).map((c, k) => ({ ...c, color: PALETTE[k % PALETTE.length], share: total > 0 ? (c.value / total) * 100 : 0 }));
  const scope = category ? all.filter((i) => i.category === category) : all;
  const scopeValue = sum(scope, (i) => i.value);
  const items = scope.map((i) => ({ ...i, shareTotal: total > 0 ? (i.value / total) * 100 : 0, shareScope: scopeValue > 0 ? (i.value / scopeValue) * 100 : 0 })).sort((a, b) => b.value - a.value);
  return { total, scopeValue, categories, items };
}

/**
 * Business analytics over unloaded runs in [from, to].
 * Pie logic: gross sale = cash + cheques + credit + discounts + market returns.
 * Runs saved before cash tracking existed count as "unrecorded" rather than being guessed.
 */
export function analyze({ runs }, from, to) {
  const rs = runs.filter((r) => isDone(r) && inRange(r.date, from, to));
  const items = {}, routes = {}, days = {}, returns = [], trips = [];
  let cash = 0, cheques = 0, credit = 0, discount = 0, unrecorded = 0, oldCash = 0, oldCheque = 0, expenses = 0, distance = 0, difference = 0, counted = 0;

  for (const r of rs) {
    const c = r.collection, t = r.totals || {};
    if (c) {
      cash += Math.max(c.cashSales, 0); cheques += c.cheques; credit += c.credit; discount += c.discount || 0;
      oldCash += c.oldCash; oldCheque += c.oldCheque; expenses += c.expenses;
      if (c.difference != null) { difference += c.difference; counted++; }
    } else unrecorded += t.sales || 0;
    distance += r.distance || 0;

    const rt = bump(routes, r.routeId, () => ({ id: r.routeId, name: r.routeName, runs: 0, gross: 0, net: 0, returns: 0, km: 0, expenses: 0, difference: 0 }));
    rt.runs++; rt.gross += t.gross || 0; rt.net += t.sales || 0; rt.returns += t.marketValue || 0;
    rt.km += r.distance || 0; rt.expenses += c?.expenses || 0; rt.difference += c?.difference || 0;

    const d = bump(days, r.date, () => ({ date: r.date, net: 0, returns: 0 }));
    d.net += t.sales || 0; d.returns += t.marketValue || 0;

    trips.push({ id: r.id, date: r.date, route: r.routeName, start: r.meterStart, end: r.meterEnd, km: r.distance, net: t.sales || 0, expenses: c?.expenses || 0, difference: c?.difference ?? null });

    for (const i of r.items) {
      const it = bump(items, i.productId, () => ({ id: i.productId, name: i.name, caseSize: i.caseSize, unit: i.unit, loaded: 0, sold: 0, returnedQty: 0, marketQty: 0, free: 0, freeValue: 0, gross: 0, marketValue: 0, net: 0, runs: 0 }));
      it.loaded += i.loaded || 0; it.sold += i.sold || 0; it.returnedQty += i.returned || 0; it.marketQty += i.marketReturn || 0; it.free += i.free || 0; it.freeValue += i.freeValue || 0;
      it.gross += i.gross || 0; it.marketValue += i.marketValue || 0; it.net += i.sales || 0; it.runs++;
      if (i.marketReturn > 0) returns.push({ key: `${r.id}-${i.productId}`, date: r.date, route: r.routeName, name: i.name, caseSize: i.caseSize, unit: i.unit, qty: i.marketReturn, value: i.marketValue || 0 });
    }
  }

  const gross = sum(rs, (r) => r.totals?.gross || 0);
  const marketValue = sum(rs, (r) => r.totals?.marketValue || 0);
  const net = gross - marketValue;
  const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);

  const itemList = Object.values(items).map((i) => ({ ...i, sellThrough: pct(i.sold, i.loaded), returnRate: pct(i.marketQty, i.sold), share: pct(i.net, net) }));
  const routeList = Object.values(routes).map((r) => ({ ...r, perKm: r.km > 0 ? r.net / r.km : null }));

  return {
    runCount: rs.length, gross, marketValue, net, expenses, distance, oldCash, oldCheque, difference, counted,
    pie: [
      { key: "cash", label: "Cash", value: cash, color: "#001948" },
      { key: "cheques", label: "Cheques", value: cheques, color: "#2563eb" },
      { key: "credit", label: "Credit", value: credit, color: "#fd6b01" },
      { key: "discount", label: "Discounts", value: discount, color: "#8b5cf6" },
      { key: "returns", label: "Market returns", value: marketValue, color: "#ef4444" },
      { key: "unrecorded", label: "Not recorded", value: unrecorded, color: "#d4d4d4" },
    ].filter((p) => p.value > 0),
    items: itemList,
    routes: routeList,
    days: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)),
    returns: returns.sort((a, b) => b.date.localeCompare(a.date) || b.value - a.value),
    trips: trips.sort((a, b) => b.date.localeCompare(a.date)),
    freeValue: sum(rs, (r) => r.totals?.freeValue || 0),
    returnRate: pct(marketValue, gross),
    perKm: distance > 0 ? net / distance : null,
  };
}
