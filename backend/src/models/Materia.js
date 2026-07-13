const { client } = require('../config/database');

// ============================================================
// MODELO: Materia  [CA-016 · HU-S2.1 · Sprint 2]
// CRUD completo del módulo de Materias/Cursos.
// ============================================================
const Materia = {
  findAll: async () => {
    const { rows } = await client.query('SELECT * FROM materias ORDER BY id');
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM materias WHERE id = $1', [id]);
    return rows[0] || null;
  },
  findByCodigo: async (codigo) => {
    const { rows } = await client.query('SELECT * FROM materias WHERE codigo = $1', [codigo]);
    return rows[0] || null;
  },
  create: async ({ codigo, nombre, creditos, descripcion, docenteId = null }) => {
    const { rows } = await client.query(
      `INSERT INTO materias (codigo, nombre, creditos, descripcion, docente_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [codigo, nombre, creditos, descripcion, docenteId]
    );
    return rows[0];
  },
  update: async (id, { codigo, nombre, creditos, descripcion, docenteId }) => {
    const { rows } = await client.query(
      `UPDATE materias
       SET codigo = COALESCE($2, codigo),
           nombre = COALESCE($3, nombre),
           creditos = COALESCE($4, creditos),
           descripcion = COALESCE($5, descripcion),
           docente_id = COALESCE($6, docente_id),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, codigo, nombre, creditos, descripcion, docenteId]
    );
    return rows[0] || null;
  },
  remove: async (id) => {
    const { rows } = await client.query('DELETE FROM materias WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  },
};

module.exports = { Materia };
