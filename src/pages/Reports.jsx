import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { cashLog, MONTHS, monthRange, monthSummary, yearTracker } from "../lib/reports";
import { cn, money, today } from "../lib/utils";
import { Donut } from "../components/charts";
import { Empty, Stat } from "../components/ui";

const Row = ({ label, value, bold, indent, neg }) => (
  <div className={cn("flex justify-between px-4 py-2.5 text-sm", bold && "font-semibold", indent && "pl-8 text-neutral-500")}>
    <span>{label}</span><span className={cn((neg ? -value : value) < 0 && "text-red-600")}>{money(neg ? -value : value)}</span>
  </div>
);
const tone = (n) => (n < 0 ? "text-red-600" : n > 0 ? "text-emerald-600" : "");

function MonthPicker({ y, m, setY, setM }) {
  return (
    <div className="mb-4 flex gap-2">
      <select className="input !w-28" value={m} onChange={(e) => setM(+e.target.value)}>{MONTHS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
      <input className="input !w-24" type="number" min="2000" max="2100" value={y} onChange={(e) => setY(+e.target.value || new Date().getFullYear())} />
    </div>
  );
}

export function MonthSummary() {
  const d = useData();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const r = useMemo(() => monthSummary(d, y, m), [d.runs, d.expenses, d.grns, d.margin, y, m]);
  const { a, s } = r;
  return (
    <>
      <MonthPicker {...{ y, m, setY, setM }} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net sales" value={money(a.net)} hint={`${r.days} trading days · ${a.runCount} runs`} />
        <Stat label="Gross profit" value={money(s.grossProfit)} tone="good" hint={`${d.margin}% margin`} />
        <Stat label="Net profit" value={money(s.netProfit)} tone={s.netProfit < 0 ? "bad" : "good"} />
        <Stat label="Distance" value={`${+a.distance.toFixed(1)} km`} hint={a.perKm != null ? `${money(a.perKm)} sales / km` : undefined} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card divide-y divide-neutral-100">
          <p className="px-4 py-3 text-sm font-medium">Profit & loss</p>
          <Row label="Sale value" value={s.gross} />
          <Row label="Market returns" value={s.marketReturns} neg indent />
          <Row label="Net sales" value={s.revenue} bold />
          <Row label="Cost of goods" value={s.cogs} neg indent />
          <Row label="Gross profit" value={s.grossProfit} bold />
          {Object.entries(r.byCategory).map(([k, v]) => <Row key={k} label={k} value={v} neg indent />)}
          <Row label="Total expenses" value={s.expenses} neg />
          <Row label="Net profit" value={s.netProfit} bold />
          {r.free > 0 && <Row label="Free issues given (info, not deducted)" value={r.free} indent />}
        </div>
        <div className="card p-4">
          <p className="mb-4 text-sm font-medium">Sale value split</p>
          {a.pie.length ? <Donut data={a.pie} /> : <Empty>No data this month</Empty>}
          {(a.oldCash > 0 || a.oldCheque > 0) && <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">Old credit collected: cash {money(a.oldCash)} · cheques {money(a.oldCheque)}</p>}
        </div>
      </div>
    </>
  );
}

export function YearTracker() {
  const d = useData();
  const [y, setY] = useState(new Date().getFullYear());
  const t = useMemo(() => yearTracker(d, y), [d.runs, d.expenses, d.grns, d.margin, y]);
  const max = Math.max(...t.months.map((x) => x.net), 1);
  const cols = [["net", "Net sales"], ["returns", "Returns"], ["cash", "Cash"], ["cheques", "Cheques"], ["credit", "Credit"], ["expenses", "Expenses"], ["grossProfit", "Gross profit"], ["netProfit", "Net profit"]];
  return (
    <>
      <div className="mb-4"><input className="input !w-28" type="number" min="2000" max="2100" value={y} onChange={(e) => setY(+e.target.value || new Date().getFullYear())} /></div>
      <div className="card mb-4 p-4">
        <p className="mb-4 text-sm font-medium">Net sales by month</p>
        <div className="flex h-36 items-end gap-2">
          {t.months.map((x) => (
            <div key={x.label} className="flex h-full flex-1 flex-col items-center gap-1" title={`${x.label} · ${money(x.net)}`}>
              <div className="flex min-h-0 w-full flex-1 items-end"><div className="w-full rounded bg-brand" style={{ height: `${Math.max((Math.max(x.net, 0) / max) * 100, 2)}%`, opacity: x.runs ? 1 : 0.15 }} /></div>
              <span className="text-[10px] text-neutral-500">{x.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead><tr><th className="th">Month</th>{cols.map(([k, l]) => <th key={k} className="th text-right">{l}</th>)}<th className="th text-right">Km</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {t.months.map((x) => (
              <tr key={x.label} className={cn(!x.runs && "text-neutral-300")}>
                <td className="td font-medium">{x.label}</td>{cols.map(([k]) => <td key={k} className={cn("td text-right", k.endsWith("rofit") && x.runs && tone(x[k]))}>{money(x[k])}</td>)}
                <td className="td text-right">{+x.km.toFixed(1)}</td>
              </tr>
            ))}
            <tr className="bg-neutral-50 font-semibold">
              <td className="td">{y}</td>{cols.map(([k]) => <td key={k} className={cn("td text-right", k.endsWith("rofit") && tone(t.total[k]))}>{money(t.total[k])}</td>)}<td className="td text-right">{+t.total.km.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CashLog() {
  const { runs } = useData();
  const now = new Date();
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [from, to] = monthRange(y, m);
  const rows = useMemo(() => cashLog(runs, from, to), [runs, from, to]);
  const tot = (k) => rows.reduce((s, r) => s + r[k], 0);
  return (
    <>
      <MonthPicker {...{ y, m, setY, setM }} />
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <Empty>No unloaded runs this month</Empty> : (
          <table className="w-full min-w-[980px]">
            <thead><tr><th className="th">Date</th><th className="th text-right">Net sales</th><th className="th text-right">Returns</th><th className="th text-right">Credit</th><th className="th text-right">Cheques</th><th className="th text-right">Discount</th>
              <th className="th text-right">Old credit (cash / chq)</th><th className="th text-right">Expenses</th><th className="th text-right">Expected cash</th><th className="th text-right">Counted</th><th className="th text-right">+/−</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.date}>
                  <td className="td text-neutral-500">{r.date}</td><td className="td text-right">{money(r.net)}</td><td className="td text-right text-neutral-500">{money(r.returns)}</td>
                  <td className="td text-right">{r.recorded ? money(r.credit) : "—"}</td><td className="td text-right">{r.recorded ? money(r.cheques) : "—"}</td><td className="td text-right">{r.recorded ? money(r.discount) : "—"}</td>
                  <td className="td text-right text-neutral-500">{r.recorded ? `${money(r.oldCash)} / ${money(r.oldCheque)}` : "—"}</td>
                  <td className="td text-right">{r.recorded ? money(r.expenses) : "—"}</td><td className="td text-right">{r.recorded ? money(r.expected) : "—"}</td>
                  <td className="td text-right">{r.hasCash ? money(r.counted) : "—"}</td><td className={cn("td text-right font-medium", r.hasCash && tone(r.difference))}>{r.hasCash ? money(r.difference) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-neutral-50 font-semibold">
                <td className="td">Total</td><td className="td text-right">{money(tot("net"))}</td><td className="td text-right">{money(tot("returns"))}</td><td className="td text-right">{money(tot("credit"))}</td><td className="td text-right">{money(tot("cheques"))}</td><td className="td text-right">{money(tot("discount"))}</td>
                <td className="td text-right">{money(tot("oldCash"))} / {money(tot("oldCheque"))}</td><td className="td text-right">{money(tot("expenses"))}</td><td className="td text-right">{money(tot("expected"))}</td>
                <td className="td text-right">{money(tot("counted"))}</td><td className={cn("td text-right", tone(tot("difference")))}>{money(tot("difference"))}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
