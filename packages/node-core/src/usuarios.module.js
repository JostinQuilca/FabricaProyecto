// ============================================================
// CA-020 · Módulo de Gestión de Usuarios (componible)
// Permite al ADMIN crear/editar/eliminar usuarios y asignarles rol,
// sin depender del registro público (CA-007).
// Las queries `usuarios`, `usuario(id)` y `roles` ya existen en el
// esquema base; aquí solo se añaden las mutations de administración.
// ============================================================
const bcrypt = require('bcryptjs');
const { getIp } = require('./auth');

const usuariosTypeDefs = `#graphql
  extend type Mutation {
    crearUsuario(nombre: String!, email: String!, password: String!, rolId: ID!): Usuario!
    actualizarUsuario(id: ID!, nombre: String, email: String, rolId: ID, password: String): Usuario!
    eliminarUsuario(id: ID!): Boolean!
  }
`;

function soloAdmin(ctx) {
  if (!ctx.user) throw new Error('No autenticado');
  if (Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');
}

function buildUsuariosResolvers({ Usuario, auditoria }) {
  return {
    Mutation: {
      crearUsuario: async (_, { nombre, email, password, rolId }, ctx) => {
        soloAdmin(ctx);
        if (await Usuario.findByEmail(email)) throw new Error(`Ya existe un usuario con el email ${email}`);
        if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        const hash = await bcrypt.hash(password, 10);
        const usuario = await Usuario.create({ nombre, email, password: hash, rol_id: rolId });
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'CREAR_USUARIO', entidad: 'usuarios', entidadId: usuario.id,
          detalles: `Usuario creado: ${email} (rol ${rolId})`, ipAddress: getIp(ctx),
        });
        return usuario;
      },
      actualizarUsuario: async (_, { id, nombre, email, rolId, password }, ctx) => {
        soloAdmin(ctx);
        if (email) {
          const otro = await Usuario.findByEmail(email);
          if (otro && String(otro.id) !== String(id)) throw new Error(`El email ${email} ya está en uso`);
        }
        let hash = null;
        if (password) {
          if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
          hash = await bcrypt.hash(password, 10);
        }
        const usuario = await Usuario.update(id, { nombre, email, rol_id: rolId, password: hash });
        if (!usuario) throw new Error('Usuario no encontrado');
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'ACTUALIZAR_USUARIO', entidad: 'usuarios', entidadId: usuario.id,
          detalles: `Usuario actualizado: ${usuario.email}`, ipAddress: getIp(ctx),
        });
        return usuario;
      },
      eliminarUsuario: async (_, { id }, ctx) => {
        soloAdmin(ctx);
        // Evita que un admin se borre a sí mismo y se quede fuera del sistema.
        if (String(ctx.user.id) === String(id)) throw new Error('No puedes eliminar tu propio usuario');
        const eliminado = await Usuario.remove(id);
        if (!eliminado) throw new Error('Usuario no encontrado');
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'ELIMINAR_USUARIO', entidad: 'usuarios', entidadId: Number(id),
          detalles: `Usuario eliminado: ${eliminado.email}`, ipAddress: getIp(ctx),
        });
        return true;
      },
    },
  };
}

/** Módulo componible de gestión de usuarios. */
function createUsuariosModule({ usuarioModel, auditoria }) {
  const audit = auditoria || { registrar: async () => null };
  return {
    typeDefs: usuariosTypeDefs,
    resolvers: buildUsuariosResolvers({ Usuario: usuarioModel, auditoria: audit }),
  };
}

module.exports = { createUsuariosModule };
