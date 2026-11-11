import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useData } from "../context/DataContext";
import { cn, fmtQty, money, monthStart, today } from "../lib/utils";
import { Badge, Empty } from "./ui";

const Filters = ({ from, to, setFrom, setTo, item, setItem, products }) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 p-3">
    <input type="date" className="input !w-36" value={from} onChange={(e) => setFrom(e.target.value || monthStart())} />
    <span className="text-neutral-400">→</span>
    <input type="date" className="input !w-36" value={to} onChange={(e) => setTo(e.target.value || today())} />
    <select className="input !w-48" value={item} onChange={(e) => setItem(e.target.value)}>
      <option value="">All items</option>
      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  </div>
);

function useFilters() {
  const { products } = useData();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [item, setItem] = useState("");
  return { products, from, to, item, props: { from, to, setFrom, setTo, item, setItem, products } };
}
const inScope = (f, r) => r.date >= f.from && r.date <= f.to && (!f.item || r.productId === f.item);

/** Every add / release with on-hand before and after. */
export function LedgerView() {
  const { ledger } = useData();
  const f = useFilters();
  const rows = useMemo(() => ledger.filter((r) => inScope(f, r)).sort((a, b) => b.date.localeCompare(a.date)), [ledger, f.from, f.to, f.item]);
  return (
    <>
      <Filters {...f.props} />
      {rows.length === 0 ? <Empty><BookOpen className="mx-auto mb-2" />No stock movements in this period</Empty> : (
        <table className="w-full min-w-[760px]">
          <thead><tr><th className="th">Date</th><th className="th">Item</th><th className="th">Type</th><th className="th text-right">Qty</th>
            <th className="th text-right">Unit cost</th><th className="th text-right">Value</th><th className="th text-right">Before</th><th className="th text-right">After</th><th className="th">Note</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td text-neutral-500">{r.date}</td><td className="td font-medium">{r.name}</td>
                <td className="td"><Badge tone={r.type === "Add" ? "green" : "red"}>{r.type}</Badge></td>
                <td className="td text-right">{fmtQty(r.qty, r.caseSize, r.unit)}</td>
                <td className="td text-right text-neutral-500">{money(r.unitCost)}</td><td className="td text-right">{money(r.qty * r.unitCost)}</td>
                <td className="td text-right text-neutral-500">{r.before}</td><td className="td text-right">{r.after}</td>
                <td className="td max-w-[14rem] truncate text-neutral-500" title={r.note}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** Per item per route per day: opening, loaded, after loading, returned, closing — with values at cost. */
export function DayReportView() {
  const { runs } = useData();
  const f = useFilters();
  const rows = useMemo(() => runs.filter((r) => r.date >= f.from && r.date <= f.to).sort((a, b) => b.date.localeCompare(a.date) || (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
    .flatMap((r) => r.items.filter((i) => !f.item || i.productId === f.item).map((i) => {
      const hasOpen = i.opening != null, done = r.status !== "loaded";
      const after = hasOpen ? i.opening - i.loaded : null, closing = !done ? null : i.closing ?? (after != null ? after + (i.returned || 0) : null); // saved at unloading; older runs are estimated
      return { key: `${r.id}-${i.productId}`, date: r.date, route: r.routeName, visit: r.visit, batch: r.batchId, i, after, closing, done, opening: i.opening };
    })), [runs, f.from, f.to, f.item]);
  return (
    <>
      <Filters {...f.props} />
      {rows.length === 0 ? <Empty><BookOpen className="mx-auto mb-2" />No loadings in this period</Empty> : (
        <table className="w-full min-w-[900px]">
          <thead><tr><th className="th">Date</th><th className="th">Route</th><th className="th">Item</th><th className="th text-right">Opening</th><th className="th text-right">Loaded</th>
            <th className="th text-right">After loading</th><th className="th text-right">Cost / pc</th><th className="th text-right">Value after loading</th>
            <th className="th text-right">Returned</th><th className="th text-right">Closing</th><th className="th text-right">Value after return</th><th className="th">Batch</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map(({ key, date, route, visit, batch, i, after, closing, done, opening }) => (
              <tr key={key}>
                <td className="td text-neutral-500">{date}</td><td className="td">{route}{visit > 1 && <span className="text-xs text-neutral-400"> · {visit}</span>}</td><td className="td font-medium">{i.name}</td>
                <td className="td text-right text-neutral-500">{opening ?? "—"}</td><td className="td text-right">{i.loaded}</td>
                <td className="td text-right">{after ?? "—"}</td><td className="td text-right text-neutral-500">{money(i.cost)}</td>
                <td className="td text-right">{after == null ? "—" : money(after * i.cost)}</td>
                <td className="td text-right">{done ? i.returned || 0 : <span className="text-neutral-300">on road</span>}</td>
                <td className={cn("td text-right", closing == null && "text-neutral-300")}>{closing ?? "—"}</td>
                <td className="td text-right">{closing == null ? "—" : money(closing * i.cost)}</td>
                <td className="td text-xs text-neutral-400">{batch || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** Retail price changes (new items, GRN price changes and edits). */
export function PriceLogView() {
  const { priceLog } = useData();
  const f = useFilters();
  const rows = useMemo(() => priceLog.filter((r) => inScope(f, r)), [priceLog, f.from, f.to, f.item]);
  return (
    <>
      <Filters {...f.props} />
      {rows.length === 0 ? <Empty>No price changes in this period</Empty> : (
        <table className="w-full">
          <thead><tr><th className="th">Date</th><th className="th">Item</th><th className="th text-right">Old price</th><th className="th text-right">New price</th><th className="th">Source</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.id}><td className="td text-neutral-500">{r.date}</td><td className="td font-medium">{r.name}</td>
                <td className="td text-right text-neutral-500">{r.oldPrice == null ? "—" : money(r.oldPrice)}</td><td className="td text-right font-medium">{money(r.newPrice)}</td>
                <td className="td"><Badge>{r.source}</Badge></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
