import { useMemo, useState } from "react";
import { ChevronDown, MapPin, PackageCheck, PackageMinus, Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { add, cancelRun, closeRun, loadRun, remove, update } from "../lib/db";
import { calcRun } from "../lib/runs";
import { cn, money, num, sum, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";

function RouteForm({ route, onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({ name: "", towns: "", vehicle: "", notes: "", ...route });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const data = { name: f.name.trim(), towns: f.towns.trim(), vehicle: f.vehicle.trim(), notes: f.notes.trim() };
    if (route) await update(uid, "routes", route.id, data); else await add(uid, "routes", data);
    onClose();
  };
  return (
    <form onSubmit={save} className="space-y-3 border-t border-neutral-100 pt-4">
      <Field label="Route name"><input className="input" required autoFocus value={f.name} onChange={set("name")} /></Field>
      <Field label="Towns covered"><input className="input" value={f.towns} onChange={set("towns")} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehicle / driver"><input className="input" value={f.vehicle} onChange={set("vehicle")} /></Field>
        <Field label="Notes"><input className="input" value={f.notes} onChange={set("notes")} placeholder="Usual days…" /></Field>
      </div>
      <div className="flex gap-2"><button className="btn-primary flex-1">Save route</button><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button></div>
    </form>
  );
}

function ManageRoutes({ onClose }) {
  const { routes, runs, uid } = useData();
  const [edit, setEdit] = useState(null); // {} = new, route = editing
  return (
    <Modal title="Routes" onClose={onClose}>
      <div className="mb-3 divide-y divide-neutral-100">
        {routes.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No routes yet</p>}
        {routes.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="min-w-0"><div className="truncate text-sm font-medium">{r.name}</div><div className="truncate text-xs text-neutral-400">{r.towns || "—"}</div></div>
            <div className="flex shrink-0">
              <button className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setEdit(r)}><Pencil size={15} /></button>
              <button className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => {
                if (runs.some((x) => x.routeId === r.id)) return alert("This route has recorded runs and can't be deleted.");
                confirm(`Delete ${r.name}?`) && remove(uid, "routes", r.id);
              }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      {edit ? <RouteForm key={edit.id || "new"} route={edit.id ? edit : null} onClose={() => setEdit(null)} />
        : <button className="btn-ghost w-full" onClick={() => setEdit({})}><Plus size={16} />Add route</button>}
    </Modal>
  );
}

function LoadForm({ date, onClose }) {
  const { uid, routes, products, runs } = useData();
  const [d, setD] = useState(date);
  const [routeId, setRouteId] = useState(routes[0]?.id || "");
  const [qty, setQty] = useState({});
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const route = routes.find((r) => r.id === routeId);
  const visit = runs.filter((r) => r.routeId === routeId && r.date === d).length + 1;
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const picked = products.filter((p) => num(qty[p.id]) > 0);

  const save = async (e) => {
    e.preventDefault();
    if (!route) return setError("Create a route first");
    if (!picked.length) return setError("Enter a loaded quantity for at least one item");
    setBusy(true); setError("");
    try {
      await loadRun(uid, {
        date: d, routeId, routeName: route.name, visit,
        items: picked.map((p) => ({ productId: p.id, name: p.name, unit: p.unit, loaded: num(qty[p.id]), price: p.price, specialPrice: p.specialPrice || 0, cost: p.cost })),
      });
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Load route" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" required value={d} onChange={(e) => setD(e.target.value)} /></Field>
          <Field label={`Route · visit ${visit}`}>
            <select className="input" required value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              {routes.length === 0 && <option value="">No routes</option>}
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <input className="input" placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[45vh] divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1"><div className="truncate text-sm">{p.name}</div><div className="text-xs text-neutral-400">{p.stock} in warehouse</div></div>
              <input className={cn("input !w-24 text-right", num(qty[p.id]) > p.stock && "!border-red-400")} type="number" min="0" max={p.stock} step="any" placeholder="0"
                value={qty[p.id] ?? ""} onChange={(e) => setQty({ ...qty, [p.id]: e.target.value })} />
            </div>
          ))}
          {list.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No products</p>}
        </div>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>{picked.length} items · {sum(picked, (p) => num(qty[p.id]))} pcs</span>
          <span>Value at list price {money(sum(picked, (p) => num(qty[p.id]) * p.price))}</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Load onto vehicle</button>
      </form>
    </Modal>
  );
}

