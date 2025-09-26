import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware base de autenticación
 * Verifica el token JWT y agrega req.user
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado', 
        message: 'Token no proporcionado' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Agregar usuario decodificado al request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado', 
        message: 'Por favor inicia sesión nuevamente' 
      });
    }
    return res.status(401).json({ 
      error: 'Token inválido', 
      message: 'El token proporcionado no es válido' 
    });
  }
}

/**
 * Middleware para verificar roles específicos
 * @param {string[]} allowedRoles - Array de roles permitidos ['CLIENT', 'BUSINESS', 'ADMIN']
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado', 
        message: 'Debes iniciar sesión' 
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Acceso denegado', 
        message: `Necesitas rol: ${allowedRoles.join(' o ')}. Tu rol: ${userRole}` 
      });
    }

    next();
  };
}

/**
 * Middleware para verificar que el usuario es ADMIN
 */
export function requireAdmin(req, res, next) {
  return authorize('ADMIN')(req, res, next);
}

/**
 * Middleware para verificar que el usuario es BUSINESS o ADMIN
 */
export function requireBusiness(req, res, next) {
  return authorize('BUSINESS', 'ADMIN')(req, res, next);
}

/**
 * Middleware para verificar que el usuario es propietario del recurso o ADMIN
 * @param {string} paramName - Nombre del parámetro que contiene el ID del usuario propietario
 */
export function requireOwnerOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    const resourceUserId = req.params[paramName] || req.body[paramName];
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (currentUserId === resourceUserId || isAdmin) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Acceso denegado', 
      message: 'Solo puedes acceder a tus propios recursos' 
    });
  };
}

/**
 * Middleware para verificar permisos específicos
 */
export function can(permission) {
  const permissions = {
    'create-service': ['BUSINESS', 'ADMIN'],
    'edit-service': ['BUSINESS', 'ADMIN'],
    'delete-service': ['BUSINESS', 'ADMIN'],
    'view-all-bookings': ['BUSINESS', 'ADMIN'],
    'manage-users': ['ADMIN'],
    'manage-config': ['BUSINESS', 'ADMIN'],
    'view-stats': ['BUSINESS', 'ADMIN']
  };

  return (req, res, next) => {
    const allowedRoles = permissions[permission] || [];
    return authorize(...allowedRoles)(req, res, next);
  };
}