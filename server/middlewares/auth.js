const { verifyToken } = require('../lib/tokens');

function ensureAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = verifyToken(token);
    if (payload.t === 'refresh') return res.status(401).json({ message: 'Invalid token type' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { ensureAuth };