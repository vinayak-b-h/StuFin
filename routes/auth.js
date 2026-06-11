const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const router  = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, budget } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars.' });
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered.' });
    const hash = await bcrypt.hash(password, 10);
    const id   = require('crypto').randomUUID();
    await db.query('INSERT INTO users (id, name, email, password, budget) VALUES (?,?,?,?,?)',
      [id, name, email.toLowerCase(), hash, parseFloat(budget) || 5000]);
    const [rows] = await db.query('SELECT id, name, email, budget, role FROM users WHERE id = ?', [id]);
    req.session.user = rows[0];
    res.json({ success: true, user: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed.' }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });
    const u = rows[0];
    req.session.user = { id: u.id, name: u.name, email: u.email, budget: u.budget, role: u.role };
    res.json({ success: true, user: req.session.user });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed.' }); }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/session', (req, res) => {
  if (req.session && req.session.user) res.json({ user: req.session.user });
  else res.status(401).json({ user: null });
});

module.exports = router;
