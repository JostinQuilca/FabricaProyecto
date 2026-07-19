// ============================================================
// @fabrica/node-core · Auth Base (commonalities de backend)
// CA-002/009/010/011: modelos Usuario/Role, esquema base y
// resolvers de autenticación (login, registro, logout).
// Todo con inyección de dependencias (client, auditoria, secret).
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getIp } = require('./auth');

/** Modelo de Usuario sobre un cliente PostgreSQL. */
function createUsuarioModel(client) {
  return {
    findAll: async () => (await client.query('SELECT * FROM usuarios ORDER BY id')).rows,
    findById: async (id) => (await client.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0] || null,
    findByEmail: async (email) => (await client.query('SELECT * FROM usuarios WHERE email = $1', [email])).rows[0] || null,
    create: async ({ nombre, email, password, rol_id }) =>
      (await client.query(
        'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, email, password, rol_id]
      )).rows[0],
  };
}

/** Modelo de Role sobre un cliente PostgreSQL. */
function createRoleModel(client) {
  return {
    findAll: async () => (await client.query('SELECT * FROM roles ORDER BY id')).rows,
    findById: async (id) => (await client.query('SELECT * FROM roles WHERE id = $1', [id])).rows[0] || null,
  };
}

/** Esquema GraphQL base (siempre presente en todo producto). */
const baseTypeDefs = `#graphql
  type Role {
    id: ID!
    nombre: String!
  }

  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Role!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  type Query {
    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario
    roles: [Role!]!
    me: Usuario
  }

  type Mutation {
    registro(nombre: String!, email: String!, password: String!, rolId: ID!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
  }
`;

/**
 * Resolvers base con dependencias inyectadas.
 * @param {object} deps
 * @param {object} deps.Usuario - modelo de Usuario
 * @param {object} deps.Role - modelo de Role
 * @param {object} deps.auditoria - modelo de auditoría (real o no-op)
 * @param {string} deps.jwtSecret - secreto para firmar el JWT
 */
function buildBaseResolvers({ Usuario, Role, auditoria, jwtSecret }) {
  return {
    Usuario: {
      rol: (parent) => Role.findById(parent.rol_id),
      createdAt: (p) => p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      updatedAt: (p) => p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
    },
    Query: {
      me: (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return ctx.user; },
      usuarios: () => Usuario.findAll(),
      usuario: (_, { id }) => Usuario.findById(id),
      roles: () => Role.findAll(),
    },
    Mutation: {
      registro: async (_, { nombre, email, password, rolId }, ctx) => {
        if (await Usuario.findByEmail(email)) throw new Error('El email ya está registrado');
        const hashedPassword = await bcrypt.hash(password, 10);
        const usuario = await Usuario.create({ nombre, email, password: hashedPassword, rol_id: rolId });
        const token = jwt.sign({ id: usuario.id, email: usuario.email, rol_id: usuario.rol_id }, jwtSecret, { expiresIn: '24h' });
        await auditoria.registrar({ usuarioId: usuario.id, accion: 'REGISTRO', entidad: 'usuarios', entidadId: usuario.id, detalles: `Nuevo usuario registrado: ${email}`, ipAddress: getIp(ctx) });
        return { token, usuario };
      },
      login: async (_, { email, password }, ctx) => {
        const ipAddress = getIp(ctx);
        const user = await Usuario.findByEmail(email);
        if (!user) {
          await auditoria.registrar({ usuarioId: null, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: null, detalles: `Intento de login fallido - email no encontrado: ${email}`, ipAddress });
          throw new Error('Credenciales incorrectas');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          await auditoria.registrar({ usuarioId: user.id, accion: 'LOGIN_FALLIDO', entidad: 'usuarios', entidadId: user.id, detalles: `Intento de login fallido - contraseña incorrecta: ${email}`, ipAddress });
          throw new Error('Credenciales incorrectas');
        }
        const usuarioReturn = { id: user.id, nombre: user.nombre, email: user.email, rol_id: user.rol_id, created_at: user.created_at, updated_at: user.updated_at };
        const token = jwt.sign(usuarioReturn, jwtSecret, { expiresIn: '24h' });
        await auditoria.registrar({ usuarioId: user.id, accion: 'LOGIN', entidad: 'usuarios', entidadId: user.id, detalles: `Login exitoso: ${email}`, ipAddress });
        return { token, usuario: usuarioReturn };
      },
      logout: async (_, __, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'LOGOUT', entidad: 'usuarios', entidadId: ctx.user.id, detalles: `Logout: ${ctx.user.email}`, ipAddress: getIp(ctx) });
        return true;
      },
    },
  };
}

module.exports = { createUsuarioModel, createRoleModel, baseTypeDefs, buildBaseResolvers };
