import { useState } from "react";
import { useBusiness } from "../context/BusinessContext";
import { useData } from "../context/DataContext";
import { stockValue, summarize } from "../lib/accounts";
import { monthStart, money, num, today } from "../lib/utils";
import { PageHeader, Stat } from "../components/ui";

const Row = ({ label, value, bold, indent }) => (
  <div className={`flex justify-between px-4 py-2.5 text-sm ${bold ? "font-semibold" : ""} ${indent ? "pl-8 text-neutral-500" : ""}`}>
    <span>{label}</span><span className={value < 0 ? "text-red-600" : ""}>{money(value)}</span>
  </div>
);

export default function Accounting() {
  const d = useData();
  const { current, update } = useBusiness();
  const [m, setM] = useState(String(d.margin));
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const s = summarize(d, from, to);

  const byCategory = {};
  d.expenses.filter((e) => e.date >= from && e.date <= to).forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.amount));

  return (
    <>
      <PageHeader title="Accounts" subtitle="Profit & loss and purchases">
        <input type="date" className="input min-w-[9rem] flex-1 sm:w-40 sm:flex-none" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-neutral-400">→</span>
        <input type="date" className="input min-w-[9rem] flex-1 sm:w-40 sm:flex-none" value={to} onChange={(e) => setTo(e.target.value)} />
      </PageHeader>

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Profit margin</p>
          <p className="text-xs text-neutral-400">% of retail sales for {current.name}. Cost of goods = retail sales − margin.</p>
        </div>
        <form className="flex w-full items-center gap-2 sm:w-auto" onSubmit={(e) => { e.preventDefault(); update(current.id, current.name, num(m)); }}>
          <input className="input !w-24 text-right" type="number" step="any" min="0" max="100" required value={m} onChange={(e) => setM(e.target.value)} />
          <span className="text-sm text-neutral-500">%</span>
          <button className="btn-primary" disabled={num(m) === d.margin}>Save</button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card divide-y divide-neutral-100">
          <p className="px-4 py-3 text-sm font-medium">Profit & loss</p>
          <Row label="Sale value (sold × price)" value={s.gross} />
          <Row label="Market returns" value={-s.marketReturns} indent />
          <Row label="Net sales" value={s.revenue} bold />
          <Row label={`Cost of goods sold (retail − ${d.margin}%)`} value={-s.cogs} indent />
          <Row label="Gross profit" value={s.grossProfit} bold />
          {Object.entries(byCategory).map(([k, v]) => <Row key={k} label={k} value={-v} indent />)}
          <Row label="Total expenses" value={-s.expenses} />
          <Row label="Net profit" value={s.netProfit} bold />
        </div>

        <div className="card divide-y divide-neutral-100">
          <p className="px-4 py-3 text-sm font-medium">Purchases</p>
          <Row label="Stock received (GRN)" value={s.purchases} />
          <Row label="Expenses" value={s.expenses} indent />
          <Row label="Total spent" value={s.purchases + s.expenses} bold />
        </div>
      </div>

      <p className="mb-2 mt-6 text-sm font-medium">Position today</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Stock value (at MRP)" value={money(stockValue(d.products))} />
        <Stat label="Loadings in period" value={s.runCount} />
      </div>
    </>
  );
}
