Admin endpoint

Path: GET /api/admin/users
Auth: Bearer token with role ADMIN
Response: JSON with two keys:
- counts: array of { role: string, count: number }
- recent: array of recent user objects: { id, email, role, createdAt, name }

Example:
{
  "counts": [ { "role": "CLIENT", "count": 12 }, { "role": "BUSINESS", "count": 3 }, { "role": "ADMIN", "count": 1 } ],
  "recent": [ { "id": "...", "email": "biz@example.com", "role": "BUSINESS", "createdAt": "...", "name": "Owner" } ]
}
