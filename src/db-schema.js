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

/** DDL del CA-022 (Calendario Académico) + eventos de ejemplo. Idempotente. */
async function ensureEventosTable(client, { seed = true } = {}) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        descripcion TEXT,
        fecha_inicio TIMESTAMP NOT NULL,
        fecha_fin TIMESTAMP,
        tipo VARCHAR(20) NOT NULL DEFAULT 'OTRO',
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha_inicio);
    CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
  `);
  if (seed) {
    // Eventos de ejemplo relativos a HOY, para que el calendario no nazca vacío
    await client.query(`
      INSERT INTO eventos (titulo, descripcion, fecha_inicio, tipo, color)
      SELECT * FROM (VALUES
        ('Inicio de clases',      'Arranque del período académico', NOW() + INTERVAL '1 day',   'CLASE',   '#2563eb'),
        ('Entrega de proyecto',   'Primera entrega del proyecto integrador', NOW() + INTERVAL '7 day', 'ENTREGA', '#f59e0b'),
        ('Examen parcial',        'Evaluación del primer parcial',  NOW() + INTERVAL '14 day',  'EXAMEN',  '#dc2626')
      ) AS v(titulo, descripcion, fecha_inicio, tipo, color)
      WHERE NOT EXISTS (SELECT 1 FROM eventos);
    `);
  }
  console.log('  ✅ CA-022: tabla eventos verificada');
}

module.exports = {
  ensureMateriasTable,
  ensureInscripcionesTable,
  ensureCalificacionesTable,
  ensureEventosTable,
};
