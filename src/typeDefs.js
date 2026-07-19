// CA-016 + CA-017 · SDL del dominio académico.
// Usa `extend type` para componerse con el esquema base del producto.
const academicoTypeDefs = `#graphql
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

  type Inscripcion {
    id: ID!
    estudiante: Usuario!
    materia: Materia!
    estado: String!
    fechaInscripcion: String!
  }

  extend type Query {
    materias: [Materia!]!
    materia(id: ID!): Materia
    inscripciones: [Inscripcion!]!
    inscripcionesByEstudiante(estudianteId: ID!): [Inscripcion!]!
    inscripcionesByMateria(materiaId: ID!): [Inscripcion!]!
  }

  extend type Mutation {
    crearMateria(codigo: String!, nombre: String!, creditos: Int!, descripcion: String, docenteId: ID): Materia!
    actualizarMateria(id: ID!, codigo: String, nombre: String, creditos: Int, descripcion: String, docenteId: ID): Materia!
    eliminarMateria(id: ID!): Boolean!
    inscribir(estudianteId: ID!, materiaId: ID!): Inscripcion!
    desinscribir(estudianteId: ID!, materiaId: ID!): Boolean!
  }
`;

module.exports = { academicoTypeDefs };
