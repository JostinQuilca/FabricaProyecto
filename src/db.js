// ============================================================
// @fabrica/node-core · CA-013 Configuración de BD
// Factory de cliente PostgreSQL con SSL configurable.
// ============================================================
const { Client } = require('pg');

/**
 * Crea (sin conectar) un cliente PostgreSQL a partir de variables de entorno.
 * @param {object} env - normalmente process.env
 * @returns {import('pg').Client}
 */
function createDbClient(env = process.env) {
  // SSL activado por defecto (Render/Supabase lo exigen). DB_SSL=false para local.
  const useSsl = String(env.DB_SSL).toLowerCase() !== 'false';
  return new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Conecta un cliente y verifica la conexión. Devuelve el mismo cliente.
 */
async function connect(client) {
  await client.connect();
  const res = await client.query('SELECT NOW()');
  console.log('PostgreSQL conectado exitosamente:', res.rows[0].now);
  return client;
}

module.exports = { createDbClient, connect };
