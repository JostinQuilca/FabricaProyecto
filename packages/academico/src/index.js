// ============================================================
// @fabrica/academico · Módulo componible del dominio académico
//   CA-016 Materias  ·  CA-017 Inscripciones  ·  CA-019 Calificaciones
// ============================================================
const { createMateriaModel } = require('./materia.model');
const { createInscripcionModel } = require('./inscripcion.model');
const { academicoTypeDefs } = require('./typeDefs');
const { buildAcademicoResolvers } = require('./resolvers');
const { ensureMateriasTable, ensureInscripcionesTable, ensureCalificacionesTable } = require('./db-schema');
const { createCalificacionesModule } = require('./calificaciones.module');

/**
 * Crea el módulo académico listo para componer con el esquema base.
 * @param {object} deps
 * @param {import('pg').Client} deps.client - cliente PostgreSQL
 * @param {object} deps.usuarioModel - modelo de Usuario (findById) del producto
 * @param {object} [deps.auditoria] - modelo de auditoría (o no-op si CA-012 off)
 * @returns {{ typeDefs: string, resolvers: object, models: object }}
 */
function createAcademicoModule({ client, usuarioModel, auditoria }) {
  const Materia = createMateriaModel(client);
  const Inscripcion = createInscripcionModel(client);
  const audit = auditoria || { registrar: async () => null };
  return {
    typeDefs: academicoTypeDefs,
    resolvers: buildAcademicoResolvers({ Materia, Inscripcion, Usuario: usuarioModel, auditoria: audit }),
    models: { Materia, Inscripcion },
  };
}

module.exports = {
  createAcademicoModule,
  createCalificacionesModule,
  ensureMateriasTable,
  ensureInscripcionesTable,
  ensureCalificacionesTable,
};
