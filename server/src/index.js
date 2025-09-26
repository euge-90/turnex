import { app, prisma } from './app.js';

const PORT = process.env.PORT || 3000;

async function startup() {
	try {
		const cfg = await prisma.config.findUnique({ where: { id: 1 } });
		if (!cfg) {
			await prisma.config.create({ data: {
				id: 1,
				workingHours: JSON.stringify({2:[9,18],3:[9,18],4:[9,18],5:[9,18],6:[9,18]}),
				blockedDays: JSON.stringify([]),
				blockedDateRanges: JSON.stringify([]),
				blockedTimes: JSON.stringify({})
			} });
		}

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

		const existing = await prisma.service.findMany({ select: { name: true } });
		const have = new Set(existing.map(s => s.name.trim().toLowerCase()));
		const toCreate = seedServices.filter(s => !have.has(s.name.trim().toLowerCase()));
		if (toCreate.length) {
			await prisma.service.createMany({ data: toCreate });
			console.log(`Seeded ${toCreate.length} new services`);
		}
	} catch (err) { console.error('Startup seed error:', err.message); }
}

if (process.env.NODE_ENV !== 'test') {
	(async () => {
		await startup();
		app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
	})();
}

export default app;

// Routes
import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';
import { Router } from 'express';
import { authMiddleware } from './lib/auth.js';

// Instantiate Prisma (PostgreSQL)
const prisma = new PrismaClient();

// TODO: Refactor route modules to use Prisma; for now they operate in-memory.
app.use('/api/auth', authRoutes({ prisma }));
app.use('/api/services', servicesRoutes({ prisma }));
app.use('/api/bookings', bookingsRoutes({ prisma }));
app.use('/api/config', configRoutes({ prisma }));

// Admin endpoints (imported)
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

// Export app for tests and external runners
export default app;

// Startup seed: ensure Config exists and default Services if empty
// Only run the startup logic when not in test mode so tests can import the app
if(process.env.NODE_ENV !== 'test'){
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
