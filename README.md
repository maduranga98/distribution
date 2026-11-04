# Distro — distribution manager

React + Vite + Tailwind + Firebase (Auth, Firestore, Hosting).

**Features:** stock & products (receive stock, adjustments, low-stock alerts) · daily sales with
line items, cash/credit, atomic stock deduction · customers & credit balances / payments ·
expenses by category · accounts (P&L, cash flow, stock value, receivables) · dashboard.

## Setup
1. Create a Firebase project; enable **Authentication → Email/Password** and **Firestore**.
2. Add a web app and copy its config into `.env` (see `.env.example`).
3. `npm install && npm run dev`

## Deploy
```bash
npm i -g firebase-tools && firebase login
firebase use --add            # pick your project
npm run build && firebase deploy --only hosting,firestore
```

## Data model
Each business lives under `users/{uid}/businesses/{businessId}/…` (`products`, `customers`, `sales`, `payments`,
`expenses`, `movements`); rules in `firestore.rules` restrict each user to their own data.
Sales snapshot cost price per item, so historical profit stays correct when costs change.
