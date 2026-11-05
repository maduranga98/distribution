import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useData } from "../context/DataContext";
import { saveUnloading } from "../lib/db";
import { calcCash, calcDistance, calcRun } from "../lib/runs";
import { cn, fmtQty, money, num, sum } from "../lib/utils";
import { CATEGORIES } from "../pages/Expenses";
import { Field } from "./ui";
import QtyInput from "./QtyInput";

const str = (v) => (v ? String(v) : "");
const Line = ({ label, value, strong, tone }) => (
  <div className={cn("flex justify-between py-1 text-sm", strong && "border-t border-neutral-200 pt-2 font-semibold")}>
    <span className={strong ? "" : "text-neutral-500"}>{label}</span>
    <span className={cn(tone === "bad" && "text-red-600", tone === "good" && "text-emerald-600")}>{value}</span>
  </div>
);
const Section = ({ title, children }) => (
  <section className="space-y-3"><h3 className="text-sm font-medium">{title}</h3>{children}</section>
);

/**
 * Evening unloading: meter, leftover qty + market returns, the day's expenses and the cash check.
 * Everything is saved together; saving again edits it.
 */
export default function UnloadForm({ run, onClose }) {
  const { uid, products } = useData();
  const c = run.collection || {};
  const [v, setV] = useState(() => Object.fromEntries(run.items.map((i) => [i.productId, { returned: str(i.returned), marketReturn: str(i.marketReturn), free: str(i.free) }])));
  const [meterEnd, setMeterEnd] = useState(run.meterEnd ?? "");
  const [exp, setExp] = useState(() => (run.dayExpenses?.length ? run.dayExpenses.map((e) => ({ ...e, amount: String(e.amount) })) : []));
  const [cash, setCash] = useState({
    credit: str(c.credit), discount: str(c.discount), cheques: str(c.cheques), oldCash: str(c.oldCash), oldCheque: str(c.oldCheque),
    cashCounted: c.counted == null ? "" : String(c.counted),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const calc = calcRun(run.items.map((i) => ({ ...i, ...v[i.productId] })));
  const expTotal = sum(exp, (e) => num(e.amount));
  const money$ = calcCash(calc.sales, cash, expTotal);
  const distance = calcDistance(run.meterStart, meterEnd);
  const meterBad = distance != null && distance < 0;
  const guide = (r) => { const n = products.find((p) => p.id === r.productId)?.freeEvery; return n > 0 && r.sold > 0 ? Math.floor(r.sold / n) : 0; };
  const set = (id, k, val) => setV({ ...v, [id]: { ...v[id], [k]: val } });
  const setC = (k) => (e) => setCash({ ...cash, [k]: e.target.value });
  const setE = (i, k, val) => setExp(exp.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const diff = money$.difference;

  const save = async (e) => {
    e.preventDefault();
    if (calc.error) return setError(calc.error);
    if (meterBad) return setError("Closing meter is lower than the opening meter");
    setBusy(true); setError("");
    try {
      await saveUnloading(
        uid, run.id,
        Object.fromEntries(Object.entries(v).map(([id, x]) => [id, { returned: num(x.returned), marketReturn: num(x.marketReturn), free: num(x.free) }])),
        { meterEnd, expenses: exp, collection: cash }
      );
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const title = `${run.status === "loaded" ? "Unload" : "Edit unloading"} · ${run.routeName}`;
  const saveLabel = run.status === "loaded" ? "Save unloading" : "Save changes";
  const blocked = busy || !!calc.error || meterBad;

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    // phones / tablets: bottom sheet or modal · lg+: full-screen workspace · xl+: items left, meter / expenses / cash right
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4 lg:bg-neutral-50 lg:p-0" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl lg:h-full lg:max-h-none lg:max-w-none lg:rounded-none lg:shadow-none">
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-100 px-4 py-3 sm:px-5 lg:bg-white lg:px-8 lg:py-4">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold lg:text-lg">{title}</h2>
          <dl className="hidden items-center gap-8 lg:flex">
            {[["Net sales", money(calc.sales), ""], ["Expected cash", money(money$.expected), ""],
              ["Difference", diff == null ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`, diff == null || diff === 0 ? "" : diff < 0 ? "text-red-600" : "text-emerald-600"]]
              .map(([k, val, tone]) => (
                <div key={k} className="text-right"><dt className="text-xs text-neutral-500">{k}</dt><dd className={cn("text-base font-semibold tabular-nums", tone)}>{val}</dd></div>
              ))}
          </dl>
          <button form="unload-form" className="btn-primary hidden lg:inline-flex" disabled={blocked}>{saveLabel}</button>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 rounded p-2 hover:bg-neutral-100"><X size={18} /></button>
        </header>

      <form id="unload-form" onSubmit={save}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5 lg:p-6 xl:overflow-hidden">
       <div className="space-y-6 xl:grid xl:h-full xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-6 xl:space-y-0 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          <Section title="Items">
          <div className="-mx-1 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px]">
              <thead><tr>
                <th className="th !px-2">Item</th><th className="th !px-2 text-right">Price / pc</th><th className="th !px-2 text-right">Loaded</th>
                <th className="th !px-1 text-right">Unloaded</th><th className="th !px-2 text-right">Sold</th>
                <th className="th !px-1 text-right">Free issue</th><th className="th !px-1 text-right">Market return</th><th className="th !px-2 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {calc.rows.map((r) => (
                  <tr key={r.productId}>
                    <td className="td !px-2 !py-1.5 lg:!py-2">{r.name}</td>
                    <td className="td !px-2 !py-1.5 lg:!py-2 text-right text-neutral-500">{money(r.price)}</td>
                    <td className="td !px-2 !py-1.5 lg:!py-2 text-right text-neutral-500">{fmtQty(r.loaded, r.caseSize, r.unit)}</td>
                    <td className="!px-1 !py-1.5 lg:!py-2"><QtyInput caseSize={r.caseSize} value={v[r.productId].returned} onChange={(x) => set(r.productId, "returned", x)} /></td>
                    <td className={cn("td !px-2 !py-1.5 lg:!py-2 text-right font-medium", r.error && "text-red-600")}>{fmtQty(r.sold, r.caseSize, r.unit)}</td>
                    <td className="!px-1 !py-1.5 lg:!py-2">
                      <QtyInput caseSize={r.caseSize} value={v[r.productId].free} onChange={(x) => set(r.productId, "free", x)} />
                      {guide(r) > 0 && <p className={cn("mt-0.5 text-right text-[10px]", r.free > guide(r) ? "text-amber-600" : "text-neutral-400")}>guide {guide(r)} pcs</p>}
                    </td>
                    <td className="!px-1 !py-1.5 lg:!py-2"><QtyInput caseSize={r.caseSize} value={v[r.productId].marketReturn} onChange={(x) => set(r.productId, "marketReturn", x)} /></td>
                    <td className="td !px-2 !py-1.5 lg:!py-2 text-right">{money(r.sales)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t border-neutral-200 text-sm font-semibold">
                <td className="td !px-2" colSpan={2}>Total (pcs)</td>
                <td className="td !px-2 text-right">{calc.loaded}</td>
                <td className="td !px-1 text-right">{sum(calc.rows, (r) => num(r.returned))}</td>
                <td className="td !px-2 text-right">{calc.sold}</td>
                <td className="td !px-1 text-right">{calc.free}</td>
                <td className="td !px-1 text-right">{sum(calc.rows, (r) => num(r.marketReturn))}</td>
                <td className="td !px-2 text-right">{money(calc.sales)}</td>
              </tr></tfoot>
            </table>
          </div>
          {/* phones & small tablets: one card per item instead of a wide table */}
          <div className="space-y-3 md:hidden">
            {calc.rows.map((r) => (
              <div key={r.productId} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium">{r.name}</p>
                  <p className="shrink-0 text-xs text-neutral-500">{money(r.price)} / pc</p>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">Loaded {fmtQty(r.loaded, r.caseSize, r.unit)}</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs text-neutral-500">Unloaded</span>
                    <QtyInput caseSize={r.caseSize} value={v[r.productId].returned} onChange={(x) => set(r.productId, "returned", x)} /></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs text-neutral-500">Free issue{guide(r) > 0 && <span className={cn("block text-[10px]", r.free > guide(r) ? "text-amber-600" : "text-neutral-400")}>guide {guide(r)} pcs</span>}</span>
                    <QtyInput caseSize={r.caseSize} value={v[r.productId].free} onChange={(x) => set(r.productId, "free", x)} /></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs text-neutral-500">Market return</span>
                    <QtyInput caseSize={r.caseSize} value={v[r.productId].marketReturn} onChange={(x) => set(r.productId, "marketReturn", x)} /></div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-sm">
                  <span className={cn(r.error && "text-red-600")}>Sold <b>{fmtQty(r.sold, r.caseSize, r.unit)}</b></span>
                  <span>Net <b>{money(r.sales)}</b></span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400">Sold = Loaded − Unloaded (unloaded goes back to the warehouse). Free issues are part of sold but are not paid for, so they are left out of the sale value. Market return = goods taken back from shops; valued at the retail price and deducted from sales (not restocked).</p>
        </Section>

        </div>
        <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
        <Section title="Vehicle meter">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Opening"><div className="input bg-neutral-50 text-neutral-500">{run.meterStart ?? "—"}</div></Field>
            <Field label="Closing">
              <input className={cn("input", meterBad && "!border-red-400")} type="number" inputMode="decimal" min="0" step="any" placeholder="Meter reading"
                value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} />
            </Field>
            <Field label="Distance"><div className="input bg-neutral-50 font-medium">{distance == null ? "—" : `${+distance.toFixed(1)} km`}</div></Field>
          </div>
          {run.meterStart == null && <p className="text-xs text-amber-600">No opening meter was saved with this loading, so distance can't be calculated.</p>}
        </Section>

        <Section title="Expenses today">
          {exp.map((x, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_auto] gap-2 sm:grid-cols-[11rem_6rem_1fr_auto]">
              <select className="input" value={x.category} onChange={(e) => setE(i, "category", e.target.value)}>
                {CATEGORIES.map((k) => <option key={k}>{k}</option>)}
              </select>
              <input className="input text-right" type="number" inputMode="decimal" min="0" step="any" placeholder="Amount" value={x.amount} onChange={(e) => setE(i, "amount", e.target.value)} />
              <input className="input col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto" placeholder="Note" value={x.note || ""} onChange={(e) => setE(i, "note", e.target.value)} />
              <button type="button" className="rounded p-2 text-neutral-400 hover:bg-neutral-100" onClick={() => setExp(exp.filter((_, j) => j !== i))}><X size={16} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button type="button" className="btn-ghost" onClick={() => setExp([...exp, { category: CATEGORIES[0], amount: "", note: "" }])}><Plus size={15} />Add expense</button>
            <span className="text-sm text-neutral-500">Total <b className="text-brand">{money(expTotal)}</b></span>
          </div>
        </Section>

        <Section title="Collections & cash check">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Credit given today"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.credit} onChange={setC("credit")} /></Field>
            <Field label="Cheques received (today's sales)"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.cheques} onChange={setC("cheques")} /></Field>
            <Field label="Discounts given today"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.discount} onChange={setC("discount")} /></Field>
            <Field label="Old credit collected · cash"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.oldCash} onChange={setC("oldCash")} /></Field>
            <Field label="Old credit collected · cheque"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.oldCheque} onChange={setC("oldCheque")} /></Field>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <Line label="Sale value" value={money(calc.gross)} />
            {calc.freeValue > 0 && <Line label={`Free issues given (${money(calc.freeValue)}, not in sale value)`} value="" />}
            <Line label="Less market returns" value={`−${money(calc.marketValue)}`} />
            <Line label="Net sales" value={money(calc.sales)} />
            <Line label="Less credit given" value={`−${money(money$.credit)}`} />
            <Line label="Less cheques received" value={`−${money(money$.cheques)}`} />
            <Line label="Less discounts given" value={`−${money(money$.discount)}`} />
            <Line label="Add old credit collected (cash)" value={`+${money(money$.oldCash)}`} />
            <Line label="Less expenses" value={`−${money(expTotal)}`} />
            <Line strong label="Expected cash" value={money(money$.expected)} />
          </div>
          <Field label="Cash on hand (counted)">
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.cashCounted} onChange={setC("cashCounted")} />
          </Field>
          <div className="rounded-lg bg-neutral-50 p-3">
            <Line strong label="Difference (excess / short)" tone={diff == null || diff === 0 ? undefined : diff < 0 ? "bad" : "good"}
              value={diff == null ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`} />
            <Line label="Total cheques in hand" value={money(money$.chequesInHand)} />
          </div>
        </Section>


        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full lg:hidden" disabled={blocked}>{saveLabel}</button>
        </div>
       </div>
      </form>
      </div>
    </div>
  );
}
