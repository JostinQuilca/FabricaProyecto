// ============================================================
// SEED DE USUARIOS — Backend de referencia de la Fábrica.
// Crea el ADMIN para iniciar sesión, más usuarios de ejemplo
// (docente y estudiantes) para poder probar los módulos que los
// necesitan (Inscripciones, Calificaciones) sin partir de cero.
// Uso: node scripts/seed_admin.js  [emailAdmin] [passwordAdmin]
// ============================================================
const path = require('path');
module.paths.unshift(path.join(__dirname, '..', 'backend', 'node_modules'));
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const bcrypt = require('bcryptjs');
const { createDbClient } = require('@fabrica/node-core');

const email = process.argv[2] || 'admin@admin.edu';
const password = process.argv[3] || 'admin123';

// rol_id: 1=ADMIN, 2=DOCENTE, 3=ESTUDIANTE
const USUARIOS_DEMO = [
  ['Docente Demo', 'docente@demo.edu', 'docente123', 2],
  ['Ana Pérez', 'ana@demo.edu', 'estudiante123', 3],
  ['Luis Gómez', 'luis@demo.edu', 'estudiante123', 3],
  ['María Torres', 'maria@demo.edu', 'estudiante123', 3],
];

(async () => {
  const client = createDbClient(process.env);
  try {
    await client.connect();

    // ADMIN: se actualiza la contraseña por si se re-ejecuta el seed
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

    // Usuarios de ejemplo: no se pisan si ya existen (DO NOTHING)
    let creados = 0;
    for (const [nombre, mail, pass, rolId] of USUARIOS_DEMO) {
      const h = await bcrypt.hash(pass, 10);
      const r = await client.query(
        `INSERT INTO usuarios (nombre, email, password, rol_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [nombre, mail, h, rolId]
      );
      if (r.rowCount > 0) creados++;
    }
    if (creados > 0) {
      console.log('👥 ' + creados + ' usuarios de ejemplo creados (1 docente, 3 estudiantes)');
      console.log('   docente@demo.edu / docente123   ·   ana|luis|maria@demo.edu / estudiante123');
    } else {
      console.log('👥 Usuarios de ejemplo ya existían (sin cambios)');
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('   ¿Corriste antes "npm run dev" en backend/ para crear las tablas?');
    process.exit(1);
  } finally {
    await client.end();
  }
})();
