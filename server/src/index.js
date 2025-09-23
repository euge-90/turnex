// Load .env if available (don't crash if not resolvable)
try { await import('dotenv/config'); } catch { /* optional: console.warn('dotenv not loaded') */ }
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();

// CORS: configurable by env (comma-separated origins). Fallback to localhost patterns.
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
const defaultCorsOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
const corsOrigins = allowedOriginsEnv
	? allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
	: defaultCorsOrigins;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Health
app.get('/api/health', (_req, res)=> res.json({ ok: true }));

// API index (JSON): quick discoverability of endpoints
app.get('/api', (req, res) => {
	const base = `${req.protocol}://${req.get('host')}`;
	res.json({
		name: 'Turnex API',
		base,
		endpoints: [
			{ method: 'GET', path: '/api/health', desc: 'Service health check' },
			{ method: 'POST', path: '/api/auth/signup', desc: 'Create account (email, password)' },
			{ method: 'POST', path: '/api/auth/login', desc: 'Login and receive JWT' },
			{ method: 'GET', path: '/api/services', desc: 'List services' },
			{ method: 'POST', path: '/api/services', desc: 'Create service (admin)' },
			{ method: 'PUT', path: '/api/services/:id', desc: 'Update service (admin)' },
			{ method: 'DELETE', path: '/api/services/:id', desc: 'Delete service (admin, no future bookings)' },
			{ method: 'GET', path: '/api/bookings', desc: 'List bookings (own unless admin)' },
			{ method: 'GET', path: '/api/bookings/day?date=YYYY-MM-DD', desc: 'Compact bookings for a day' },
			{ method: 'POST', path: '/api/bookings', desc: 'Create booking (auth)' },
			{ method: 'DELETE', path: '/api/bookings/:id', desc: 'Cancel booking (owner or admin)' },
			{ method: 'PUT', path: '/api/bookings/:id', desc: 'Update booking status (admin)' },
			{ method: 'GET', path: '/api/config', desc: 'Get availability config' },
			{ method: 'PUT', path: '/api/config', desc: 'Update availability config (admin)' },
			{ method: 'GET', path: '/api/admin/users/count', desc: 'Total users (admin)' }
		]
	});
});

// Friendly root page (HTML)
app.get('/', (req, res) => {
	res.type('html').send(`<!doctype html>
	<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Turnex API</title>
		<style>
			body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;margin:0;padding:2rem;line-height:1.5;color:#222;background:#f8f9fa}
			.card{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
			.card h1{margin:0 0 .25rem;font-size:1.5rem}
			.card .muted{color:#6b7280;font-size:.95rem;margin:.25rem 0 1rem}
			.card .links a{display:inline-block;margin-right:1rem;color:#0d6efd;text-decoration:none}
			.card .links a:hover{text-decoration:underline}
			.badge{display:inline-block;background:#0d6efd;color:#fff;border-radius:999px;padding:.15rem .5rem;font-size:.75rem;margin-left:.5rem}
			.box{padding:1.25rem 1.25rem}
			code{background:#f1f5f9;border:1px solid #e5e7eb;border-radius:6px;padding:.1rem .35rem}
		</style>
	</head>
	<body>
		<div class="card">
			<div class="box">
				<h1>Turnex API <span class="badge">live</span></h1>
				<div class="muted">Bienvenido. Esta es la API para la app de turnos.</div>
				<div class="links">
					<a href="/api/health">/api/health</a>
					<a href="/api/services">/api/services</a>
				</div>
				<p class="muted">Frontend: configure el meta <code>api-base</code> para apuntar a <code>${req?.protocol ?? 'https'}://${req?.headers?.host ?? ''}/api</code>.</p>
			</div>
		</div>
	</body>
	</html>`);
});

// Routes
import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import configRoutes from './routes/config.js';
import { Router } from 'express';
import { authMiddleware } from './lib/auth.js';

// Instantiate Prisma (PostgreSQL)
const prisma = new PrismaClient();

// TODO: Refactor route modules to use Prisma; for now they operate in-memory.
app.use('/api/auth', authRoutes({ prisma }));
app.use('/api/services', servicesRoutes({ prisma }));
app.use('/api/bookings', bookingsRoutes({ prisma }));
app.use('/api/config', configRoutes({ prisma }));

// Admin minimal endpoints
const adminRouter = Router();
adminRouter.get('/users/count', authMiddleware(false), async (req, res)=>{
	if(req.user?.role !== 'admin') return res.status(403).json({ error:'Forbidden' });
	const total = await prisma.user.count();
	res.json({ total });
});
app.use('/api/admin', adminRouter);

const PORT = process.env.PORT || 3000;

// Startup seed: ensure Config exists and default Services if empty
(async ()=>{
	try{
		// Ensure config row exists
		const cfg = await prisma.config.findUnique({ where:{ id:1 } });
		if(!cfg){
			await prisma.config.create({ data:{
				id:1,
				workingHours: JSON.stringify({2:[9,18],3:[9,18],4:[9,18],5:[9,18],6:[9,18]}),
				blockedDays: JSON.stringify([]),
				blockedDateRanges: JSON.stringify([]),
				blockedTimes: JSON.stringify({})
			} });
		}
		// Seed services (idempotent by name)
		const seedServices = [
			{ name:'Corte dama', description:'Corte y estilizado para mujer.', duration:60, price:9000 },
			{ name:'Corte caballero', description:'Corte clásico o moderno.', duration:30, price:6000 },
			{ name:'Corte niños', description:'Corte sencillo para niñas y niños.', duration:30, price:5000 },
			{ name:'Lavado + Brushing', description:'Lavado y brushing con acabado natural.', duration:45, price:7000 },
			{ name:'Peinado fiesta', description:'Peinado para eventos especiales.', duration:60, price:12000 },
			{ name:'Color raíz', description:'Retoque de raíz para mantener el color.', duration:60, price:11000 },
			{ name:'Color completo', description:'Coloración completa del cabello.', duration:90, price:16000 },
			{ name:'Mechas / Balayage', description:'Iluminación por mechas o técnica balayage.', duration:120, price:28000 },
			{ name:'Tratamiento hidratación', description:'Hidratación profunda para devolver brillo.', duration:60, price:9000 },
			{ name:'Tratamiento anti-frizz', description:'Control del frizz y suavidad.', duration:90, price:15000 },
			{ name:'Botox capilar', description:'Reparación intensa con efecto brillo.', duration:90, price:18000 },
			{ name:'Alisado', description:'Alisado de larga duración.', duration:150, price:35000 },
			{ name:'Corte + Barba', description:'Combo para caballeros: corte y diseño de barba.', duration:60, price:9500 },
			{ name:'Perfilado de barba', description:'Definición y mantenimiento de barba.', duration:30, price:5000 },
			{ name:'Plancha / Ondas', description:'Marcado con plancha o buclera.', duration:30, price:6000 }
		];
		const existing = await prisma.service.findMany({ select:{ name:true } });
		const have = new Set(existing.map(s=> s.name.trim().toLowerCase()))
		const toCreate = seedServices.filter(s=> !have.has(s.name.trim().toLowerCase()));
		if(toCreate.length){
			await prisma.service.createMany({ data: toCreate });
			console.log(`Seeded ${toCreate.length} new services`);
		}
	}catch(err){ console.error('Startup seed error:', err.message); }
	app.listen(PORT, ()=> console.log(`API listening on http://localhost:${PORT}`));
})();
