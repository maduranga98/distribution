import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { balances, stockValue, summarize } from "../lib/accounts";
import { monthStart, money, sum, today } from "../lib/utils";
import { Badge, PageHeader, Stat } from "../components/ui";

export default function Dashboard() {
  const d = useData();
  const t = today();
  const day = summarize(d, t, t);
  const month = summarize(d, monthStart(), t);
  const owed = sum(Object.values(balances(d)), (v) => Math.max(v, 0));
  const low = d.products.filter((p) => p.stock <= (p.minStock || 0));

  // last 7 days revenue bars
  const days = [...Array(7)].map((_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
    const k = dt.toLocaleDateString("en-CA");
    return { k, label: dt.toLocaleDateString("en-US", { weekday: "short" }), v: sum(d.sales.filter((s) => s.date === k), (s) => s.total) };
  });
  const max = Math.max(...days.map((x) => x.v), 1);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString("en-US", { dateStyle: "full" })}>
        <Link to="/sales" className="btn-primary">New sale</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's sales" value={money(day.revenue)} hint={`${day.salesCount} orders`} />
        <Stat label="Today's profit" value={money(day.grossProfit)} hint="before expenses" tone="good" />
        <Stat label="Month net profit" value={money(month.netProfit)} tone={month.netProfit < 0 ? "bad" : "good"} />
        <Stat label="Receivables" value={money(owed)} hint="owed by customers" tone={owed > 0 ? "bad" : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <p className="mb-4 text-sm font-medium">Last 7 days</p>
          <div className="flex h-40 items-end gap-2">
            {days.map((x) => (
              <div key={x.k} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] text-neutral-400">{x.v ? money(x.v).replace(/\.00$/, "") : ""}</span>
                <div className="w-full rounded bg-neutral-900" style={{ height: `${Math.max((x.v / max) * 100, 2)}%`, opacity: x.k === t ? 1 : 0.2 }} />
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
                  <Badge tone={p.stock <= 0 ? "red" : "amber"}>{p.stock} {p.unit}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
