// CA-016 + CA-017 · Resolvers del dominio académico.
// Recibe por inyección: modelos (Materia, Inscripcion, Usuario) y auditoria.
// `auditoria` puede ser el módulo real (CA-012) o un no-op si está desactivado.
const { getIp } = require('@fabrica/node-core/auth');

function buildAcademicoResolvers({ Materia, Inscripcion, Usuario, auditoria }) {
  return {
    Materia: {
      docente: (p) => (p.docente_id ? Usuario.findById(p.docente_id) : null),
      createdAt: (p) => p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      updatedAt: (p) => p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
    },
    Inscripcion: {
      estudiante: (p) => Usuario.findById(p.estudiante_id),
      materia: (p) => Materia.findById(p.materia_id),
      fechaInscripcion: (p) => p.fecha_inscripcion ? new Date(p.fecha_inscripcion).toISOString() : new Date().toISOString(),
    },
    Query: {
      materias: async (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Materia.findAll(); },
      materia: async (_, { id }, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Materia.findById(id); },
      inscripciones: async (_, __, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Inscripcion.findAll(); },
      inscripcionesByEstudiante: async (_, { estudianteId }, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Inscripcion.findByEstudiante(estudianteId); },
      inscripcionesByMateria: async (_, { materiaId }, ctx) => { if (!ctx.user) throw new Error('No autenticado'); return Inscripcion.findByMateria(materiaId); },
    },
    Mutation: {
      crearMateria: async (_, { codigo, nombre, creditos, descripcion, docenteId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        if (await Materia.findByCodigo(codigo)) throw new Error(`Ya existe una materia con el código ${codigo}`);
        const materia = await Materia.create({ codigo, nombre, creditos, descripcion, docenteId });
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'CREAR_MATERIA', entidad: 'materias', entidadId: materia.id, detalles: `Materia creada: ${codigo} - ${nombre}`, ipAddress: getIp(ctx) });
        return materia;
      },
      actualizarMateria: async (_, { id, codigo, nombre, creditos, descripcion, docenteId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (![1, 2].includes(Number(ctx.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');
        const materia = await Materia.update(id, { codigo, nombre, creditos, descripcion, docenteId });
        if (!materia) throw new Error('Materia no encontrada');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'ACTUALIZAR_MATERIA', entidad: 'materias', entidadId: materia.id, detalles: `Materia actualizada: ${materia.codigo} - ${materia.nombre}`, ipAddress: getIp(ctx) });
        return materia;
      },
      eliminarMateria: async (_, { id }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        if (Number(ctx.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');
        const eliminada = await Materia.remove(id);
        if (!eliminada) throw new Error('Materia no encontrada');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'ELIMINAR_MATERIA', entidad: 'materias', entidadId: Number(id), detalles: `Materia eliminada: ${eliminada.codigo} - ${eliminada.nombre}`, ipAddress: getIp(ctx) });
        return true;
      },
      inscribir: async (_, { estudianteId, materiaId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        const estudiante = await Usuario.findById(estudianteId);
        if (!estudiante) throw new Error('Estudiante no encontrado');
        const materia = await Materia.findById(materiaId);
        if (!materia) throw new Error('Materia no encontrada');
        if (await Inscripcion.exists(estudianteId, materiaId)) throw new Error('El estudiante ya está inscrito en esta materia');
        const inscripcion = await Inscripcion.inscribir(estudianteId, materiaId);
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'INSCRIBIR', entidad: 'inscripciones', entidadId: inscripcion.id, detalles: `Inscripción: estudiante ${estudiante.email} en materia ${materia.codigo}`, ipAddress: getIp(ctx) });
        return inscripcion;
      },
      desinscribir: async (_, { estudianteId, materiaId }, ctx) => {
        if (!ctx.user) throw new Error('No autenticado');
        const eliminada = await Inscripcion.desinscribir(estudianteId, materiaId);
        if (!eliminada) throw new Error('El estudiante no está inscrito en esta materia');
        await auditoria.registrar({ usuarioId: ctx.user.id, accion: 'DESINSCRIBIR', entidad: 'inscripciones', entidadId: eliminada.id, detalles: `Desinscripción: estudiante ${estudianteId} de materia ${materiaId}`, ipAddress: getIp(ctx) });
        return true;
      },
    },
  };
}

module.exports = { buildAcademicoResolvers };
