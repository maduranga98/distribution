import {
  addDoc, collection, deleteDoc, doc, getDocs, increment, runTransaction,
  serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { calcCash, calcDistance, calcRun } from "./runs";
import { batchId, num, today } from "./utils";

const col = (base, name) => collection(db, `users/${base}/${name}`);
const ref = (base, name, id) => doc(db, `users/${base}/${name}/${id}`);
const stamp = (d) => ({ ...d, createdAt: serverTimestamp() });
const r3 = (n) => Math.round(n * 1000) / 1000;

/** One stock-ledger row. qty is always positive; type says the direction. */
const ledgerRow = (base, tx, p, e) =>
  tx.set(doc(col(base, "ledger")), stamp({
    date: e.date || today(), productId: p.id, name: p.name, unit: p.unit, caseSize: p.caseSize || 0,
    type: e.type, qty: Math.abs(e.qty), unitCost: e.unitCost ?? p.cost ?? 0, note: e.note || "",
    before: e.before, after: e.after,
  }));
const priceRow = (base, tx, p, oldPrice, newPrice, source) =>
  tx.set(doc(col(base, "priceLog")), stamp({ date: today(), productId: p.id, name: p.name, oldPrice, newPrice, source }));

export const add = (base, name, data) => addDoc(col(base, name), stamp(data));
export const update = (base, name, id, data) => updateDoc(ref(base, name, id), data);
export const remove = (base, name, id) => deleteDoc(ref(base, name, id));

export async function deleteProduct(base, id) {
  await deleteDoc(ref(base, "products", id));
}

/** Save a new product order: ids in the wanted sequence become order 0..n-1. */
export async function saveProductOrder(base, ids) {
  const batch = writeBatch(db);
  ids.forEach((id, i) => batch.update(ref(base, "products", id), { order: i }));
  await batch.commit();
}

/** New product, with an "Opening stock" ledger row and the first price-history entry. */
export async function createProduct(base, data) {
  const pRef = doc(col(base, "products"));
  const batch = writeBatch(db);
  batch.set(pRef, stamp(data));
  const p = { id: pRef.id, ...data };
  const tx = { set: (r, d) => batch.set(r, d) };
  if (data.stock > 0) ledgerRow(base, tx, p, { type: "Add", qty: data.stock, before: 0, after: data.stock, note: "Opening stock" });
  priceRow(base, tx, p, null, data.price, "New");
  await batch.commit();
}

/** Edit a product; a changed retail price is remembered and logged. */
export async function saveProduct(base, product, data, price) {
  const batch = writeBatch(db);
  const patch = { ...data };
  if (price !== product.price) {
    patch.price = price;
    patch.priceHistory = [product.price, ...(product.priceHistory || [])].filter((v, k, a) => v !== price && a.indexOf(v) === k).slice(0, 6);
    priceRow(base, { set: (r, d) => batch.set(r, d) }, product, product.price, price, "Edit");
  }
  batch.update(ref(base, "products", product.id), patch);
  await batch.commit();
}

/** Stock entry: add (+qty) or release (−qty) with a reason. Recorded in the ledger with on-hand before/after. */
export async function adjustStock(base, m) {
  const pRef = ref(base, "products", m.productId);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(pRef);
    if (!s.exists()) throw new Error("Product no longer exists");
    const p = { id: s.id, ...s.data() }, before = p.stock, after = before + m.qty;
    if (after < 0) throw new Error(`Only ${before} in stock`);
    tx.update(pRef, { stock: increment(m.qty) });
    ledgerRow(base, tx, p, { date: m.date, type: m.qty >= 0 ? "Add" : "Release", qty: m.qty, unitCost: m.unitCost, note: m.note, before, after });
  });
}

const norm = (s) => String(s || "").trim().toLowerCase();

export const listProducts = async (base) => (await getDocs(col(base, "products"))).docs.map((d) => ({ id: d.id, ...d.data() }));

/** The product in `list` that is the same item as `p`: same SKU, else same name. */
export const matchProduct = (list, p) =>
  (norm(p.sku) && list.find((x) => norm(x.sku) === norm(p.sku))) || list.find((x) => norm(x.name) === norm(p.name)) || null;

