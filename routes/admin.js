const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [[users]] = await db.query("SELECT COUNT(*) AS cnt FROM users WHERE role='student'");
    const [[txns]]  = await db.query('SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS vol FROM transactions');
    const [[cats]]  = await db.query('SELECT COUNT(*) AS cnt FROM categories');
    res.json({ total_students: users.cnt, total_transactions: txns.cnt, total_volume: txns.vol, total_categories: cats.cnt });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats.' }); }
});

module.exports = router;
