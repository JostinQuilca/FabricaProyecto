// ============================================================
// SEED ADMIN — Backend de referencia de la Fábrica de Software.
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
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`,
      ['Administrador', email, hash]
    );
    console.log('✅ Admin listo:');
    console.log('   Email:    ' + email);
    console.log('   Password: ' + password);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('   ¿Corriste antes "npm run dev" en backend/ para crear las tablas?');
    process.exit(1);
  } finally {
    await client.end();
  }
})();
