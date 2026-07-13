const { client } = require('../config/database');

const Usuario = {
  findAll: async () => {
    const { rows } = await client.query('SELECT * FROM usuarios ORDER BY id');
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    return rows[0] || null;
  },
  findByEmail: async (email) => {
    const { rows } = await client.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0] || null;
  },
  create: async ({ nombre, email, password, rol_id }) => {
    const { rows } = await client.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, password, rol_id]
    );
    return rows[0];
  },
};

module.exports = { Usuario };
