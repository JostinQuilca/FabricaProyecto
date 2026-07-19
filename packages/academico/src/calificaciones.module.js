// ============================================================
// CA-019 · Módulo de Calificaciones (componible)
// Depende de CA-016 (Materias): una calificación es de un estudiante
// en una materia. Mismo patrón que Materias/Inscripciones.
// ============================================================
const { getIp } = require('@fabrica/node-core/auth');
const { createCalificacionModel } = require('./calificacion.model');

const calificacionesTypeDefs = `#graphql
  type Calificacion {
    id: ID!
    estudiante: Usuario!
    materia: Materia!
    nota: Float!
    periodo: String!
    observacion: String
    createdAt: String!
  }

  extend type Query {
    calificaciones: [Calificacion!]!
    calificacionesByEstudiante(estudianteId: ID!): [Calificacion!]!
    calificacionesByMateria(materiaId: ID!): [Calificacion!]!
  }

  extend type Mutation {
    registrarCalificacion(estudianteId: ID!, materiaId: ID!, nota: Float!, periodo: String!, observacion: String): Calificacion!
    actualizarCalificacion(id: ID!, nota: Float, observacion: String): Calificacion!
    eliminarCalificacion(id: ID!): Boolean!
  }
`;

function buildCalificacionesResolvers({ Calificacion, Materia, Usuario, auditoria }) {
  return {
    Calificacion: {
      estudiante: (p) => Usuario.findById(p.estudiante_id),
      materia: (p) => Materia.findById(p.materia_id),
      createdAt: (p) => p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
    },
    Query: {
      calificaciones: async (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Calificacion.findAll(); },
      calificacionesByEstudiante: async (_, { estudianteId }, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Calificacion.findByEstudiante(estudianteId); },
      calificacionesByMateria: async (_, { materiaId }, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Calificacion.findByMateria(materiaId); },
    },
    Mutation: {
      registrarCalificacion: async (_, { estudianteId, materiaId, nota, periodo, observacion }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (nota < 0 || nota > 100) throw new Error('La nota debe estar entre 0 y 100');
        const estudiante = await Usuario.findById(estudianteId);
        if (!estudiante) throw new Error('Estudiante no encontrado');
        const materia = await Materia.findById(materiaId);
        if (!materia) throw new Error('Materia no encontrada');
        if (await Calificacion.exists(estudianteId, materiaId, periodo)) throw new Error('Ya existe una calificación para ese estudiante, materia y período');
        const cal = await Calificacion.create({ estudianteId, materiaId, nota, periodo, observacion });
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'REGISTRAR_CALIFICACION', entidad: 'calificaciones', entidadId: cal.id, detalles: `Nota ${nota} a ${estudiante.email} en ${materia.codigo} (${periodo})`, ipAddress: getIp(ctx) });
        return cal;
      },
      actualizarCalificacion: async (_, { id, nota, observacion }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (nota != null && (nota < 0 || nota > 100)) throw new Error('La nota debe estar entre 0 y 100');
        const cal = await Calificacion.update(id, { nota, observacion });
        if (!cal) throw new Error('Calificación no encontrada');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'ACTUALIZAR_CALIFICACION', entidad: 'calificaciones', entidadId: cal.id, detalles: `Calificación ${id} actualizada`, ipAddress: getIp(ctx) });
        return cal;
      },
      eliminarCalificacion: async (_, { id }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');
        const eliminada = await Calificacion.remove(id);
        if (!eliminada) throw new Error('Calificación no encontrada');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'ELIMINAR_CALIFICACION', entidad: 'calificaciones', entidadId: Number(id), detalles: `Calificación ${id} eliminada`, ipAddress: getIp(ctx) });
        return true;
      },
    },
  };
}

/**
 * Crea el módulo de Calificaciones. Requiere el modelo de Materia (del
 * módulo académico) y el de Usuario (base), más la auditoría.
 */
function createCalificacionesModule({ client, materiaModel, usuarioModel, auditoria }) {
  const Calificacion = createCalificacionModel(client);
  const audit = auditoria || { registrar: async () => null };
  return {
    typeDefs: calificacionesTypeDefs,
    resolvers: buildCalificacionesResolvers({ Calificacion, Materia: materiaModel, Usuario: usuarioModel, auditoria: audit }),
    models: { Calificacion },
  };
}

module.exports = { createCalificacionesModule };
