import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Todas las rutas de admin requieren rol ADMIN
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * GET /api/admin/users/count
 * Obtener conteo de usuarios
 */
router.get('/users/count', async (req, res) => {
  try {
    const total = await prisma.user.count();
    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const counts = {
      total,
      clients: byRole.find(r => r.role === 'CLIENT')?._count || 0,
      business: byRole.find(r => r.role === 'BUSINESS')?._count || 0,
      admins: byRole.find(r => r.role === 'ADMIN')?._count || 0
    };

    res.json({ counts });
  } catch (error) {
    console.error('Error al obtener conteo de usuarios:', error);
    res.status(500).json({ 
      error: 'Error al obtener conteo',
      details: error.message 
    });
  }
});

/**
 * GET /api/admin/users
 * Listar todos los usuarios
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessName: true,
        businessId: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            services: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ 
      error: 'Error al listar usuarios',
      details: error.message 
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Actualizar usuario (cambiar rol, etc.)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, name, businessName } = req.body;

    const updateData = {};
    
    if (role) updateData.role = role;
    if (name) updateData.name = name;
    if (businessName !== undefined) updateData.businessName = businessName;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        businessName: true,
        createdAt: true
      }
    });

    res.json({ 
      message: 'Usuario actualizado',
      user 
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      error: 'Error al actualizar usuario',
      details: error.message 
    });
  }
});

/**
 * GET /api/admin/stats
 * Estadísticas generales del sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalServices = await prisma.service.count();
    const totalBookings = await prisma.booking.count();
    
    const today = new Date().toISOString().split('T')[0];
    const bookingsToday = await prisma.booking.count({
      where: { date: today }
    });

    res.json({
      stats: {
        totalUsers,
        totalServices,
        totalBookings,
        bookingsToday
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
});

export default router;