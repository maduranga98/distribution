import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { OWNER } from "../lib/utils";

const Ctx = createContext(null);
export const useBusiness = () => useContext(Ctx);

export function BusinessProvider({ children }) {
  const key = "biz:current";
  const [list, setList] = useState(null); // null = loading
  const [currentId, setCurrentId] = useState(() => { try { return localStorage.getItem(key); } catch { return null; } });

  useEffect(() => onSnapshot(
    query(collection(db, `users/${OWNER}/businesses`), orderBy("createdAt", "asc")),
    (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() })))
  ), []);

  const value = useMemo(() => {
    const current = list?.find((b) => b.id === currentId) || list?.[0] || null;
    return {
      list, current, loading: list === null,
      select: (id) => { setCurrentId(id); try { localStorage.setItem(key, id); } catch { /* ignore */ } },
      create: async (name, margin) => {
        const r = await addDoc(collection(db, `users/${OWNER}/businesses`), { name: name.trim(), margin, createdAt: serverTimestamp() });
        setCurrentId(r.id); try { localStorage.setItem(key, r.id); } catch { /* ignore */ }
      },
      update: (id, name, margin) => updateDoc(doc(db, `users/${OWNER}/businesses/${id}`), { name: name.trim(), margin }),
    };
  }, [list, currentId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
