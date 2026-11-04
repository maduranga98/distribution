import { useState } from "react";
import { Banknote, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useData } from "../context/DataContext";
import { add, remove, update } from "../lib/db";
import { balances } from "../lib/accounts";
import { money, num, today } from "../lib/utils";
import { Badge, Empty, Field, Modal, PageHeader } from "../components/ui";

function CustomerForm({ customer, onClose }) {
  const { uid } = useData();
  const [f, setF] = useState({ name: "", phone: "", address: "", ...customer });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const data = { name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim() };
    customer ? await update(uid, "customers", customer.id, data) : await add(uid, "customers", data);
    onClose();
  };
  return (
    <Modal title={customer ? "Edit customer" : "New customer"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name"><input className="input" required autoFocus value={f.name} onChange={set("name")} /></Field>
        <Field label="Phone"><input className="input" value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Address"><input className="input" value={f.address} onChange={set("address")} /></Field>
        <button className="btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

function PaymentForm({ customer, balance, onClose }) {
  const { uid } = useData();
  const [amount, setAmount] = useState(balance > 0 ? balance : "");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const save = async (e) => {
    e.preventDefault();
    await add(uid, "payments", { customerId: customer.id, customerName: customer.name, amount: num(amount), date, note: note.trim() });
    onClose();
  };
  return (
    <Modal title={`Receive payment · ${customer.name}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-neutral-500">Outstanding: <b className="text-neutral-900">{money(balance)}</b></p>
        <Field label="Amount"><input className="input" type="number" step="any" min="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Date"><input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <button className="btn-primary w-full">Record payment</button>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const d = useData();
  const [modal, setModal] = useState(null);
  const bal = balances(d);

  return (
    <>
      <PageHeader title="Customers" subtitle="Accounts and credit balances">
        <button className="btn-primary" onClick={() => setModal({ t: "c" })}><Plus size={16} />Customer</button>
      </PageHeader>
      <div className="card overflow-x-auto">
        {d.customers.length === 0 ? <Empty><Users className="mx-auto mb-2" />No customers yet</Empty> : (
          <table className="w-full">
            <thead className="border-b border-neutral-100"><tr>
              <th className="th">Name</th><th className="th">Phone</th><th className="th text-right">Balance</th><th className="th" />
            </tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {d.customers.map((c) => {
                const b = bal[c.id] || 0;
                return (
                  <tr key={c.id}>
                    <td className="td"><div className="font-medium">{c.name}</div><div className="text-xs text-neutral-400">{c.address}</div></td>
                    <td className="td text-neutral-500">{c.phone}</td>
                    <td className="td text-right">{b > 0.005 ? <Badge tone="red">{money(b)}</Badge> : <Badge tone="green">Settled</Badge>}</td>
                    <td className="td whitespace-nowrap text-right">
                      {b > 0.005 && <button title="Receive payment" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "p", c, b })}><Banknote size={15} /></button>}
                      <button title="Edit" className="rounded p-1.5 hover:bg-neutral-100" onClick={() => setModal({ t: "c", c })}><Pencil size={15} /></button>
                      <button title="Delete" className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        onClick={() => (b > 0.005 ? alert("Settle the balance first.") : confirm(`Delete ${c.name}?`) && remove(d.uid, "customers", c.id))}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {modal?.t === "c" && <CustomerForm customer={modal.c} onClose={() => setModal(null)} />}
      {modal?.t === "p" && <PaymentForm customer={modal.c} balance={modal.b} onClose={() => setModal(null)} />}
    </>
  );
}
