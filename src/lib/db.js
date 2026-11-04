import {
  addDoc, collection, deleteDoc, doc, increment, runTransaction,
  serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { calcRun } from "./runs";

const col = (base, name) => collection(db, `users/${base}/${name}`);
const ref = (base, name, id) => doc(db, `users/${base}/${name}/${id}`);
const stamp = (d) => ({ ...d, createdAt: serverTimestamp() });

export const add = (base, name, data) => addDoc(col(base, name), stamp(data));
export const update = (base, name, id, data) => updateDoc(ref(base, name, id), data);
export const remove = (base, name, id) => deleteDoc(ref(base, name, id));

/** Record a sale and decrement stock atomically. Rejects if stock is insufficient. */
export async function createSale(base, sale) {
  const saleRef = doc(col(base, "sales"));
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(sale.items.map((i) => tx.get(ref(base, "products", i.productId))));
    const need = {};
    sale.items.forEach((i) => (need[i.productId] = (need[i.productId] || 0) + i.qty));
    snaps.forEach((s, idx) => {
      const it = sale.items[idx];
      if (!s.exists()) throw new Error(`Product "${it.name}" no longer exists`);
      if (s.data().stock < need[it.productId])
        throw new Error(`Not enough stock for "${it.name}" (available ${s.data().stock})`);
    });
    sale.items.forEach((i) => tx.update(ref(base, "products", i.productId), { stock: increment(-i.qty) }));
    tx.set(saleRef, stamp(sale));
  });
  return saleRef.id;
}

/** Delete a sale and return its items to stock. */
export async function deleteSale(base, sale) {
  const batch = writeBatch(db);
  sale.items.forEach((i) => batch.update(ref(base, "products", i.productId), { stock: increment(i.qty) }));
  batch.delete(ref(base, "sales", sale.id));
  await batch.commit();
}

/** Stock in (purchase) or manual adjustment (+/-). Purchases update unit cost. */
export async function addStockMovement(base, m) {
  const batch = writeBatch(db);
  const patch = { stock: increment(m.qty) };
  if (m.type === "purchase" && m.unitCost > 0) patch.cost = m.unitCost;
  batch.update(ref(base, "products", m.productId), patch);
  batch.set(doc(col(base, "movements")), stamp(m));
  await batch.commit();
}

export async function deleteProduct(base, id) {
  await deleteDoc(ref(base, "products", id));
}

/** Morning loading: take stock out of the warehouse and open a route run. */
export async function loadRun(base, run) {
  const runRef = doc(col(base, "runs"));
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(run.items.map((i) => tx.get(ref(base, "products", i.productId))));
    snaps.forEach((s, idx) => {
      const it = run.items[idx];
      if (!s.exists()) throw new Error(`Product "${it.name}" no longer exists`);
      if (s.data().stock < it.loaded) throw new Error(`Not enough stock for "${it.name}" (available ${s.data().stock})`);
    });
    run.items.forEach((i) => tx.update(ref(base, "products", i.productId), { stock: increment(-i.loaded) }));
    tx.set(runRef, stamp({ ...run, status: "loaded" }));
  });
  return runRef.id;
}

/** Evening unloading: return leftovers to stock, post one sale for the route, close the run. */
export async function closeRun(base, runId, lines, collections) {
  const runRef = ref(base, "runs", runId);
  const saleRef = doc(col(base, "sales"));
  await runTransaction(db, async (tx) => {
    const runSnap = await tx.get(runRef);
    if (!runSnap.exists() || runSnap.data().status !== "loaded") throw new Error("This run is already closed");
    const run = runSnap.data();
    const items = run.items.map((i) => ({ ...i, ...lines[i.productId] }));
    const calc = calcRun(items);
    if (calc.error) throw new Error(calc.error);
    const cash = Number(collections.cash) || 0, cheque = Number(collections.cheque) || 0;
    if (cash + cheque > calc.sales + 0.005) throw new Error("Collected more than the sales value");

    items.forEach((i) => {
      if (Number(i.returned) > 0) tx.update(ref(base, "products", i.productId), { stock: increment(Number(i.returned)) });
    });
    // Net unit price/cost so item totals reconcile (concessions, market returns and free issues are folded in).
    const sold = calc.rows.filter((r) => r.sold > 0).map((r) => ({
      productId: r.productId, name: r.name, unit: r.unit, qty: r.sold, price: r.sales / r.sold, cost: r.cost / r.sold,
    }));
    tx.set(saleRef, stamp({
      date: run.date, customerId: null, customerName: `Route · ${run.routeName}`,
      items: sold, total: calc.sales, cost: calc.cost, paid: cash + cheque, runId,
    }));
    tx.update(runRef, {
      status: "closed", items: calc.rows.map(({ error, ...r }) => r),
      totals: { sold: calc.sold, gross: calc.gross, concession: calc.concession, marketValue: calc.marketValue, freeValue: calc.freeValue, sales: calc.sales, cost: calc.cost },
      collections: { cash, cheque, credit: calc.sales - cash - cheque }, saleId: saleRef.id, closedAt: serverTimestamp(),
    });
  });
}

/** Cancel an open run: everything loaded goes back to stock. */
export async function cancelRun(base, run) {
  const batch = writeBatch(db);
  run.items.forEach((i) => batch.update(ref(base, "products", i.productId), { stock: increment(i.loaded) }));
  batch.delete(ref(base, "runs", run.id));
  await batch.commit();
}
