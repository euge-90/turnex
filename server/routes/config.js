import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, can } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/config
 * Obtener configuración (público)
 */
router.get('/', async (req, res) => {
  try {
    const config = await prisma.config.findFirst();

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json({ 
      config: {
        id: config.id,
        businessHours: JSON.parse(config.businessHours),
        blockedDates: JSON.parse(config.blockedDates),
        blockedTimes: JSON.parse(config.blockedTimes),
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ 
      error: 'Error al obtener configuración',
      details: error.message 
    });
  }
});

/**
 * PUT /api/config
 * Actualizar configuración (solo BUSINESS y ADMIN)
 */
router.put('/', authenticate, can('manage-config'), async (req, res) => {
  try {
    const { businessHours, blockedDates, blockedTimes } = req.body;

    // Buscar config existente
    let config = await prisma.config.findFirst();

    const updateData = {};

    if (businessHours) {
      updateData.businessHours = JSON.stringify(businessHours);
    }

    if (blockedDates) {
      updateData.blockedDates = JSON.stringify(blockedDates);
    }

    if (blockedTimes) {
      updateData.blockedTimes = JSON.stringify(blockedTimes);
    }

    if (!config) {
      // Crear si no existe
      config = await prisma.config.create({
        data: {
          businessHours: JSON.stringify(businessHours || {}),
          blockedDates: JSON.stringify(blockedDates || []),
          blockedTimes: JSON.stringify(blockedTimes || [])
        }
      });
    } else {
      // Actualizar
      config = await prisma.config.update({
        where: { id: config.id },
        data: updateData
      });
    }

    res.json({ 
      message: 'Configuración actualizada',
      config: {
        id: config.id,
        businessHours: JSON.parse(config.businessHours),
        blockedDates: JSON.parse(config.blockedDates),
        blockedTimes: JSON.parse(config.blockedTimes),
        updatedAt: config.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ 
      error: 'Error al actualizar configuración',
      details: error.message 
    });
  }
});

export default router;