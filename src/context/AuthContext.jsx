import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>;
}
