// CA-017 · Modelo de Inscripción (factory con cliente inyectado)
function createInscripcionModel(client) {
  return {
    findAll: async () => (await client.query(
      `SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
              m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM inscripciones i
       JOIN usuarios u ON i.estudiante_id = u.id
       JOIN materias m ON i.materia_id = m.id
       ORDER BY i.fecha_inscripcion DESC`)).rows,
    findByEstudiante: async (estudianteId) => (await client.query(
      `SELECT i.*, m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM inscripciones i JOIN materias m ON i.materia_id = m.id
       WHERE i.estudiante_id = $1 ORDER BY i.fecha_inscripcion DESC`, [estudianteId])).rows,
    findByMateria: async (materiaId) => (await client.query(
      `SELECT i.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email
       FROM inscripciones i JOIN usuarios u ON i.estudiante_id = u.id
       WHERE i.materia_id = $1 ORDER BY i.fecha_inscripcion DESC`, [materiaId])).rows,
    exists: async (estudianteId, materiaId) => (await client.query(
      'SELECT id FROM inscripciones WHERE estudiante_id = $1 AND materia_id = $2',
      [estudianteId, materiaId])).rows[0] || null,
    inscribir: async (estudianteId, materiaId) => (await client.query(
      `INSERT INTO inscripciones (estudiante_id, materia_id) VALUES ($1, $2) RETURNING *`,
      [estudianteId, materiaId])).rows[0],
    desinscribir: async (estudianteId, materiaId) => (await client.query(
      `DELETE FROM inscripciones WHERE estudiante_id = $1 AND materia_id = $2 RETURNING *`,
      [estudianteId, materiaId])).rows[0] || null,
  };
}

module.exports = { createInscripcionModel };
