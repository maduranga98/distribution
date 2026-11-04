import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Field } from "../components/ui";

export default function Login() {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await (mode === "in" ? signInWithEmailAndPassword : createUserWithEmailAndPassword)(auth, email, password);
    } catch (err) {
      setError(err.code?.replace("auth/", "").replace(/-/g, " ") || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Distro</h1>
          <p className="text-sm text-neutral-500">{mode === "in" ? "Sign in to your account" : "Create your account"}</p>
        </div>
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-sm capitalize text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</button>
        <button type="button" className="w-full text-center text-xs text-neutral-500 hover:text-neutral-900" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
