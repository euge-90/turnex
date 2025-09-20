const { z } = require('zod');

const email = z.string().trim().email();
// Require >8 chars (min 9)
const password = z.string().min(9, 'Password must be at least 9 characters');
// Full name: at least two words of 2+ chars each
const name = z.string().trim().refine(v => v.split(/\s+/).filter(w => w.length >= 2).length >= 2, {
  message: 'Full name (first and last) required'
});
const phone = z.string().trim().regex(/^[+\d\s().-]{8,}$/, 'Invalid phone');

const loginSchema = z.object({
  email,
  password,
});

const signupSchema = z.object({
  name,
  email,
  phone,
  password,
});

module.exports = { loginSchema, signupSchema };