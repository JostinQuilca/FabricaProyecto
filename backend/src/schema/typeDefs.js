const typeDefs = `#graphql
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

  # >>>CA-016>>> Módulo de Materias (Sprint 2 · HU-S2.1)
  type Materia {
    id: ID!
    codigo: String!
    nombre: String!
    creditos: Int!
    descripcion: String
    docente: Usuario
    createdAt: String!
    updatedAt: String!
  }
  # <<<CA-016<<<

  # >>>CA-017>>> Módulo de Inscripciones (Sprint 2 · HU-S2.3)
  type Inscripcion {
    id: ID!
    estudiante: Usuario!
    materia: Materia!
    estado: String!
    fechaInscripcion: String!
  }
  # <<<CA-017<<<

  type Query {
    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario
    roles: [Role!]!
    me: Usuario
    auditoria(limit: Int, offset: Int): [Auditoria!]!
    auditoriaByUsuario(usuarioId: ID!, limit: Int): [Auditoria!]!
    auditoriaByAccion(accion: String!, limit: Int): [Auditoria!]!
    # >>>CA-016>>> Queries de Materias
    materias: [Materia!]!
    materia(id: ID!): Materia
    # <<<CA-016<<<
    # >>>CA-017>>> Queries de Inscripciones
    inscripciones: [Inscripcion!]!
    inscripcionesByEstudiante(estudianteId: ID!): [Inscripcion!]!
    inscripcionesByMateria(materiaId: ID!): [Inscripcion!]!
    # <<<CA-017<<<
  }

  type Mutation {
    registro(nombre: String!, email: String!, password: String!, rolId: ID!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    # >>>CA-016>>> Mutations de Materias (CRUD)
    crearMateria(codigo: String!, nombre: String!, creditos: Int!, descripcion: String, docenteId: ID): Materia!
    actualizarMateria(id: ID!, codigo: String, nombre: String, creditos: Int, descripcion: String, docenteId: ID): Materia!
    eliminarMateria(id: ID!): Boolean!
    # <<<CA-016<<<
    # >>>CA-017>>> Mutations de Inscripciones
    inscribir(estudianteId: ID!, materiaId: ID!): Inscripcion!
    desinscribir(estudianteId: ID!, materiaId: ID!): Boolean!
    # <<<CA-017<<<
  }
`;

module.exports = { typeDefs };
