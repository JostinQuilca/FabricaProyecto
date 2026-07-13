const { client } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    await client.connect();
    console.log('Conectado a la BD para crear usuario');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('2004Jd20', salt);

    await client.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4)',
      ['Jostin Quilca', 'jdquilcap1@utn.edu.ec', hash, 3]
    );

    console.log('¡Usuario jdquilcap1@utn.edu.ec creado con éxito!');
  } catch (error) {
    console.error('Error creando el usuario:', error);
  } finally {
    await client.end();
  }
}

run();
