import { Package } from "lucide-react";
import { useData } from "../context/DataContext";
import { onVehicle } from "../lib/accounts";
import { Badge, Empty } from "./ui";

/** Live stock: warehouse, on the vehicle (loaded, not yet unloaded) and total. */
export default function StockTable({ products, actions }) {
  const { runs } = useData();
  const van = onVehicle(runs);
  if (!products.length) return <Empty><Package className="mx-auto mb-2" />No products</Empty>;
  return (
    <table className="w-full">
      <thead className="border-b border-neutral-100"><tr>
        <th className="th">Product</th><th className="th text-right">Price</th>
        <th className="th text-right">Warehouse</th><th className="th text-right">On vehicle</th><th className="th text-right">Total</th>
        {actions && <th className="th" />}
      </tr></thead>
      <tbody className="divide-y divide-neutral-100">
        {products.map((p) => {
          const v = van[p.id] || 0;
          return (
            <tr key={p.id}>
              <td className="td"><div className="font-medium">{p.name}</div><div className="text-xs text-neutral-400">{p.sku}</div></td>
              <td className="td text-right">{Number(p.price).toFixed(2)}</td>
              <td className="td text-right"><Badge tone={p.stock <= 0 ? "red" : p.stock <= (p.minStock || 0) ? "amber" : "green"}>{p.stock} {p.unit}</Badge></td>
              <td className="td text-right text-neutral-500">{v || "—"}</td>
              <td className="td text-right font-medium">{p.stock + v}</td>
              {actions && <td className="td whitespace-nowrap text-right">{actions(p)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
