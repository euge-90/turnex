const jwt = require('jsonwebtoken');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

function createAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });
}
function createRefreshToken(payload) {
  return jwt.sign({ t: 'refresh', ...payload }, JWT_SECRET, { expiresIn: REFRESH_TTL });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const crossSite = true; // Front en GitHub Pages y API en Render
  return {
    httpOnly: true,
    secure: isProd || crossSite,
    sameSite: crossSite ? 'none' : 'lax',
    path: '/api/auth',
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').map(v => v.trim()).filter(Boolean).reduce((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) acc[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
    return acc;
  }, {});
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  cookieOptions,
  parseCookies,
};