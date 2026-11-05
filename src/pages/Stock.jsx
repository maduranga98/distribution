import { useState } from "react";
import { ClipboardList, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { LedgerView, DayReportView, PriceLogView } from "../components/StockViews";
import { useData } from "../context/DataContext";
import { adjustStock, createGrn, createProduct, deleteGrn, deleteProduct, saveProduct } from "../lib/db";
import { onVehicle, stockValue } from "../lib/accounts";
import { cn, fmtQty, money, num, sum, today } from "../lib/utils";
import { Empty, Field, Modal, PageHeader, Stat } from "../components/ui";
import StockTable from "../components/StockTable";
import QtyInput from "../components/QtyInput";

function ProductForm({ product, onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({ name: "", sku: "", unit: "pcs", caseSize: "", cost: "", price: "", minStock: "", stock: "", freeEvery: "", ...product });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const data = {
      name: f.name.trim(), sku: f.sku.trim(), unit: f.unit.trim() || "pcs", caseSize: num(f.caseSize) > 1 ? num(f.caseSize) : 0,
      cost: num(f.cost), minStock: num(f.minStock), freeEvery: num(f.freeEvery) > 0 ? num(f.freeEvery) : 0,
    };
    try {
      if (product) await saveProduct(uid, product, data, num(f.price));
      else await createProduct(uid, { ...data, price: num(f.price), priceHistory: [], stock: num(f.stock) });
      onClose();
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal title={product ? "Edit product" : "New product"} onClose={onClose}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Name"><input className="input" required autoFocus value={f.name} onChange={set("name")} /></Field></div>
        <Field label="SKU"><input className="input" value={f.sku} onChange={set("sku")} /></Field>
        <Field label="Unit"><input className="input" value={f.unit} onChange={set("unit")} /></Field>
        <div className="col-span-2"><Field label="Pieces per case (blank if not sold in cases)"><input className="input" type="number" step="1" min="0" placeholder="e.g. 48" value={f.caseSize || ""} onChange={set("caseSize")} /></Field></div>
        <Field label="MRP (per piece)"><input className="input" type="number" step="any" min="0" required value={f.cost} onChange={set("cost")} /></Field>
        <Field label="List / retail price (per piece)"><input className="input" type="number" step="any" min="0" required value={f.price} onChange={set("price")} /></Field>
        {!product && <Field label="Opening stock"><QtyInput caseSize={f.caseSize} value={String(f.stock)} onChange={(v) => setF({ ...f, stock: v })} /></Field>}
        <Field label="Low-stock alert at"><input className="input" type="number" step="any" min="0" value={f.minStock} onChange={set("minStock")} /></Field>
        <div className="col-span-2"><Field label="Free issue guide: 1 free per … pcs sold (blank if none)"><input className="input" type="number" step="any" min="0" placeholder="e.g. 12" value={f.freeEvery || ""} onChange={set("freeEvery")} /></Field></div>
        {product && <p className="col-span-2 text-xs text-neutral-400">Price changes are recorded in Price history.</p>}
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <button className="btn-primary col-span-2 mt-2">Save</button>
      </form>
    </Modal>
  );
}

/** Add or release stock (damage, count correction, opening balance…). Shows in the Ledger. */
function StockEntryForm({ product, onClose }) {
  const { uid, products } = useData();
  const [pid, setPid] = useState(product?.id || "");
  const p = products.find((x) => x.id === pid);
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState("");
  const [sign, setSign] = useState(1);
  const [cost, setCost] = useState(product ? String(product.cost) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (!p || !num(qty)) return setError("Pick an item and enter a quantity");
    setBusy(true); setError("");
    try {
      await adjustStock(uid, { productId: p.id, qty: sign * num(qty), date, unitCost: num(cost), note: note.trim() });
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };
  return (
    <Modal title="Stock entry" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
          {[[1, "Add"], [-1, "Release"]].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setSign(k)} className={cn("rounded-md py-1.5", sign === k ? "bg-white shadow-sm" : "text-neutral-500")}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Unit cost (per pc)"><input className="input" type="number" step="any" min="0" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        </div>
        <Field label="Item">
          <select className="input" value={pid} onChange={(e) => { setPid(e.target.value); setCost(String(products.find((x) => x.id === e.target.value)?.cost ?? "")); }}>
            <option value="">Select item…</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label={p ? `Quantity · in stock ${fmtQty(p.stock, p.caseSize, p.unit)}` : "Quantity"}><QtyInput caseSize={p?.caseSize} value={qty} onChange={setQty} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opening stock, damaged, count correction…" /></Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Save stock entry</button>
      </form>
    </Modal>
  );
}

const blank = () => ({ productId: "", qty: "", cost: "", mode: "keep", newPrice: "" });

/** One GRN line's price selector: keep current / pick a previous price / enter a new one. */
function PriceSelect({ product, line, onChange }) {
  if (!product) return <div className="input bg-neutral-50 text-neutral-300">—</div>;
  const prev = (product.priceHistory || []).filter((p) => p !== product.price);
  return (
    <div className="flex gap-1.5">
      <select className="input" value={line.mode} onChange={(e) => onChange({ mode: e.target.value })}>
        <option value="keep">Same · {money(product.price)}</option>
        {prev.map((p) => <option key={p} value={`p:${p}`}>Previous · {money(p)}</option>)}
        <option value="new">New price…</option>
      </select>
      {line.mode === "new" && (
        <input className="input !w-24" type="number" step="any" min="0" required autoFocus placeholder="Price" value={line.newPrice} onChange={(e) => onChange({ newPrice: e.target.value })} />
      )}
    </div>
  );
}

const linePrice = (p, l) => (l.mode === "keep" ? p.price : l.mode === "new" ? num(l.newPrice) : num(l.mode.slice(2)));

function GrnForm({ onClose }) {
  const { uid, products } = useData();
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState("");
  const [ref, setRef] = useState("");
  const [lines, setLines] = useState([blank()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const prod = (id) => products.find((p) => p.id === id);
  const setLine = (i, patch) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const pick = (i, productId) => setLine(i, { productId, mode: "keep", newPrice: "", cost: prod(productId)?.cost ?? "" });
  const valid = lines.filter((l) => l.productId && num(l.qty) > 0);
  const total = sum(valid, (l) => num(l.qty) * num(l.cost));

  const save = async (e) => {
    e.preventDefault();
    if (!valid.length) return setError("Add at least one item with a quantity");
    if (new Set(valid.map((l) => l.productId)).size !== valid.length) return setError("An item appears twice");
    setBusy(true); setError("");
    try {
      await createGrn(uid, {
        date, supplier: supplier.trim(), ref: ref.trim(), total,
        items: valid.map((l) => {
          const p = prod(l.productId);
          return { productId: p.id, name: p.name, unit: p.unit, caseSize: p.caseSize || 0, qty: num(l.qty), cost: num(l.cost), price: linePrice(p, l), oldPrice: p.price };
        }),
      });
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Modal title="Goods received (GRN)" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date"><input type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Supplier"><input className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field>
          <Field label="Invoice / ref"><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>

        <div className="space-y-3">
          {lines.map((l, i) => {
            const p = prod(l.productId);
            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-neutral-200 p-2.5">
                <select className="input col-span-11 sm:col-span-5" value={l.productId} onChange={(e) => pick(i, e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <button type="button" className="col-span-1 justify-self-end rounded p-1.5 text-neutral-400 hover:bg-neutral-100 sm:order-last"
                  onClick={() => setLines(lines.length > 1 ? lines.filter((_, k) => k !== i) : [blank()])}><X size={16} /></button>
                <div className="col-span-6 sm:col-span-3"><QtyInput caseSize={p?.caseSize} value={l.qty} onChange={(v) => setLine(i, { qty: v })} /></div>
                <input className="input col-span-6 sm:col-span-2" type="number" step="any" min="0" placeholder="MRP / pc" value={l.cost} onChange={(e) => setLine(i, { cost: e.target.value })} />
                <div className="col-span-12 sm:col-span-12"><span className="label">Retail price</span><PriceSelect product={p} line={l} onChange={(patch) => setLine(i, patch)} /></div>
              </div>
            );
          })}
          <button type="button" className="text-sm text-neutral-500 hover:text-brand" onClick={() => setLines([...lines, blank()])}>+ Add item</button>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-sm text-neutral-500">{valid.length} items · {sum(valid, (l) => num(l.qty))} pcs in total</span>
          <span className="text-lg font-semibold">{money(total)}</span>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>Save GRN & add to inventory</button>
      </form>
    </Modal>
  );
}

function GrnList() {
  const { grns, uid } = useData();
  const [open, setOpen] = useState(null);
  if (!grns.length) return <Empty><ClipboardList className="mx-auto mb-2" />No GRNs yet</Empty>;
  const del = async (g) => {
    if (!confirm("Delete this GRN and remove its quantities from inventory?")) return;
    try { await deleteGrn(uid, g); } catch (e) { alert(e.message); }
  };
  return (
    <div className="divide-y divide-neutral-100">
      {grns.map((g) => (
        <div key={g.id}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === g.id ? null : g.id)}>
              <div className="text-sm font-medium">{g.date}{g.supplier && ` · ${g.supplier}`}{g.ref && <span className="text-neutral-400"> · {g.ref}</span>}</div>
              <div className="text-xs text-neutral-500">{g.items.length} items · {sum(g.items, (i) => i.qty)} pcs · {money(g.total)}</div>
            </button>
            <button className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => del(g)}><Trash2 size={15} /></button>
          </div>
          {open === g.id && (
            <table className="mb-2 w-full">
              <thead><tr><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">MRP / pc</th><th className="th text-right">Retail price / pc</th></tr></thead>
              <tbody>{g.items.map((i) => (
                <tr key={i.productId}>
                  <td className="td !py-1.5">{i.name}</td><td className="td !py-1.5 text-right">{fmtQty(i.qty, i.caseSize, i.unit)}</td><td className="td !py-1.5 text-right">{money(i.cost)}</td>
                  <td className={cn("td !py-1.5 text-right", i.price !== i.oldPrice && "font-medium text-amber-700")}>{i.price !== i.oldPrice ? `${money(i.oldPrice)} → ${money(i.price)}` : money(i.price)}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Stock() {
  const { products, runs, uid } = useData();
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("stock");
  const [q, setQ] = useState("");
  const list = products.filter((p) => (p.name + p.sku).toLowerCase().includes(q.toLowerCase()));
  const van = sum(Object.values(onVehicle(runs)), (v) => v);

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock, goods received and prices">
        <button className="btn-ghost" onClick={() => setModal({ t: "product" })}><Plus size={16} />Product</button>
        <button className="btn-ghost" onClick={() => setModal({ t: "adjust" })}><SlidersHorizontal size={16} />Stock entry</button>
        <button className="btn-primary" onClick={() => setModal({ t: "grn" })}><ClipboardList size={16} />New GRN</button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Products" value={products.length} />
        <Stat label="On vehicles" value={van} hint="pcs, not yet unloaded" />
        <Stat label="Stock value (MRP)" value={money(stockValue(products))} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1 text-sm">
          {[["stock", "Current stock"], ["ledger", "Ledger"], ["report", "Day stock report"], ["grn", "GRN history"], ["prices", "Price history"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("whitespace-nowrap rounded-md px-3 py-1.5", tab === k ? "bg-white shadow-sm" : "text-neutral-500")}>{l}</button>
          ))}
        </div>
        {tab === "stock" && <input className="input !w-44" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
      </div>

      <div className="card overflow-x-auto">
        {tab === "grn" ? <GrnList /> : tab === "ledger" ? <LedgerView /> : tab === "report" ? <DayReportView /> : tab === "prices" ? <PriceLogView /> : (
          <StockTable products={list} actions={(p) => (<>
            <button title="Adjust stock" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "adjust", p })}><SlidersHorizontal size={15} /></button>
            <button title="Edit" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "product", p })}><Pencil size={15} /></button>
            <button title="Delete" className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => confirm(`Delete ${p.name}?`) && deleteProduct(uid, p.id)}><Trash2 size={15} /></button>
          </>)} />
        )}
      </div>

      {modal?.t === "product" && <ProductForm product={modal.p} onClose={() => setModal(null)} />}
      {modal?.t === "adjust" && <StockEntryForm product={modal.p} onClose={() => setModal(null)} />}
      {modal?.t === "grn" && <GrnForm onClose={() => setModal(null)} />}
    </>
  );
}
