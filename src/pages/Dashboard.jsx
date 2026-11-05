import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { stockValue, summarize } from "../lib/accounts";
import { fmtQty, monthStart, money, today } from "../lib/utils";
import { Badge, PageHeader, Stat } from "../components/ui";

export default function Dashboard() {
  const d = useData();
  const t = today();
  const day = summarize(d, t, t);
  const month = summarize(d, monthStart(), t);
  const low = d.products.filter((p) => p.stock <= (p.minStock || 0));
  const onRoad = d.runs.filter((r) => r.status === "loaded").length;

  const days = [...Array(7)].map((_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
    const k = dt.toLocaleDateString("en-CA");
    return { k, label: dt.toLocaleDateString("en-US", { weekday: "short" }), v: summarize(d, k, k).revenue };
  });
  const max = Math.max(...days.map((x) => x.v), 1);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString("en-US", { dateStyle: "full" })}>
        <Link to="/daily" className="btn-primary">Daily loading</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's net sale" value={money(day.revenue)} hint={day.marketReturns ? `after ${money(day.marketReturns)} market returns` : `${day.runCount} unloaded`} />
        <Stat label="Today's profit" value={money(day.grossProfit)} hint="before expenses" tone="good" />
        <Stat label="Month net profit" value={money(month.netProfit)} tone={month.netProfit < 0 ? "bad" : "good"} />
        <Stat label="On the road" value={onRoad} hint="loadings to unload" tone={onRoad ? "bad" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <p className="mb-4 text-sm font-medium">Last 7 days · net sale</p>
          <div className="flex h-40 items-end gap-2">
            {days.map((x) => (
              <div key={x.k} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="max-w-full truncate text-[9px] text-neutral-400 sm:text-[10px]">{x.v ? money(x.v).replace(/\.00$/, "") : ""}</span>
                <div className="flex min-h-0 w-full flex-1 items-end"><div className="w-full rounded bg-brand" style={{ height: `${Math.max((Math.max(x.v, 0) / max) * 100, 2)}%`, opacity: x.k === t ? 1 : 0.2 }} /></div>
                <span className="text-[10px] text-neutral-500">{x.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Low stock</p>
            <span className="text-xs text-neutral-400">Value {money(stockValue(d.products))}</span>
          </div>
          {low.length === 0 ? <p className="py-6 text-center text-sm text-neutral-400">All stocked up</p> : (
            <ul className="divide-y divide-neutral-100">
              {low.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <Badge tone={p.stock <= 0 ? "red" : "amber"}>{fmtQty(p.stock, p.caseSize, p.unit)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
