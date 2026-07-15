-- ═══════════════════════════════════════════════════════════════
--  StuFin – Student Finance Manager
--  MySQL Database Schema
--  Run this file to initialise all tables and seed default data
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS stufin
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stufin;

-- ── 1. USERS ─────────────────────────────────────────────────────────────────
--  Stores registered student accounts.
--  `budget` is the self-declared monthly spending limit (INR).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,          -- store bcrypt hash in production
  budget     DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  role       ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ── 2. CATEGORIES ────────────────────────────────────────────────────────────
--  Master list of expense / income categories (managed by admin).
--  `is_default` = 1 means it ships with the app and cannot be deleted.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  name       VARCHAR(80)  NOT NULL UNIQUE,
  type       ENUM('expense','income') NOT NULL,
  emoji      VARCHAR(10)  NOT NULL DEFAULT '📦',
  is_default TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cat_type (type)
) ENGINE=InnoDB;

-- ── 3. TRANSACTIONS ──────────────────────────────────────────────────────────
--  Every income / expense entry recorded by a student.
--  Foreign keys cascade on user deletion for clean teardown.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL,
  category_id VARCHAR(36)   NOT NULL,
  type        ENUM('income','expense') NOT NULL,
  amount      DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  txn_date    DATE          NOT NULL,
  note        VARCHAR(255)  DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_txn_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_txn_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_txn_user_date (user_id, txn_date),
  INDEX idx_txn_type     (type)
) ENGINE=InnoDB;

-- ── 4. CATEGORY_BUDGETS ──────────────────────────────────────────────────────
--  Per-student, per-category monthly spending limits.
--  UNIQUE constraint ensures one budget row per (user, category).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_budgets (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL,
  category_id VARCHAR(36)   NOT NULL,
  amount      DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  month_year  CHAR(7)       NOT NULL DEFAULT (DATE_FORMAT(CURDATE(), '%Y-%m')),
                                     -- e.g. '2026-06'
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget (user_id, category_id, month_year),
  CONSTRAINT fk_budget_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_budget_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 5. SAVINGS_GOALS ─────────────────────────────────────────────────────────
--  Named savings targets with progress tracking.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(120)  NOT NULL,
  emoji       VARCHAR(10)   NOT NULL DEFAULT '🎯',
  target      DECIMAL(12,2) NOT NULL CHECK (target > 0),
  saved       DECIMAL(12,2) NOT NULL DEFAULT 0.00
<<<<<<< HEAD
              CHECK (saved >= 0 AND saved <= target),
=======
              CHECK (saved >= 0),
>>>>>>> 8079931ea00c6d859bec6d9190154f5e21ce91e9
  deadline    DATE          DEFAULT NULL,
  is_reached  TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_goal_user (user_id)
) ENGINE=InnoDB;

-- ── 6. REMINDERS ─────────────────────────────────────────────────────────────
--  Bill / fee payment reminders with a due date.
--  `is_paid` is toggled when the student marks a bill as settled.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id         VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id    VARCHAR(36)   NOT NULL,
  title      VARCHAR(150)  NOT NULL,
  amount     DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  due_date   DATE          NOT NULL,
  is_paid    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reminder_due (user_id, due_date)
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
--  SEED DATA
-- ════════════════════════════════════════════════════════════════

-- ── Default categories ─────────────────────────────────────────
INSERT IGNORE INTO categories (id, name, type, emoji, is_default) VALUES
  ('cat-01', 'Food & Dining',  'expense', '🍽️', 1),
  ('cat-02', 'Travel',         'expense', '🚌', 1),
  ('cat-03', 'Academics',      'expense', '📚', 1),
  ('cat-04', 'Entertainment',  'expense', '🎮', 1),
  ('cat-05', 'Stationery',     'expense', '✏️', 1),
  ('cat-06', 'Health',         'expense', '💊', 1),
  ('cat-07', 'Clothing',       'expense', '👕', 1),
  ('cat-08', 'Utilities',      'expense', '💡', 1),
  ('cat-09', 'Stipend',        'income',  '💼', 1),
  ('cat-10', 'Pocket Money',   'income',  '💰', 1),
  ('cat-11', 'Freelance',      'income',  '🖥️', 1),
  ('cat-12', 'Scholarship',    'income',  '🎓', 1),
  ('cat-13', 'Other',          'expense', '📦', 1);

-- ── Demo student account (password: demo123) ──────────────────
-- In production replace with a bcrypt hash of the real password.
INSERT IGNORE INTO users (id, name, email, password, budget, role) VALUES
  ('usr-demo-01', 'Vinayak S', 'vinayak@rvce.edu.in', 'demo123', 5000.00, 'student');

-- ── Demo transactions (current month = 2026-06) ───────────────
INSERT IGNORE INTO transactions (id, user_id, category_id, type, amount, txn_date, note) VALUES
  ('txn-01', 'usr-demo-01', 'cat-10', 'income',  3000.00, '2026-06-01', 'Monthly pocket money'),
  ('txn-02', 'usr-demo-01', 'cat-09', 'income',  2000.00, '2026-06-03', 'Internship stipend'),
  ('txn-03', 'usr-demo-01', 'cat-01', 'expense',  420.00, '2026-06-04', 'Mess fee top-up'),
  ('txn-04', 'usr-demo-01', 'cat-02', 'expense',  160.00, '2026-06-05', 'Bus pass recharge'),
  ('txn-05', 'usr-demo-01', 'cat-03', 'expense',  350.00, '2026-06-07', 'Reference books'),
  ('txn-06', 'usr-demo-01', 'cat-04', 'expense',  199.00, '2026-06-09', 'Streaming subscription'),
  ('txn-07', 'usr-demo-01', 'cat-05', 'expense',  120.00, '2026-06-10', 'Pens and notebooks'),
  ('txn-08', 'usr-demo-01', 'cat-01', 'expense',  280.00, '2026-06-12', 'Canteen and snacks'),
  ('txn-09', 'usr-demo-01', 'cat-11', 'income',   800.00, '2026-06-14', 'Logo design project'),
  ('txn-10', 'usr-demo-01', 'cat-06', 'expense',  230.00, '2026-06-15', 'Pharmacy');

