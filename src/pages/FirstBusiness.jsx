import { useState } from "react";
import { useBusiness } from "../context/BusinessContext";
import { Field } from "../components/ui";

export default function FirstBusiness() {
  const { create } = useBusiness();
  const [name, setName] = useState("");
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={(e) => { e.preventDefault(); create(name); }} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Create your first business</h1>
          <p className="text-sm text-neutral-500">You can add more later and switch between them.</p>
        </div>
        <Field label="Business name"><input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <button className="btn-primary w-full">Continue</button>
      </form>
    </div>
  );
}
