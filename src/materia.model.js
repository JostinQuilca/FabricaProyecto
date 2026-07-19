// CA-016 · Modelo de Materia (factory con cliente inyectado)
function createMateriaModel(client) {
  return {
    findAll: async () => (await client.query('SELECT * FROM materias ORDER BY id')).rows,
    findById: async (id) => (await client.query('SELECT * FROM materias WHERE id = $1', [id])).rows[0] || null,
    findByCodigo: async (codigo) => (await client.query('SELECT * FROM materias WHERE codigo = $1', [codigo])).rows[0] || null,
    create: async ({ codigo, nombre, creditos, descripcion, docenteId = null }) =>
      (await client.query(
        `INSERT INTO materias (codigo, nombre, creditos, descripcion, docente_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [codigo, nombre, creditos, descripcion, docenteId]
      )).rows[0],
    update: async (id, { codigo, nombre, creditos, descripcion, docenteId }) =>
      (await client.query(
        `UPDATE materias SET codigo = COALESCE($2, codigo), nombre = COALESCE($3, nombre),
           creditos = COALESCE($4, creditos), descripcion = COALESCE($5, descripcion),
           docente_id = COALESCE($6, docente_id), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, codigo, nombre, creditos, descripcion, docenteId]
      )).rows[0] || null,
    remove: async (id) =>
      (await client.query('DELETE FROM materias WHERE id = $1 RETURNING *', [id])).rows[0] || null,
  };
}

module.exports = { createMateriaModel };
