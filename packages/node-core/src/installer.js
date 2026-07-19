// ============================================================
// @fabrica/node-core · Instalador de Core Assets (runtime)
// Lógica compartida entre el CLI (scripts/add-feature.js) y la
// Mutation GraphQL que permite instalar un asset desde una UI.
// Descarga el frontend del asset desde GitHub, activa su feature
// toggle e inyecta su ruta / tarjeta de acceso. La creación de la
// tabla en BD queda a cargo de quien invoque (ya tiene el client).
// ============================================================
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'JostinQuilca';
const REPO_NAME = 'FabricaProyecto';
const BRANCH = 'main';

/** Catálogo de Core Assets opcionales instalables después de generar el producto. */
const FEATURES_CATALOG = {
  auditoria: {
    id: 'auditoria',
    configKey: 'CA-012_ModeloAuditoria',
    nombre: 'Auditoría',
    descripcion: 'Registro de eventos del sistema (login, cambios, accesos).',
    frontendDirs: ['frontend/src/app/pages/auditoria'],
    frontendFiles: [],
    dependsOn: [],
    route: {
      comment: '// Sprint 2 · CA-012 Auditoría',
      path: 'auditoria',
      componentName: 'AuditoriaComponent',
      importPath: './pages/auditoria/auditoria.component'
    },
    adminCard: { icon: '🔍', label: 'Registro de auditoría', link: '/auditoria' }
  },
  materias: {
    id: 'materias',
    configKey: 'CA-016_ModuloMaterias',
    nombre: 'Materias',
    descripcion: 'Catálogo de materias/cursos con gestión CRUD.',
    backendDep: '@fabrica/academico',
    frontendDirs: ['frontend/src/app/pages/materias'],
    frontendFiles: [
      'frontend/src/app/services/materia.service.ts',
      'frontend/src/app/models/materia.model.ts'
    ],
    dependsOn: [],
    route: {
      comment: '// Sprint 2 · CA-016 Materias',
      path: 'materias',
      componentName: 'MateriasComponent',
      importPath: './pages/materias/materias.component'
    },
    adminCard: { icon: '📚', label: 'Gestionar materias', link: '/materias' }
  },
  inscripciones: {
    id: 'inscripciones',
    configKey: 'CA-017_ModuloInscripciones',
    nombre: 'Inscripciones',
    descripcion: 'Matrícula de estudiantes en materias.',
    backendDep: '@fabrica/academico',
    frontendDirs: ['frontend/src/app/pages/inscripciones'],
    frontendFiles: [
      'frontend/src/app/services/inscripcion.service.ts',
      'frontend/src/app/models/inscripcion.model.ts'
    ],
    dependsOn: ['materias'],
    route: {
      comment: '// Sprint 2 · CA-017 Inscripciones',
      path: 'inscripciones',
      componentName: 'InscripcionesComponent',
      importPath: './pages/inscripciones/inscripciones.component'
    },
    adminCard: { icon: '📝', label: 'Gestionar inscripciones', link: '/inscripciones' }
  },
  usuarios: {
    id: 'usuarios',
    configKey: 'CA-020_GestionUsuarios',
    nombre: 'Gestión de Usuarios',
    descripcion: 'Alta, edición y baja de usuarios con asignación de rol (ADMIN).',
    frontendDirs: ['frontend/src/app/pages/usuarios'],
    frontendFiles: ['frontend/src/app/services/usuario.service.ts'],
    dependsOn: [],
    route: {
      comment: '// Sprint 2 · CA-020 Gestión de Usuarios',
      path: 'usuarios',
      componentName: 'UsuariosComponent',
      importPath: './pages/usuarios/usuarios.component'
    },
    adminCard: { icon: '👥', label: 'Gestionar usuarios', link: '/usuarios' }
  },
  calificaciones: {
    id: 'calificaciones',
    configKey: 'CA-019_ModuloCalificaciones',
    nombre: 'Calificaciones',
    descripcion: 'Registro de notas de estudiantes por materia.',
    backendDep: '@fabrica/academico',
    frontendDirs: ['frontend/src/app/pages/calificaciones'],
    frontendFiles: [
      'frontend/src/app/services/calificacion.service.ts',
      'frontend/src/app/models/calificacion.model.ts'
    ],
    dependsOn: ['materias'],
    route: {
      comment: '// Sprint 2 · CA-019 Calificaciones',
      path: 'calificaciones',
      componentName: 'CalificacionesComponent',
      importPath: './pages/calificaciones/calificaciones.component'
    },
    adminCard: { icon: '🎯', label: 'Gestionar calificaciones', link: '/calificaciones' }
  }
};

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar ${url}: ${res.statusText}`);
  const text = await res.text();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
}

async function downloadRepoFile(repoPath, localDest) {
  await downloadFile(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${repoPath}`, localDest);
}

async function downloadDirectory(githubPath, localDest) {
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${githubPath}?ref=${BRANCH}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`No se pudo listar ${apiUrl}: ${res.statusText}`);
  const contents = await res.json();
  for (const item of contents) {
    const itemDest = path.join(localDest, item.name);
    if (item.type === 'file') await downloadFile(item.download_url, itemDest);
    else if (item.type === 'dir') await downloadDirectory(item.path, itemDest);
  }
}

/** Lee (sin escribir) el bloque core_assets, aplanado. Soporta anidado y plano. */
function leerAssets(config) {
  const ca = (config.configuracion_nuevo_proyecto || {}).core_assets || {};
  if (ca.obligatorios || ca.opcionales) return { ...(ca.obligatorios || {}), ...(ca.opcionales || {}) };
  return ca;
}

