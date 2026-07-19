// ============================================================
// @fabrica/node-core · CA-011 Middleware JWT
// Verificación de tokens (dependencia inyectable del secreto).
// ============================================================
const jwt = require('jsonwebtoken');

/**
 * Verifica un token JWT (acepta prefijo "Bearer ").
 * @param {string} token
 * @param {string} secret - JWT_SECRET (por defecto process.env.JWT_SECRET)
 * @returns {object|null} payload o null si es inválido.
 */
function verifyToken(token, secret = process.env.JWT_SECRET) {
  try {
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '');
    return jwt.verify(cleanToken, secret);
  } catch {
    return null;
  }
}

/** Obtiene la IP del cliente desde el contexto de la request. */
function getIp(context) {
  return context && context.req
    ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida')
    : 'desconocida';
}

module.exports = { verifyToken, getIp };
