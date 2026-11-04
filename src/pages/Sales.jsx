import { useState } from "react";
import { Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useData } from "../context/DataContext";
import { createSale, deleteSale } from "../lib/db";
import { money, num, sum, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";

function SaleForm({ onClose }) {
  const { uid, products, customers } = useData();
  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([{ productId: "", qty: "1", price: "" }]);
  const [paid, setPaid] = useState(""); // blank = paid in full
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setLine = (i, patch) => setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const pick = (i, productId) => setLine(i, { productId, price: products.find((p) => p.id === productId)?.price ?? "" });

  const valid = lines.filter((l) => l.productId && num(l.qty) > 0);
  const total = sum(valid, (l) => num(l.qty) * num(l.price));
  const paidAmt = paid === "" ? total : Math.min(num(paid), total);
  const customer = customers.find((c) => c.id === customerId);

  const save = async (e) => {
    e.preventDefault();
    if (!valid.length) return setError("Add at least one item");
    if (paidAmt < total && !customer) return setError("Select a customer for credit sales");
    setBusy(true); setError("");
    const items = valid.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return { productId: p.id, name: p.name, unit: p.unit, qty: num(l.qty), price: num(l.price), cost: p.cost };
    });
    try {
      await createSale(uid, {
        date, customerId: customer?.id || null, customerName: customer?.name || "Walk-in",
        items, total, cost: sum(items, (i) => i.qty * i.cost), paid: paidAmt,
      });
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="New sale" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Customer">
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <select className="input col-span-12 sm:col-span-6" value={l.productId} onChange={(e) => pick(i, e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((x) => <option key={x.id} value={x.id} disabled={x.stock <= 0}>{x.name} ({x.stock} left)</option>)}
                </select>
                <input className="input col-span-4 sm:col-span-2" type="number" step="any" min="0" max={p?.stock} placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
                <input className="input col-span-5 sm:col-span-3" type="number" step="any" min="0" placeholder="Price" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} />
                <button type="button" className="col-span-3 justify-self-end rounded p-1.5 text-neutral-400 hover:bg-neutral-100 sm:col-span-1"
                  onClick={() => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : lines)}><X size={16} /></button>
              </div>
            );
          })}
          <button type="button" className="text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setLines([...lines, { productId: "", qty: "1", price: "" }])}>+ Add item</button>
        </div>

        <div className="grid grid-cols-2 items-end gap-3 border-t border-neutral-100 pt-4">
          <Field label={`Amount received (blank = full ${money(total)})`}>
            <input className="input" type="number" step="any" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} />
          </Field>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="text-2xl font-semibold">{money(total)}</p>
            {paidAmt < total && <p className="text-xs text-red-600">Credit {money(total - paidAmt)}</p>}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Record sale</button>
      </form>
    </Modal>
  );
}

export default function Sales() {
  const d = useData();
  const [date, setDate] = useState(today());
  const [open, setOpen] = useState(false);
  const list = d.sales.filter((s) => s.date === date);
  const total = sum(list, (s) => s.total);
  const profit = total - sum(list, (s) => s.cost);

  return (
    <>
      <PageHeader title="Sales" subtitle="Daily sales">
        <input type="date" className="input !w-40" value={date} onChange={(e) => setDate(e.target.value || today())} />
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />New sale</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Sales" value={money(total)} />
        <Stat label="Profit" value={money(profit)} tone="good" />
        <Stat label="Collected" value={money(sum(list, (s) => s.paid))} />
      </div>

      <div className="card overflow-x-auto">
        {list.length === 0 ? <Empty><ShoppingCart className="mx-auto mb-2" />No sales on this day</Empty> : (
          <table className="w-full">
            <thead className="border-b border-neutral-100"><tr>
              <th className="th">Customer</th><th className="th">Items</th><th className="th text-right">Total</th><th className="th text-right">Status</th><th className="th" />
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.customerName}</td>
                  <td className="td text-neutral-500">{s.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}</td>
                  <td className="td text-right">{money(s.total)}</td>
                  <td className="td text-right">{s.paid >= s.total ? <Badge tone="green">Paid</Badge> : <Badge tone="red">Owes {money(s.total - s.paid)}</Badge>}</td>
                  <td className="td text-right">
                    {s.runId ? <span className="text-xs text-neutral-400">Route</span> : (
                      <button className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete & restock"
                        onClick={() => confirm("Delete this sale and return items to stock?") && deleteSale(d.uid, s)}><Trash2 size={15} /></button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && <SaleForm onClose={() => setOpen(false)} />}
    </>
  );
}
