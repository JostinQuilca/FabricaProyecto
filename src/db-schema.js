// ============================================================
// @fabrica/node-core · CA-018 Setup automático de BD
// La base de datos es parte de los Core Assets: cada librería
// trae su propio DDL y el producto se auto-provisiona al arrancar.
// ============================================================
const { Client } = require('pg');

/**
 * Crea la base de datos del producto si no existe.
 * Se conecta a la BD administrativa "postgres" con las mismas credenciales.
 *
 * NO es fatal: en BD gestionadas (Render/Supabase) la base ya existe y el
 * usuario suele no tener acceso a "postgres" ni permiso de CREATE DATABASE.
 * En ese caso se avisa y se continúa: la conexión real a la BD del producto
 * (que ya existe) y el CREATE TABLE IF NOT EXISTS se encargan del resto.
 *
 * @param {object} env - normalmente process.env
 * @returns {Promise<boolean>} true si la creó, false si ya existía o no se pudo.
 */
async function ensureDatabase(env = process.env) {
  const useSsl = String(env.DB_SSL).toLowerCase() !== 'false';
  const admin = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: 'postgres',
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
  try {
    await admin.connect();
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.DB_NAME]);
    if (rows.length > 0) return false;
    // CREATE DATABASE no acepta parámetros; el nombre viene del .env del producto.
    await admin.query(`CREATE DATABASE "${String(env.DB_NAME).replace(/"/g, '')}"`);
    console.log(`  🗄️  Base de datos "${env.DB_NAME}" creada`);
    return true;
  } catch (e) {
    console.log(`  ℹ️  No se pudo autocrear la base ("${e.message}"). Se asume que ya existe y se continúa.`);
    return false;
  } finally {
    try { await admin.end(); } catch { /* noop */ }
  }
}

/**
 * Crea las tablas OBLIGATORIAS (commonalities): roles y usuarios.
 * Idempotente (CREATE TABLE IF NOT EXISTS).
 */
async function ensureBaseTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) UNIQUE NOT NULL
    );
    INSERT INTO roles (nombre)
    VALUES ('ADMIN'), ('DOCENTE'), ('ESTUDIANTE')
    ON CONFLICT (nombre) DO NOTHING;

    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol_id INTEGER NOT NULL REFERENCES roles(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  ✅ Tablas base (roles, usuarios) verificadas');
}

/**
 * DDL del Core Asset CA-012 (Auditoría). Idempotente.
 */
async function ensureAuditoriaTable(client) {
  await client.query(`
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
  `);
  console.log('  ✅ CA-012: tabla auditoria verificada');
}

module.exports = { ensureDatabase, ensureBaseTables, ensureAuditoriaTable };
