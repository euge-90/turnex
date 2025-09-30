import { Router } from 'express';
import { authMiddleware } from '../lib/auth.js';

export default function servicesRoutes({ prisma }) {
  const router = Router();

  // GET /api/services - Listar todos los servicios (público)
  router.get('/', async (req, res) => {
    try {
      const services = await prisma.service.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(services);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      res.status(500).json({
        error: 'Error al obtener servicios',
        details: error.message
      });
    }
  });

  // GET /api/services/:id - Obtener un servicio específico
  router.get('/:id', async (req, res) => {
    try {
      const service = await prisma.service.findUnique({
        where: { id: req.params.id }
      });

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      res.json(service);
    } catch (error) {
      res.status(500).json({
        error: 'Error al obtener servicio',
        details: error.message
      });
    }
  });

  // POST /api/services - Crear servicio (requiere auth)
  router.post('/', authMiddleware(false), async (req, res) => {
    try {
      const { name, description, price, duration = 30, category } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({
          error: 'Nombre y precio son requeridos'
        });
      }

      const service = await prisma.service.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          duration: parseInt(duration),
          category,
          active: true
        }
      });

      res.status(201).json(service);
    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({
        error: 'Error al crear servicio',
        details: error.message
      });
    }
  });

  // PUT /api/services/:id - Actualizar servicio (requiere auth)
  router.put('/:id', authMiddleware(false), async (req, res) => {
    try {
      const { name, description, price, duration, category } = req.body;

      const service = await prisma.service.findUnique({
        where: { id: req.params.id }
      });

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      const updatedService = await prisma.service.update({
        where: { id: req.params.id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(duration !== undefined && { duration: parseInt(duration) }),
          ...(category !== undefined && { category })
        }
      });

      res.json(updatedService);
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      res.status(500).json({
        error: 'Error al actualizar servicio',
        details: error.message
      });
    }
  });

  // DELETE /api/services/:id - Eliminar servicio (requiere auth)
  router.delete('/:id', authMiddleware(false), async (req, res) => {
    try {
      const service = await prisma.service.findUnique({
        where: { id: req.params.id },
        include: { bookings: true }
      });

      if (!service) {
        return res.status(404).json({ error: 'Servicio no encontrado' });
      }

      // Verificar que no tenga turnos futuros
      const today = new Date().toISOString().split('T')[0];
      const hasFutureBookings = service.bookings.some(b => b.date >= today);

      if (hasFutureBookings) {
        return res.status(409).json({
          error: 'No se puede eliminar un servicio con turnos futuros'
        });
      }

      await prisma.service.delete({ where: { id: req.params.id } });

      res.status(204).end();
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      res.status(500).json({
        error: 'Error al eliminar servicio',
        details: error.message
      });
    }
  });

  return router;
}