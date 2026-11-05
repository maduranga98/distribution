import { cn } from "../lib/utils";

/**
 * Quantity entry in cases + pieces. `value` and `onChange` always carry TOTAL PIECES
 * (string, "" = empty). Items without a case size get a single pieces box.
 */
export default function QtyInput({ value, caseSize, onChange, className, autoFocus }) {
  const cs = Number(caseSize) > 1 ? Number(caseSize) : 0;
  const total = parseFloat(value) || 0;
  const cases = cs ? Math.floor(total / cs) : 0;
  const loose = cs ? Math.round((total - cases * cs) * 1000) / 1000 : value;
  const emit = (c, p) => {
    const t = (parseFloat(c) || 0) * cs + (parseFloat(p) || 0);
    onChange(c === "" && p === "" ? "" : String(Math.round(t * 1000) / 1000));
  };
  const box = "input !w-16 !px-2 text-right";
  if (!cs) return (
    <input className={cn(box, className)} type="number" min="0" step="any" placeholder="pcs" autoFocus={autoFocus}
      value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  );
  return (
    <div className={cn("flex gap-1", className)}>
      <input className={box} type="number" min="0" step="1" placeholder="cs" autoFocus={autoFocus}
        value={total ? cases || "" : ""} onChange={(e) => emit(e.target.value, loose || "")} />
      <input className={box} type="number" min="0" step="any" placeholder="pcs"
        value={total ? loose || "" : ""} onChange={(e) => emit(cases || "", e.target.value)} />
    </div>
  );
}
