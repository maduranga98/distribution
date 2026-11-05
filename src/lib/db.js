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

export async function deleteProduct(base, id) {
  await deleteDoc(ref(base, "products", id));
}

/** Manual stock adjustment (+/-), e.g. damaged or counted difference. */
export async function adjustStock(base, m) {
  const batch = writeBatch(db);
  batch.update(ref(base, "products", m.productId), { stock: increment(m.qty) });
  batch.set(doc(col(base, "movements")), stamp({ ...m, type: "adjust" }));
  await batch.commit();
}

/**
 * GRN: receive stock into inventory. Each line carries the MRP and the retail price chosen
 * in the price selector; the product's price only changes (and is remembered) if it differs.
 */
export async function createGrn(base, grn) {
  const grnRef = doc(col(base, "grns"));
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(grn.items.map((i) => tx.get(ref(base, "products", i.productId))));
    snaps.forEach((s, idx) => {
      if (!s.exists()) throw new Error(`Product "${grn.items[idx].name}" no longer exists`);
      const i = grn.items[idx], p = s.data();
      const patch = { stock: increment(i.qty), cost: i.cost };
      if (i.price !== p.price) {
        patch.price = i.price;
        patch.priceHistory = [p.price, ...(p.priceHistory || [])].filter((v, k, a) => v !== i.price && a.indexOf(v) === k).slice(0, 6);
      }
      tx.update(s.ref, patch);
    });
    tx.set(grnRef, stamp(grn));
  });
  return grnRef.id;
}

/** Delete a GRN and take its quantities back out of inventory (blocked if already used). */
export async function deleteGrn(base, grn) {
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(grn.items.map((i) => tx.get(ref(base, "products", i.productId))));
    snaps.forEach((s, idx) => {
      const i = grn.items[idx];
      if (s.exists() && s.data().stock < i.qty) throw new Error(`Can't remove: "${i.name}" has only ${s.data().stock} in stock`);
    });
    snaps.forEach((s, idx) => s.exists() && tx.update(s.ref, { stock: increment(-grn.items[idx].qty) }));
    tx.delete(ref(base, "grns", grn.id));
  });
}

/**
 * Save a loading (create, or edit while still on the road). Inventory moves by the difference
 * between the new and previously saved quantities.
 */
export async function saveLoading(base, run, runId) {
  const runRef = runId ? ref(base, "runs", runId) : doc(col(base, "runs"));
  await runTransaction(db, async (tx) => {
    let old = {};
    if (runId) {
      const s = await tx.get(runRef);
      if (!s.exists() || s.data().status !== "loaded") throw new Error("This loading is already unloaded and can't be edited");
      s.data().items.forEach((i) => (old[i.productId] = i.loaded));
    }
    const now = Object.fromEntries(run.items.map((i) => [i.productId, i.loaded]));
    const ids = [...new Set([...Object.keys(old), ...Object.keys(now)])];
    const snaps = await Promise.all(ids.map((id) => tx.get(ref(base, "products", id))));
    snaps.forEach((s, k) => {
      const delta = (now[ids[k]] || 0) - (old[ids[k]] || 0);
      if (!delta) return;
      if (!s.exists()) throw new Error("A product no longer exists");
      if (delta > 0 && s.data().stock < delta) throw new Error(`Not enough stock for "${s.data().name}" (available ${s.data().stock})`);
      tx.update(s.ref, { stock: increment(-delta) });
    });
    if (runId) tx.update(runRef, run); else tx.set(runRef, stamp({ ...run, status: "loaded" }));
  });
  return runRef.id;
}

/** Cancel a loading that hasn't been unloaded: everything goes back to the warehouse. */
export async function cancelLoading(base, run) {
  const batch = writeBatch(db);
  run.items.forEach((i) => batch.update(ref(base, "products", i.productId), { stock: increment(i.loaded) }));
  batch.delete(ref(base, "runs", run.id));
  await batch.commit();
}

/**
 * Evening unloading (also used to edit one). lines[productId] = { returned, marketReturn }.
 * Leftover goes back to the warehouse; sold = loaded − returned; market returns reduce the sale value.
 */
export async function saveUnloading(base, runId, lines) {
  const runRef = ref(base, "runs", runId);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(runRef);
    if (!s.exists()) throw new Error("Loading not found");
    const run = s.data();
    const items = run.items.map((i) => ({ ...i, ...lines[i.productId] }));
    const calc = calcRun(items);
    if (calc.error) throw new Error(calc.error);
    const wasDone = run.status !== "loaded";
    run.items.forEach((i) => {
      const delta = Number(lines[i.productId]?.returned || 0) - (wasDone ? Number(i.returned || 0) : 0);
      if (delta) tx.update(ref(base, "products", i.productId), { stock: increment(delta) });
    });
    tx.update(runRef, {
      status: "unloaded",
      items: calc.rows.map(({ error, ...r }) => r),
      totals: { loaded: calc.loaded, sold: calc.sold, gross: calc.gross, marketValue: calc.marketValue, sales: calc.sales, cost: calc.cost },
      unloadedAt: serverTimestamp(),
    });
  });
}
