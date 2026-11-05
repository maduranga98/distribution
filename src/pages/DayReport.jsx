import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../context/DataContext";
import { dayReport } from "../lib/reports";
import { cn, money, today } from "../lib/utils";
import { Empty, PageHeader, Stat } from "../components/ui";

const tone = (n) => (n < 0 ? "text-red-600" : n > 0 ? "text-emerald-600" : "");
const shift = (date, days) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};
const Row = ({ label, value, bold, indent, sign }) => (
  <div className={cn("flex justify-between px-4 py-2.5 text-sm", bold && "font-semibold", indent && "pl-8 text-neutral-500")}>
    <span>{label}</span><span>{sign}{money(value)}</span>
  </div>
);

/** Saved daily report: sales, credit, cheques, returns, discounts, expected vs real cash and expenses. */
export default function DayReport() {
  const { runs, expenses } = useData();
  const [date, setDate] = useState(today());
  const r = useMemo(() => dayReport(runs, expenses, date), [runs, expenses, date]);
  const t = r.total;
  const recorded = r.rows.filter((x) => x.recorded);

  return (
    <>
      <PageHeader title="Day report" subtitle="Sales, collections, discounts, cash & expenses">
        <Link to="/daily" className="btn-ghost">Back to daily</Link>
        <button className="btn-ghost !px-2" onClick={() => setDate(shift(date, -1))} aria-label="Previous day"><ChevronLeft size={16} /></button>
        <input type="date" className="input !w-40" value={date} onChange={(e) => setDate(e.target.value || today())} />
        <button className="btn-ghost !px-2" onClick={() => setDate(shift(date, 1))} aria-label="Next day"><ChevronRight size={16} /></button>
      </PageHeader>

      {r.rows.length === 0 ? <div className="card"><Empty>No unloaded runs on this day</Empty></div> : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Net sales" value={money(t.net)} hint={`${r.rows.length} runs · ${+t.km.toFixed(1)} km`} />
            <Stat label="Expected cash" value={money(t.expected)} hint="from the system" />
            <Stat label="Cash on hand (real)" value={t.hasCash ? money(t.counted) : "—"} hint={t.pending ? `${t.pending} run(s) not counted` : "counted"} />
            <Stat label="Difference" value={t.hasCash ? `${t.difference > 0 ? "+" : ""}${money(t.difference)}` : "—"}
              tone={!t.hasCash || t.difference === 0 ? undefined : t.difference < 0 ? "bad" : "good"} hint={t.difference < 0 ? "short" : t.difference > 0 ? "excess" : undefined} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card divide-y divide-neutral-100">
              <p className="px-4 py-3 text-sm font-medium">Sales & collections</p>
              <Row label="Sale value" value={t.gross} />
              <Row label="Market returns" value={t.returns} sign="−" indent />
              <Row label="Net sales" value={t.net} bold />
              <Row label="Credit given" value={t.credit} sign="−" indent />
              <Row label="Cheques received" value={t.cheques} sign="−" indent />
              <Row label="Discounts given" value={t.discount} sign="−" indent />
              <Row label="Old credit collected (cash)" value={t.oldCash} sign="+" indent />
              <Row label="Expenses" value={t.expenses} sign="−" indent />
              <Row label="Expected cash" value={t.expected} bold />
              <Row label="Cash on hand (counted)" value={t.counted} />
              <div className={cn("flex justify-between px-4 py-2.5 text-sm font-semibold", t.hasCash && tone(t.difference))}>
                <span>Difference (excess / short)</span><span>{t.hasCash ? `${t.difference > 0 ? "+" : ""}${money(t.difference)}` : "—"}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card divide-y divide-neutral-100">
                <p className="px-4 py-3 text-sm font-medium">Cheques in hand</p>
                <Row label="Today's sales cheques" value={t.cheques} />
                <Row label="Old credit cheques" value={t.oldCheque} indent />
                <Row label="Total cheques" value={t.cheques + t.oldCheque} bold />
                {t.free > 0 && <Row label="Free issues (value, info only)" value={t.free} indent />}
              </div>
              <div className="card divide-y divide-neutral-100">
                <p className="px-4 py-3 text-sm font-medium">Expenses</p>
                {r.expenseList.length === 0 && <p className="px-4 py-3 text-sm text-neutral-400">No expenses</p>}
                {r.expenseList.map((e, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                    <span>{e.category}<span className="text-neutral-400"> · {e.route}{e.note ? ` · ${e.note}` : ""}</span></span><span>{money(e.amount)}</span>
                  </div>
                ))}
                {r.expenseList.length > 0 && <Row label="Total" value={t.expenses + r.otherExpenseTotal} bold />}
              </div>
            </div>
          </div>

          <div className="card mt-4 overflow-x-auto">
            <p className="px-4 py-3 text-sm font-medium">By route</p>
            <table className="w-full min-w-[900px]">
              <thead><tr>
                <th className="th">Route</th><th className="th text-right">Net sales</th><th className="th text-right">Returns</th><th className="th text-right">Credit</th><th className="th text-right">Cheques</th>
                <th className="th text-right">Discount</th><th className="th text-right">Expenses</th><th className="th text-right">Expected</th><th className="th text-right">Real cash</th><th className="th text-right">+/−</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {r.rows.map((x) => (
                  <tr key={x.id}>
                    <td className="td font-medium">{x.route}{x.visit > 1 && <span className="text-xs font-normal text-neutral-400"> visit {x.visit}</span>}</td>
                    <td className="td text-right">{money(x.net)}</td><td className="td text-right text-neutral-500">{money(x.returns)}</td>
                    <td className="td text-right">{x.recorded ? money(x.credit) : "—"}</td><td className="td text-right">{x.recorded ? money(x.cheques) : "—"}</td>
                    <td className="td text-right">{x.recorded ? money(x.discount) : "—"}</td><td className="td text-right">{x.recorded ? money(x.expenses) : "—"}</td>
                    <td className="td text-right">{x.recorded ? money(x.expected) : "—"}</td>
                    <td className="td text-right">{x.counted != null ? money(x.counted) : "—"}</td>
                    <td className={cn("td text-right font-medium", x.difference != null && tone(x.difference))}>{x.difference != null ? money(x.difference) : "—"}</td>
                  </tr>
                ))}
                {recorded.length > 1 && (
                  <tr className="bg-neutral-50 font-semibold">
                    <td className="td">Total</td><td className="td text-right">{money(t.net)}</td><td className="td text-right">{money(t.returns)}</td><td className="td text-right">{money(t.credit)}</td>
                    <td className="td text-right">{money(t.cheques)}</td><td className="td text-right">{money(t.discount)}</td><td className="td text-right">{money(t.expenses)}</td>
                    <td className="td text-right">{money(t.expected)}</td><td className="td text-right">{t.hasCash ? money(t.counted) : "—"}</td>
                    <td className={cn("td text-right", t.hasCash && tone(t.difference))}>{t.hasCash ? money(t.difference) : "—"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
