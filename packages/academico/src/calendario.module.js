// ============================================================
// CA-022 · Módulo de Calendario Académico (componible)
// Eventos institucionales con fecha y tipo (clase, examen, taller,
// feriado, entrega). No depende de Materias: es un asset autónomo,
// aunque un evento puede asociarse opcionalmente a una materia.
// ============================================================
const { getIp } = require('@fabrica/node-core/auth');

/** Modelo de Evento sobre un cliente PostgreSQL. */
function createEventoModel(client) {
  return {
    findAll: async () => (await client.query(
      `SELECT * FROM eventos ORDER BY fecha_inicio ASC`)).rows,
    findByRango: async (desde, hasta) => (await client.query(
      `SELECT * FROM eventos
       WHERE fecha_inicio >= $1 AND fecha_inicio <= $2
       ORDER BY fecha_inicio ASC`, [desde, hasta])).rows,
    findById: async (id) => (await client.query('SELECT * FROM eventos WHERE id = $1', [id])).rows[0] || null,
    create: async ({ titulo, descripcion, fechaInicio, fechaFin, tipo, color }) => (await client.query(
      `INSERT INTO eventos (titulo, descripcion, fecha_inicio, fecha_fin, tipo, color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [titulo, descripcion, fechaInicio, fechaFin, tipo, color])).rows[0],
    update: async (id, { titulo, descripcion, fechaInicio, fechaFin, tipo, color }) => (await client.query(
      `UPDATE eventos SET titulo = COALESCE($2, titulo), descripcion = COALESCE($3, descripcion),
              fecha_inicio = COALESCE($4, fecha_inicio), fecha_fin = COALESCE($5, fecha_fin),
              tipo = COALESCE($6, tipo), color = COALESCE($7, color), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, titulo, descripcion, fechaInicio, fechaFin, tipo, color])).rows[0] || null,
    remove: async (id) => (await client.query('DELETE FROM eventos WHERE id = $1 RETURNING *', [id])).rows[0] || null,
  };
}

const calendarioTypeDefs = `#graphql
  type Evento {
    id: ID!
    titulo: String!
    descripcion: String
    fechaInicio: String!
    fechaFin: String
    tipo: String!
    color: String
  }

  extend type Query {
    eventos: [Evento!]!
    eventosPorRango(desde: String!, hasta: String!): [Evento!]!
  }

  extend type Mutation {
    crearEvento(titulo: String!, descripcion: String, fechaInicio: String!, fechaFin: String, tipo: String!, color: String): Evento!
    actualizarEvento(id: ID!, titulo: String, descripcion: String, fechaInicio: String, fechaFin: String, tipo: String, color: String): Evento!
    eliminarEvento(id: ID!): Boolean!
  }
`;

const TIPOS = ['CLASE', 'EXAMEN', 'TALLER', 'ENTREGA', 'FERIADO', 'OTRO'];

function buildCalendarioResolvers({ Evento, auditoria }) {
  const iso = (v) => (v ? new Date(v).toISOString() : null);
  return {
    Evento: {
      fechaInicio: (p) => iso(p.fecha_inicio),
      fechaFin: (p) => iso(p.fecha_fin),
    },
    Query: {
      eventos: async (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Evento.findAll(); },
      eventosPorRango: async (_, { desde, hasta }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        return Evento.findByRango(desde, hasta);
      },
    },
    Mutation: {
      crearEvento: async (_, args, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (!TIPOS.includes(args.tipo)) throw new Error(`Tipo inválido. Usa uno de: ${TIPOS.join(', ')}`);
        const evento = await Evento.create(args);
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'CREAR_EVENTO', entidad: 'eventos', entidadId: evento.id,
          detalles: `Evento creado: ${args.titulo} (${args.tipo})`, ipAddress: getIp(ctx),
        });
        return evento;
      },
      actualizarEvento: async (_, { id, ...cambios }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (cambios.tipo && !TIPOS.includes(cambios.tipo)) throw new Error(`Tipo inválido. Usa uno de: ${TIPOS.join(', ')}`);
        const evento = await Evento.update(id, cambios);
        if (!evento) throw new Error('Evento no encontrado');
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'ACTUALIZAR_EVENTO', entidad: 'eventos', entidadId: evento.id,
          detalles: `Evento actualizado: ${evento.titulo}`, ipAddress: getIp(ctx),
        });
        return evento;
      },
      eliminarEvento: async (_, { id }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');
        const eliminado = await Evento.remove(id);
        if (!eliminado) throw new Error('Evento no encontrado');
        await auditoria.registrar({
          usuarioId: ctx.user.id, accion: 'ELIMINAR_EVENTO', entidad: 'eventos', entidadId: Number(id),
          detalles: `Evento eliminado: ${eliminado.titulo}`, ipAddress: getIp(ctx),
        });
        return true;
      },
    },
  };
}

function createCalendarioModule({ client, auditoria }) {
  const Evento = createEventoModel(client);
  const audit = auditoria || { registrar: async () => null };
  return {
    typeDefs: calendarioTypeDefs,
    resolvers: buildCalendarioResolvers({ Evento, auditoria: audit }),
    models: { Evento },
  };
}

module.exports = { createCalendarioModule, TIPOS_EVENTO: TIPOS };
