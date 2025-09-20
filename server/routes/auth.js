const express = require('express');
const { validate } = require('../middlewares/validate');
const { loginSchema, signupSchema } = require('../schemas/auth');
const { createAccessToken, createRefreshToken, verifyToken, cookieOptions, parseCookies } = require('../lib/tokens');
const { createUser, verifyUser, pickUser, findByEmail } = require('../services/users');

const router = express.Router();

router.post('/signup', validate(signupSchema), async (req, res) => {
  try {
    const user = await createUser(req.body);
    const payload = { sub: String(user.id), email: user.email, role: user.role || 'client', name: user.name };
    const access = createAccessToken(payload);
    const refresh = createRefreshToken(payload);
    res.cookie('rt', refresh, cookieOptions());
    return res.status(201).json({ user: pickUser(user), token: access });
  } catch (err) {
    if (err.message === 'UserExists') return res.status(409).json({ message: 'Email already registered' });
    return res.status(500).json({ message: 'Failed to create user' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await verifyUser(email, password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const payload = { sub: String(user.id), email: user.email, role: user.role || 'client', name: user.name };
  const access = createAccessToken(payload);
  const refresh = createRefreshToken(payload);
  res.cookie('rt', refresh, cookieOptions());
  return res.json({ user: pickUser(user), token: access });
});

router.post('/refresh', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies.rt;
    if (!token) return res.status(401).json({ message: 'Missing refresh token' });
    const payload = verifyToken(token);
    if (payload.t !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });
    // opcional: verificar que el usuario exista aún
    const user = await findByEmail(payload.email);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const newAccess = createAccessToken({ sub: String(user.id), email: user.email, role: user.role || 'client', name: user.name });
    const newRefresh = createRefreshToken({ sub: String(user.id), email: user.email, role: user.role || 'client', name: user.name });
    res.cookie('rt', newRefresh, cookieOptions());
    return res.json({ token: newAccess });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('rt', { ...cookieOptions(), maxAge: 0 });
  return res.json({ ok: true });
});

module.exports = router;