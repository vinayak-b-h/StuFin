const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reminders WHERE user_id = ? ORDER BY due_date ASC', [req.session.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch reminders.' }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { title, amount, due_date } = req.body;
  if (!title || !due_date) return res.status(400).json({ error: 'title and due_date required.' });
  try {
    const id = require('crypto').randomUUID();
    await db.query('INSERT INTO reminders (id, user_id, title, amount, due_date) VALUES (?,?,?,?,?)',
      [id, req.session.user.id, title, parseFloat(amount)||0, due_date]);
    const [rows] = await db.query('SELECT * FROM reminders WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to add reminder.' }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete reminder.' }); }
});

module.exports = router;
