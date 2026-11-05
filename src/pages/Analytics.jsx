import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useData } from "../context/DataContext";
import { analyze } from "../lib/analytics";
import { cn, fmtQty, monthStart, money, today } from "../lib/utils";
import { Bar, Donut } from "../components/charts";
import { Badge, Empty, PageHeader, Stat } from "../components/ui";
import { CashLog, MonthSummary, YearTracker } from "./Reports";

const TABS = [["overview", "Overview"], ["items", "Items"], ["returns", "Market returns"], ["routes", "Routes & trips"], ["cash", "Cash log"], ["month", "Month summary"], ["year", "Year tracker"]];
const SORTS = { net: "Net sales", sold: "Pieces sold", sellThrough: "Sell-through", returnRate: "Return rate" };
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const km = (n) => (n == null ? "—" : `${+n.toFixed(1)} km`);

function lastMonth() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  const f = (x) => x.toLocaleDateString("en-CA");
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [f(d), f(end)];
}

function Overview({ a }) {
  const max = Math.max(...a.days.map((d) => d.net), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Net sales" value={money(a.net)} hint={`${a.runCount} unloaded runs`} />
        <Stat label="Market returns" value={money(a.marketValue)} hint={`${pct(a.returnRate)} of sale value`} tone={a.marketValue ? "bad" : undefined} />
        <Stat label="Free issues" value={money(a.freeValue)} hint="at list price, info only" />
        <Stat label="Expenses" value={money(a.expenses)} hint={a.net ? `${pct((a.expenses / a.net) * 100)} of net sales` : undefined} />
        <Stat label="Cash short / excess" value={`${a.difference > 0 ? "+" : ""}${money(a.difference)}`} tone={a.difference < 0 ? "bad" : a.difference > 0 ? "good" : undefined} hint={`${a.counted} counted days`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <p className="mb-1 text-sm font-medium">Where the sale value went</p>
          <p className="mb-4 text-xs text-neutral-400">Cash + cheques + credit + market returns = sale value ({money(a.gross)})</p>
          {a.pie.length ? <Donut data={a.pie} center={<><span className="text-[11px] text-neutral-400">Sale value</span><span className="text-sm font-semibold">{money(a.gross)}</span></>} />
            : <Empty>No data in this period</Empty>}
          {(a.oldCash > 0 || a.oldCheque > 0) && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
              Old credit collected in this period (not part of the sale above): cash {money(a.oldCash)} · cheques {money(a.oldCheque)}
            </p>
          )}
        </div>
        <div className="card p-4 lg:col-span-2">
          <p className="mb-3 text-sm font-medium">Distance</p>
          <p className="text-2xl font-semibold tracking-tight">{km(a.distance)}</p>
          <p className="mt-0.5 text-xs text-neutral-400">{a.perKm != null ? `${money(a.perKm)} net sale per km` : "Enter meter readings to see sales per km"}</p>
          <p className="mb-2 mt-6 text-sm font-medium">Top items</p>
          <ul className="space-y-2.5">
            {[...a.items].sort((x, y) => y.net - x.net).slice(0, 5).map((i) => (
              <li key={i.id}><div className="mb-1 flex justify-between text-xs"><span className="truncate">{i.name}</span><span className="text-neutral-500">{money(i.net)}</span></div><Bar pct={i.share} /></li>
            ))}
          </ul>
        </div>
      </div>
      {a.days.length > 0 && (
        <div className="card p-4">
          <p className="mb-4 text-sm font-medium">Net sale by day</p>
          <div className="flex h-36 items-end gap-1 overflow-x-auto">
            {a.days.map((d) => (
              <div key={d.date} className="flex min-w-[18px] flex-1 flex-col items-center gap-1" title={`${d.date} · ${money(d.net)}`}>
                <div className="w-full rounded bg-brand" style={{ height: `${Math.max((Math.max(d.net, 0) / max) * 100, 2)}%` }} />
                <span className="text-[9px] text-neutral-400">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Items({ a }) {
  const [sort, setSort] = useState("net");
  const list = [...a.items].sort((x, y) => y[sort] - x[sort]);
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 p-3">
        <p className="text-sm font-medium">Item performance</p>
        <select className="input !w-44" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>Sort: {l}</option>)}
        </select>
      </div>
      {list.length === 0 ? <Empty><BarChart3 className="mx-auto mb-2" />No data in this period</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead><tr>
              <th className="th">Item</th><th className="th text-right">Loaded</th><th className="th text-right">Sold</th>
              <th className="th text-right">Sell-through</th><th className="th text-right">Free</th><th className="th text-right">Mkt returns</th><th className="th text-right">Net sales</th><th className="th w-28">Share</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {list.map((i) => (
                <tr key={i.id}>
                  <td className="td font-medium">{i.name}</td>
                  <td className="td text-right text-neutral-500">{fmtQty(i.loaded, i.caseSize, i.unit)}</td>
                  <td className="td text-right">{fmtQty(i.sold, i.caseSize, i.unit)}</td>
                  <td className="td text-right"><Badge tone={i.sellThrough >= 90 ? "green" : i.sellThrough >= 70 ? "gray" : "amber"}>{pct(i.sellThrough)}</Badge></td>
                  <td className="td text-right text-neutral-500">{i.free ? fmtQty(i.free, i.caseSize, i.unit) : "—"}</td>
                  <td className="td text-right">{i.marketQty ? <span className="text-red-600">{fmtQty(i.marketQty, i.caseSize, i.unit)} · {pct(i.returnRate)}</span> : <span className="text-neutral-300">—</span>}</td>
                  <td className="td text-right font-medium">{money(i.net)}</td>
                  <td className="td"><Bar pct={i.share} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Returns({ a }) {
  const byItem = [...a.items].filter((i) => i.marketQty > 0).sort((x, y) => y.marketValue - x.marketValue);
  const byRoute = [...a.routes].filter((r) => r.returns > 0).sort((x, y) => y.returns - x.returns);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Return value" value={money(a.marketValue)} tone={a.marketValue ? "bad" : undefined} />
        <Stat label="% of sale value" value={pct(a.returnRate)} />
        <Stat label="Entries" value={a.returns.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="px-4 py-3 text-sm font-medium">By item</p>
          {byItem.length === 0 ? <Empty>No market returns</Empty> : (
            <table className="w-full"><tbody className="divide-y divide-neutral-100">
              {byItem.map((i) => (
                <tr key={i.id}><td className="td">{i.name}<div className="mt-1.5"><Bar pct={(i.marketValue / byItem[0].marketValue) * 100} color="#ef4444" /></div></td>
                  <td className="td text-right text-neutral-500">{fmtQty(i.marketQty, i.caseSize, i.unit)}<div className="text-xs">{pct(i.returnRate)} of sold</div></td>
                  <td className="td text-right font-medium">{money(i.marketValue)}</td></tr>
              ))}
            </tbody></table>
          )}
        </div>
        <div className="card">
          <p className="px-4 py-3 text-sm font-medium">By route</p>
          {byRoute.length === 0 ? <Empty>No market returns</Empty> : (
            <table className="w-full"><tbody className="divide-y divide-neutral-100">
              {byRoute.map((r) => (
                <tr key={r.id}><td className="td">{r.name}</td><td className="td text-right text-neutral-500">{pct((r.returns / r.gross) * 100)} of sale</td><td className="td text-right font-medium">{money(r.returns)}</td></tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>
      <div className="card">
        <p className="px-4 py-3 text-sm font-medium">Detail</p>
        {a.returns.length === 0 ? <Empty>No market returns</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[520px]">
            <thead><tr><th className="th">Date</th><th className="th">Route</th><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Value</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {a.returns.map((r) => (
                <tr key={r.key}><td className="td text-neutral-500">{r.date}</td><td className="td">{r.route}</td><td className="td">{r.name}</td>
                  <td className="td text-right">{fmtQty(r.qty, r.caseSize, r.unit)}</td><td className="td text-right font-medium">{money(r.value)}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

function Routes({ a }) {
  return (
    <div className="space-y-4">
      <div className="card">
        <p className="px-4 py-3 text-sm font-medium">Routes</p>
        {a.routes.length === 0 ? <Empty>No data in this period</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr><th className="th">Route</th><th className="th text-right">Runs</th><th className="th text-right">Net sales</th><th className="th text-right">Distance</th>
              <th className="th text-right">Sales / km</th><th className="th text-right">Expenses</th><th className="th text-right">Cash +/−</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {[...a.routes].sort((x, y) => y.net - x.net).map((r) => (
                <tr key={r.id}><td className="td font-medium">{r.name}</td><td className="td text-right text-neutral-500">{r.runs}</td><td className="td text-right">{money(r.net)}</td>
                  <td className="td text-right text-neutral-500">{km(r.km || null)}</td><td className="td text-right">{r.perKm != null ? money(r.perKm) : "—"}</td>
                  <td className="td text-right">{money(r.expenses)}</td>
                  <td className={cn("td text-right", r.difference < 0 && "text-red-600", r.difference > 0 && "text-emerald-600")}>{money(r.difference)}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <div className="card">
        <p className="px-4 py-3 text-sm font-medium">Trip log</p>
        {a.trips.length === 0 ? <Empty>No data in this period</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr><th className="th">Date</th><th className="th">Route</th><th className="th text-right">Meter</th><th className="th text-right">Distance</th>
              <th className="th text-right">Net sales</th><th className="th text-right">Expenses</th><th className="th text-right">Cash +/−</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {a.trips.map((t) => (
                <tr key={t.id}><td className="td text-neutral-500">{t.date}</td><td className="td">{t.route}</td>
                  <td className="td text-right text-neutral-500">{t.start != null ? `${t.start} → ${t.end ?? "?"}` : "—"}</td>
                  <td className="td text-right">{km(t.km)}</td><td className="td text-right">{money(t.net)}</td><td className="td text-right">{money(t.expenses)}</td>
                  <td className={cn("td text-right", t.difference < 0 && "text-red-600", t.difference > 0 && "text-emerald-600")}>{t.difference == null ? "—" : money(t.difference)}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const d = useData();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState("overview");
  const a = useMemo(() => analyze(d, from, to), [d.runs, from, to]);
  const View = { overview: Overview, items: Items, returns: Returns, routes: Routes }[tab];
  const own = ["cash", "month", "year"].includes(tab); // these tabs pick their own month / year

  return (
    <>
      <PageHeader title="Analytics" subtitle="Performance from unloaded runs">
        {!own && <>
        <button className="btn-ghost" onClick={() => { setFrom(monthStart()); setTo(today()); }}>This month</button>
        <button className="btn-ghost" onClick={() => { const [f, t] = lastMonth(); setFrom(f); setTo(t); }}>Last month</button>
        <input type="date" className="input !w-36" value={from} onChange={(e) => setFrom(e.target.value || monthStart())} />
        <span className="text-neutral-400">→</span>
        <input type="date" className="input !w-36" value={to} onChange={(e) => setTo(e.target.value || today())} />
        </>}
      </PageHeader>
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition", tab === k ? "bg-white shadow-sm" : "text-neutral-500 hover:text-brand")}>{l}</button>
        ))}
      </div>
      {tab === "cash" ? <CashLog /> : tab === "month" ? <MonthSummary /> : tab === "year" ? <YearTracker /> : <View a={a} />}
    </>
  );
}
