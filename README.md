# Distro — distribution manager

React + Vite + Tailwind + Firebase (Auth, Firestore, Hosting).

**Flow:** Inventory → GRN (receive stock, optional new retail price per item) → Loading (pick date + route, save, edit
until unloaded) → Unloading in the evening (unloaded qty + optional market returns, editable) → Daily sales.
Loading also records the opening vehicle meter; unloading records the closing meter (distance = difference), the day's expenses and the cash check
(expected cash = net sales − credit − cheques + old credit collected in cash − expenses; difference = counted − expected). **Analytics** shows
item performance, market returns, the cash / cheques / credit / returns split of the sale value, and route & trip distance for any date range.
Sold qty = loaded − unloaded; net sale = sold × price − market returns × price. Current stock shows warehouse, on-vehicle and total.

## Setup
1. Create a Firebase project; enable **Firestore** (no login is used).
2. Add a web app and copy its config into `.env` (see `.env.example`).
3. `npm install && npm run dev`

## Deploy
```bash
npm i -g firebase-tools && firebase login
firebase use --add            # pick your project
npm run build && firebase deploy --only hosting,firestore
```

## Data model
Each business lives under `users/owner/businesses/{businessId}/…`: `products` (stock, cost, price, priceHistory), `grns`,
`routes`, `runs` (a loading and, once unloaded, its unloading + totals), `expenses` (unloading expenses are written here too, linked by `runId`), `movements` (manual adjustments).
`firestore.rules` is open to that path (no login). Loadings snapshot price and cost per item, so history stays correct when prices change.