/**
 * Move stock from one business to another in a single transaction.
 * t = { date, note, fromName, toName, items: [{ productId, qty }] }. Items missing in the destination are created there
 * (same details, no price history). Both ledgers get a row with on-hand before/after.
 */
export async function transferStock(fromBase, toBase, t) {
  if (fromBase === toBase) throw new Error("Pick a different business");
  const destList = await listProducts(toBase);
  const orders = destList.map((p) => p.order).filter(Number.isFinite);
  let nextOrder = orders.length ? Math.max(...orders) + 1 : null;
  await runTransaction(db, async (tx) => {
    const srcSnaps = await Promise.all(t.items.map((i) => tx.get(ref(fromBase, "products", i.productId))));
    const matches = srcSnaps.map((s) => (s.exists() ? matchProduct(destList, s.data()) : null));
    const ids = matches.filter(Boolean).map((m) => m.id);
    if (new Set(ids).size !== ids.length) throw new Error("Two items match the same product in the destination");
    const dstSnaps = await Promise.all(matches.map((m) => (m ? tx.get(ref(toBase, "products", m.id)) : null)));
    srcSnaps.forEach((s, k) => {
      const qty = t.items[k].qty;
      if (!s.exists()) throw new Error("A product no longer exists");
      const p = { id: s.id, ...s.data() };
      if (!(qty > 0)) throw new Error(`Enter a quantity for "${p.name}"`);
      if (p.stock < qty) throw new Error(`Only ${p.stock} of "${p.name}" in stock`);
      tx.update(s.ref, { stock: increment(-qty) });
      ledgerRow(fromBase, tx, p, { date: t.date, type: "Release", qty, before: p.stock, after: p.stock - qty, note: `Transfer to ${t.toName}${t.note ? ` · ${t.note}` : ""}` });
      const note = `Transfer from ${t.fromName}${t.note ? ` · ${t.note}` : ""}`;
      const d = dstSnaps[k];
      if (d?.exists()) {
        const dp = { id: d.id, ...d.data() };
        tx.update(d.ref, { stock: increment(qty) });
        ledgerRow(toBase, tx, dp, { date: t.date, type: "Add", qty, unitCost: p.cost, before: dp.stock, after: dp.stock + qty, note });
      } else {
        const nRef = doc(col(toBase, "products"));
        const data = {
          name: p.name, sku: p.sku || "", category: p.category || "", unit: p.unit || "pcs", caseSize: p.caseSize || 0, cost: p.cost || 0,
          price: p.price || 0, priceHistory: [], minStock: p.minStock || 0, freeEvery: p.freeEvery || 0, stock: qty, ...(nextOrder != null && { order: nextOrder++ }),
        };
        tx.set(nRef, stamp(data));
        const np = { id: nRef.id, ...data };
        ledgerRow(toBase, tx, np, { date: t.date, type: "Add", qty, unitCost: p.cost, before: 0, after: qty, note });
        priceRow(toBase, tx, np, null, data.price, "Transfer");
      }
    });
  });
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
      const pr = { id: s.id, ...p };
      ledgerRow(base, tx, pr, { date: grn.date, type: "Add", qty: i.qty, unitCost: i.cost, before: p.stock, after: p.stock + i.qty, note: `GRN${grn.ref ? ` ${grn.ref}` : ""}${grn.supplier ? ` · ${grn.supplier}` : ""}` });
      if (i.price !== p.price) priceRow(base, tx, pr, p.price, i.price, "GRN");
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
    snaps.forEach((s, idx) => {
      if (!s.exists()) return;
      const i = grn.items[idx], p = { id: s.id, ...s.data() };
      tx.update(s.ref, { stock: increment(-i.qty) });
      ledgerRow(base, tx, p, { type: "Release", qty: i.qty, unitCost: i.cost, before: p.stock, after: p.stock - i.qty, note: "GRN deleted" });
    });
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
    let old = {}, oldOpen = {};
    if (runId) {
      const s = await tx.get(runRef);
      if (!s.exists() || s.data().status !== "loaded") throw new Error("This loading is already unloaded and can't be edited");
      s.data().items.forEach((i) => { old[i.productId] = i.loaded; oldOpen[i.productId] = i.opening; });
    }
    const now = Object.fromEntries(run.items.map((i) => [i.productId, i.loaded]));
    const ids = [...new Set([...Object.keys(old), ...Object.keys(now)])];
    const snaps = await Promise.all(ids.map((id) => tx.get(ref(base, "products", id))));
    const stockNow = Object.fromEntries(snaps.map((s, k) => [ids[k], s.exists() ? s.data().stock : 0]));
    // warehouse stock before this loading took its share (kept when editing, for the Day Stock Report)
    const data = { ...run, items: run.items.map((i) => ({ ...i, opening: oldOpen[i.productId] ?? stockNow[i.productId] })) };
    snaps.forEach((s, k) => {
      const delta = (now[ids[k]] || 0) - (old[ids[k]] || 0);
      if (!delta) return;
      if (!s.exists()) throw new Error("A product no longer exists");
      if (delta > 0 && s.data().stock < delta) throw new Error(`Not enough stock for "${s.data().name}" (available ${s.data().stock})`);
      tx.update(s.ref, { stock: increment(-delta) });
    });
    if (runId) tx.update(runRef, data); else tx.set(runRef, stamp({ ...data, status: "loaded", batchId: batchId() }));
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
 * Evening unloading (also used to edit one). lines[productId] = { returned, marketReturn, free }.
 * Leftover goes back to the warehouse; sold = loaded − returned; market returns reduce the sale value.
 * extra = { meterEnd, expenses: [{category, amount, note}], collection: {credit, cheques, oldCash, oldCheque, cashCounted} }.
 * The day's expenses are also written to the expenses collection (linked by runId) so Accounts stay correct;
 * on edit the previously written ones are replaced.
 */
export async function saveUnloading(base, runId, lines, extra = {}) {
  const runRef = ref(base, "runs", runId);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(runRef);
    if (!s.exists()) throw new Error("Loading not found");
    const run = s.data();
    const snaps = await Promise.all(run.items.map((i) => tx.get(ref(base, "products", i.productId))));
    const items = run.items.map((i) => ({ ...i, ...lines[i.productId] }));
    const calc = calcRun(items);
    if (calc.error) throw new Error(calc.error);

    const meterEnd = extra.meterEnd === "" || extra.meterEnd == null ? null : num(extra.meterEnd);
    const distance = calcDistance(run.meterStart, meterEnd);
    if (distance != null && distance < 0) throw new Error("Closing meter is lower than the opening meter");

    const dayExpenses = (extra.expenses || [])
      .map((e) => ({ category: e.category, amount: num(e.amount), note: (e.note || "").trim() }))
      .filter((e) => e.amount > 0);
    const expenseTotal = dayExpenses.reduce((t, e) => t + e.amount, 0);
    const cash = calcCash(calc.sales, extra.collection || {}, expenseTotal);

    const wasDone = run.status !== "loaded";
    // warehouse stock right after this unloading, kept per item for the Day Stock Report
    const closing = {};
    run.items.forEach((i, k) => {
      const delta = num(lines[i.productId]?.returned) - (wasDone ? num(i.returned) : 0);
      const p = snaps[k];
      if (!p.exists()) return; // product deleted since loading: nothing to restock
      if (delta) tx.update(p.ref, { stock: increment(delta) });
      if (!wasDone) closing[i.productId] = r3(num(p.data().stock) + delta);
      else if (i.closing != null) closing[i.productId] = r3(i.closing + delta);
    });

    (run.expenseIds || []).forEach((id) => tx.delete(ref(base, "expenses", id)));
    const expenseIds = dayExpenses.map((e) => {
      const r = doc(col(base, "expenses"));
      tx.set(r, stamp({ ...e, date: run.date, runId, routeName: run.routeName }));
      return r.id;
    });

    tx.update(runRef, {
      status: "unloaded",
      items: calc.rows.map(({ error, closing: _, ...r }) => ({ ...r, ...(closing[r.productId] != null && { closing: closing[r.productId] }) })),
      totals: { loaded: calc.loaded, sold: calc.sold, free: calc.free, freeValue: calc.freeValue, gross: calc.gross, marketValue: calc.marketValue, sales: calc.sales, cost: calc.cost },
      meterEnd, distance, dayExpenses, expenseIds, collection: cash,
      unloadedAt: serverTimestamp(),
    });
  });
}
