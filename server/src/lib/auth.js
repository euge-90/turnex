import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export async function hashPassword(pw){
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw, hash){
  return bcrypt.compare(pw, hash);
}

export function signToken(user){
  const payload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(requireAdmin=false){
  return (req, res, next)=>{
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')? auth.slice(7): null;
    if(!token) return res.status(401).json({ error: 'Unauthorized' });
    try{
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if(requireAdmin && payload.role !== 'admin'){
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    }catch(err){ return res.status(401).json({ error: 'Unauthorized' }); }
  };
}
