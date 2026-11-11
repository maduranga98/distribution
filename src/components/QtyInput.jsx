import { useState } from "react";
import { cn } from "../lib/utils";

const r3 = (n) => Math.round(n * 1000) / 1000;
const total = (b, cs) => r3((parseFloat(b.c) || 0) * cs + (parseFloat(b.p) || 0));
const split = (value, cs) => {
  const t = parseFloat(value) || 0, c = Math.floor(t / cs), p = r3(t - c * cs);
  return { c: c ? String(c) : "", p: p ? String(p) : "" };
};

/**
 * Quantity entry in cases + pieces. `value` and `onChange` always carry TOTAL PIECES
 * (string, "" = empty). Items without a case size get a single pieces box.
 *
 * The two boxes keep exactly what was typed until the field is left. Re-splitting the total on
 * every keystroke moved digits into the cases box mid-typing (case of 6: typing "72" pcs gave 18).
 */
export default function QtyInput({ value, caseSize, onChange, className, autoFocus }) {
  const cs = Number(caseSize) > 1 ? Number(caseSize) : 0;
  const [typed, setTyped] = useState(() => split(value, cs || 1));
  const box = "input !w-16 !px-2 text-right";
  if (!cs) return (
    <input className={cn(box, className)} type="number" min="0" step="any" placeholder="pcs" autoFocus={autoFocus}
      value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  );
  // what was typed, unless the value was changed from outside (form reset, other case size)
  const b = total(typed, cs) === (parseFloat(value) || 0) ? typed : split(value, cs);
  const edit = (k) => (e) => {
    const next = { ...b, [k]: e.target.value };
    setTyped(next);
    onChange(next.c === "" && next.p === "" ? "" : String(total(next, cs)));
  };
  // on leaving both boxes: 15 pcs in a case of 12 → 1 cs 3 pcs
  const tidy = (e) => !e.currentTarget.contains(e.relatedTarget) && setTyped(split(value, cs));
  return (
    <div className={cn("flex gap-1", className)} onBlur={tidy}>
      <input className={box} type="number" min="0" step="1" placeholder="cs" autoFocus={autoFocus} value={b.c} onChange={edit("c")} />
      <input className={box} type="number" min="0" step="any" placeholder="pcs" value={b.p} onChange={edit("p")} />
    </div>
  );
}
