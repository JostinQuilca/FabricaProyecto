// ============================================================
// CA-023 · Módulo de Horarios de clase (componible)
// Franja horaria de una materia: día, hora inicio/fin, aula y docente.
// DEPENDE de CA-016 (Materias): un horario es siempre de una materia.
// ============================================================
const { getIp } = require('@fabrica/node-core/auth');

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function createHorarioModel(client) {
  return {
    findAll: async () => (await client.query(
      `SELECT h.*, m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM horarios h JOIN materias m ON h.materia_id = m.id
       ORDER BY array_position(ARRAY['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'], h.dia), h.hora_inicio`)).rows,
    findByMateria: async (materiaId) => (await client.query(
      'SELECT * FROM horarios WHERE materia_id = $1 ORDER BY hora_inicio', [materiaId])).rows,
    findById: async (id) => (await client.query('SELECT * FROM horarios WHERE id = $1', [id])).rows[0] || null,
    /** Detecta choque de aula: misma aula, mismo día, franjas superpuestas. */
    choqueAula: async ({ dia, aula, horaInicio, horaFin, excluirId = null }) => (await client.query(
      `SELECT id FROM horarios
       WHERE dia = $1 AND aula = $2
         AND hora_inicio < $4 AND hora_fin > $3
         AND ($5::int IS NULL OR id <> $5)
       LIMIT 1`,
      [dia, aula, horaInicio, horaFin, excluirId])).rows[0] || null,
    create: async ({ materiaId, dia, horaInicio, horaFin, aula, docenteId = null }) => (await client.query(
      `INSERT INTO horarios (materia_id, dia, hora_inicio, hora_fin, aula, docente_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [materiaId, dia, horaInicio, horaFin, aula, docenteId])).rows[0],
    remove: async (id) => (await client.query('DELETE FROM horarios WHERE id = $1 RETURNING *', [id])).rows[0] || null,
  };
}

const horariosTypeDefs = `#graphql
  type Horario {
    id: ID!
    materia: Materia!
    dia: String!
    horaInicio: String!
    horaFin: String!
    aula: String
    docente: Usuario
  }

  extend type Query {
    horarios: [Horario!]!
    horariosPorMateria(materiaId: ID!): [Horario!]!
  }

  extend type Mutation {
    crearHorario(materiaId: ID!, dia: String!, horaInicio: String!, horaFin: String!, aula: String, docenteId: ID): Horario!
    eliminarHorario(id: ID!): Boolean!
  }
`;

function buildHorariosResolvers({ Horario, Materia, Usuario, auditoria }) {
  return {
    Horario: {
      materia: (p) => Materia.findById(p.materia_id),
      docente: (p) => (p.docente_id ? Usuario.findById(p.docente_id) : null),
      horaInicio: (p) => String(p.hora_inicio).slice(0, 5),
      horaFin: (p) => String(p.hora_fin).slice(0, 5),
    },
    Query: {
      horarios: async (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Horario.findAll(); },
      horariosPorMateria: async (_, { materiaId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        return Horario.findByMateria(materiaId);
      },
    },
    Mutation: {
      crearHorario: async (_, { materiaId, dia, horaInicio, horaFin, aula, docenteId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (!DIAS.includes(dia)) throw new Error(`Día inválido. Usa uno de: ${DIAS.join(', ')}`);
        if (horaFin <= horaInicio) throw new Error('La hora de fin debe ser posterior a la de inicio');
        const materia = await Materia.findById(materiaId);
        if (!materia) throw new Error('Materia no encontrada');
        if (aula && await Horario.choqueAula({ dia, aula, horaInicio, horaFin })) {
          throw new Error(`El aula ${aula} ya está ocupada ese día en esa franja horaria`);
        }
        const horario = await Horario.create({ materiaId, dia, horaInicio, horaFin, aula, docenteId });
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'CREAR_HORARIO', entidad: 'horarios', entidadId: horario.id,
          detalles: `Horario: ${materia.codigo} ${dia} ${horaInicio}-${horaFin}`, ipAddress: getIp(ctx),
        });
        return horario;
      },
      eliminarHorario: async (_, { id }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        const eliminado = await Horario.remove(id);
        if (!eliminado) throw new Error('Horario no encontrado');
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'ELIMINAR_HORARIO', entidad: 'horarios', entidadId: Number(id),
          detalles: `Horario ${id} eliminado`, ipAddress: getIp(ctx),
        });
        return true;
      },
    },
  };
}

function createHorariosModule({ client, materiaModel, usuarioModel, auditoria }) {
  const Horario = createHorarioModel(client);
  const audit = auditoria || { registrar: async () => null };
  return {
    typeDefs: horariosTypeDefs,
    resolvers: buildHorariosResolvers({ Horario, Materia: materiaModel, Usuario: usuarioModel, auditoria: audit }),
    models: { Horario },
  };
}

module.exports = { createHorariosModule, DIAS_SEMANA: DIAS };
