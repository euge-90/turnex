import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, can } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/services - público
router.get('/', async (req, res) => {
  // ... código para listar servicios
});

// POST /api/services - BUSINESS/ADMIN
router.post('/', authenticate, can('create-service'), async (req, res) => {
  // ... código para crear servicio
});

// PUT /api/services/:id - propietario/ADMIN
router.put('/:id', authenticate, can('edit-service'), async (req, res) => {
  // ... código para editar servicio
});

// DELETE /api/services/:id - propietario/ADMIN
router.delete('/:id', authenticate, can('delete-service'), async (req, res) => {
  // ... código para eliminar servicio
});

export default router;