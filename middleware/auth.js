// middleware/auth.js – protect routes that require login
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated. Please login.' });
  }
}

module.exports = { requireAuth };
