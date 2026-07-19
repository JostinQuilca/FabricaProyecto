// ============================================================
// COMPOSITION ROOT del producto (cascarón).
// Todo el código vive en las librerías @fabrica/*; este archivo
// solo ENSAMBLA los Core Assets activos según los feature toggles.
// ============================================================
const net = require('net');
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const {
  createDbClient, connect,
  ensureDatabase, ensureBaseTables, ensureAuditoriaTable,
  verifyToken,
  createUsuarioModel, createRoleModel, baseTypeDefs, buildBaseResolvers,
  createAuditoriaModule, noopAuditoria,
  createUsuariosModule,
  composeModules, crearFeatureToggles,
} = require('@fabrica/node-core');
require('dotenv').config();

/**
 * Espera a que un puerto quede libre, haciendo un bind de prueba con `net`.
 * Útil ante reinicios de nodemon (al editar un archivo): en Windows el socket
 * anterior tarda unos ms en liberarse. Apollo's startStandaloneServer emite el
 * EADDRINUSE como un evento 'error' no capturable con try/catch normal, así que
 * se verifica el puerto ANTES de arrancar el servidor real.
 * Si tras unos intentos sigue ocupado, es OTRA app usando el puerto → se lanza
 * el error para dar un mensaje claro (ver startServer).
 */
function waitForPortFree(port, maxIntentos = 6, esperaMs = 500) {
  return new Promise((resolve, reject) => {
    let intento = 0;
    const probar = () => {
      intento++;
      const tester = net.createServer();
      tester.once('error', (err) => {
        tester.close();
        if (err.code === 'EADDRINUSE' && intento < maxIntentos) {
          console.log(`  ⏳ Puerto ${port} aún ocupado (reintento ${intento}/${maxIntentos})...`);
          setTimeout(probar, esperaMs);
        } else {
          reject(err);
        }
      });
      tester.once('listening', () => {
        tester.close(() => resolve());
      });
      tester.listen(port);
    };
    probar();
  });
}

async function startServer() {
  const features = crearFeatureToggles();
  const client = createDbClient(process.env);

  // CA-018 · Auto-setup de BD (la database y las tablas de cada asset activo)
  const autoSetup = features.isEnabled('CA-018_SetupBD_Automatico');
  if (autoSetup) {
    console.log('🗄️  CA-018: verificando base de datos y tablas...');
    await ensureDatabase(process.env);
  }

  await connect(client);

  // Modelos base (commonalities)
  const Usuario = createUsuarioModel(client);
  const Role = createRoleModel(client);

  // CA-012 · Auditoría (real si está activa, no-op si no)
  const auditoriaOn = features.isEnabled('CA-012_ModeloAuditoria');
  const auditoriaModule = auditoriaOn ? createAuditoriaModule({ client }) : null;
  const auditoria = auditoriaModule ? auditoriaModule.model : noopAuditoria;

  if (autoSetup) {
    await ensureBaseTables(client);
    if (auditoriaOn) await ensureAuditoriaTable(client);
  }

  // Ensamblaje de módulos según toggles.
  // "coreAssetsActivos" permite al frontend descubrir en runtime qué módulos
  // opcionales están habilitados en ESTE producto, para mostrar (o no) sus
  // vistas/tarjetas sin necesitar código hardcodeado por asset.
  const modules = [
    { typeDefs: baseTypeDefs, resolvers: buildBaseResolvers({ Usuario, Role, auditoria, jwtSecret: process.env.JWT_SECRET }) },
    {
      typeDefs: `extend type Query { coreAssetsActivos: [String!]! }`,
      resolvers: { Query: { coreAssetsActivos: () => features.enabledAssets() } },
    },
  ];
  if (auditoriaOn) modules.push(auditoriaModule);

  // CA-020 · Gestión de Usuarios (alta/edición/baja de usuarios por el ADMIN)
  if (features.isEnabled('CA-020_GestionUsuarios')) {
    modules.push(createUsuariosModule({ usuarioModel: Usuario, auditoria }));
    console.log('  ✓ CA-020 Gestión de Usuarios cargado');
  }

  if (features.isEnabled('CA-016_ModuloMaterias')) {
    const {
      createAcademicoModule, createCalificacionesModule,
      ensureMateriasTable, ensureInscripcionesTable, ensureCalificacionesTable,
    } = require('@fabrica/academico');
    const academicoModule = createAcademicoModule({ client, usuarioModel: Usuario, auditoria });
    modules.push(academicoModule);
    if (autoSetup) {
      await ensureMateriasTable(client);
      if (features.isEnabled('CA-017_ModuloInscripciones')) await ensureInscripcionesTable(client);
    }
    console.log('  ✓ @fabrica/academico (CA-016/CA-017) cargado');

    // CA-019 · Calificaciones (requiere CA-016; usa el modelo Materia del módulo académico)
    if (features.isEnabled('CA-019_ModuloCalificaciones')) {
      modules.push(createCalificacionesModule({
        client, materiaModel: academicoModule.models.Materia, usuarioModel: Usuario, auditoria,
      }));
      if (autoSetup) await ensureCalificacionesTable(client);
      console.log('  ✓ CA-019 Calificaciones cargado');
    }
  }

  const { typeDefs, resolvers } = composeModules(modules);
  const server = new ApolloServer({ typeDefs, resolvers });

  const port = process.env.PORT || 4300;
  try {
    await waitForPortFree(Number(port));
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`\n❌ El puerto ${port} está ocupado por otra aplicación.`);
      console.error(`   Cambia PORT en backend/.env a un puerto libre (ej. 4310)`);
      console.error(`   y ajusta apiUrl en frontend/src/environments/environment.ts al mismo puerto.\n`);
      process.exit(1);
    }
    throw err;
  }

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => ({ user: verifyToken(req.headers.authorization || ''), req }),
  });

  console.log(`Servidor GraphQL listo en ${url}`);
  console.log(`Core Assets activos: ${features.enabledAssets().length}`);
}

startServer();
