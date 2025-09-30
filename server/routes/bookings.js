import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/bookings
 * Listar reservas según el rol
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, id: userId, businessId } = req.user;

    let where = {};

    // CLIENT: solo ve sus propias reservas
    if (role === 'CLIENT') {
      where = { userId };
    }
    
    // BUSINESS: ve reservas de sus servicios
    else if (role === 'BUSINESS') {
      where = {
        service: {
          user: { businessId }
        }
      };
    }
    
    // ADMIN: ve todas las reservas
    // (where queda vacío = todas)

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ 
      error: 'Error al obtener reservas',
      details: error.message 
    });
  }
});

/**
 * GET /api/bookings/day
 * Obtener reservas de un día específico (para calendario)
 */
router.get('/day', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Fecha requerida' });
    }

    const bookings = await prisma.booking.findMany({
      where: { date },
      select: {
        id: true,
        time: true,
        serviceId: true,
        service: {
          select: {
            duration: true
          }
        }
      }
    });

    res.json({ bookings });
  } catch (error) {
    console.error('Error al obtener reservas del día:', error);
    res.status(500).json({ 
      error: 'Error al obtener reservas',
      details: error.message 
    });
  }
});

/**
 * POST /api/bookings
 * Crear nueva reserva (autenticado)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { serviceId, date, time, name } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!serviceId || !date || !time || !name) {
      return res.status(400).json({ 
        error: 'Todos los campos son requeridos' 
      });
    }

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Verificar disponibilidad (no solapamiento)
    const existingBookings = await prisma.booking.findMany({
      where: { 
        date,
        serviceId 
      },
      include: {
        service: {
          select: { duration: true }
        }
      }
    });

    // Calcular si hay solapamiento
    const [newHour, newMin] = time.split(':').map(Number);
    const newStartMin = newHour * 60 + newMin;
    const newEndMin = newStartMin + service.duration;

    const hasOverlap = existingBookings.some(booking => {
      const [bookHour, bookMin] = booking.time.split(':').map(Number);
      const bookStartMin = bookHour * 60 + bookMin;
      const bookEndMin = bookStartMin + booking.service.duration;

      return (newStartMin < bookEndMin && newEndMin > bookStartMin);
    });

    if (hasOverlap) {
      return res.status(409).json({ 
        error: 'Horario no disponible',
        message: 'Ya existe una reserva en ese horario' 
      });
    }

    // Crear reserva
    const booking = await prisma.booking.create({
      data: {
        serviceId,
        userId,
        date,
        time,
        name
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true
          }
        }
      }
    });

    res.status(201).json({ 
      message: 'Reserva creada exitosamente',
      booking 
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ 
      error: 'Error al crear reserva',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancelar reserva (propietario o admin)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    // Buscar la reserva
    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Verificar permisos: propietario o admin
    if (booking.userId !== userId && role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'No tienes permiso para cancelar esta reserva' 
      });
    }

    // Eliminar reserva
    await prisma.booking.delete({ where: { id } });

    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ 
      error: 'Error al cancelar reserva',
      details: error.message 
    });
  }
});

export default router;