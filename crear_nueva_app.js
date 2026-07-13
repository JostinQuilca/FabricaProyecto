const fs = require('fs');
const path = require('path');

// 1. Cargar Configuración de la Fábrica
const configPath = path.join(__dirname, 'factory-config.json');
let config;
try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.error("❌ Error: No se encontró factory-config.json. ¿Estás en la raíz de la fábrica?");
    process.exit(1);
}

// 2. Obtener el nombre del proyecto de los argumentos de consola
const projectName = process.argv[2] || config.configuracion_nuevo_proyecto.nombre_default;
const targetDir = path.join(__dirname, '..', projectName);

console.log(`\n🏭 INICIANDO ENSAMBLAJE DE LÍNEA DE PRODUCTO: ${projectName}`);
console.log(`========================================================`);

// Función para copiar directorios recursivamente
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (src.includes('node_modules') || src.includes('.git') || src.includes('.angular')) return;
        
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function(childItemName) {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Función auxiliar para borrar bloques de código de archivos
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

    console.log(`\n📦 1. Extrayendo Base de Core Assets...`);
    fs.mkdirSync(targetDir);
    
    const destFrontend = path.join(targetDir, 'frontend');
    const destBackend = path.join(targetDir, 'backend');

    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.frontend), destFrontend);
    copyRecursiveSync(path.join(__dirname, config.fabrica.rutas_core_assets.backend), destBackend);
    
    console.log(`✅ Código base extraído.`);

    console.log(`\n🎛️  2. Verificando Configuración de Core Assets...`);
    const assets = config.configuracion_nuevo_proyecto.core_assets;

    // Validación de Assets Obligatorios (Commonalities)
    const obligatorios = [
        'CA-001_DesignSystem', 'CA-002_ModeloUsuarioFront', 'CA-003_AuthService',
        'CA-004_AuthGuard', 'CA-005_RoleGuard', 'CA-006_Login', 'CA-008_Dashboard',
        'CA-009_EsquemaGraphQLBase', 'CA-010_ResolversGraphQL', 'CA-011_JWTMiddleware', 
        'CA-013_ConfiguracionBD'
    ];

    for (const ca of obligatorios) {
        if (!assets[ca]) {
            console.log(`  ⚠️  ADVERTENCIA: Has marcado [${ca}] como false, pero es un Core Asset OBLIGATORIO. El sistema lo mantendrá clonado para evitar romper la arquitectura base.`);
        }
    }

    // =========================================================================
    // REGLA 1: AUDITORÍA (CA-012) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-012_ModeloAuditoria']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-012_ModeloAuditoria] deshabilitada. Eliminando dependencias de código...`);
        
        // 1. Borrar archivo del modelo y scripts
        const auditoriaModelPath = path.join(destBackend, 'src', 'models', 'Auditoria.js');
        if (fs.existsSync(auditoriaModelPath)) fs.unlinkSync(auditoriaModelPath);
        
        const createAuditScript = path.join(destBackend, 'scripts', 'create_audit_table.js');
        if (fs.existsSync(createAuditScript)) fs.unlinkSync(createAuditScript);

        const migrateAuditScript = path.join(destBackend, 'scripts', 'migrate_auditoria.js');
        if (fs.existsSync(migrateAuditScript)) fs.unlinkSync(migrateAuditScript);

        // 2. Limpiar GraphQL Schema
        const typeDefsPath = path.join(destBackend, 'src', 'schema', 'typeDefs.js');
        removeFromFile(typeDefsPath, /type Auditoria {[\s\S]*?}\n\n/g);
        removeFromFile(typeDefsPath, /\s*auditoria\(.*?\): \[Auditoria!\]!\n/g);
        removeFromFile(typeDefsPath, /\s*auditoriaByUsuario\(.*?\): \[Auditoria!\]!\n/g);
        removeFromFile(typeDefsPath, /\s*auditoriaByAccion\(.*?\): \[Auditoria!\]!\n/g);
        
        // 3. Limpiar Resolvers
        const resolversPath = path.join(destBackend, 'src', 'resolvers', 'index.js');
        removeFromFile(resolversPath, /const { Auditoria } = require\('\.\.\/models\/Auditoria'\);\n/g);
        // Quitar el field-resolver de tipo Auditoria (anclado a su último campo).
        removeFromFile(resolversPath, /\s*Auditoria: {[\s\S]*?usuarioEmail:[^\n]*\n\s*},/g);
        // Anclar el fin del bloque a la última query (findByAccion). Un `[\s\S]*?},`
        // terminaba prematuramente en el `},` de la destructuración de parámetros.
        removeFromFile(resolversPath, /\s*\/\/ Queries de auditoría[\s\S]*?return Auditoria\.findByAccion\([^)]*\);\s*\n\s*},/g, '');
        // Quitar llamadas al método registrar() dentro de login/logout/registro
        removeFromFile(resolversPath, /\s*\/\/ 4\. Registrar evento de auditoría[\s\S]*?ipAddress\n\s*}\);/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar intento fallido de login[\s\S]*?ipAddress\n\s*}\);/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar login exitoso[\s\S]*?ipAddress\n\s*}\);/g);
        removeFromFile(resolversPath, /\s*\/\/ Registrar logout[\s\S]*?ipAddress\n\s*}\);/g);
        removeFromFile(resolversPath, /\s*const ipAddress = context\.req \? .*? 'desconocida';\n/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-012_ModeloAuditoria]`);
    }

    // =========================================================================
    // REGLA 2: REGISTRO ABIERTO (CA-007) - Punto de Variabilidad
    // =========================================================================
    if (!assets['CA-007_RegistroAbierto']) {
        console.log(`  ➔ ✂️  Poda detectada: [CA-007_RegistroAbierto] cerrado. Eliminando pantallas de frontend...`);
        
        // 1. Eliminar carpeta del frontend
        const registroPath = path.join(destFrontend, 'src', 'app', 'pages', 'registro');
        if (fs.existsSync(registroPath)) {
            fs.rmSync(registroPath, { recursive: true, force: true });
        }
        
        // 2. Limpiar ruta en app.routes.ts
        const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');
        removeFromFile(routesPath, /,\n\s*{\n\s*path: 'registro',[\s\S]*?}/g);
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-007_RegistroAbierto]`);
    }

    // =========================================================================
    // REGLA 3 y 4: MÓDULOS ACADÉMICOS (CA-016 Materias / CA-017 Inscripciones)
    //   Puntos de Variabilidad basados en MARCADORES en el código:
    //     # >>>CA-016>>>  ...  # <<<CA-016<<<   (GraphQL)
    //     // >>>CA-016>>> ...  // <<<CA-016<<<  (JS)
    //   Podar entre marcadores es robusto: no depende de la forma del código.
    //   CA-017 depende de CA-016 (si se desactiva Materias, cae Inscripciones).
    // =========================================================================
    const materiasOn = assets['CA-016_ModuloMaterias'] !== false;
    const inscripcionesOn = materiasOn && assets['CA-017_ModuloInscripciones'] !== false;

    // Elimina cualquier bloque delimitado por marcadores >>>CA-xxx>>> ... <<<CA-xxx<<<
    // (soporta comentarios GraphQL `#` y JavaScript `//`).
    function podarMarcadores(filePath, ca) {
        const re = new RegExp(`[ \\t]*(#|//)\\s*>>>${ca}>>>[\\s\\S]*?<<<${ca}<<<[^\\n]*\\n`, 'g');
        removeFromFile(filePath, re);
    }

    const resolversPath = path.join(destBackend, 'src', 'resolvers', 'index.js');
    const typeDefsPath = path.join(destBackend, 'src', 'schema', 'typeDefs.js');
    const routesPath = path.join(destFrontend, 'src', 'app', 'app.routes.ts');

    function podarModuloAcademico(ca, nombre, opts) {
        console.log(`  ➔ ✂️  Poda detectada: [${ca}_Modulo${nombre}] deshabilitado.`);
        podarMarcadores(resolversPath, ca);
        podarMarcadores(typeDefsPath, ca);
        // Modelo backend
        const model = path.join(destBackend, 'src', 'models', `${opts.model}.js`);
        if (fs.existsSync(model)) fs.unlinkSync(model);
        // Página y servicio frontend
        const page = path.join(destFrontend, 'src', 'app', 'pages', opts.page);
        if (fs.existsSync(page)) fs.rmSync(page, { recursive: true, force: true });
        const service = path.join(destFrontend, 'src', 'app', 'services', opts.service);
        if (fs.existsSync(service)) fs.unlinkSync(service);
        // Ruta Angular (bloque delimitado por su comentario "Sprint 2 · CA-xxx")
        removeFromFile(routesPath, opts.routeRegex);
    }

    if (!inscripcionesOn) {
        podarModuloAcademico('CA-017', 'Inscripciones', {
            model: 'Inscripcion',
            page: 'inscripciones',
            service: 'inscripcion.service.ts',
            routeRegex: /,\n\s*\/\/ Sprint 2 · CA-017 Inscripciones\n\s*{\n[\s\S]*?canActivate: \[authGuard\]\n\s*}/g
        });
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-017_ModuloInscripciones]`);
    }

    if (!materiasOn) {
        podarModuloAcademico('CA-016', 'Materias', {
            model: 'Materia',
            page: 'materias',
            service: 'materia.service.ts',
            routeRegex: /,\n\s*\/\/ Sprint 2 · CA-016 Materias\n\s*{\n[\s\S]*?canActivate: \[authGuard\]\n\s*}/g
        });
    } else {
        console.log(`  ➔ ✅ Manteniendo Core Asset: [CA-016_ModuloMaterias]`);
    }

    console.log(`\n⚙️  3. Generando configuración de entorno base...`);
    const envContent = `DB_HOST=${config.configuracion_nuevo_proyecto.entorno.db_host_template}
DB_PORT=5432
DB_NAME=bd_${projectName.toLowerCase()}
DB_USER=root
DB_PASSWORD=secret
JWT_SECRET=super_secreto_generado_en_fabrica
PORT=${config.configuracion_nuevo_proyecto.entorno.puerto_backend}
`;
    fs.writeFileSync(path.join(destBackend, '.env'), envContent);
    console.log(`✅ Archivo .env inyectado.`);

    console.log(`\n🎉 ¡PROYECTO ENSAMBLADO CON ÉXITO!`);
    console.log(`========================================================`);
    console.log(`Siguientes pasos:`);
    console.log(`1. cd ../${projectName}/backend`);
    console.log(`2. npm install`);
    console.log(`3. npm run dev`);
    console.log(`\n¡Gracias por usar la Fábrica de Software Académico!\n`);

} catch (err) {
    console.error("❌ Ocurrió un error al ensamblar el proyecto:", err);
}
