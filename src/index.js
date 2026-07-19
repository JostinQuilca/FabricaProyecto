// ============================================================
// @fabrica/node-core · Punto de entrada
// Core Assets de backend reutilizables por los productos derivados
// de la Línea de Productos de Software (composición por librerías).
// ============================================================
const { createDbClient, connect } = require('./db');
const { verifyToken, getIp } = require('./auth');
const { createAuditoriaModule, createAuditoriaModel, noopAuditoria } = require('./auditoria');
const { composeModules, mergeResolvers } = require('./compose');
const { crearFeatureToggles, cargarConfig } = require('./feature-toggles');
const { ensureDatabase, ensureBaseTables, ensureAuditoriaTable } = require('./db-schema');
const { createUsuarioModel, createRoleModel, baseTypeDefs, buildBaseResolvers } = require('./auth-base');
const { FEATURES_CATALOG, installAsset, catalogoConEstado, leerAssets } = require('./installer');

module.exports = {
  // Instalador de Core Assets (CLI y GUI comparten esta lógica)
  FEATURES_CATALOG,
  installAsset,
  catalogoConEstado,
  leerAssets,
  // CA-013 · Base de datos
  createDbClient,
  connect,
  // Auth base (CA-002/009/010/011): modelos, esquema y resolvers de login
  createUsuarioModel,
  createRoleModel,
  baseTypeDefs,
  buildBaseResolvers,
  // CA-018 · Setup automático de BD (DDL como parte del asset)
  ensureDatabase,
  ensureBaseTables,
  ensureAuditoriaTable,
  // CA-011 · JWT
  verifyToken,
  getIp,
  // CA-012 · Auditoría (módulo componible)
  createAuditoriaModule,
  createAuditoriaModel,
  noopAuditoria,
  // Composición de módulos GraphQL
  composeModules,
  mergeResolvers,
  // Variabilidad (feature toggles)
  crearFeatureToggles,
  cargarConfig,
};
