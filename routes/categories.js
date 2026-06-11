const express = require('express');
const db      = require('../db');
const { requireAuth } = require('../middleware/auth');
const router  = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY type, name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch categories.' }); }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, type, emoji } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required.' });
  try {
    const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length) return res.status(409).json({ error: 'Category already exists.' });
    const id = require('crypto').randomUUID();
    await db.query('INSERT INTO categories (id, name, type, emoji) VALUES (?,?,?,?)',
      [id, name, type, emoji || (type === 'income' ? '💵' : '💸')]);
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Failed to add category.' }); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT is_default FROM categories WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    if (rows[0].is_default) return res.status(403).json({ error: 'Cannot delete default categories.' });
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete category.' }); }
});

module.exports = router;
