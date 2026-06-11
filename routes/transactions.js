// routes/transactions.js
const express     = require('express');
const db          = require('../db');
const { requireAuth } = require('../middleware/auth');
const router      = express.Router();

// GET /api/transactions  – all transactions for logged-in user
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { month, type, category } = req.query;  // optional filters

  let sql = `
    SELECT t.*, c.name AS category_name, c.emoji
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?`;
  const params = [userId];

  if (month) {
    sql += ' AND DATE_FORMAT(t.txn_date, "%Y-%m") = ?';
    params.push(month);
  }
  if (type) {
    sql += ' AND t.type = ?';
    params.push(type);
  }
  if (category) {
    sql += ' AND t.category_id = ?';
    params.push(category);
  }

  sql += ' ORDER BY t.txn_date DESC, t.created_at DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
});

// POST /api/transactions  – add new transaction
router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { category_id, type, amount, txn_date, note } = req.body;

  if (!category_id || !type || !amount || !txn_date)
    return res.status(400).json({ error: 'category_id, type, amount and txn_date are required.' });
  if (!['income','expense'].includes(type))
    return res.status(400).json({ error: 'type must be income or expense.' });
  if (parseFloat(amount) <= 0)
    return res.status(400).json({ error: 'amount must be greater than 0.' });

  try {
    const id = require('crypto').randomUUID();
    await db.query(
      'INSERT INTO transactions (id, user_id, category_id, type, amount, txn_date, note) VALUES (?,?,?,?,?,?,?)',
      [id, userId, category_id, type, parseFloat(amount), txn_date, note || null]
    );
    const [rows] = await db.query(
      'SELECT t.*, c.name AS category_name, c.emoji FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add transaction.' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [result] = await db.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: 'Transaction not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

// GET /api/transactions/summary/monthly  – income vs expense last 6 months
router.get('/summary/monthly', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  try {
    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(txn_date, '%Y-%m') AS month,
        SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = ?
        AND txn_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `, [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary.' });
  }
});

module.exports = router;
