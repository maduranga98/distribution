import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, ChevronDown, FileText, MapPin, PackageCheck, PackageMinus, Pencil, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { cancelLoading, saveLoading } from "../lib/db";
import { cn, fmtQty, money, num, sum, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";
import StockTable from "../components/StockTable";
import QtyInput from "../components/QtyInput";
import UnloadForm from "../components/UnloadForm";

/** Morning loading. With `run` it edits a saved loading; stock moves by the difference. */
function LoadForm({ date, run, onClose }) {
  const { uid, routes, products, runs } = useData();
  const [d, setD] = useState(run?.date || date);
  const [routeId, setRouteId] = useState(run?.routeId || routes[0]?.id || "");
  const old = useMemo(() => Object.fromEntries((run?.items || []).map((i) => [i.productId, i])), [run]);
  const [qty, setQty] = useState(() => Object.fromEntries((run?.items || []).map((i) => [i.productId, String(i.loaded)])));
  const [q, setQ] = useState("");
  const [meter, setMeter] = useState(run?.meterStart ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lastMeter = runs.find((r) => r.routeId === routeId && r.meterEnd != null)?.meterEnd; // where this vehicle stopped last time
  const route = routes.find((r) => r.id === routeId);
  const visit = run && routeId === run.routeId && d === run.date ? run.visit
    : runs.filter((r) => r.routeId === routeId && r.date === d && r.id !== run?.id).length + 1;
  const room = (p) => p.stock + (old[p.id]?.loaded || 0); // what can still be loaded
  const priceOf = (p) => old[p.id]?.price ?? p.price; // loaded lines keep their saved price
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const picked = products.filter((p) => num(qty[p.id]) > 0);

  const save = async (e) => {
    e.preventDefault();
    if (!route) return setError("Create a route first");
    if (!picked.length) return setError("Enter a loaded quantity for at least one item");
    const over = picked.find((p) => num(qty[p.id]) > room(p));
    if (over) return setError(`Not enough stock for "${over.name}" (available ${room(over)})`);
    setBusy(true); setError("");
    try {
      await saveLoading(uid, {
        date: d, routeId, routeName: route.name, visit, meterStart: meter === "" ? null : num(meter),
        items: picked.map((p) => ({ productId: p.id, name: p.name, unit: p.unit, caseSize: p.caseSize || 0, loaded: num(qty[p.id]), price: priceOf(p), cost: old[p.id]?.cost ?? p.cost })),
      }, run?.id);
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={run ? "Edit loading" : "Load route"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date"><input type="date" className="input" required value={d} onChange={(e) => setD(e.target.value)} /></Field>
          <Field label={`Route · visit ${visit}`}>
            <select className="input" required value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              {routes.length === 0 && <option value="">No routes</option>}
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Vehicle meter (opening)">
          <div className="flex items-center gap-2">
            <input className="input" type="number" inputMode="decimal" min="0" step="any" placeholder="Meter reading" value={meter} onChange={(e) => setMeter(e.target.value)} />
            {lastMeter != null && meter === "" && <button type="button" className="btn-ghost shrink-0" onClick={() => setMeter(String(lastMeter))}>Last: {lastMeter}</button>}
          </div>
        </Field>
        <input className="input" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[45vh] divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1"><div className="truncate text-sm">{p.name}</div><div className="text-xs text-neutral-400">{fmtQty(room(p), p.caseSize, p.unit)} available · {money(priceOf(p))} / pc</div></div>
              <QtyInput className={num(qty[p.id]) > room(p) ? "[&_input]:!border-red-400" : ""} caseSize={p.caseSize} value={qty[p.id] ?? ""} onChange={(v) => setQty({ ...qty, [p.id]: v })} />
            </div>
          ))}
          {list.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No products</p>}
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>{picked.length} items · {sum(picked, (p) => num(qty[p.id]))} pcs in total</span>
          <span>Value {money(sum(picked, (p) => num(qty[p.id]) * priceOf(p)))}</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{run ? "Save changes" : "Save loading"}</button>
      </form>
    </Modal>
  );
}

function RunCard({ run, onEdit, onUnload }) {
  const { uid } = useData();
  const [open, setOpen] = useState(false);
  const done = run.status !== "loaded";
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <button className="min-w-0 basis-full text-left sm:basis-0 sm:flex-1" onClick={() => setOpen(!open)}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-medium">{run.routeName}</span>
            {run.visit > 1 && <span className="text-xs text-neutral-400">visit {run.visit}</span>}
            <Badge tone={done ? "green" : "amber"}>{done ? "Unloaded" : "On the road"}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {run.items.length} items · {sum(run.items, (i) => i.loaded)} pcs loaded
            {done && ` · sold ${run.totals.sold} pcs${run.totals.free ? ` (${run.totals.free} free)` : ""} · market returns ${money(run.totals.marketValue)} · net sale ${money(run.totals.sales)}`}
            {run.meterStart != null && ` · meter ${run.meterStart}${run.meterEnd != null ? ` → ${run.meterEnd}${run.distance != null ? ` (${+run.distance.toFixed(1)} km)` : ""}` : ""}`}
          </p>
          {done && run.collection && (
            <p className="mt-0.5 text-xs text-neutral-500">
              Expenses {money(run.collection.expenses)} · credit {money(run.collection.credit)} · cheques {money(run.collection.cheques)}{run.collection.discount > 0 && ` · discount ${money(run.collection.discount)}`}
              {run.collection.difference != null && <> · <span className={run.collection.difference < 0 ? "text-red-600" : "text-emerald-600"}>
                {run.collection.difference < 0 ? "short" : "excess"} {money(Math.abs(run.collection.difference))}</span></>}
            </p>
          )}
        </button>
        <button className="btn-ghost" onClick={onEdit}><Pencil size={15} />{done ? "Edit unloading" : "Edit loading"}</button>
        {!done && <>
          <button className="btn-primary" onClick={onUnload}><PackageCheck size={16} />Unload</button>
          <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Cancel loading & restock"
            onClick={() => confirm("Cancel this loading and return everything to the warehouse?") && cancelLoading(uid, run)}><Trash2 size={15} /></button>
        </>}
        <ChevronDown size={16} className={cn("ml-auto text-neutral-400 transition", open && "rotate-180")} />
      </div>
      {open && (
        <div className="overflow-x-auto border-t border-neutral-100">
          <table className="w-full">
            <thead><tr>
              <th className="th">Item</th><th className="th text-right">Price / pc</th><th className="th text-right">Loaded</th>
              {done && <><th className="th text-right">Unloaded</th><th className="th text-right">Sold</th><th className="th text-right">Free</th><th className="th text-right">Mkt return</th><th className="th text-right">Net</th></>}
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {run.items.map((i) => (
                <tr key={i.productId}>
                  <td className="td">{i.name}</td><td className="td text-right">{money(i.price)}</td><td className="td text-right">{fmtQty(i.loaded, i.caseSize, i.unit)}</td>
                  {done && <><td className="td text-right">{fmtQty(i.returned || 0, i.caseSize, i.unit)}</td><td className="td text-right">{fmtQty(i.sold, i.caseSize, i.unit)}</td><td className="td text-right">{i.free ? fmtQty(i.free, i.caseSize, i.unit) : "—"}</td><td className="td text-right">{fmtQty(i.marketReturn || 0, i.caseSize, i.unit)}</td><td className="td text-right">{money(i.sales)}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Daily() {
  const { runs, products } = useData();
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState(null);
  const list = runs.filter((r) => r.date === date);
  const done = list.filter((r) => r.status !== "loaded");
  const t = (k) => sum(done, (r) => r.totals?.[k] || 0);

  return (
    <>
      <PageHeader title="Daily" subtitle="Loading, unloading & sales">
        <input type="date" className="input !w-40" value={date} onChange={(e) => setDate(e.target.value || today())} />
        <button className="btn-ghost" onClick={() => setModal({ t: "stock" })}><Boxes size={16} />Current stock</button>
        <Link to="/daily/report" className="btn-ghost"><FileText size={16} />Day report</Link>
        <Link to="/routes" className="btn-ghost"><MapPin size={16} />Routes</Link>
        <button className="btn-primary" onClick={() => setModal({ t: "load" })}><PackageMinus size={16} />Load route</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Loadings" value={list.length} hint={`${list.length - done.length} on the road`} />
        <Stat label="Pieces sold" value={t("sold")} hint="loaded − unloaded" />
        <Stat label="Sale value" value={money(t("gross"))} />
        <Stat label="Market returns" value={`−${money(t("marketValue"))}`} tone={t("marketValue") ? "bad" : undefined} />
        <Stat className="col-span-2 sm:col-span-1" label="Net sale" value={money(t("sales"))} tone="good" />
      </div>

      <div className="space-y-3">
        {list.length === 0
          ? <div className="card"><Empty><MapPin className="mx-auto mb-2" />No loadings on this day</Empty></div>
          : list.map((r) => <RunCard key={r.id} run={r}
              onEdit={() => setModal(r.status === "loaded" ? { t: "load", run: r } : { t: "unload", run: r })}
              onUnload={() => setModal({ t: "unload", run: r })} />)}
      </div>

      {modal?.t === "load" && <LoadForm date={date} run={modal.run} onClose={() => setModal(null)} />}
      {modal?.t === "unload" && <UnloadForm run={modal.run} onClose={() => setModal(null)} />}
      {modal?.t === "stock" && (
        <Modal title="Current stock" onClose={() => setModal(null)} wide>
          <div className="overflow-x-auto"><StockTable products={products} /></div>
        </Modal>
      )}
    </>
  );
}
