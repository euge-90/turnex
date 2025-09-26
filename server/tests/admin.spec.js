describe('Admin API', ()=>{
  test('GET /api/admin/users returns counts and recent (requires admin)', async ()=>{
    const express = (await import('express')).default;
    const adminRoutesFactory = (await import('../src/routes/admin.js')).default;
    const sign = (await import('../src/lib/auth.js')).signToken;
    const request = (await import('supertest')).default;

    // Build a mock prisma with minimal behavior
    const fakeUsers = [
      { id: '1', email: 'a@x.com', role: 'BUSINESS', createdAt: new Date(), name: 'Biz' },
      { id: '2', email: 'b@x.com', role: 'ADMIN', createdAt: new Date(), name: 'Admin' }
    ];
    const prismaMock = {
      user: {
        count: async ({ where }) => fakeUsers.filter(u=>u.role===where.role).length,
        findMany: async ({ orderBy, take, select }) => fakeUsers.slice(0,take||20)
      }
    };

    // Create an express app, mount the admin routes with mocked prisma
    const app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutesFactory({ prisma: prismaMock }));

    // Create an admin-like token (payload role ADMIN)
    const adminPayload = { id: '2', email: 'b@x.com', role: 'ADMIN' };
    const token = sign(adminPayload);

    const resp = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json');
    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty('counts');
    expect(Array.isArray(resp.body.counts)).toBe(true);
    expect(resp.body).toHaveProperty('recent');
    expect(Array.isArray(resp.body.recent)).toBe(true);
    if(resp.body.recent.length>0){
      const u = resp.body.recent[0];
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('email');
      expect(u).toHaveProperty('role');
    }
  }, 20000);
});
