// ============================================================
// @fabrica/node-core · Punto de entrada
// Re-exporta los Core Assets de backend reutilizables por los
// productos derivados de la Línea de Productos de Software.
// ============================================================
const { crearFeatureToggles, cargarConfig } = require('./feature-toggles');

module.exports = {
  // CA · Motor de variabilidad (HU-S2.7)
  crearFeatureToggles,
  cargarConfig,

  // Catálogo declarativo de Core Assets de backend expuestos por el paquete.
  // Los assets viven en el core (backend/src) y se consumen vía este índice;
  // los productos derivados los importan en lugar de clonar carpetas (HU-S2.7).
  coreAssets: {
    'CA-009_EsquemaGraphQLBase': 'schema/typeDefs.js',
    'CA-010_ResolversGraphQL': 'resolvers/index.js',
    'CA-011_JWTMiddleware': 'middleware/auth.js',
    'CA-012_ModeloAuditoria': 'models/Auditoria.js',
    'CA-013_ConfiguracionBD': 'config/database.js'
  }
};
