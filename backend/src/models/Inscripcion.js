const { client } = require('../config/database');

// ============================================================
// MODELO: Inscripcion  [CA-017 · HU-S2.3 · Sprint 2]
// Gestiona la relación estudiante-materia (matrículas).
// ============================================================
const Inscripcion = {
  findAll: async () => {
    const { rows } = await client.query(
      `SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
              m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM inscripciones i
       JOIN usuarios u ON i.estudiante_id = u.id
       JOIN materias m ON i.materia_id = m.id
       ORDER BY i.fecha_inscripcion DESC`
    );
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM inscripciones WHERE id = $1', [id]);
    return rows[0] || null;
  },
  findByEstudiante: async (estudianteId) => {
    const { rows } = await client.query(
      `SELECT i.*, m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM inscripciones i
       JOIN materias m ON i.materia_id = m.id
       WHERE i.estudiante_id = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [estudianteId]
    );
    return rows;
  },
  findByMateria: async (materiaId) => {
    const { rows } = await client.query(
      `SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email
       FROM inscripciones i
       JOIN usuarios u ON i.estudiante_id = u.id
       WHERE i.materia_id = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [materiaId]
    );
    return rows;
  },
  exists: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      'SELECT id FROM inscripciones WHERE estudiante_id = $1 AND materia_id = $2',
      [estudianteId, materiaId]
    );
    return rows[0] || null;
  },
  inscribir: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      `INSERT INTO inscripciones (estudiante_id, materia_id)
       VALUES ($1, $2) RETURNING *`,
      [estudianteId, materiaId]
    );
    return rows[0];
  },
  desinscribir: async (estudianteId, materiaId) => {
    const { rows } = await client.query(
      `DELETE FROM inscripciones
       WHERE estudiante_id = $1 AND materia_id = $2
       RETURNING *`,
      [estudianteId, materiaId]
    );
    return rows[0] || null;
  },
};

module.exports = { Inscripcion };
