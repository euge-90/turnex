const { z } = require('zod');

const email = z.string().trim().email();
// Password: keep login len>=9 (loose), but require strong policy for signup
const passwordLoose = z.string().min(9, 'Password must be at least 9 characters');
const passwordStrong = passwordLoose.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include upper, lower, and number');
// Full name: at least two words of 2+ chars each
const name = z.string().trim().refine(v => v.split(/\s+/).filter(w => w.length >= 2).length >= 2, {
  message: 'Full name (first and last) required'
});
const phone = z.string().trim().regex(/^[+\d\s().-]{8,}$/, 'Invalid phone');

const loginSchema = z.object({
  email,
  password: passwordLoose,
});

const signupSchema = z.object({
  name,
  email,
  phone,
  password: passwordStrong,
});

module.exports = { loginSchema, signupSchema };