import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useBusiness } from "./BusinessContext";
import { useAuth } from "./AuthContext";

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

const NAMES = ["products", "customers", "sales", "expenses", "payments", "movements"];

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { current } = useBusiness();
  const base = `${user.uid}/businesses/${current.id}`;
  const [data, setData] = useState({});
  const [ready, setReady] = useState({});

  useEffect(() => {
    const unsubs = NAMES.map((name) =>
      onSnapshot(
        query(collection(db, `users/${base}/${name}`), orderBy("createdAt", "desc")),
        (snap) => {
          setData((d) => ({ ...d, [name]: snap.docs.map((x) => ({ id: x.id, ...x.data() })) }));
          setReady((r) => ({ ...r, [name]: true }));
        },
        (e) => console.error(name, e)
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [base]);

  const value = useMemo(() => {
    const g = (n) => data[n] || [];
    return {
      uid: base, // data path prefix for the active business
      loading: NAMES.some((n) => !ready[n]),
      products: g("products"), customers: g("customers"), sales: g("sales"),
      expenses: g("expenses"), payments: g("payments"), movements: g("movements"),
    };
  }, [data, ready, base]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
