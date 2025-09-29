export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No tenés permisos para esta acción',
        requiredRole: allowedRoles,
        yourRole: req.user.role
      });
    }

    next();
  };
}

// Atajos para roles específicos
export const requireAdmin = requireRole('ADMIN');
export const requireBusiness = requireRole('BUSINESS', 'ADMIN');
export const requireClient = requireRole('CLIENT', 'BUSINESS', 'ADMIN');