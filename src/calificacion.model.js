// CA-019 · Modelo de Calificación (factory con cliente inyectado)
function createCalificacionModel(client) {
  return {
    findAll: async () => (await client.query(
      `SELECT c.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email,
              m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM calificaciones c
       JOIN usuarios u ON c.estudiante_id = u.id
       JOIN materias m ON c.materia_id = m.id
       ORDER BY c.created_at DESC`)).rows,
    findByEstudiante: async (estudianteId) => (await client.query(
      `SELECT c.*, m.codigo AS materia_codigo, m.nombre AS materia_nombre
       FROM calificaciones c JOIN materias m ON c.materia_id = m.id
       WHERE c.estudiante_id = $1 ORDER BY c.created_at DESC`, [estudianteId])).rows,
    findByMateria: async (materiaId) => (await client.query(
      `SELECT c.*, u.nombre AS estudiante_nombre, u.email AS estudiante_email
       FROM calificaciones c JOIN usuarios u ON c.estudiante_id = u.id
       WHERE c.materia_id = $1 ORDER BY c.created_at DESC`, [materiaId])).rows,
    findById: async (id) => (await client.query('SELECT * FROM calificaciones WHERE id = $1', [id])).rows[0] || null,
    exists: async (estudianteId, materiaId, periodo) => (await client.query(
      'SELECT id FROM calificaciones WHERE estudiante_id = $1 AND materia_id = $2 AND periodo = $3',
      [estudianteId, materiaId, periodo])).rows[0] || null,
    create: async ({ estudianteId, materiaId, nota, periodo, observacion = null }) => (await client.query(
      `INSERT INTO calificaciones (estudiante_id, materia_id, nota, periodo, observacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [estudianteId, materiaId, nota, periodo, observacion])).rows[0],
    update: async (id, { nota, observacion }) => (await client.query(
      `UPDATE calificaciones SET nota = COALESCE($2, nota),
              observacion = COALESCE($3, observacion), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, nota, observacion])).rows[0] || null,
    remove: async (id) => (await client.query('DELETE FROM calificaciones WHERE id = $1 RETURNING *', [id])).rows[0] || null,
  };
}

module.exports = { createCalificacionModel };
