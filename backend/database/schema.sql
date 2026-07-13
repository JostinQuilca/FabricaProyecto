-- ============================================================
-- SCHEMA.SQL - Fuente de Verdad del Esquema (Database as Code)
-- Proyecto: Fábrica de Software Académico
-- Sprint 1 - Core Assets
-- ============================================================

-- ============================================================
-- MÓDULO: ROLES
-- Descripción: Catálogo de roles del sistema académico.
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);

-- Roles iniciales del sistema
INSERT INTO roles (nombre) 
VALUES ('ADMIN'), ('DOCENTE'), ('ESTUDIANTE')
ON CONFLICT (nombre) DO NOTHING;


-- ============================================================
-- MÓDULO: USUARIOS
-- Descripción: Usuarios del sistema con relación a roles.
-- FK: rol_id -> roles(id)
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- MÓDULO: AUDITORÍA  [HU-S1.2]
-- Descripción: Registro de logs de eventos del sistema.
--   Registra quién realizó qué acción y cuándo.
-- FK: usuario_id -> usuarios(id) (opcional, permite NULL
--     para acciones del sistema o usuarios eliminados)
-- ============================================================

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

-- Índices para optimizar consultas frecuentes de auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON auditoria(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad);


-- ============================================================
-- MÓDULO: MATERIAS  [CA-016 · HU-S2.1 · Sprint 2]
-- Descripción: Catálogo de materias/cursos del sistema académico.
--   Core Asset opcional de la Línea de Productos (SPLE).
-- ============================================================

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

-- Materias de ejemplo (seed) para validar el módulo
INSERT INTO materias (codigo, nombre, creditos, descripcion)
VALUES
    ('MAT-101', 'Cálculo Diferencial', 4, 'Fundamentos de límites, derivadas y aplicaciones.'),
    ('INF-201', 'Estructuras de Datos', 5, 'Listas, pilas, colas, árboles y grafos.'),
    ('SW-301',  'Ingeniería de Software', 4, 'Líneas de producto de software y fábricas de software.')
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- MÓDULO: INSCRIPCIONES  [CA-017 · HU-S2.3 · Sprint 2]
-- Descripción: Relación estudiante-materia (matrículas).
--   FK: estudiante_id -> usuarios(id), materia_id -> materias(id)
--   Restricción: un estudiante no puede inscribirse dos veces
--   en la misma materia (UNIQUE estudiante_id + materia_id).
-- ============================================================

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
