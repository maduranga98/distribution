import { useState } from "react";
import { useData } from "../context/DataContext";
import { balances, stockValue, summarize } from "../lib/accounts";
import { monthStart, money, sum, today } from "../lib/utils";
import { PageHeader, Stat } from "../components/ui";

const Row = ({ label, value, bold, indent }) => (
  <div className={`flex justify-between px-4 py-2.5 text-sm ${bold ? "font-semibold" : ""} ${indent ? "pl-8 text-neutral-500" : ""}`}>
    <span>{label}</span><span className={value < 0 ? "text-red-600" : ""}>{money(value)}</span>
  </div>
);

export default function Accounting() {
  const d = useData();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const s = summarize(d, from, to);
  const owed = sum(Object.values(balances(d)), (v) => Math.max(v, 0));

  const byCategory = {};
  d.expenses.filter((e) => e.date >= from && e.date <= to).forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.amount));

  return (
    <>
      <PageHeader title="Accounts" subtitle="Profit & loss, cash flow, balances">
        <input type="date" className="input !w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-neutral-400">→</span>
        <input type="date" className="input !w-40" value={to} onChange={(e) => setTo(e.target.value)} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card divide-y divide-neutral-100">
          <p className="px-4 py-3 text-sm font-medium">Profit & loss</p>
          <Row label="Revenue" value={s.revenue} />
          <Row label="Cost of goods sold" value={-s.cogs} indent />
          <Row label="Gross profit" value={s.grossProfit} bold />
          {Object.entries(byCategory).map(([k, v]) => <Row key={k} label={k} value={-v} indent />)}
          <Row label="Total expenses" value={-s.expenses} />
          <Row label="Net profit" value={s.netProfit} bold />
        </div>

        <div className="card divide-y divide-neutral-100">
          <p className="px-4 py-3 text-sm font-medium">Cash flow</p>
          <Row label="Cash received (sales + payments)" value={s.cashIn} />
          <Row label="Stock purchases" value={-s.purchases} indent />
          <Row label="Expenses" value={-s.expenses} indent />
          <Row label="Net cash movement" value={s.netCash} bold />
        </div>
      </div>

      <p className="mb-2 mt-6 text-sm font-medium">Position today</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Stock value (at cost)" value={money(stockValue(d.products))} />
        <Stat label="Owed by customers" value={money(owed)} />
      </div>
    </>
  );
}
