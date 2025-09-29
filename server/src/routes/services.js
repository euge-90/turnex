import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, can } from '../../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/services
 * Listar servicios (público o filtrado por negocio)
 */
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    
    const where = businessId ? { 
      user: { businessId } 
    } : {};

    const services = await prisma.service.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            businessName: true,
            businessId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ services });
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ 
      error: 'Error al obtener servicios',
      details: error.message 
    });
  }
});

/**
 * GET /api/services/:id
 * Obtener un servicio específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            businessName: true,
            businessId: true,
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ service });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener servicio',
      details: error.message 
    });
  }
});

/**
 * POST /api/services
 * Crear servicio (solo BUSINESS y ADMIN)
 */
router.post('/', authenticate, can('create-service'), async (req, res) => {
  try {
    const { name, description, price, duration = 30 } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!name || !price) {
      return res.status(400).json({ 
        error: 'Nombre y precio son requeridos' 
      });
    }

    if (price <= 0) {
      return res.status(400).json({ 
        error: 'El precio debe ser mayor a 0' 
      });
    }

    // Crear servicio
    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            businessName: true,
            businessId: true,
          }
        }
      }
    });

    res.status(201).json({ 
      message: 'Servicio creado exitosamente',
      service 
    });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    res.status(500).json({ 
      error: 'Error al crear servicio',
      details: error.message 
    });
  }
});

/**
 * PUT /api/services/:id
 * Actualizar servicio (solo propietario o ADMIN)
 */
router.put('/:id', authenticate, can('edit-service'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({ 
      where: { id } 
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Verificar permisos: solo propietario o admin
    if (service.userId !== userId && !isAdmin) {
      return res.status(403).json({ 
        error: 'No tienes permiso para editar este servicio' 
      });
    }

    // Actualizar
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(duration && { duration: parseInt(duration) }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            businessName: true,
          }
        }
      }
    });

    res.json({ 
      message: 'Servicio actualizado exitosamente',
      service: updatedService 
    });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ 
      error: 'Error al actualizar servicio',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/services/:id
 * Eliminar servicio (solo propietario o ADMIN, sin turnos futuros)
 */
router.delete('/:id', authenticate, can('delete-service'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({ 
      where: { id },
      include: { bookings: true }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Verificar permisos
    if (service.userId !== userId && !isAdmin) {
      return res.status(403).json({ 
        error: 'No tienes permiso para eliminar este servicio' 
      });
    }

    // Verificar que no tenga turnos futuros
    const today = new Date().toISOString().split('T')[0];
    const hasFutureBookings = service.bookings.some(b => b.date >= today);

    if (hasFutureBookings) {
      return res.status(409).json({ 
        error: 'No se puede eliminar un servicio con turnos futuros' 
      });
    }

    // Eliminar
    await prisma.service.delete({ where: { id } });

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ 
      error: 'Error al eliminar servicio',
      details: error.message 
    });
  }
});

export default router;