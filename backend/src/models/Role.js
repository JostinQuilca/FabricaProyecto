const { client } = require('../config/database');

const Role = {
  findAll: async () => {
    const { rows } = await client.query('SELECT * FROM roles ORDER BY id');
    return rows;
  },
  findById: async (id) => {
    const { rows } = await client.query('SELECT * FROM roles WHERE id = $1', [id]);
    return rows[0] || null;
  },
};

module.exports = { Role };
