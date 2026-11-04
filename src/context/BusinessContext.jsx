import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

const Ctx = createContext(null);
export const useBusiness = () => useContext(Ctx);

export function BusinessProvider({ children }) {
  const { user } = useAuth();
  const key = `biz:${user.uid}`;
  const [list, setList] = useState(null); // null = loading
  const [currentId, setCurrentId] = useState(() => { try { return localStorage.getItem(key); } catch { return null; } });

  useEffect(() => onSnapshot(
    query(collection(db, `users/${user.uid}/businesses`), orderBy("createdAt", "asc")),
    (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  ), [user.uid]);

  const value = useMemo(() => {
    const current = list?.find((b) => b.id === currentId) || list?.[0] || null;
    return {
      list, current, loading: list === null,
      select: (id) => { setCurrentId(id); try { localStorage.setItem(key, id); } catch { /* ignore */ } },
      create: async (name) => {
        const r = await addDoc(collection(db, `users/${user.uid}/businesses`), { name: name.trim(), createdAt: serverTimestamp() });
        setCurrentId(r.id); try { localStorage.setItem(key, r.id); } catch { /* ignore */ }
      },
      rename: (id, name) => updateDoc(doc(db, `users/${user.uid}/businesses/${id}`), { name: name.trim() }),
    };
  }, [list, currentId, key, user.uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
