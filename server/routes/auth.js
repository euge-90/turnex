import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/auth/signup
 * Registro de nuevos usuarios
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role = 'CLIENT', businessName } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'La contraseña debe tener al menos 8 caracteres' 
      });
    }

    // Validar email único
    const existingUser = await prisma.user.findUnique({ 
      where: { email } 
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'El email ya está registrado' 
      });
    }

    // Si el rol es BUSINESS, el businessName es requerido
    if (role === 'BUSINESS' && !businessName) {
      return res.status(400).json({ 
        error: 'El nombre del negocio es requerido para usuarios BUSINESS' 
      });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const userData = {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: role === 'ADMIN' ? 'CLIENT' : role, // No permitir crear ADMIN desde signup
    };

    // Si es BUSINESS, agregar datos del negocio
    if (role === 'BUSINESS') {
      userData.businessName = businessName;
      userData.businessId = `biz_${Date.now()}`; // ID único del negocio
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessName: true,
        businessId: true,
        createdAt: true,
      },
    });

    // Generar token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        businessId: user.businessId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      token,
      user 
    });
  } catch (error) {
    console.error('Error en signup:', error);
    res.status(500).json({ 
      error: 'Error al crear usuario',
      details: error.message 
    });
  }
});

/**
 * POST /api/auth/login
 * Inicio de sesión
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        businessName: true,
        businessId: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    // Generar token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        businessId: user.businessId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // No enviar password en la respuesta
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      message: 'Login exitoso',
      token,
      user: userWithoutPassword 
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error al iniciar sesión',
      details: error.message 
    });
  }
});

/**
 * POST /api/auth/refresh
 * Renovar token (opcional, para implementar después)
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7);
    
    // Verificar token (aunque esté expirado)
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // Verificar que el usuario aún existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        businessId: user.businessId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;