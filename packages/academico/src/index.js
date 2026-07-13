// ============================================================
// @fabrica/academico · Punto de entrada
// Core Assets del dominio académico (Sprint 2).
//   CA-016 Materias  ·  CA-017 Inscripciones
//
// Los modelos, typeDefs y resolvers viven en backend/src y se
// componen en el servidor GraphQL. Este índice documenta el
// contrato del paquete y sus dependencias declarativas.
// ============================================================
module.exports = {
  coreAssets: {
    'CA-016_ModuloMaterias': {
      modelo: 'models/Materia.js',
      typeDefs: 'schema/typeDefs.js#Materia',
      resolvers: 'resolvers/index.js#Materia',
      tabla: 'materias'
    },
    'CA-017_ModuloInscripciones': {
      modelo: 'models/Inscripcion.js',
      typeDefs: 'schema/typeDefs.js#Inscripcion',
      resolvers: 'resolvers/index.js#Inscripcion',
      tabla: 'inscripciones',
      dependeDe: ['CA-016_ModuloMaterias']
    }
  }
};
