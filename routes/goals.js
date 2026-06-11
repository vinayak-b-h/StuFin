const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY deadline ASC', [req.session.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch goals.' }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, emoji, target, saved, deadline } = req.body;
  if (!name || !target) return res.status(400).json({ error: 'name and target required.' });
  try {
    const id = require('crypto').randomUUID();
    await db.query('INSERT INTO savings_goals (id, user_id, name, emoji, target, saved, deadline) VALUES (?,?,?,?,?,?,?)',
      [id, req.session.user.id, name, emoji || '🎯', parseFloat(target), parseFloat(saved)||0, deadline||null]);
    const [rows] = await db.query('SELECT * FROM savings_goals WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to create goal.' }); }
});

router.patch('/:id/add', requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'amount must be > 0.' });
  try {
    await db.query(`UPDATE savings_goals SET saved = LEAST(target, saved + ?),
      is_reached = IF(LEAST(target, saved + ?) >= target, 1, 0) WHERE id = ? AND user_id = ?`,
      [parseFloat(amount), parseFloat(amount), req.params.id, req.session.user.id]);
    const [rows] = await db.query('SELECT * FROM savings_goals WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to update goal.' }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete goal.' }); }
});

module.exports = router;
