// ============================================================
// @fabrica/academico · DDL de los Core Assets académicos
// CA-016 Materias · CA-017 Inscripciones
// La tabla viaja con la librería: instalar el asset = tener su BD.
// ============================================================

/**
 * DDL del CA-016 (Materias) + datos de ejemplo. Idempotente.
 * `CREATE TABLE IF NOT EXISTS` no altera una tabla que ya existía con un
 * esquema más viejo (ej. instalada por una versión anterior del asset),
 * así que las columnas que se sumaron después se agregan con
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para que la tabla se
 * auto-repare en vez de fallar al crear los índices.
 */
async function ensureMateriasTable(client, { seed = true } = {}) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS materias (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        creditos INTEGER NOT NULL DEFAULT 0 CHECK (creditos >= 0),
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE materias ADD COLUMN IF NOT EXISTS docente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_materias_codigo ON materias(codigo);
    CREATE INDEX IF NOT EXISTS idx_materias_docente ON materias(docente_id);
  `);
  if (seed) {
    await client.query(`
      INSERT INTO materias (codigo, nombre, creditos, descripcion)
      VALUES
        ('MAT-101', 'Cálculo Diferencial', 4, 'Fundamentos de límites, derivadas y aplicaciones.'),
        ('INF-201', 'Estructuras de Datos', 5, 'Listas, pilas, colas, árboles y grafos.'),
        ('SW-301',  'Ingeniería de Software', 4, 'Líneas de producto de software y fábricas de software.')
      ON CONFLICT (codigo) DO NOTHING;
    `);
  }
  console.log('  ✅ CA-016: tabla materias verificada');
}

/** DDL del CA-017 (Inscripciones). Requiere materias (FK). Idempotente. */
async function ensureInscripcionesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS inscripciones (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
        fecha_inscripcion TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (estudiante_id, materia_id)
    );
    ALTER TABLE inscripciones ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA';
    CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante ON inscripciones(estudiante_id);
    CREATE INDEX IF NOT EXISTS idx_inscripciones_materia ON inscripciones(materia_id);
  `);
  console.log('  ✅ CA-017: tabla inscripciones verificada');
}

/** DDL del CA-019 (Calificaciones). Requiere materias y usuarios (FK). Idempotente. */
async function ensureCalificacionesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS calificaciones (
        id SERIAL PRIMARY KEY,
        estudiante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
        nota NUMERIC(5,2) NOT NULL CHECK (nota >= 0 AND nota <= 100),
        periodo VARCHAR(20) NOT NULL,
        observacion TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (estudiante_id, materia_id, periodo)
    );
    CREATE INDEX IF NOT EXISTS idx_calificaciones_estudiante ON calificaciones(estudiante_id);
    CREATE INDEX IF NOT EXISTS idx_calificaciones_materia ON calificaciones(materia_id);
  `);
  console.log('  ✅ CA-019: tabla calificaciones verificada');
}

module.exports = { ensureMateriasTable, ensureInscripcionesTable, ensureCalificacionesTable };
