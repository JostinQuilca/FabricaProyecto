const fs = require('fs');
const path = require('path');

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
const projectName = process.argv[2] || config.configuracion_nuevo_proyecto.nombre_default;
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

    const assets = config.configuracion_nuevo_proyecto.core_assets;
    const materiasOn = assets['CA-016_ModuloMaterias'] !== false;
    const inscripcionesOn = materiasOn && assets['CA-017_ModuloInscripciones'] !== false;
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
    console.log(`  ✅ Backend y frontend copiados (sin librerías @fabrica/*)`);

    // =========================================================
    // PASO 2: Generar package.json con deps de GitHub
    // =========================================================
    console.log(`\n📦 2. Configurando dependencias desde GitHub...`);

    const GITHUB_REPO = 'alexlunamayo2002-netizen/fabrica-software-academico';

    // package.json raíz — NO usa workspaces, las libs vienen de GitHub
    const rootPkg = {
        name: projectName.toLowerCase(),
        version: '1.0.0',
        private: true,
        description: `Producto derivado de la Fábrica de Software Académico: ${projectName}`,
        scripts: {
            'install:all': 'cd backend && npm install && cd ../frontend && npm install',
            'dev:backend': 'cd backend && npm run dev',
            'start:frontend': 'cd frontend && npm start',
            'db:setup': 'node scripts/setup_db.js'
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
// Crea SOLO las tablas de los Core Assets activos.
// Uso: node scripts/setup_db.js
// ============================================================
const path = require('path');
const fs = require('fs');
// Resolver módulos desde backend/node_modules
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Cargar feature toggles
const configPath = path.join(__dirname, '..', 'factory-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const assets = config.configuracion_nuevo_proyecto.core_assets;

function isEnabled(assetId) {
    const OBLIGATORIOS = [
        'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
        'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
        'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware',
        'CA-013_ConfiguracionBD'
    ];
    if (OBLIGATORIOS.includes(assetId)) return true;
    return assets[assetId] === true;
}

const useSsl = String(process.env.DB_SSL).toLowerCase() !== 'false';
const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

async function setup() {
    try {
        console.log('Conectando a la base de datos...');
        await client.connect();
        console.log('✅ Conexión exitosa\\n');

        // ── TABLAS OBLIGATORIAS (Commonalities) ──────────────────
        console.log('📋 Creando tablas obligatorias...');

        await client.query(\`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(50) UNIQUE NOT NULL
            );
            INSERT INTO roles (nombre)
            VALUES ('ADMIN'), ('DOCENTE'), ('ESTUDIANTE')
            ON CONFLICT (nombre) DO NOTHING;
        \`);
        console.log('  ✅ Tabla roles + datos iniciales');

        await client.query(\`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol_id INTEGER NOT NULL REFERENCES roles(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        \`);
        console.log('  ✅ Tabla usuarios');

        // ── TABLAS OPCIONALES (según Feature Toggles) ────────────
        console.log('\\n🎛️  Verificando Core Assets opcionales...');

        if (isEnabled('CA-012_ModeloAuditoria')) {
            await client.query(\`
                CREATE TABLE IF NOT EXISTS auditoria (
                    id SERIAL PRIMARY KEY,
                    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    accion VARCHAR(255) NOT NULL,
                    entidad VARCHAR(100),
                    entidad_id INTEGER,
                    detalles TEXT,
                    ip_address VARCHAR(45),
                    fecha_hora TIMESTAMP NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
                CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON auditoria(fecha_hora);
                CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad);
            \`);
            console.log('  ✅ CA-012: Tabla auditoria creada');
        } else {
            console.log('  ➖ CA-012: Auditoría desactivada, tabla omitida');
        }

        if (isEnabled('CA-016_ModuloMaterias')) {
            await client.query(\`
                CREATE TABLE IF NOT EXISTS materias (
                    id SERIAL PRIMARY KEY,
                    codigo VARCHAR(20) UNIQUE NOT NULL,
                    nombre VARCHAR(150) NOT NULL,
                    creditos INTEGER NOT NULL DEFAULT 0 CHECK (creditos >= 0),
                    descripcion TEXT,
                    docente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_materias_codigo ON materias(codigo);
                CREATE INDEX IF NOT EXISTS idx_materias_docente ON materias(docente_id);

                INSERT INTO materias (codigo, nombre, creditos, descripcion)
                VALUES
                    ('MAT-101', 'Cálculo Diferencial', 4, 'Fundamentos de límites, derivadas y aplicaciones.'),
                    ('INF-201', 'Estructuras de Datos', 5, 'Listas, pilas, colas, árboles y grafos.'),
                    ('SW-301',  'Ingeniería de Software', 4, 'Líneas de producto de software y fábricas de software.')
                ON CONFLICT (codigo) DO NOTHING;
            \`);
            console.log('  ✅ CA-016: Tabla materias creada + datos de ejemplo');
        } else {
            console.log('  ➖ CA-016: Materias desactivada, tabla omitida');
        }

        if (isEnabled('CA-016_ModuloMaterias') && isEnabled('CA-017_ModuloInscripciones')) {
            await client.query(\`
                CREATE TABLE IF NOT EXISTS inscripciones (
                    id SERIAL PRIMARY KEY,
                    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                    materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
                    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
                    fecha_inscripcion TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE (estudiante_id, materia_id)
                );
                CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante ON inscripciones(estudiante_id);
                CREATE INDEX IF NOT EXISTS idx_inscripciones_materia ON inscripciones(materia_id);
            \`);
            console.log('  ✅ CA-017: Tabla inscripciones creada');
        } else {
            console.log('  ➖ CA-017: Inscripciones desactivada, tabla omitida');
        }

        // ── Resumen ──────────────────────────────────────────────
        const tables = await client.query(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        );
        console.log('\\n📊 Tablas creadas en la BD:');
        tables.rows.forEach(r => console.log('   • ' + r.tablename));
        console.log('\\n🎉 ¡Setup de BD completado para ${projectName}!');

    } catch (error) {
        console.error('❌ Error en setup de BD:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setup();
`;

    fs.writeFileSync(path.join(scriptsDir, 'setup_db.js'), setupDbScript);
    console.log(`  ✅ scripts/setup_db.js generado (crea tablas según toggles)`);

    // =========================================================
    // PASO 5: Generar factory-config.json y .env
    // =========================================================
    console.log(`\n⚙️  5. Generando configuración...`);

    fs.writeFileSync(path.join(targetDir, 'factory-config.json'), JSON.stringify(config, null, 2));

    const envContent = `DB_HOST=${config.configuracion_nuevo_proyecto.entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=tu_usuario
DB_PASSWORD=tu_password
JWT_SECRET=cambia_este_secreto_${Date.now()}
PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}
DB_SSL=true
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);
    console.log(`  ✅ factory-config.json y .env generados`);

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

## Inicio rápido

\`\`\`bash
# 1. Instalar dependencias (baja librerías @fabrica/* de GitHub)
cd backend && npm install
cd ../frontend && npm install

# 2. Configurar BD (editar backend/.env con tus credenciales)

# 3. Crear tablas según los core assets activos
node scripts/setup_db.js

# 4. Arrancar backend
cd backend && npm run dev

# 5. Arrancar frontend (otra terminal)
cd frontend && npm start
\`\`\`

## Librerías @fabrica/* (instaladas desde GitHub)

- \`@fabrica/node-core\` — BD, JWT, Auditoría, Feature Toggles
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

    console.log(`\n🎉 ¡Producto generado exitosamente en ${targetDir}!`);
    console.log(`📦 Librerías: se instalan desde GitHub (no copiadas)`);
    console.log(`🗄️  BD: ejecutar 'node scripts/setup_db.js' para crear tablas`);
    console.log(`\nSiguientes pasos:`);
    console.log(`1. cd ../${projectName}`);
    console.log(`2. cd backend && npm install     # baja @fabrica/* de GitHub`);
    console.log(`3. Configura backend/.env con tus credenciales de BD`);
    console.log(`4. node scripts/setup_db.js      # crea tablas según toggles`);
    console.log(`5. npm run dev                   # arranca el backend`);
    console.log(`6. cd ../frontend && npm install && npm start`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}
