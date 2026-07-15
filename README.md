# StuFin – Student Finance Manager

StuFin is a lightweight web app that helps students track income, expenses, budgets, savings goals, and bill reminders — all in one clean dashboard.

**Live app:** https://stufin.vercel.app

## Features

- 🔐 **Auth** – Register/login with email & password
- 📊 **Dashboard** – Budget health bar, KPI cards (income, expenses, balance, budget left), spending charts
- 💳 **Transactions** – Add, search, and filter income/expense records by category and type
- 🎯 **Budgets** – Set monthly spending limits per category
- ⭐ **Savings Goals** – Track progress toward targets with deadlines
- 🔔 **Reminders** – Never miss a bill due date
- 📄 **Reports** – Export transactions as PDF or CSV
- 🛠️ **Admin Panel** – Manage categories and view platform stats

## Tech Stack

- HTML, CSS, JavaScript (vanilla, no frameworks)
- `localStorage` used as the client-side data store (simulates a SQL-backed backend)
- `schema.sql` documents the intended relational schema (users, transactions, budgets, goals, reminders, categories) for future backend integration

## Project Structure

```
StuFin/
├── index.html    # App markup (auth screen + dashboard shell)
├── app.js        # All app logic: auth, CRUD, charts, exports
├── style.css     # Design system & styling
└── schema.sql    # Reference SQL schema
```

## Running Locally

Since this is a static site, no build step is required.

```bash
git clone https://github.com/vinayak-b-h/StuFin.git
cd StuFin
```

Then just open `index.html` in your browser, or serve it locally:

```bash
npx serve .
```

## Deployment

This project is deployed on **Vercel** as a static site.

To deploy your own copy:

1. Push this repo to your own GitHub account.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Other**. Leave build/output commands empty.
4. Click **Deploy**.

Every push to `main` auto-redeploys the live site.

## Notes on Data

All data (users, transactions, budgets, goals, reminders) is stored in the browser's `localStorage`. This means:

- Data is **per-browser/per-device** and not shared across devices.
- Clearing browser storage will erase all saved data.
- No real backend/database is currently connected — `schema.sql` is provided as a reference for a future real backend (e.g. Postgres/Supabase) integration.

## License

This project is for personal/educational use.