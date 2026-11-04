import {
  addDoc, collection, deleteDoc, doc, increment, runTransaction,
  serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const col = (uid, name) => collection(db, "users", uid, name);
const ref = (uid, name, id) => doc(db, "users", uid, name, id);
const stamp = (d) => ({ ...d, createdAt: serverTimestamp() });

export const add = (uid, name, data) => addDoc(col(uid, name), stamp(data));
export const update = (uid, name, id, data) => updateDoc(ref(uid, name, id), data);
export const remove = (uid, name, id) => deleteDoc(ref(uid, name, id));

/** Record a sale and decrement stock atomically. Rejects if stock is insufficient. */
export async function createSale(uid, sale) {
  const saleRef = doc(col(uid, "sales"));
  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(sale.items.map((i) => tx.get(ref(uid, "products", i.productId))));
    const need = {};
    sale.items.forEach((i) => (need[i.productId] = (need[i.productId] || 0) + i.qty));
    snaps.forEach((s, idx) => {
      const it = sale.items[idx];
      if (!s.exists()) throw new Error(`Product "${it.name}" no longer exists`);
      if (s.data().stock < need[it.productId])
        throw new Error(`Not enough stock for "${it.name}" (available ${s.data().stock})`);
    });
    sale.items.forEach((i) => tx.update(ref(uid, "products", i.productId), { stock: increment(-i.qty) }));
    tx.set(saleRef, stamp(sale));
  });
  return saleRef.id;
}

/** Delete a sale and return its items to stock. */
export async function deleteSale(uid, sale) {
  const batch = writeBatch(db);
  sale.items.forEach((i) => batch.update(ref(uid, "products", i.productId), { stock: increment(i.qty) }));
  batch.delete(ref(uid, "sales", sale.id));
  await batch.commit();
}

/** Stock in (purchase) or manual adjustment (+/-). Purchases update unit cost. */
export async function addStockMovement(uid, m) {
  const batch = writeBatch(db);
  const patch = { stock: increment(m.qty) };
  if (m.type === "purchase" && m.unitCost > 0) patch.cost = m.unitCost;
  batch.update(ref(uid, "products", m.productId), patch);
  batch.set(doc(col(uid, "movements")), stamp(m));
  await batch.commit();
}

export async function deleteProduct(uid, id) {
  await deleteDoc(ref(uid, "products", id));
}