function UnloadForm({ run, onClose }) {
  const { uid } = useData();
  const [v, setV] = useState({});
  const [cash, setCash] = useState("");
  const [cheque, setCheque] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = useMemo(() => Object.fromEntries(run.items.map((i) => [i.productId, v[i.productId] || {}])), [run, v]);
  const calc = calcRun(run.items.map((i) => ({ ...i, ...lines[i.productId] })));
  const paid = num(cash) + num(cheque);
  const credit = calc.sales - paid;
  const set = (id, k, val) => setV({ ...v, [id]: { ...v[id], [k]: val } });

  const save = async (e) => {
    e.preventDefault();
    if (calc.error) return setError(calc.error);
    setBusy(true); setError("");
    try { await closeRun(uid, run.id, lines, { cash: num(cash), cheque: num(cheque) }); onClose(); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  const cols = [["returned", "Returned"], ["free", "Free"], ["specialQty", "Special"], ["marketReturns", "Mkt ret."]];

  return (
    <Modal title={`Unload · ${run.routeName}`} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr>
              <th className="th !px-2">Item</th><th className="th !px-2 text-right">Loaded</th>
              {cols.map(([, l]) => <th key={l} className="th !px-1 text-right">{l}</th>)}
              <th className="th !px-2 text-right">Sold</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {calc.rows.map((r) => (
                <tr key={r.productId}>
                  <td className="td !px-2 !py-1.5">{r.name}</td>
                  <td className="td !px-2 !py-1.5 text-right text-neutral-500">{r.loaded}</td>
                  {cols.map(([k]) => (
                    <td key={k} className="!px-1 !py-1.5">
                      <input className="input !w-16 !px-2 !py-1 text-right" type="number" min="0" step="any" placeholder="0"
                        value={v[r.productId]?.[k] ?? ""} onChange={(e) => set(r.productId, k, e.target.value)} />
                    </td>
                  ))}
                  <td className={cn("td !px-2 !py-1.5 text-right font-medium", r.error && "text-red-600")}>{r.sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-400">Sold = Loaded − Returned − Free. Special = qty sold at special price. Mkt ret. = returns taken back from shops (deducted from sales value, not restocked).</p>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 p-3 text-center text-sm">
          <div><p className="text-xs text-neutral-500">Gross</p><p className="font-medium">{money(calc.gross)}</p></div>
          <div><p className="text-xs text-neutral-500">Deductions</p><p className="font-medium">−{money(calc.concession + calc.marketValue)}</p></div>
          <div><p className="text-xs text-neutral-500">Sales value</p><p className="font-semibold">{money(calc.sales)}</p></div>
        </div>

        <div className="grid grid-cols-3 items-end gap-3">
          <Field label="Cash collected"><input className="input" type="number" min="0" step="any" value={cash} onChange={(e) => setCash(e.target.value)} /></Field>
          <Field label="Cheques"><input className="input" type="number" min="0" step="any" value={cheque} onChange={(e) => setCheque(e.target.value)} /></Field>
          <div className="pb-2 text-right"><p className="text-xs text-neutral-500">Credit</p><p className={cn("font-semibold", credit < 0 && "text-red-600")}>{money(credit)}</p></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !!calc.error || credit < -0.005}>Close run & update stock</button>
      </form>
    </Modal>
  );
}

function RunCard({ run, onUnload }) {
  const { uid } = useData();
  const [open, setOpen] = useState(false);
  const closed = run.status === "closed";
  const pcs = sum(run.items, (i) => i.loaded);
  return (
    <div className="card">
      <div className="flex items-center gap-3 p-4">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{run.routeName}</span>
            {run.visit > 1 && <span className="text-xs text-neutral-400">visit {run.visit}</span>}
            <Badge tone={closed ? "green" : "amber"}>{closed ? "Closed" : "On the road"}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {run.items.length} items · {pcs} pcs loaded{closed && ` · sales ${money(run.totals.sales)} · cash ${money(run.collections.cash)}${run.collections.credit > 0.005 ? ` · credit ${money(run.collections.credit)}` : ""}`}
          </p>
        </button>
        {!closed && <>
          <button className="btn-primary" onClick={onUnload}><PackageCheck size={16} />Unload</button>
          <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Cancel run & restock"
            onClick={() => confirm("Cancel this run and return everything to the warehouse?") && cancelRun(uid, run)}><Trash2 size={15} /></button>
        </>}
        <ChevronDown size={16} className={cn("text-neutral-400 transition", open && "rotate-180")} />
      </div>
      {open && (
        <div className="overflow-x-auto border-t border-neutral-100">
          <table className="w-full">
            <thead><tr>
              <th className="th">Item</th><th className="th text-right">Loaded</th>
              {closed && <><th className="th text-right">Returned</th><th className="th text-right">Free</th><th className="th text-right">Sold</th><th className="th text-right">Sales</th></>}
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {run.items.map((i) => (
                <tr key={i.productId}>
                  <td className="td">{i.name}</td><td className="td text-right">{i.loaded}</td>
                  {closed && <><td className="td text-right">{i.returned || 0}</td><td className="td text-right">{i.free || 0}</td><td className="td text-right">{i.sold}</td><td className="td text-right">{money(i.sales)}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RoutesPage() {
  const { runs } = useData();
  const [date, setDate] = useState(today());
  const [modal, setModal] = useState(null);
  const list = runs.filter((r) => r.date === date);
  const closed = list.filter((r) => r.status === "closed");

  return (
    <>
      <PageHeader title="Routes" subtitle="Daily loading & unloading">
        <input type="date" className="input !w-40" value={date} onChange={(e) => setDate(e.target.value || today())} />
        <button className="btn-ghost" onClick={() => setModal({ t: "routes" })}><MapPin size={16} />Routes</button>
        <button className="btn-primary" onClick={() => setModal({ t: "load" })}><PackageMinus size={16} />Load route</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Runs" value={list.length} hint={`${list.length - closed.length} on the road`} />
        <Stat label="Pcs loaded" value={sum(list, (r) => sum(r.items, (i) => i.loaded))} />
        <Stat label="Sales" value={money(sum(closed, (r) => r.totals.sales))} />
        <Stat label="Cash + cheques" value={money(sum(closed, (r) => r.collections.cash + r.collections.cheque))} tone="good" />
      </div>

      <div className="space-y-3">
        {list.length === 0
          ? <div className="card"><Empty><MapPin className="mx-auto mb-2" />No runs on this day</Empty></div>
          : list.map((r) => <RunCard key={r.id} run={r} onUnload={() => setModal({ t: "unload", run: r })} />)}
      </div>

      {modal?.t === "routes" && <ManageRoutes onClose={() => setModal(null)} />}
      {modal?.t === "load" && <LoadForm date={date} onClose={() => setModal(null)} />}
      {modal?.t === "unload" && <UnloadForm run={modal.run} onClose={() => setModal(null)} />}
    </>
  );
}
