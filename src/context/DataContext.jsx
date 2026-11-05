import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useBusiness } from "./BusinessContext";
import { DEFAULT_MARGIN, OWNER } from "../lib/utils";

const Ctx = createContext(null);
export const useData = () => useContext(Ctx);

const NAMES = ["products", "expenses", "movements", "ledger", "priceLog", "grns", "routes", "runs"];

export function DataProvider({ children }) {
  const { current } = useBusiness();
  const base = `${OWNER}/businesses/${current.id}`;
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
      margin: Number.isFinite(current.margin) ? current.margin : DEFAULT_MARGIN, // profit % of MRP
      loading: NAMES.some((n) => !ready[n]),
      products: g("products"),
      expenses: g("expenses"), movements: g("movements"), ledger: g("ledger"), priceLog: g("priceLog"), grns: g("grns"), routes: g("routes"), runs: g("runs"),
    };
  }, [data, ready, base, current.margin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
