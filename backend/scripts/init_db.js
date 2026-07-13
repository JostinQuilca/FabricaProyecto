const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false } // Requerido por Supabase
});

const initDB = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();

    console.log('Creando tablas...');
    
    // Ejecutar el SQL proporcionado
    await client.query(`
      -- Tabla de roles
      CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(50) UNIQUE NOT NULL
      );

      -- Roles iniciales (Ignora si ya existen gracias a ON CONFLICT DO NOTHING)
      INSERT INTO roles (nombre) 
      VALUES ('ADMIN'), ('DOCENTE'), ('ESTUDIANTE')
      ON CONFLICT (nombre) DO NOTHING;

      -- Tabla de usuarios
      CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          rol_id INTEGER NOT NULL REFERENCES roles(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tablas creadas y roles insertados exitosamente.');

    // Verificar roles insertados
    const res = await client.query('SELECT * FROM roles;');
    console.log('Roles actuales en BD:', res.rows);

  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    await client.end();
  }
};

initDB();
