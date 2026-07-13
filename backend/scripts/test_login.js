const { client } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM usuarios WHERE email=$1', ['jdquilcap1@utn.edu.ec']);
  console.log('User found:', res.rows.length > 0);
  if (res.rows.length) {
    const match = await bcrypt.compare('2004Jd20', res.rows[0].password);
    console.log('Password match:', match);
  }
  await client.end();
}
run();
