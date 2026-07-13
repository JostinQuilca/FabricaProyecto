// ============================================================
// MIGRACIÓN: Módulos Académicos (Sprint 2)
//   CA-016 Materias  +  CA-017 Inscripciones
// Lee las credenciales desde .env (igual que la app).
// Uso:  node scripts/migrate_academico.js
// ============================================================
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const migrate = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();

    console.log('Creando tabla "materias" (CA-016)...');
    await client.query(`
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
    `);

    console.log('Creando tabla "inscripciones" (CA-017)...');
    await client.query(`
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
    `);

    console.log('Insertando materias de ejemplo (seed)...');
    await client.query(`
      INSERT INTO materias (codigo, nombre, creditos, descripcion)
      VALUES
        ('MAT-101', 'Cálculo Diferencial', 4, 'Fundamentos de límites, derivadas y aplicaciones.'),
        ('INF-201', 'Estructuras de Datos', 5, 'Listas, pilas, colas, árboles y grafos.'),
        ('SW-301',  'Ingeniería de Software', 4, 'Líneas de producto de software y fábricas de software.')
      ON CONFLICT (codigo) DO NOTHING;
    `);

    // Verificación
    const materias = await client.query('SELECT COUNT(*) FROM materias');
    const insc = await client.query('SELECT COUNT(*) FROM inscripciones');
    console.log(`\n✅ Migración completa.`);
    console.log(`   Materias en BD: ${materias.rows[0].count}`);
    console.log(`   Inscripciones en BD: ${insc.rows[0].count}`);
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

migrate();
