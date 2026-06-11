# StuFin – Setup Guide (Node.js + MySQL)

## Folder Structure
```
stufin-backend/
├── public/          ← Frontend (HTML + CSS + JS) served by Express
│   ├── index.html
│   ├── style.css
│   └── app.js
├── routes/
│   ├── auth.js
│   ├── transactions.js
│   ├── categories.js   (also exports budgetsRouter)
│   └── goals.js        (also exports remindersRouter, adminRouter)
├── middleware/
│   └── auth.js
├── db.js            ← MySQL connection pool
├── server.js        ← Express entry point
├── schema.sql       ← Run this in MySQL first
├── .env             ← Your DB credentials go here
└── package.json
```

---

## Step 1 — Install MySQL
Download and install MySQL Community Server:
https://dev.mysql.com/downloads/mysql/

During setup, set a root password — you'll need it in Step 3.

---

## Step 2 — Create the Database
Open MySQL Workbench (or MySQL shell) and run:
```sql
SOURCE path/to/stufin-backend/schema.sql;
```
Or paste the contents of schema.sql into MySQL Workbench and execute.

---

## Step 3 — Configure .env
Open `.env` and fill in your MySQL password:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=stufin
SESSION_SECRET=any_random_string
PORT=3000
```

---

## Step 4 — Install Node.js dependencies
Open VS Code terminal (Ctrl + `) inside the stufin-backend folder:
```bash
npm install
```

---

## Step 5 — Start the server
```bash
# Normal start
node server.js

# Auto-restart on file changes (recommended during development)
npm run dev
```

You should see:
```
✅  MySQL connected successfully
🚀  StuFin server running at http://localhost:3000
```

---

## Step 6 — Open the app
Go to: http://localhost:3000

Register a new account and start using StuFin!

---

## API Reference

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| POST   | /api/auth/register              | Create account               |
| POST   | /api/auth/login                 | Login                        |
| POST   | /api/auth/logout                | Logout                       |
| GET    | /api/auth/session               | Check current session        |
| GET    | /api/transactions               | Get all transactions         |
| POST   | /api/transactions               | Add transaction              |
| DELETE | /api/transactions/:id           | Delete transaction           |
| GET    | /api/transactions/summary/monthly | 6-month income/expense trend|
| GET    | /api/categories                 | Get all categories           |
| POST   | /api/categories                 | Add category                 |
| DELETE | /api/categories/:id             | Delete category              |
| GET    | /api/budgets?month=YYYY-MM      | Get budgets with actuals     |
| POST   | /api/budgets                    | Set category budget          |
| DELETE | /api/budgets/:id                | Remove budget                |
| GET    | /api/goals                      | Get savings goals            |
| POST   | /api/goals                      | Create goal                  |
| PATCH  | /api/goals/:id/add              | Add savings to goal          |
| DELETE | /api/goals/:id                  | Delete goal                  |
| GET    | /api/reminders                  | Get reminders                |
| POST   | /api/reminders                  | Add reminder                 |
| DELETE | /api/reminders/:id              | Delete reminder              |
| GET    | /api/admin/stats                | Platform statistics          |
