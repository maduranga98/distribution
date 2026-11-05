import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useData } from "../context/DataContext";
import { saveUnloading } from "../lib/db";
import { calcCash, calcDistance, calcRun } from "../lib/runs";
import { cn, fmtQty, money, num, sum } from "../lib/utils";
import { CATEGORIES } from "../pages/Expenses";
import { Field, Modal } from "./ui";
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
  const { uid } = useData();
  const c = run.collection || {};
  const [v, setV] = useState(() => Object.fromEntries(run.items.map((i) => [i.productId, { returned: str(i.returned), marketReturn: str(i.marketReturn) }])));
  const [meterEnd, setMeterEnd] = useState(run.meterEnd ?? "");
  const [exp, setExp] = useState(() => (run.dayExpenses?.length ? run.dayExpenses.map((e) => ({ ...e, amount: String(e.amount) })) : []));
  const [cash, setCash] = useState({
    credit: str(c.credit), cheques: str(c.cheques), oldCash: str(c.oldCash), oldCheque: str(c.oldCheque),
    cashCounted: c.counted == null ? "" : String(c.counted),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const calc = calcRun(run.items.map((i) => ({ ...i, ...v[i.productId] })));
  const expTotal = sum(exp, (e) => num(e.amount));
  const money$ = calcCash(calc.sales, cash, expTotal);
  const distance = calcDistance(run.meterStart, meterEnd);
  const meterBad = distance != null && distance < 0;
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
        Object.fromEntries(Object.entries(v).map(([id, x]) => [id, { returned: num(x.returned), marketReturn: num(x.marketReturn) }])),
        { meterEnd, expenses: exp, collection: cash }
      );
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title={`${run.status === "loaded" ? "Unload" : "Edit unloading"} · ${run.routeName}`} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-6">
        <Section title="Vehicle meter">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Opening"><div className="input bg-neutral-50 text-neutral-500">{run.meterStart ?? "—"}</div></Field>
            <Field label="Closing">
              <input className={cn("input", meterBad && "!border-red-400")} type="number" inputMode="decimal" min="0" step="any" placeholder="Meter reading"
                value={meterEnd} onChange={(e) => setMeterEnd(e.target.value)} />
            </Field>
            <Field label="Distance"><div className="input bg-neutral-50 font-medium">{distance == null ? "—" : `${+distance.toFixed(1)} km`}</div></Field>
          </div>
          {run.meterStart == null && <p className="text-xs text-amber-600">No opening meter was saved with this loading, so distance can't be calculated.</p>}
        </Section>

        <Section title="Items">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead><tr>
                <th className="th !px-2">Item</th><th className="th !px-2 text-right">Price / pc</th><th className="th !px-2 text-right">Loaded</th>
                <th className="th !px-1 text-right">Unloaded</th><th className="th !px-2 text-right">Sold</th>
                <th className="th !px-1 text-right">Market return</th><th className="th !px-2 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {calc.rows.map((r) => (
                  <tr key={r.productId}>
                    <td className="td !px-2 !py-1.5">{r.name}</td>
                    <td className="td !px-2 !py-1.5 text-right text-neutral-500">{money(r.price)}</td>
                    <td className="td !px-2 !py-1.5 text-right text-neutral-500">{fmtQty(r.loaded, r.caseSize, r.unit)}</td>
                    <td className="!px-1 !py-1.5"><QtyInput caseSize={r.caseSize} value={v[r.productId].returned} onChange={(x) => set(r.productId, "returned", x)} /></td>
                    <td className={cn("td !px-2 !py-1.5 text-right font-medium", r.error && "text-red-600")}>{fmtQty(r.sold, r.caseSize, r.unit)}</td>
                    <td className="!px-1 !py-1.5"><QtyInput caseSize={r.caseSize} value={v[r.productId].marketReturn} onChange={(x) => set(r.productId, "marketReturn", x)} /></td>
                    <td className="td !px-2 !py-1.5 text-right">{money(r.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-400">Sold = Loaded − Unloaded (unloaded goes back to the warehouse). Market return = goods taken back from shops; valued at the retail price and deducted from sales (not restocked).</p>
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
            <span className="text-sm text-neutral-500">Total <b className="text-neutral-900">{money(expTotal)}</b></span>
          </div>
        </Section>

        <Section title="Collections & cash check">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Credit given today"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.credit} onChange={setC("credit")} /></Field>
            <Field label="Cheques received (today's sales)"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.cheques} onChange={setC("cheques")} /></Field>
            <Field label="Old credit collected · cash"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.oldCash} onChange={setC("oldCash")} /></Field>
            <Field label="Old credit collected · cheque"><input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.oldCheque} onChange={setC("oldCheque")} /></Field>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <Line label="Sale value" value={money(calc.gross)} />
            <Line label="Less market returns" value={`−${money(calc.marketValue)}`} />
            <Line label="Net sales" value={money(calc.sales)} />
            <Line label="Less credit given" value={`−${money(money$.credit)}`} />
            <Line label="Less cheques received" value={`−${money(money$.cheques)}`} />
            <Line label="Add old credit collected (cash)" value={`+${money(money$.oldCash)}`} />
            <Line label="Less expenses" value={`−${money(expTotal)}`} />
            <Line strong label="Expected cash" value={money(money$.expected)} />
          </div>
          <Field label="Total cash in hand (counted)">
            <input className="input" type="number" inputMode="decimal" min="0" step="any" value={cash.cashCounted} onChange={setC("cashCounted")} />
          </Field>
          <div className="rounded-lg bg-neutral-50 p-3">
            <Line strong label="Difference (excess / short)" tone={diff == null || diff === 0 ? undefined : diff < 0 ? "bad" : "good"}
              value={diff == null ? "—" : `${diff > 0 ? "+" : ""}${money(diff)}`} />
            <Line label="Total cheques in hand" value={money(money$.chequesInHand)} />
          </div>
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy || !!calc.error || meterBad}>{run.status === "loaded" ? "Save unloading" : "Save changes"}</button>
      </form>
    </Modal>
  );
}
