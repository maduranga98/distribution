import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";

const STEPS = [
  ["1", "Receive stock", "Inventory → New GRN for goods received (set a new retail price if it changed). Use Stock entry to add opening stock or release damaged / corrected stock.", "/stock", "Inventory"],
  ["2", "Load in the morning", "Daily → Load route. Pick the date and route, enter the opening meter and the quantities in cases + pieces. You can edit the loading until it is unloaded.", "/daily", "Daily"],
  ["3", "Unload in the evening", "Daily → Unload. Enter the closing meter, unloaded qty, free issues, market returns, the day's expenses, credit, cheques, old credit collected and the cash you counted. Save once — you can edit it later.", "/daily", "Daily"],
  ["4", "Check the cash", "The difference line shows excess / short against expected cash. Cheques in hand shows what to bank.", "/daily", "Daily"],
  ["5", "Review performance", "Analytics: item performance, market returns, routes & trips, cash log, month summary, year tracker and insights (best sellers, slow movers, reorder alerts).", "/analytics", "Analytics"],
];
const RULES = [
  ["Sold", "Loaded − Unloaded (free issues included)."],
  ["Sale value", "(Sold − Free issues) × list price. Free issues are shown for information and are not deducted from profit."],
  ["Net sales", "Sale value − market returns (valued at list price)."],
  ["Expected cash", "Net sales − credit − cheques + old credit collected in cash − expenses."],
  ["Difference", "Cash counted − expected cash (negative = short)."],
  ["Distance", "Closing meter − opening meter."],
  ["Profit", "Margin % of net sales (set in Accounts) − expenses."],
];

export default function Guide() {
  return (
    <>
      <PageHeader title="Start here" subtitle="The daily routine, in order" />
      <div className="space-y-3">
        {STEPS.map(([n, t, d, to, label]) => (
          <div key={n} className="card flex gap-4 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">{n}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{t}</p><p className="mt-1 text-sm text-neutral-500">{d}</p></div>
            <Link to={to} className="btn-ghost h-fit shrink-0">{label}</Link>
          </div>
        ))}
      </div>
      <p className="mb-2 mt-8 text-sm font-medium">How the numbers work</p>
      <div className="card divide-y divide-neutral-100">
        {RULES.map(([k, v]) => (
          <div key={k} className="flex gap-4 px-4 py-2.5 text-sm"><span className="w-28 shrink-0 font-medium">{k}</span><span className="text-neutral-500">{v}</span></div>
        ))}
      </div>
    </>
  );
}
