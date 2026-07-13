const { client } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seedUser() {
  try {
    await client.connect();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('2004Jd20', salt);
    
    // Check if ESTUDIANTE role exists and get its ID
    const { rows: roles } = await client.query('SELECT id FROM roles WHERE nombre = $1', ['ESTUDIANTE']);
    if (roles.length === 0) throw new Error('Rol ESTUDIANTE no encontrado');
    
    // Insert user
    await client.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['Jostin Quilca', 'jdquilcap1@utn.edu.ec', hashedPassword, roles[0].id]
    );
    console.log('Usuario jdquilcap1 migrado exitosamente a la nueva base de datos.');
  } catch (err) {
    console.error('Error migrando usuario:', err);
  } finally {
    await client.end();
  }
}
seedUser();
