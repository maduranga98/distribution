import { Package } from "lucide-react";
import { useData } from "../context/DataContext";
import { onVehicle } from "../lib/accounts";
import { fmtQty } from "../lib/utils";
import { Badge, Empty } from "./ui";

/** Live stock: warehouse, on the vehicle (loaded, not yet unloaded) and total. */
export default function StockTable({ products, actions }) {
  const { runs } = useData();
  const van = onVehicle(runs);
  if (!products.length) return <Empty><Package className="mx-auto mb-2" />No products</Empty>;
  return (
    <table className="w-full">
      <thead className="border-b border-neutral-100"><tr>
        <th className="th">Product</th><th className="th hidden text-right sm:table-cell">Price</th>
        <th className="th text-right">Warehouse</th><th className="th hidden text-right sm:table-cell">On vehicle</th><th className="th hidden text-right md:table-cell">Total</th>
        {actions && <th className="th" />}
      </tr></thead>
      <tbody className="divide-y divide-neutral-100">
        {products.map((p) => {
          const v = van[p.id] || 0;
          return (
            <tr key={p.id}>
              <td className="td"><div className="font-medium">{p.name}</div><div className="text-xs text-neutral-400">{[p.category, p.sku].filter(Boolean).join(" · ")}{p.caseSize > 1 && ` · ${p.caseSize} per case`}</div>
                <div className="mt-0.5 text-xs text-neutral-500 sm:hidden">{Number(p.price).toFixed(2)}{v ? ` · ${fmtQty(v, p.caseSize, p.unit)} on vehicle` : ""}</div></td>
              <td className="td hidden text-right sm:table-cell">{Number(p.price).toFixed(2)}</td>
              <td className="td text-right"><Badge tone={p.stock <= 0 ? "red" : p.stock <= (p.minStock || 0) ? "amber" : "green"}>{fmtQty(p.stock, p.caseSize, p.unit)}</Badge></td>
              <td className="td hidden text-right text-neutral-500 sm:table-cell">{v ? fmtQty(v, p.caseSize, p.unit) : "—"}</td>
              <td className="td hidden text-right font-medium md:table-cell">{fmtQty(p.stock + v, p.caseSize, p.unit)}</td>
              {actions && <td className="td whitespace-nowrap text-right">{actions(p)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
