import { useState } from "react";
import { Check, ChevronsUpDown, Pencil, Plus } from "lucide-react";
import { useBusiness } from "../context/BusinessContext";
import { Field, Modal } from "./ui";
import { DEFAULT_MARGIN, cn, num } from "../lib/utils";

function NameForm({ business, onClose }) {
  const { create, update } = useBusiness();
  const [name, setName] = useState(business?.name || "");
  const [margin, setMargin] = useState(String(business?.margin ?? DEFAULT_MARGIN));
  const save = async (e) => {
    e.preventDefault();
    business ? await update(business.id, name, num(margin)) : await create(name, num(margin));
    onClose();
  };
  return (
    <Modal title={business ? "Edit business" : "New business"} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Name"><input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Profit margin (% of retail price)"><input className="input" type="number" step="any" min="0" max="100" required value={margin} onChange={(e) => setMargin(e.target.value)} /></Field>
        <button className="btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

export default function BusinessSwitcher({ className }) {
  const { list, current, select } = useBusiness();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);

  return (
    <div className={cn("relative", className)}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50">
        <span className="truncate">{current.name}</span><ChevronsUpDown size={14} className="shrink-0 text-neutral-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
            {list.map((b) => (
              <button key={b.id} onClick={() => { select(b.id); setOpen(false); }} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-neutral-100">
                <span className="truncate">{b.name}</span>{b.id === current.id && <Check size={14} />}
              </button>
            ))}
            <div className="my-1 border-t border-neutral-100" />
            <button onClick={() => { setModal({ b: current }); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"><Pencil size={14} />Edit current</button>
            <button onClick={() => { setModal({}); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"><Plus size={14} />New business</button>
          </div>
        </>
      )}
      {modal && <NameForm business={modal.b} onClose={() => setModal(null)} />}
    </div>
  );
}
