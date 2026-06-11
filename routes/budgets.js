const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const userId    = req.session.user.id;
  const monthYear = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const [rows] = await db.query(`
      SELECT cb.id, cb.category_id, c.name AS category_name, c.emoji,
             cb.amount AS budget,
             COALESCE(SUM(t.amount), 0) AS spent,
             cb.amount - COALESCE(SUM(t.amount), 0) AS remaining
      FROM category_budgets cb
      JOIN categories c ON c.id = cb.category_id
      LEFT JOIN transactions t
        ON t.user_id = cb.user_id
       AND t.category_id = cb.category_id
       AND DATE_FORMAT(t.txn_date,'%Y-%m') = cb.month_year
       AND t.type = 'expense'
      WHERE cb.user_id = ? AND cb.month_year = ?
      GROUP BY cb.id
    `, [userId, monthYear]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch budgets.' }); }
});

router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { category_id, amount, month_year } = req.body;
  const my = month_year || new Date().toISOString().slice(0, 7);
  if (!category_id || !amount) return res.status(400).json({ error: 'category_id and amount required.' });
  try {
    const id = require('crypto').randomUUID();
    await db.query(`INSERT INTO category_budgets (id, user_id, category_id, amount, month_year)
      VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [id, userId, category_id, parseFloat(amount), my]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to save budget.' }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM category_budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete budget.' }); }
});

module.exports = router;
