// ============================================================
// FÁBRICA DE SOFTWARE — CLI "add-feature" (se copia a scripts/
// de cada producto derivado).
//
// Uso:  node scripts/add-feature.js <modulo>
//   Módulos: auditoria · materias · inscripciones
//
// Delega toda la lógica en @fabrica/node-core (instalador compartido
// con la interfaz gráfica "Módulos de la Fábrica"): activa el toggle,
// descarga el frontend desde GitHub, inyecta ruta y tarjeta admin.
// Este script se encarga de lo que solo tiene sentido en CLI:
// instalar dependencias npm, crear las tablas y avisar del reinicio.
// ============================================================
const path = require('path');
const { execSync } = require('child_process');

// Resolver @fabrica/node-core y @fabrica/academico desde backend/node_modules
const ROOT = path.join(__dirname, '..');
module.paths.unshift(path.join(ROOT, 'backend', 'node_modules'));

const { installAsset, FEATURES_CATALOG, createDbClient, ensureAuditoriaTable } = require('@fabrica/node-core');

async function main() {
  const assetId = process.argv[2];
  if (!assetId || !FEATURES_CATALOG[assetId]) {
    console.log('Uso: node scripts/add-feature.js <modulo>');
    console.log(`Módulos disponibles: ${Object.keys(FEATURES_CATALOG).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📦 Instalando módulo: ${assetId.toUpperCase()}`);
  console.log('─'.repeat(50));

  const resultado = await installAsset({ productRoot: ROOT, assetId });
  console.log(`  ${resultado.alreadyInstalled ? '✔️ ' : '✅'} ${resultado.mensaje}`);

  if (resultado.needsNpmInstall) {
    console.log(`  📥 Instalando dependencias backend (npm install)...`);
    execSync('npm install --no-audit --no-fund', { stdio: 'inherit', cwd: path.join(ROOT, 'backend') });
  }

  console.log(`  🗄️  Preparando tablas en la base de datos...`);
  require('dotenv').config({ path: path.join(ROOT, 'backend', '.env') });
  const client = createDbClient(process.env);
  await client.connect();
  try {
    if (resultado.instalados.includes('auditoria')) {
      await ensureAuditoriaTable(client);
    }
    if (resultado.instalados.some(a => ['materias', 'inscripciones', 'calificaciones'].includes(a))) {
      const academico = require('@fabrica/academico');
      if (resultado.instalados.includes('materias')) await academico.ensureMateriasTable(client);
      if (resultado.instalados.includes('inscripciones')) await academico.ensureInscripcionesTable(client);
      if (resultado.instalados.includes('calificaciones')) await academico.ensureCalificacionesTable(client);
    }
  } finally {
    await client.end();
  }

  console.log(`\n🎉 ¡Módulo '${assetId}' instalado!`);
  console.log(`   Reinicia el backend (npm run dev) para cargar el módulo.`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
