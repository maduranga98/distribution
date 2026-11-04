import { useState } from "react";
import { Package, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useData } from "../context/DataContext";
import { add, addStockMovement, deleteProduct, update } from "../lib/db";
import { money, num, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";
import { stockValue } from "../lib/accounts";

function ProductForm({ product, onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({ name: "", sku: "", unit: "pcs", cost: "", price: "", specialPrice: "", minStock: "", stock: "", ...product });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const data = { name: f.name.trim(), sku: f.sku.trim(), unit: f.unit.trim() || "pcs", cost: num(f.cost), price: num(f.price), specialPrice: num(f.specialPrice), minStock: num(f.minStock) };
    if (product) await update(uid, "products", product.id, data);
    else await add(uid, "products", { ...data, stock: num(f.stock) });
    onClose();
  };
  return (
    <Modal title={product ? "Edit product" : "New product"} onClose={onClose}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Name"><input className="input" required autoFocus value={f.name} onChange={set("name")} /></Field></div>
        <Field label="SKU"><input className="input" value={f.sku} onChange={set("sku")} /></Field>
        <Field label="Unit"><input className="input" value={f.unit} onChange={set("unit")} /></Field>
        <Field label="Cost price"><input className="input" type="number" step="any" min="0" required value={f.cost} onChange={set("cost")} /></Field>
        <Field label="Selling price"><input className="input" type="number" step="any" min="0" required value={f.price} onChange={set("price")} /></Field>
        <Field label="Special price (optional)"><input className="input" type="number" step="any" min="0" value={f.specialPrice} onChange={set("specialPrice")} /></Field>
        {!product && <Field label="Opening stock"><input className="input" type="number" step="any" min="0" value={f.stock} onChange={set("stock")} /></Field>}
        <Field label="Low-stock alert at"><input className="input" type="number" step="any" min="0" value={f.minStock} onChange={set("minStock")} /></Field>
        <button className="btn-primary col-span-2 mt-2">Save</button>
      </form>
    </Modal>
  );
}

function StockForm({ product, onClose }) {
  const { uid } = useData();
  const [type, setType] = useState("purchase");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState(product.cost);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const save = async (e) => {
    e.preventDefault();
    const q = num(qty);
    if (!q) return;
    await addStockMovement(uid, {
      productId: product.id, productName: product.name, type, qty: q,
      unitCost: type === "purchase" ? num(unitCost) : 0, date, note: note.trim(),
    });
    onClose();
  };
  return (
    <Modal title={`Update stock · ${product.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          {[["purchase", "Stock in (purchase)"], ["adjust", "Adjustment"]].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setType(k)} className={`rounded-md py-1.5 ${type === k ? "bg-white shadow-sm" : "text-neutral-500"}`}>{l}</button>
          ))}
        </div>
        <Field label={type === "purchase" ? `Quantity received (${product.unit})` : "Quantity (use negative to remove, e.g. damaged)"}>
          <input className="input" type="number" step="any" required autoFocus min={type === "purchase" ? "0" : undefined} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        {type === "purchase" && <Field label="Unit cost"><input className="input" type="number" step="any" min="0" required value={unitCost} onChange={(e) => setUnitCost(e.target.value)} /></Field>}
        <Field label="Date"><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, reason…" /></Field>
        <button className="btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

export default function Stock() {
  const { products, uid } = useData();
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState("");
  const list = products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Stock" subtitle="Products and inventory">
        <input className="input !w-44" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setModal({ t: "product" })}><Plus size={16} />Product</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Products" value={products.length} />
        <Stat label="Stock value (at cost)" value={money(stockValue(products))} />
        <Stat label="Low / out of stock" value={products.filter((p) => p.stock <= (p.minStock || 0)).length} />
      </div>

      <div className="card overflow-x-auto">
        {list.length === 0 ? <Empty><Package className="mx-auto mb-2" />No products yet</Empty> : (
          <table className="w-full">
            <thead className="border-b border-neutral-100"><tr>
              <th className="th">Product</th><th className="th text-right">Cost</th><th className="th text-right">Price</th><th className="th text-right">In stock</th><th className="th" />
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="td"><div className="font-medium">{p.name}</div><div className="text-xs text-neutral-400">{p.sku}</div></td>
                  <td className="td text-right">{money(p.cost)}</td>
                  <td className="td text-right">{money(p.price)}</td>
                  <td className="td text-right"><Badge tone={p.stock <= 0 ? "red" : p.stock <= (p.minStock || 0) ? "amber" : "green"}>{p.stock} {p.unit}</Badge></td>
                  <td className="td whitespace-nowrap text-right">
                    <button title="Receive / adjust stock" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "stock", p })}><Truck size={15} /></button>
                    <button title="Edit" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "product", p })}><Pencil size={15} /></button>
                    <button title="Delete" className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => confirm(`Delete ${p.name}?`) && deleteProduct(uid, p.id)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.t === "product" && <ProductForm product={modal.p} onClose={() => setModal(null)} />}
      {modal?.t === "stock" && <StockForm product={modal.p} onClose={() => setModal(null)} />}
    </>
  );
}
