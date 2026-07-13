const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../config/database');
const { Role } = require('../models/Role');
const { Usuario } = require('../models/Usuario');
const { Auditoria } = require('../models/Auditoria');
// >>>CA-016>>>
const { Materia } = require('../models/Materia');
// <<<CA-016<<<
// >>>CA-017>>>
const { Inscripcion } = require('../models/Inscripcion');
// <<<CA-017<<<

// Helper: obtiene la IP del cliente desde el contexto de la request
const getIp = (context) =>
  context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';

const resolvers = {
  Usuario: {
    rol: (parent) => Role.findById(parent.rol_id),
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  // >>>CA-016>>>
  Materia: {
    docente: (parent) => (parent.docente_id ? Usuario.findById(parent.docente_id) : null),
    createdAt: (parent) => parent.created_at ? new Date(parent.created_at).toISOString() : new Date().toISOString(),
    updatedAt: (parent) => parent.updated_at ? new Date(parent.updated_at).toISOString() : new Date().toISOString(),
  },
  // <<<CA-016<<<
  // >>>CA-017>>>
  Inscripcion: {
    estudiante: (parent) => Usuario.findById(parent.estudiante_id),
    materia: (parent) => Materia.findById(parent.materia_id),
    fechaInscripcion: (parent) => parent.fecha_inscripcion ? new Date(parent.fecha_inscripcion).toISOString() : new Date().toISOString(),
  },
  // <<<CA-017<<<
  Auditoria: {
    usuarioId: (parent) => parent.usuario_id,
    entidadId: (parent) => parent.entidad_id,
    ipAddress: (parent) => parent.ip_address,
    fechaHora: (parent) => parent.fecha_hora ? new Date(parent.fecha_hora).toISOString() : new Date().toISOString(),
    usuarioNombre: (parent) => parent.usuario_nombre || null,
    usuarioEmail: (parent) => parent.usuario_email || null,
  },
  Query: {
    me: (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return context.user;
    },
    usuarios: () => Usuario.findAll(),
    usuario: (_, { id }) => Usuario.findById(id),
    roles: () => Role.findAll(),

    // Queries de auditoría
    auditoria: async (_, { limit = 50, offset = 0 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findAll(limit, offset);
    },
    auditoriaByUsuario: async (_, { usuarioId, limit = 50 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findByUsuario(usuarioId, limit);
    },
    auditoriaByAccion: async (_, { accion, limit = 50 }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Auditoria.findByAccion(accion, limit);
    },

    // >>>CA-016>>> Queries de Materias
    materias: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Materia.findAll();
    },
    materia: async (_, { id }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Materia.findById(id);
    },
    // <<<CA-016<<<
    // >>>CA-017>>> Queries de Inscripciones
    inscripciones: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findAll();
    },
    inscripcionesByEstudiante: async (_, { estudianteId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findByEstudiante(estudianteId);
    },
    inscripcionesByMateria: async (_, { materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      return Inscripcion.findByMateria(materiaId);
    },
    // <<<CA-017<<<
  },
  Mutation: {
    registro: async (_, { nombre, email, password, rolId }, context) => {
      // 1. Verificar si el email ya existe (usando el modelo del compañero)
      const existente = await Usuario.findByEmail(email);
      if (existente) {
        throw new Error('El email ya está registrado');
      }

      // 2. Hash password & crear usuario (usando el modelo del compañero)
      const hashedPassword = await bcrypt.hash(password, 10);
      const usuario = await Usuario.create({
        nombre,
        email,
        password: hashedPassword,
        rol_id: rolId,
      });

      // 3. Generate token
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol_id: usuario.rol_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 4. Registrar evento de auditoría
      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';
      await Auditoria.registrar({
        usuarioId: usuario.id,
        accion: 'REGISTRO',
        entidad: 'usuarios',
        entidadId: usuario.id,
        detalles: `Nuevo usuario registrado: ${email}`,
        ipAddress
      });

      return { token, usuario };
    },
    login: async (_, { email, password }, context) => {
      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';

      // 1. Buscar usuario por email
      const user = await Usuario.findByEmail(email);

      if (!user) {
        // Registrar intento fallido de login
        await Auditoria.registrar({
          usuarioId: null,
          accion: 'LOGIN_FALLIDO',
          entidad: 'usuarios',
          entidadId: null,
          detalles: `Intento de login fallido - email no encontrado: ${email}`,
          ipAddress
        });
        throw new Error('Credenciales incorrectas');
      }

      // 2. Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Registrar intento fallido de login
        await Auditoria.registrar({
          usuarioId: user.id,
          accion: 'LOGIN_FALLIDO',
          entidad: 'usuarios',
          entidadId: user.id,
          detalles: `Intento de login fallido - contraseña incorrecta: ${email}`,
          ipAddress
        });
        throw new Error('Credenciales incorrectas');
      }

      const usuarioReturn = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      // 3. Generate token
      const token = jwt.sign(usuarioReturn, process.env.JWT_SECRET, { expiresIn: '24h' });

      // 4. Registrar login exitoso
      await Auditoria.registrar({
        usuarioId: user.id,
        accion: 'LOGIN',
        entidad: 'usuarios',
        entidadId: user.id,
        detalles: `Login exitoso: ${email}`,
        ipAddress
      });

      return {
        token,
        usuario: usuarioReturn
      };
    },
    logout: async (_, __, context) => {
      if (!context.user) throw new Error('No autenticado');

      const ipAddress = context.req ? (context.req.headers['x-forwarded-for'] || context.req.socket?.remoteAddress || 'desconocida') : 'desconocida';

      // Registrar logout
      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'LOGOUT',
        entidad: 'usuarios',
        entidadId: context.user.id,
        detalles: `Logout: ${context.user.email}`,
        ipAddress
      });

      return true;
    },

    // >>>CA-016>>> Mutations de Materias (CRUD)
    // Autorización: solo ADMIN (rol_id=1) y DOCENTE (rol_id=2)
    crearMateria: async (_, { codigo, nombre, creditos, descripcion, docenteId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      if (![1, 2].includes(Number(context.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');

      const existente = await Materia.findByCodigo(codigo);
      if (existente) throw new Error(`Ya existe una materia con el código ${codigo}`);

      const materia = await Materia.create({ codigo, nombre, creditos, descripcion, docenteId });

      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'CREAR_MATERIA',
        entidad: 'materias',
        entidadId: materia.id,
        detalles: `Materia creada: ${codigo} - ${nombre}`,
        ipAddress: getIp(context)
      });

      return materia;
    },
    actualizarMateria: async (_, { id, codigo, nombre, creditos, descripcion, docenteId }, context) => {
      if (!context.user) throw new Error('No autenticado');
      if (![1, 2].includes(Number(context.user.rol_id))) throw new Error('No autorizado: se requiere rol ADMIN o DOCENTE');

      const materia = await Materia.update(id, { codigo, nombre, creditos, descripcion, docenteId });
      if (!materia) throw new Error('Materia no encontrada');

      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'ACTUALIZAR_MATERIA',
        entidad: 'materias',
        entidadId: materia.id,
        detalles: `Materia actualizada: ${materia.codigo} - ${materia.nombre}`,
        ipAddress: getIp(context)
      });

      return materia;
    },
    eliminarMateria: async (_, { id }, context) => {
      if (!context.user) throw new Error('No autenticado');
      if (Number(context.user.rol_id) !== 1) throw new Error('No autorizado: se requiere rol ADMIN');

      const eliminada = await Materia.remove(id);
      if (!eliminada) throw new Error('Materia no encontrada');

      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'ELIMINAR_MATERIA',
        entidad: 'materias',
        entidadId: Number(id),
        detalles: `Materia eliminada: ${eliminada.codigo} - ${eliminada.nombre}`,
        ipAddress: getIp(context)
      });

      return true;
    },
    // <<<CA-016<<<
    // >>>CA-017>>> Mutations de Inscripciones
    inscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');

      const estudiante = await Usuario.findById(estudianteId);
      if (!estudiante) throw new Error('Estudiante no encontrado');
      const materia = await Materia.findById(materiaId);
      if (!materia) throw new Error('Materia no encontrada');

      const yaInscrito = await Inscripcion.exists(estudianteId, materiaId);
      if (yaInscrito) throw new Error('El estudiante ya está inscrito en esta materia');

      const inscripcion = await Inscripcion.inscribir(estudianteId, materiaId);

      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'INSCRIBIR',
        entidad: 'inscripciones',
        entidadId: inscripcion.id,
        detalles: `Inscripción: estudiante ${estudiante.email} en materia ${materia.codigo}`,
        ipAddress: getIp(context)
      });

      return inscripcion;
    },
    desinscribir: async (_, { estudianteId, materiaId }, context) => {
      if (!context.user) throw new Error('No autenticado');

      const eliminada = await Inscripcion.desinscribir(estudianteId, materiaId);
      if (!eliminada) throw new Error('El estudiante no está inscrito en esta materia');

      await Auditoria.registrar({
        usuarioId: context.user.id,
        accion: 'DESINSCRIBIR',
        entidad: 'inscripciones',
        entidadId: eliminada.id,
        detalles: `Desinscripción: estudiante ${estudianteId} de materia ${materiaId}`,
        ipAddress: getIp(context)
      });

      return true;
    },
    // <<<CA-017<<<
  },
};

module.exports = { resolvers };
