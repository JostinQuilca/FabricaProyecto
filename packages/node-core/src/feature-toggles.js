// ============================================================
// @fabrica/node-core · Motor de Feature Toggles (Variabilidad)
// Sprint 2 · HU-S2.7
//
// Implementa el Punto de Variabilidad de la Línea de Productos:
// cada producto derivado activa/desactiva Core Assets mediante
// configuración (factory-config.json) en lugar de tocar código.
// ============================================================
const fs = require('fs');
const path = require('path');

/**
 * Carga la configuración de la fábrica desde factory-config.json.
 * Se busca hacia arriba desde el directorio actual hasta encontrarlo.
 */
function cargarConfig(startDir = process.cwd()) {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'factory-config.json');
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Crea un contenedor de feature toggles a partir de la configuración.
 * @param {object} [config] - configuración de la fábrica (opcional; si no
 *   se pasa, se carga desde factory-config.json).
 */
function crearFeatureToggles(config = cargarConfig()) {
  const assets = (config && config.configuracion_nuevo_proyecto &&
    config.configuracion_nuevo_proyecto.core_assets) || {};

  // Commonalities: siempre activos aunque no aparezcan en la config.
  const OBLIGATORIOS = new Set([
    'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
    'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
    'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware',
    'CA-013_ConfiguracionBD'
  ]);

  return {
    /** ¿Está habilitado un Core Asset en este producto? */
    isEnabled(assetId) {
      if (OBLIGATORIOS.has(assetId)) return true;
      return assets[assetId] === true;
    },
    /** Lista de Core Assets habilitados. */
    enabledAssets() {
      return Object.keys(assets).filter(a => this.isEnabled(a));
    },
    /** Ejecuta un callback solo si el asset está habilitado (composición segura). */
    withFeature(assetId, fn, fallback = undefined) {
      return this.isEnabled(assetId) ? fn() : fallback;
    }
  };
}

module.exports = { crearFeatureToggles, cargarConfig };
