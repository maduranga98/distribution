import { useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { useData } from "../context/DataContext";
import { add, remove } from "../lib/db";
import { monthStart, money, num, sum, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader, Stat } from "../components/ui";

export const CATEGORIES = ["Fuel", "Salary", "Driver / Helper Wages", "Loading / Unloading", "Vehicle Maintenance", "Tolls / Parking", "Packing", "Rent", "Utilities", "Marketing", "Other"];

function ExpenseForm({ onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({ date: today(), category: CATEGORIES[0], amount: "", note: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    await add(uid, "expenses", { ...f, amount: num(f.amount), note: f.note.trim() });
    onClose();
  };
  return (
    <Modal title="New expense" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Date"><input className="input" type="date" required value={f.date} onChange={set("date")} /></Field>
        <Field label="Category"><select className="input" value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Amount"><input className="input" type="number" step="any" min="0.01" required autoFocus value={f.amount} onChange={set("amount")} /></Field>
        <Field label="Note"><input className="input" value={f.note} onChange={set("note")} /></Field>
        <button className="btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const { expenses, uid } = useData();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthStart());
  const list = expenses.filter((e) => e.date >= from).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title="Expenses" subtitle="Operating costs">
        <input type="date" className="input min-w-[9rem] flex-1 sm:w-40 sm:flex-none" value={from} onChange={(e) => setFrom(e.target.value || monthStart())} />
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Expense</button>
      </PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3"><Stat label="Total since date" value={money(sum(list, (e) => e.amount))} /><Stat label="Entries" value={list.length} /></div>
      <div className="card overflow-x-auto">
        {list.length === 0 ? <Empty><Receipt className="mx-auto mb-2" />No expenses</Empty> : (
          <table className="w-full">
            <tbody className="divide-y divide-neutral-100">
              {list.map((e) => (
                <tr key={e.id}>
                  <td className="td text-neutral-500">{e.date}</td>
                  <td className="td"><Badge>{e.category}</Badge></td>
                  <td className="td text-neutral-500">{e.note}</td>
                  <td className="td text-right font-medium">{money(e.amount)}</td>
                  <td className="td text-right">{e.runId
                    ? <span className="text-xs text-neutral-400" title="Recorded at unloading — edit it from Daily">{e.routeName || "Daily"}</span>
                    : <button className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => confirm("Delete expense?") && remove(uid, "expenses", e.id)}><Trash2 size={15} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && <ExpenseForm onClose={() => setOpen(false)} />}
    </>
  );
}
