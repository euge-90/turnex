const { z } = require('zod');

const email = z.string().trim().email();
const password = z.string().min(8, 'Password too short');
const name = z.string().trim().min(2, 'Name required');
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