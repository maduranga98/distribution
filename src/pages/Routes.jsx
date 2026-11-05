import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useData } from "../context/DataContext";
import { add, remove, update } from "../lib/db";
import { DAY_NAMES, DAY_SHORT, WEEK, analyzeRoutes, dow, planSummary, weekdayAverages } from "../lib/routes";
import { cn, money, monthStart, num, today } from "../lib/utils";
import { Bar } from "../components/charts";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";

const TABS = [["planner", "Route planner"], ["analysis", "Route analysis"]];
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const km = (n) => (n ? `${+n.toFixed(1)} km` : "—");

/** Add / edit a route: name, ordered stops, weekdays, targets. */
function RouteForm({ route, onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({
    name: route?.name || "", vehicle: route?.vehicle || "", notes: route?.notes || "",
    target: route?.target || "", plannedKm: route?.plannedKm || "",
  });
  const [stops, setStops] = useState(route?.stops?.length ? route.stops : (route?.towns || "").split(",").map((s) => s.trim()).filter(Boolean));
  const [days, setDays] = useState(route?.days || []);
  const [stop, setStop] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addStop = () => {
    const v = stop.trim();
    if (v && !stops.includes(v)) setStops([...stops, v]);
    setStop("");
  };
  const move = (i, d) => {
    const s = [...stops], j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    setStops(s);
  };
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const pending = stop.trim() && !stops.includes(stop.trim()) ? [...stops, stop.trim()] : stops;
    const data = {
      name: f.name.trim(), vehicle: f.vehicle.trim(), notes: f.notes.trim(), stops: pending, towns: pending.join(", "),
      days: [...days].sort((a, b) => a - b), target: num(f.target), plannedKm: num(f.plannedKm),
    };
    try { route ? await update(uid, "routes", route.id, data) : await add(uid, "routes", data); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={route ? "Edit route" : "Add route"} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Route name"><input className="input" required autoFocus value={f.name} onChange={set("name")} /></Field>
          <Field label="Vehicle / driver"><input className="input" value={f.vehicle} onChange={set("vehicle")} /></Field>
        </div>

        <div>
          <span className="label">Stops, in visiting order</span>
          {stops.length > 0 && (
            <ol className="mb-2 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {stops.map((s, i) => (
                <li key={s} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="w-5 text-xs text-neutral-400">{i + 1}</span>
                  <span className="flex-1 truncate">{s}</span>
                  <button type="button" className="rounded p-1 hover:bg-neutral-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className="rounded p-1 hover:bg-neutral-100 disabled:opacity-30" disabled={i === stops.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                  <button type="button" className="rounded p-1 text-red-500 hover:bg-red-50" onClick={() => setStops(stops.filter((x) => x !== s))}><X size={14} /></button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex gap-2">
            <input className="input" placeholder="Town / shop name" value={stop} onChange={(e) => setStop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStop())} />
            <button type="button" className="btn-ghost" onClick={addStop}><Plus size={16} />Add</button>
          </div>
        </div>

        <div>
          <span className="label">Runs on</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map((d) => (
              <button key={d} type="button" onClick={() => toggle(d)}
                className={cn("rounded-lg border px-3 py-1.5 text-sm transition", days.includes(d) ? "border-brand bg-brand text-white" : "border-neutral-200 hover:bg-neutral-100")}>
                {DAY_SHORT[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sales target / run"><input className="input" type="number" min="0" step="any" value={f.target} onChange={set("target")} placeholder="0" /></Field>
          <Field label="Planned km / run"><input className="input" type="number" min="0" step="any" value={f.plannedKm} onChange={set("plannedKm")} placeholder="0" /></Field>
          <Field label="Notes"><input className="input" value={f.notes} onChange={set("notes")} /></Field>
        </div>

        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy}>Save route</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function DayCard({ day, routes, avg, isToday, onEdit }) {
  const { uid } = useData();
  const here = routes.filter((r) => r.days?.includes(day));
  const free = routes.filter((r) => !r.days?.includes(day));
  const assign = (id, on) => {
    const r = routes.find((x) => x.id === id);
    const days = on ? [...(r.days || []), day] : (r.days || []).filter((d) => d !== day);
    return update(uid, "routes", id, { days });
  };
  const target = here.reduce((s, r) => s + (r.target || 0), 0);
  return (
    <div className={cn("card flex flex-col p-3", isToday && "border-brand")}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{DAY_NAMES[day]}</p>
        {isToday && <Badge tone="green">Today</Badge>}
      </div>
      <div className="flex-1 space-y-1.5">
        {here.length === 0 && <p className="py-2 text-xs text-neutral-400">No route planned</p>}
        {here.map((r) => (
          <div key={r.id} className="flex items-center gap-1 rounded-lg bg-neutral-100 pl-2.5 text-sm">
            <button className="min-w-0 flex-1 truncate py-1.5 text-left" onClick={() => onEdit(r)}>{r.name}</button>
            <button className="rounded p-1.5 text-neutral-400 hover:text-red-500" onClick={() => assign(r.id, false)} title="Remove from this day"><X size={13} /></button>
          </div>
        ))}
      </div>
      {free.length > 0 && (
        <select className="input mt-2 !py-1.5 text-xs" value="" onChange={(e) => e.target.value && assign(e.target.value, true)}>
          <option value="">+ Add route</option>
          {free.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )}
      <p className="mt-2 text-[11px] text-neutral-400">
        {target > 0 && <>Target {money(target)} · </>}{avg != null ? `Usually ${money(avg)}` : "No history"}
      </p>
    </div>
  );
}

function Planner({ onEdit }) {
  const { routes, runs, uid } = useData();
  const plan = useMemo(() => planSummary(routes), [routes]);
  const avgs = useMemo(() => weekdayAverages(runs), [runs]);
  const todayDow = dow(today());

  const del = (r) => {
    if (runs.some((x) => x.routeId === r.id)) return alert("This route has recorded runs and can't be deleted.");
    confirm(`Delete ${r.name}?`) && remove(uid, "routes", r.id);
  };

  if (routes.length === 0) {
    return <div className="card"><Empty><MapPin className="mx-auto mb-2" />No routes yet — add your first route to start planning</Empty></div>;
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Routes" value={plan.routes} hint={plan.unscheduled ? `${plan.unscheduled} not scheduled` : "all scheduled"} />
        <Stat label="Runs per week" value={plan.slots} hint={plan.emptyDays ? `${plan.emptyDays} days with no route` : "every day covered"} />
        <Stat label="Weekly target" value={money(plan.target)} hint="from route targets" />
        <Stat label="Planned distance" value={km(plan.km)} hint="per week" />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium"><CalendarDays size={16} />Weekly plan</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WEEK.map((d) => <DayCard key={d} day={d} routes={routes} avg={avgs[d].avg} isToday={d === todayDow} onEdit={onEdit} />)}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Routes</p>
        <div className="grid gap-3 md:grid-cols-2">
          {routes.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-neutral-400">{[r.vehicle, r.notes].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <div className="flex shrink-0">
                  <button className="rounded p-1.5 hover:bg-neutral-100" onClick={() => onEdit(r)}><Pencil size={15} /></button>
                  <button className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => del(r)}><Trash2 size={15} /></button>
                </div>
              </div>
              {(r.stops?.length || r.towns) ? (
                <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-600">
                  {(r.stops?.length ? r.stops : r.towns.split(",").map((s) => s.trim())).map((s, i, a) => (
                    <li key={s + i} className="flex items-center gap-1.5"><span className="rounded bg-neutral-100 px-1.5 py-0.5">{i + 1}. {s}</span>{i < a.length - 1 && <span className="text-neutral-300">›</span>}</li>
                  ))}
                </ol>
              ) : <p className="mt-3 text-xs text-neutral-400">No stops added</p>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-3">
                {r.days?.length ? WEEK.filter((d) => r.days.includes(d)).map((d) => <Badge key={d}>{DAY_SHORT[d]}</Badge>) : <Badge tone="amber">Not scheduled</Badge>}
                <span className="ml-auto text-xs text-neutral-400">{[r.target > 0 && `Target ${money(r.target)}`, r.plannedKm > 0 && km(r.plannedKm)].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TONE = { good: "text-emerald-700 bg-emerald-50", bad: "text-red-600 bg-red-50", warn: "text-amber-700 bg-amber-50" };

function Analysis({ from, to }) {
  const d = useData();
  const a = useMemo(() => analyzeRoutes(d, from, to), [d.runs, d.routes, from, to]);
  const max = Math.max(...a.list.map((r) => r.net), 1);
  const dmax = Math.max(...a.weekday.map((w) => w.avg || 0), 1);

  if (a.list.length === 0) return <div className="card"><Empty>No routes yet</Empty></div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net sales" value={money(a.net)} hint={`${a.runs} unloaded runs`} />
        <Stat label="Avg per run" value={a.runs ? money(a.net / a.runs) : "—"} />
        <Stat label="Distance" value={km(a.km)} hint={a.km ? `${money(a.net / a.km)} sales per km` : "no meter readings"} />
        <Stat label="Expenses" value={money(a.expenses)} hint={a.net ? `${pct((a.expenses / a.net) * 100)} of net sales` : undefined} />
      </div>

      {a.insights.length > 0 && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-medium">Insights</p>
          {a.insights.map((i, k) => <p key={k} className={cn("rounded-lg px-3 py-2 text-sm", TONE[i.tone])}>{i.text}</p>)}
        </div>
      )}

      <div className="card">
        <p className="px-4 py-3 text-sm font-medium">Route performance</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead><tr>
              <th className="th">Route</th><th className="th text-right">Runs</th><th className="th text-right">Net sales</th><th className="th text-right">Avg / run</th>
              <th className="th text-right">vs target</th><th className="th text-right">Returns</th><th className="th text-right">Sales / km</th>
              <th className="th text-right">Expenses</th><th className="th text-right">Cash +/−</th><th className="th text-right">Best day</th>
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {a.list.map((r) => (
                <tr key={r.id}>
                  <td className="td min-w-40">
                    <p className="font-medium">{r.name}</p>
                    <div className="mt-1.5"><Bar pct={(r.net / max) * 100} /></div>
                  </td>
                  <td className="td text-right text-neutral-500">{r.runs}</td>
                  <td className="td text-right">{money(r.net)}</td>
                  <td className="td text-right">
                    {r.avg != null ? money(r.avg) : "—"}
                    {r.trend != null && <span className={cn("ml-1.5 text-xs", r.trend < 0 ? "text-red-600" : "text-emerald-600")}>{r.trend > 0 ? "▲" : "▼"}{Math.abs(r.trend).toFixed(0)}%</span>}
                  </td>
                  <td className={cn("td text-right", r.vsTarget != null && (r.vsTarget >= 100 ? "text-emerald-600" : r.vsTarget < 80 ? "text-red-600" : ""))}>{r.vsTarget != null ? `${r.vsTarget.toFixed(0)}%` : "—"}</td>
                  <td className={cn("td text-right", r.returnRate >= 5 && "text-red-600")}>{r.runs ? pct(r.returnRate) : "—"}</td>
                  <td className="td text-right">{r.perKm != null ? money(r.perKm) : "—"}</td>
                  <td className="td text-right">{money(r.expenses)}</td>
                  <td className={cn("td text-right", r.difference < 0 && "text-red-600", r.difference > 0 && "text-emerald-600")}>{r.runs ? money(r.difference) : "—"}</td>
                  <td className="td text-right text-neutral-500">{r.bestDay != null ? DAY_SHORT[r.bestDay] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-1 text-sm font-medium">Average net sale by weekday</p>
        <p className="mb-4 text-xs text-neutral-400">Use this to decide which day each route should run</p>
        <div className="flex h-32 items-end gap-2">
          {WEEK.map((w) => {
            const x = a.weekday[w];
            return (
              <div key={w} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={x.avg != null ? money(x.avg) : "No runs"}>
                <span className="text-[10px] text-neutral-400">{x.avg != null ? Math.round(x.avg) : ""}</span>
                <div className="w-full rounded-t bg-brand" style={{ height: `${((x.avg || 0) / dmax) * 100}%`, minHeight: x.avg ? 3 : 0 }} />
                <span className="text-xs text-neutral-500">{DAY_SHORT[w]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Routes() {
  const [tab, setTab] = useState("planner");
  const [edit, setEdit] = useState(null); // {} = new, route = editing
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  return (
    <>
      <PageHeader title="Routes" subtitle="Plan your week and see which routes perform">
        {tab === "analysis" && <>
          <button className="btn-ghost" onClick={() => { setFrom(monthStart()); setTo(today()); }}>This month</button>
          <input type="date" className="input !w-36" value={from} onChange={(e) => setFrom(e.target.value || monthStart())} />
          <span className="text-neutral-400">→</span>
          <input type="date" className="input !w-36" value={to} onChange={(e) => setTo(e.target.value || today())} />
        </>}
        <button className="btn-primary" onClick={() => setEdit({})}><Plus size={16} />Add route</button>
      </PageHeader>

      <div className="mb-4 flex gap-1 rounded-lg bg-neutral-100 p-1">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition", tab === k ? "bg-white shadow-sm" : "text-neutral-500 hover:text-brand")}>{l}</button>
        ))}
      </div>

      {tab === "planner" ? <Planner onEdit={setEdit} /> : <Analysis from={from} to={to} />}
      {edit && <RouteForm key={edit.id || "new"} route={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}