/** Activa un toggle en factory-config.json, respetando su formato (anidado o plano). */
function activarToggle(config, configKey) {
  const ca = config.configuracion_nuevo_proyecto.core_assets;
  if (ca.opcionales || ca.obligatorios) {
    ca.opcionales = ca.opcionales || {};
    ca.opcionales[configKey] = true;
  } else {
    ca[configKey] = true;
  }
}

function injectRoute(routesPath, route) {
  if (!fs.existsSync(routesPath)) return;
  let content = fs.readFileSync(routesPath, 'utf8');
  if (content.includes(`path: '${route.path}'`)) return;
  const wildcardIndex = content.lastIndexOf("{ path: '**'");
  if (wildcardIndex === -1) return;
  const newRoute = `${route.comment}\n  {\n    path: '${route.path}',\n    loadComponent: () => import('${route.importPath}').then(c => c.${route.componentName}),\n    canActivate: [authGuard]\n  },\n  `;
  content = content.slice(0, wildcardIndex) + newRoute + content.slice(wildcardIndex);
  fs.writeFileSync(routesPath, content);
}

function injectAdminCard(adminHtmlPath, card) {
  if (!fs.existsSync(adminHtmlPath)) return;
  let content = fs.readFileSync(adminHtmlPath, 'utf8');
  if (content.includes(`routerLink="${card.link}"`)) return;
  const marker = '<!-- add-feature:insert-here -->';
  if (!content.includes(marker)) return;
  const cardHtml = `<a routerLink="${card.link}" class="stat-card" style="text-decoration:none;">\n        <div class="value">${card.icon}</div>\n        <div class="label">${card.label}</div>\n      </a>\n      ${marker}`;
  fs.writeFileSync(adminHtmlPath, content.replace(marker, cardHtml));
}

function ensureBackendDep(backendPkgPath, depName) {
  if (!fs.existsSync(backendPkgPath)) return false;
  const pkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  if (pkg.dependencies[depName]) return false;
  const branch = depName === '@fabrica/academico' ? 'pkg/academico' : 'pkg/node-core';
  pkg.dependencies[depName] = `github:${REPO_OWNER}/${REPO_NAME}#${branch}`;
  fs.writeFileSync(backendPkgPath, JSON.stringify(pkg, null, 2));
  return true;
}

/**
 * Instala un Core Asset opcional en un producto ya generado:
 * activa su toggle, descarga su frontend desde GitHub, inyecta su
 * ruta y su tarjeta en el Panel de Administración.
 *
 * NO instala dependencias npm ni crea tablas: eso queda a cargo del
 * llamador (CLI hace npm install + setup_db; la mutation GraphQL usa
 * los módulos ya cargados en memoria del backend).
 *
 * @param {object} opts
 * @param {string} opts.productRoot - carpeta raíz del producto (donde vive factory-config.json)
 * @param {string} opts.assetId - clave del catálogo ('auditoria' | 'materias' | 'inscripciones')
 * @returns {Promise<{ ok: boolean, alreadyInstalled: boolean, needsNpmInstall: boolean, mensaje: string, instalados: string[] }>}
 */
async function installAsset({ productRoot, assetId }) {
  const feature = FEATURES_CATALOG[assetId];
  if (!feature) throw new Error(`Asset desconocido: ${assetId}`);

  const configPath = path.join(productRoot, 'factory-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const instalados = [];
  let needsNpmInstall = false;

  // Instalar dependencias primero (ej: inscripciones necesita materias)
  for (const dep of feature.dependsOn) {
    const sub = await installAsset({ productRoot, assetId: dep });
    instalados.push(...sub.instalados);
    needsNpmInstall = needsNpmInstall || sub.needsNpmInstall;
  }

  const yaActivo = leerAssets(config)[feature.configKey] === true;

  if (!yaActivo) {
    activarToggle(config, feature.configKey);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  if (feature.backendDep) {
    needsNpmInstall = ensureBackendDep(path.join(productRoot, 'backend', 'package.json'), feature.backendDep) || needsNpmInstall;
  }

  for (const dir of feature.frontendDirs) {
    const localDest = path.join(productRoot, ...dir.split('/'));
    if (!fs.existsSync(localDest)) await downloadDirectory(dir, localDest);
  }
  for (const file of feature.frontendFiles) {
    const localDest = path.join(productRoot, ...file.split('/'));
    if (!fs.existsSync(localDest)) await downloadRepoFile(file, localDest);
  }

  injectRoute(path.join(productRoot, 'frontend', 'src', 'app', 'app.routes.ts'), feature.route);
  if (feature.adminCard) {
    injectAdminCard(path.join(productRoot, 'frontend', 'src', 'app', 'pages', 'admin', 'admin.component.html'), feature.adminCard);
  }

  instalados.push(assetId);
  return {
    ok: true,
    alreadyInstalled: yaActivo,
    needsNpmInstall,
    mensaje: yaActivo ? `${feature.nombre} ya estaba activo` : `${feature.nombre} instalado`,
    instalados,
  };
}

/** Catálogo con estado activo/inactivo para exponer en una UI. */
function catalogoConEstado(config) {
  const assets = leerAssets(config);
  return Object.values(FEATURES_CATALOG).map(f => ({
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    activo: assets[f.configKey] === true,
  }));
}

module.exports = { FEATURES_CATALOG, installAsset, catalogoConEstado, leerAssets };
