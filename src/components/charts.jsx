import { money } from "../lib/utils";

/** Dependency-free donut chart. `data` = [{ key, label, value, color }]. */
export function Donut({ data, center }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 15.9155; // circumference = 100 so dash lengths are percentages
  let offset = 25; // start at 12 o'clock
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r={R} fill="none" stroke="#f5f5f5" strokeWidth="4.5" />
          {total > 0 && data.map((d) => {
            const len = (d.value / total) * 100;
            const el = <circle key={d.key} cx="18" cy="18" r={R} fill="none" stroke={d.color} strokeWidth="4.5"
              strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} />;
            offset -= len;
            return el;
          })}
        </svg>
        {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 truncate text-neutral-600">{d.label}</span>
            <span className="font-medium">{money(d.value)}</span>
            <span className="w-12 text-right text-xs text-neutral-400">{total ? ((d.value / total) * 100).toFixed(1) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Thin horizontal share bar. */
export const Bar = ({ pct, color = "#171717" }) => (
  <div className="h-1.5 w-full rounded-full bg-neutral-100">
    <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: color }} />
  </div>
);
