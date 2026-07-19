const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --no-install salta la instalación automática de dependencias
const SKIP_INSTALL = process.argv.includes('--no-install');

// ============================================================
// FÁBRICA DE SOFTWARE ACADÉMICO — Generador de Productos v2
// Genera un ESQUELETO LIVIANO que consume las librerías
// @fabrica/* desde GitHub (no las copia localmente).
// ============================================================

// 1. Cargar Configuración de la Fábrica
const configPath = path.join(__dirname, 'factory-config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error("❌ Error: No se encontró factory-config.json. ¿Estás en la raíz de la fábrica?");
    process.exit(1);
}

// 2. Obtener el nombre del proyecto
const nameArg = process.argv.slice(2).find(a => !a.startsWith('--'));
const projectName = nameArg || config.configuracion_nuevo_proyecto.nombre_default;
const targetDir = path.join(__dirname, '..', projectName);

console.log(`\n🏭 FÁBRICA DE SOFTWARE — Ensamblaje de Producto Liviano: ${projectName}`);
console.log(`${'='.repeat(60)}`);

// Utilidades
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (/node_modules|\.git|\.angular|[\\/]dist([\\/]|$)/.test(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(child => {
            copyRecursiveSync(path.join(src, child), path.join(dest, child));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function removeFromFile(filePath, regex, replacement = '') {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
    }
}

try {
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Error: El directorio ${targetDir} ya existe. Elige otro nombre.`);
        process.exit(1);
    }

    // Override de assets opcionales desde la Consola de la Fábrica (GUI).
    // Se pasa por env FABRICA_OPCIONALES (JSON: {"CA-012_...": true, ...})
    // para elegir qué llevar SIN mutar el factory-config.json del repo.
    if (process.env.FABRICA_OPCIONALES) {
        try {
            const override = JSON.parse(process.env.FABRICA_OPCIONALES);
            const ca = config.configuracion_nuevo_proyecto.core_assets;
            if (ca.opcionales) Object.assign(ca.opcionales, override);
            else Object.assign(ca, override);
        } catch (e) {
            console.error('⚠️  FABRICA_OPCIONALES no es JSON válido, se ignora:', e.message);
        }
    }

    // core_assets soporta formato anidado {obligatorios, opcionales} o plano (legacy)
    const rawAssets = config.configuracion_nuevo_proyecto.core_assets || {};
    const assets = (rawAssets.obligatorios || rawAssets.opcionales)
      ? { ...(rawAssets.obligatorios || {}), ...(rawAssets.opcionales || {}) }
      : rawAssets;
    const materiasOn = assets['CA-016_ModuloMaterias'] !== false;
    const inscripcionesOn = materiasOn && assets['CA-017_ModuloInscripciones'] !== false;
    const calificacionesOn = materiasOn && assets['CA-019_ModuloCalificaciones'] !== false;
    const auditoriaOn = assets['CA-012_ModeloAuditoria'] !== false;
    const registroOn = assets['CA-007_RegistroAbierto'] !== false;

    // =========================================================
    // PASO 1: Copiar backend y frontend (sin packages/)
    // =========================================================
    console.log(`\n📁 1. Generando esqueleto del producto...`);
    fs.mkdirSync(targetDir);

    const destFrontend = path.join(targetDir, 'frontend');
    const destBackend = path.join(targetDir, 'backend');

    // Copiar backend y frontend (código del producto, SIN librerías)
    copyRecursiveSync(path.join(__dirname, 'backend'), destBackend);
    copyRecursiveSync(path.join(__dirname, 'frontend'), destFrontend);
    // El backend de referencia del propio repo lleva su factory-config.json
    // (necesario solo para el contexto de build de SU Dockerfile). En un
    // producto derivado esa copia queda obsoleta y, peor, cargarConfig()
    // la encuentra ANTES que la del producto (busca hacia arriba desde
    // backend/), leyendo toggles incorrectos. Se elimina siempre aquí; el
    // paso 5 escribe la config correcta en la raíz del producto.
    const staleBackendConfig = path.join(destBackend, 'factory-config.json');
    if (fs.existsSync(staleBackendConfig)) fs.unlinkSync(staleBackendConfig);
    console.log(`  ✅ Backend y frontend copiados (sin librerías @fabrica/*)`);

    // =========================================================
    // PASO 2: Generar package.json con deps de GitHub
    // =========================================================
    console.log(`\n📦 2. Configurando dependencias desde GitHub...`);

    const GITHUB_REPO = 'JostinQuilca/FabricaProyecto';

    // package.json raíz — NO usa workspaces, las libs vienen de GitHub.
    // `npm start` hace TODO: crea BD+tablas, crea admin y levanta backend+frontend.
    const rootPkg = {
        name: projectName.toLowerCase(),
        version: '1.0.0',
        private: true,
        description: `Producto derivado de la Fábrica de Software Académico: ${projectName}`,
        scripts: {
            'install:all': 'cd backend && npm install && cd ../frontend && npm install',
            'setup': 'node scripts/setup_db.js && node scripts/seed_admin.js',
            'dev:backend': 'cd backend && npm run dev',
            'start:frontend': 'cd frontend && npm start',
            'start': 'npm run setup && concurrently -n backend,frontend -c blue,green "cd backend && npm run dev" "cd frontend && npm start"'
        },
        devDependencies: {
            'concurrently': '^9.1.0'
        }
    };
    fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(rootPkg, null, 2));

    // package.json del backend — libs de GitHub
    const backendPkg = JSON.parse(fs.readFileSync(path.join(destBackend, 'package.json'), 'utf8'));
    backendPkg.name = projectName.toLowerCase() + '-backend';
    backendPkg.description = `Backend del producto ${projectName}`;

    // Reemplazar dependencias locales por dependencias de GitHub
    backendPkg.dependencies['@fabrica/node-core'] = `github:${GITHUB_REPO}#pkg/node-core`;
    if (materiasOn) {
        backendPkg.dependencies['@fabrica/academico'] = `github:${GITHUB_REPO}#pkg/academico`;
    } else {
        delete backendPkg.dependencies['@fabrica/academico'];
    }

    // Agregar script de setup de BD
    backendPkg.scripts['db:setup'] = 'node ../scripts/setup_db.js';

    // Eliminar package-lock.json viejo
    const oldLock = path.join(destBackend, 'package-lock.json');
    if (fs.existsSync(oldLock)) fs.unlinkSync(oldLock);

    fs.writeFileSync(path.join(destBackend, 'package.json'), JSON.stringify(backendPkg, null, 2));
    console.log(`  ✅ @fabrica/node-core → github:${GITHUB_REPO}#pkg/node-core`);
    if (materiasOn) console.log(`  ✅ @fabrica/academico → github:${GITHUB_REPO}#pkg/academico`);
    else console.log(`  ➖ @fabrica/academico omitido (CA-016 desactivado)`);

    // Eliminar package-lock.json del frontend
    const oldFeLock = path.join(destFrontend, 'package-lock.json');
    if (fs.existsSync(oldFeLock)) fs.unlinkSync(oldFeLock);

    // =========================================================
    // PASO 3: Aplicar variabilidad (feature toggles)
    // =========================================================
    console.log(`\n🎛️  3. Aplicando variabilidad (feature toggles)...`);

    const obligatorios = [
        'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
        'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
        'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware',
        'CA-013_ConfiguracionBD'
    ];
    for (const ca of obligatorios) {
        if (assets[ca] === false) {
            console.log(`  ⚠️  [${ca}] es OBLIGATORIO (commonality); se mantiene.`);
        }
    }

    const estado = (on) => on ? '✅ activo' : '✂️  inactivo';
    console.log(`  Backend · CA-012 Auditoría:     ${estado(auditoriaOn)}`);
    console.log(`  Backend · CA-016 Materias:      ${estado(materiasOn)}`);
    console.log(`  Backend · CA-017 Inscripciones: ${estado(inscripcionesOn)}`);
    console.log(`  Backend · CA-019 Calificaciones:${estado(calificacionesOn)}`);
    console.log(`  Frontend · CA-007 Registro:     ${estado(registroOn)}`);

    // --- FRONTEND: poda estática ---
    const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');

    if (!registroOn) {
        console.log(`  ➔ ✂️  Frontend: podando [CA-007_RegistroAbierto]`);
        const registroPath = path.join(destFrontend, 'src', 'app', 'pages', 'registro');
        if (fs.existsSync(registroPath)) fs.rmSync(registroPath, { recursive: true, force: true });
        removeFromFile(routesPath, /,\r?\n\s*{\r?\n\s*path: 'registro',[\s\S]*?}/g);
    }

    function podarFrontendModulo(ca, opts) {
        console.log(`  ➔ ✂️  Frontend: podando [${ca}]`);
        const page = path.join(destFrontend, 'src', 'app', 'pages', opts.page);
        if (fs.existsSync(page)) fs.rmSync(page, { recursive: true, force: true });
        const service = path.join(destFrontend, 'src', 'app', 'services', opts.service);
        if (fs.existsSync(service)) fs.unlinkSync(service);
        removeFromFile(routesPath, opts.routeRegex);
    }

    if (!auditoriaOn) {
        console.log(`  ➔ ✂️  Frontend: podando [CA-012_ModeloAuditoria]`);
        const auditPage = path.join(destFrontend, 'src', 'app', 'pages', 'auditoria');
        if (fs.existsSync(auditPage)) fs.rmSync(auditPage, { recursive: true, force: true });
        removeFromFile(routesPath, /,?\r?\n\s*\/\/ Sprint 2 · CA-012 Auditoría\r?\n\s*{\r?\n[\s\S]*?canActivate: \[authGuard\]\r?\n\s*}/g);
        // Quitar el acceso rápido a auditoría del panel admin
        const adminHtml = path.join(destFrontend, 'src', 'app', 'pages', 'admin', 'admin.component.html');
        removeFromFile(adminHtml, /\s*<a routerLink="\/auditoria"[\s\S]*?<\/a>/g);
    }
    if (!calificacionesOn) {
        podarFrontendModulo('CA-019_ModuloCalificaciones', {
            page: 'calificaciones',
            service: 'calificacion.service.ts',
            routeRegex: /,\r?\n\s*\/\/ Sprint 2 · CA-019 Calificaciones\r?\n\s*{\r?\n[\s\S]*?canActivate: \[authGuard\]\r?\n\s*}/g
        });
    }
    if (!inscripcionesOn) {
        podarFrontendModulo('CA-017_ModuloInscripciones', {
            page: 'inscripciones',
            service: 'inscripcion.service.ts',
            routeRegex: /,\r?\n\s*\/\/ Sprint 2 · CA-017 Inscripciones\r?\n\s*{\r?\n[\s\S]*?canActivate: \[authGuard\]\r?\n\s*}/g
        });
    }
    if (!materiasOn) {
        podarFrontendModulo('CA-016_ModuloMaterias', {
            page: 'materias',
            service: 'materia.service.ts',
            routeRegex: /,\r?\n\s*\/\/ Sprint 2 · CA-016 Materias\r?\n\s*{\r?\n[\s\S]*?canActivate: \[authGuard\]\r?\n\s*}/g
        });
    }

    // =========================================================
    // PASO 4: Generar script inteligente de BD
    // =========================================================
    console.log(`\n🗄️  4. Generando script de setup de BD inteligente...`);

    const scriptsDir = path.join(targetDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });

    const setupDbScript = `// ============================================================
// SETUP DE BASE DE DATOS — Producto: ${projectName}
// El DDL de cada Core Asset viaja dentro de su librería @fabrica/*.
// Crea la database (si no existe) y las tablas de los assets activos.
// Uso: node scripts/setup_db.js   (también corre solo al arrancar
// el backend si CA-018_SetupBD_Automatico está activo)
// ============================================================
const path = require('path');
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const {
  createDbClient, ensureDatabase, ensureBaseTables, ensureAuditoriaTable,
  crearFeatureToggles, cargarConfig
} = require('@fabrica/node-core');

(async () => {
  try {
    const features = crearFeatureToggles(cargarConfig(path.join(__dirname, '..')));

    console.log('Verificando base de datos...');
    await ensureDatabase(process.env);

    const client = createDbClient(process.env);
    await client.connect();
    console.log('✅ Conectado a "' + process.env.DB_NAME + '"\\n');

    await ensureBaseTables(client);

    if (features.isEnabled('CA-012_ModeloAuditoria')) {
      await ensureAuditoriaTable(client);
    } else {
      console.log('  ➖ CA-012: Auditoría desactivada, tabla omitida');
    }

    if (features.isEnabled('CA-016_ModuloMaterias')) {
      const { ensureMateriasTable, ensureInscripcionesTable } = require('@fabrica/academico');
      await ensureMateriasTable(client);
      if (features.isEnabled('CA-017_ModuloInscripciones')) {
        await ensureInscripcionesTable(client);
      } else {
        console.log('  ➖ CA-017: Inscripciones desactivada, tabla omitida');
      }
    } else {
      console.log('  ➖ CA-016/CA-017: módulo académico desactivado, tablas omitidas');
    }

    const tables = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('\\n📊 Tablas en la BD:');
    tables.rows.forEach(r => console.log('   • ' + r.tablename));
    console.log('\\n🎉 ¡Setup de BD completado para ${projectName}!');
    await client.end();
  } catch (error) {
    console.error('❌ Error en setup de BD:', error.message);
    process.exit(1);
  }
})();
`;

    fs.writeFileSync(path.join(scriptsDir, 'setup_db.js'), setupDbScript);
    console.log(`  ✅ scripts/setup_db.js generado (el DDL vive en las librerías @fabrica/*)`);

    // =========================================================
    // PASO 5: Generar factory-config.json y .env
    // =========================================================
    console.log(`\n⚙️  5. Generando configuración...`);

    fs.writeFileSync(path.join(targetDir, 'factory-config.json'), JSON.stringify(config, null, 2));

    // .env: si hay config de BD local en la fábrica, se usa (dev listo de una);
    // si no, se deja la plantilla remota para producción.
    const entorno = config.configuracion_nuevo_proyecto.entorno;
    const local = entorno.db_local;
    const envContent = local
      ? `# Configuración LOCAL (generada desde factory-config.entorno.db_local)
DB_HOST=${local.host}
DB_PORT=${local.port}
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=${local.user}
DB_PASSWORD=${local.password}
JWT_SECRET=secreto_${projectName.toLowerCase()}_${Date.now()}
PORT=${entorno.puerto_backend}
DB_SSL=${local.ssl ? 'true' : 'false'}
`
      : `DB_HOST=${entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=tu_usuario
DB_PASSWORD=tu_password
JWT_SECRET=cambia_este_secreto_${Date.now()}
PORT=${entorno.puerto_backend}
DB_SSL=true
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);

    // Sincronizar el environment.ts del frontend con el puerto del backend,
    // para que el producto quede consistente sin importar el valor que tenga
    // la copia de referencia de la fábrica.
    const envTsPath = path.join(destFrontend, 'src', 'environments', 'environment.ts');
    if (fs.existsSync(envTsPath)) {
        removeFromFile(envTsPath, /apiUrl:\s*'http:\/\/localhost:\d+'/g, `apiUrl: 'http://localhost:${entorno.puerto_backend}'`);
    }

    // seed_admin.js — crea un usuario ADMIN listo para iniciar sesión.
    const seedAdminScript = `// ============================================================
// SEED ADMIN — Producto: ${projectName}
// Crea un usuario ADMIN para poder iniciar sesión de inmediato.
// Uso: node scripts/seed_admin.js  [email] [password]
// ============================================================
const path = require('path');
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const bcrypt = require('bcryptjs');
const { createDbClient } = require('@fabrica/node-core');

const email = process.argv[2] || 'admin@admin.edu';
const password = process.argv[3] || 'admin123';

(async () => {
  const client = createDbClient(process.env);
  try {
    await client.connect();
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      \`INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password\`,
      ['Administrador', email, hash]
    );
    console.log('✅ Admin listo:');
    console.log('   Email:    ' + email);
    console.log('   Password: ' + password);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('   ¿Corriste antes el backend o node scripts/setup_db.js para crear las tablas?');
    process.exit(1);
  } finally {
    await client.end();
  }
})();
`;
    fs.writeFileSync(path.join(scriptsDir, 'seed_admin.js'), seedAdminScript);
    console.log(`  ✅ factory-config.json, .env y scripts/seed_admin.js generados`);

    // =========================================================
    // PASO 6: Generar README del producto
    // =========================================================
    const readmeContent = `# ${projectName}

Producto derivado de la **Fábrica de Software Académico** (SPLE).

## Core Assets activos

| Core Asset | Estado |
|-----------|--------|
| CA-012 Auditoría | ${auditoriaOn ? '✅' : '❌'} |
| CA-016 Materias | ${materiasOn ? '✅' : '❌'} |
| CA-017 Inscripciones | ${inscripcionesOn ? '✅' : '❌'} |
| CA-007 Registro | ${registroOn ? '✅' : '❌'} |

## Inicio rápido — UN solo comando

Las dependencias ya se instalaron al generar el producto. Solo necesitas que tu
PostgreSQL esté corriendo (si usas Docker: \`docker start fabrica-pg\`).

\`\`\`powershell
npm start
\`\`\`

Eso hace TODO: crea la base de datos y las tablas, crea el admin y levanta
backend + frontend a la vez.

- **App:** http://localhost:4200
- **Login:** \`admin@admin.edu\` / \`admin123\`

## Añadir un módulo después (auditoría, materias, inscripciones)

\`\`\`powershell
cd ${projectName}
node scripts/add-feature.js auditoria    # trae el frontend de GitHub + activa el toggle
# reinicia el backend: la tabla del módulo se crea sola al arrancar
\`\`\`

## Librerías @fabrica/* (instaladas desde GitHub)

- \`@fabrica/node-core\` — BD, JWT, Auditoría, Feature Toggles, setup de BD
${materiasOn ? '- `@fabrica/academico` — Materias + Inscripciones' : ''}
`;
    fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

    // =========================================================
    // RESUMEN
    // =========================================================
    console.log(`\n🎉 ¡PRODUCTO ENSAMBLADO CON ÉXITO!`);
    console.log(`${'='.repeat(60)}`);
    // Copiar script de CLI add-feature.js
    const addFeatureTemplatePath = path.join(__dirname, 'add-feature-template.js');
    if (fs.existsSync(addFeatureTemplatePath)) {
        console.log('📦 Copiando herramienta CLI (add-feature.js)...');
        fs.copyFileSync(addFeatureTemplatePath, path.join(scriptsDir, 'add-feature.js'));
    }

    // =========================================================
    // PASO 7: Instalar dependencias automáticamente
    // =========================================================
    if (SKIP_INSTALL) {
        console.log(`\n⏭️  Instalación omitida (--no-install).`);
    } else {
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const steps = [
            ['raíz (concurrently)', targetDir],
            ['backend (+ librerías @fabrica/* de GitHub)', destBackend],
            ['frontend (Angular)', destFrontend],
        ];
        for (const [label, dir] of steps) {
            console.log(`\n📥 Instalando dependencias: ${label}...`);
            try {
                execSync(`${npm} install --no-audit --no-fund`, { cwd: dir, stdio: 'inherit' });
            } catch (e) {
                console.error(`  ⚠️  Falló la instalación en ${dir}. Podrás correrla a mano con "npm install".`);
            }
        }
        console.log(`\n✅ Dependencias instaladas.`);
    }

    console.log(`\n🎉 ¡Producto generado en ${targetDir}!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n▶️  PARA CORRER EL PRODUCTO (solo 1 comando):`);
    console.log(`\n   cd ../${projectName}`);
    console.log(`   npm start`);
    console.log(`\n   (crea la BD + tablas, crea el admin y levanta backend + frontend)`);
    console.log(`\n   Requisito: tu PostgreSQL debe estar corriendo.`);
    console.log(`   Login:  admin@admin.edu  /  admin123   ·   App: http://localhost:4200`);
    console.log(`\n   Añadir un módulo después:  node scripts/add-feature.js auditoria\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}
