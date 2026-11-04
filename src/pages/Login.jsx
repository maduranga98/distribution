import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true); setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") setError(err.code?.replace("auth/", "").replace(/-/g, " ") || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Distro</h1>
          <p className="text-sm text-neutral-500">Distribution manager</p>
        </div>
        <button onClick={signIn} disabled={busy} className="btn-primary w-full">Continue with Google</button>
        {error && <p className="text-sm capitalize text-red-600">{error}</p>}
      </div>
    </div>
  );
}
