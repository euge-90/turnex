const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  it('returns ok true and version', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('version');
  });
});