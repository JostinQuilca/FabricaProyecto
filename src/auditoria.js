// ============================================================
// @fabrica/node-core · CA-012 Módulo de Auditoría (componible)
// Exporta modelo + typeDefs + resolvers a partir de un cliente.
// ============================================================
const { getIp } = require('./auth');

/** Crea el modelo de Auditoría sobre un cliente PostgreSQL. */
function createAuditoriaModel(client) {
  return {
    registrar: async ({ usuarioId = null, accion, entidad = null, entidadId = null, detalles = null, ipAddress = null }) => {
      const { rows } = await client.query(
        `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalles, ip_address, fecha_hora)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [usuarioId, accion, entidad, entidadId, detalles, ipAddress]
      );
      return rows[0];
    },
    findAll: async (limit = 50, offset = 0) => {
      const { rows } = await client.query(
        `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
         FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id
         ORDER BY a.fecha_hora DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return rows;
    },
    findByUsuario: async (usuarioId, limit = 50) => {
      const { rows } = await client.query(
        `SELECT * FROM auditoria WHERE usuario_id = $1 ORDER BY fecha_hora DESC LIMIT $2`,
        [usuarioId, limit]
      );
      return rows;
    },
    findByAccion: async (accion, limit = 50) => {
      const { rows } = await client.query(
        `SELECT a.*, u.nombre as usuario_nombre, u.email as usuario_email
         FROM auditoria a LEFT JOIN usuarios u ON a.usuario_id = u.id
         WHERE a.accion = $1 ORDER BY a.fecha_hora DESC LIMIT $2`,
        [accion, limit]
      );
      return rows;
    },
  };
}

const auditoriaTypeDefs = `#graphql
  type Auditoria {
    id: ID!
    usuarioId: Int
    accion: String!
    entidad: String
    entidadId: Int
    detalles: String
    ipAddress: String
    fechaHora: String!
    usuarioNombre: String
    usuarioEmail: String
  }
  extend type Query {
    auditoria(limit: Int, offset: Int): [Auditoria!]!
    auditoriaByUsuario(usuarioId: ID!, limit: Int): [Auditoria!]!
    auditoriaByAccion(accion: String!, limit: Int): [Auditoria!]!
  }
`;

/** Construye los resolvers de Auditoría con el modelo inyectado. */
function buildAuditoriaResolvers(Auditoria) {
  return {
    Auditoria: {
      usuarioId: (p) => p.usuario_id,
      entidadId: (p) => p.entidad_id,
      ipAddress: (p) => p.ip_address,
      fechaHora: (p) => p.fecha_hora ? new Date(p.fecha_hora).toISOString() : new Date().toISOString(),
      usuarioNombre: (p) => p.usuario_nombre || null,
      usuarioEmail: (p) => p.usuario_email || null,
    },
    Query: {
      auditoria: async (_, { limit = 50, offset = 0 }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        return Auditoria.findAll(limit, offset);
      },
      auditoriaByUsuario: async (_, { usuarioId, limit = 50 }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        return Auditoria.findByUsuario(usuarioId, limit);
      },
      auditoriaByAccion: async (_, { accion, limit = 50 }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        return Auditoria.findByAccion(accion, limit);
      },
    },
  };
}

/**
 * Módulo componible de Auditoría.
 * @returns {{ model, typeDefs, resolvers }}
 */
function createAuditoriaModule({ client }) {
  const model = createAuditoriaModel(client);
  return { model, typeDefs: auditoriaTypeDefs, resolvers: buildAuditoriaResolvers(model) };
}

/** Auditoría "no-op": se usa cuando CA-012 está desactivado, para que los
 *  demás módulos puedan llamar auditoria.registrar() sin romperse. */
const noopAuditoria = { registrar: async () => null, findAll: async () => [], findByUsuario: async () => [], findByAccion: async () => [] };

module.exports = { createAuditoriaModule, createAuditoriaModel, noopAuditoria, getIp };
