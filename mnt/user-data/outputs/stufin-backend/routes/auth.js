// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const router  = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, budget } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ error: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const id   = require('crypto').randomUUID();
    await db.query(
      'INSERT INTO users (id, name, email, password, budget) VALUES (?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hash, parseFloat(budget) || 5000]
    );

    const [rows] = await db.query('SELECT id, name, email, budget, role FROM users WHERE id = ?', [id]);
    req.session.user = rows[0];
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const user  = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const safeUser = { id: user.id, name: user.name, email: user.email, budget: user.budget, role: user.role };
    req.session.user = safeUser;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/auth/session  – check if user is logged in
router.get('/session', (req, res) => {
  if (req.session && req.session.user)
    res.json({ user: req.session.user });
  else
    res.status(401).json({ user: null });
});

module.exports = router;