-- ── Demo budgets ──────────────────────────────────────────────
INSERT IGNORE INTO category_budgets (id, user_id, category_id, amount, month_year) VALUES
  ('bud-01', 'usr-demo-01', 'cat-01', 1200.00, '2026-06'),
  ('bud-02', 'usr-demo-01', 'cat-02',  500.00, '2026-06'),
  ('bud-03', 'usr-demo-01', 'cat-03',  600.00, '2026-06'),
  ('bud-04', 'usr-demo-01', 'cat-04',  300.00, '2026-06');

-- ── Demo savings goals ─────────────────────────────────────────
INSERT IGNORE INTO savings_goals (id, user_id, name, emoji, target, saved, deadline) VALUES
  ('goal-01', 'usr-demo-01', 'New Laptop',     '💻', 45000.00,  8000.00, '2027-03-01'),
  ('goal-02', 'usr-demo-01', 'Goa Trip',       '🏖️', 10000.00,  3200.00, '2026-12-15'),
  ('goal-03', 'usr-demo-01', 'Emergency Fund', '🛡️', 15000.00,  5500.00, '2027-01-01');

-- ── Demo reminders ─────────────────────────────────────────────
INSERT IGNORE INTO reminders (id, user_id, title, amount, due_date) VALUES
  ('rem-01', 'usr-demo-01', 'Hostel Fee',    8500.00, '2026-06-20'),
  ('rem-02', 'usr-demo-01', 'Internet Bill',  599.00, '2026-06-25'),
  ('rem-03', 'usr-demo-01', 'Library Fine',    50.00, '2026-07-05');

-- ════════════════════════════════════════════════════════════════
--  USEFUL VIEWS
-- ════════════════════════════════════════════════════════════════

-- Monthly summary per user
CREATE OR REPLACE VIEW vw_monthly_summary AS
SELECT
  t.user_id,
  DATE_FORMAT(t.txn_date, '%Y-%m')                        AS month_year,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE -t.amount END) AS net_balance
FROM transactions t
GROUP BY t.user_id, month_year;

-- Spending per category this month vs budget
CREATE OR REPLACE VIEW vw_budget_vs_actual AS
SELECT
  cb.user_id,
  cb.month_year,
  c.name                                                       AS category,
  c.emoji,
  cb.amount                                                    AS budget,
  COALESCE(SUM(t.amount), 0)                                  AS spent,
  cb.amount - COALESCE(SUM(t.amount), 0)                      AS remaining,
  ROUND(COALESCE(SUM(t.amount), 0) / cb.amount * 100, 1)     AS pct_used
FROM category_budgets cb
JOIN categories c ON c.id = cb.category_id
LEFT JOIN transactions t
  ON t.user_id = cb.user_id
 AND t.category_id = cb.category_id
 AND DATE_FORMAT(t.txn_date, '%Y-%m') = cb.month_year
 AND t.type = 'expense'
GROUP BY cb.user_id, cb.month_year, cb.category_id;

-- ════════════════════════════════════════════════════════════════
--  SAMPLE QUERIES (for backend / Node.js / Express integration)
-- ════════════════════════════════════════════════════════════════

-- 1. All transactions for a user this month, newest first
-- SELECT t.*, c.name AS category_name, c.emoji
-- FROM transactions t
-- JOIN categories c ON c.id = t.category_id
-- WHERE t.user_id = :userId
--   AND DATE_FORMAT(t.txn_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
-- ORDER BY t.txn_date DESC, t.created_at DESC;

-- 2. Monthly income vs expense totals for charting (last 6 months)
-- SELECT
--   DATE_FORMAT(txn_date, '%Y-%m') AS month,
--   SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
--   SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
-- FROM transactions
-- WHERE user_id = :userId
--   AND txn_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
-- GROUP BY month
-- ORDER BY month ASC;

-- 3. Budget health: spending vs limit per category, current month
-- SELECT * FROM vw_budget_vs_actual
-- WHERE user_id = :userId
--   AND month_year = DATE_FORMAT(CURDATE(), '%Y-%m');

-- 4. Upcoming reminders in the next 7 days
-- SELECT * FROM reminders
-- WHERE user_id = :userId
--   AND is_paid = 0
--   AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
-- ORDER BY due_date ASC;

-- 5. Savings goal progress
-- SELECT *, ROUND(saved / target * 100, 1) AS pct_complete
-- FROM savings_goals
-- WHERE user_id = :userId
-- ORDER BY deadline ASC;

-- 6. Admin: total platform stats
-- SELECT
--   (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
--   (SELECT COUNT(*) FROM transactions)                 AS total_transactions,
--   (SELECT SUM(amount) FROM transactions)              AS total_volume,
--   (SELECT COUNT(*) FROM categories)                   AS total_categories;
