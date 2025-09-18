// Simple in-memory store to get the API running without a DB.
// Replace with Prisma queries later, keeping a similar data shape.

export const seq = { user: 1, service: 1, booking: 1 };

export const usersByEmail = new Map(); // email -> user
export const usersById = new Map(); // id -> user

export const services = new Map(); // id -> service
export const bookings = new Map(); // id -> booking

export let config = {
  workingHours: { 1:[9,18], 2:[9,18], 3:[9,18], 4:[9,18], 5:[9,18] },
  blockedDays: [],
  blockedDateRanges: [],
  blockedTimes: {}
};

export function seedAdmin(user) {
  if(!usersByEmail.has(user.email)){
    usersByEmail.set(user.email, user);
    usersById.set(user.id, user);
  }
}

export function addService(s){ const id = seq.service++; const svc = { id, ...s }; services.set(id, svc); return svc; }
export function getServiceById(id){ return services.get(Number(id)) || null; }
export function listServices(){ return Array.from(services.values()); }

export function addBooking(b){ const id = seq.booking++; const bk = { id, ...b }; bookings.set(id, bk); return bk; }
export function listBookings(){ return Array.from(bookings.values()); }
export function getBookingsByDate(date){ return listBookings().filter(b=> b.date===date); }

// Seed default services if empty
if(services.size===0){
  addService({ name:'Corte dama', description:'Corte y estilizado para mujer.', duration:60, price:5500 });
  addService({ name:'Corte caballero', description:'Corte clásico o moderno.', duration:30, price:3500 });
  addService({ name:'Corte niños', description:'Corte para peques.', duration:30, price:3000 });
}
