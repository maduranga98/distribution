import {
  addDoc, collection, deleteDoc, doc, increment, runTransaction,
  serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

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
