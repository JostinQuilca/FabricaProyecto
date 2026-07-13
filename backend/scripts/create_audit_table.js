const { client } = require('../src/config/database');

async function createAuditTable() {
  try {
    await client.connect();
    console.log('Conectando a la base de datos...');

    // Crear tabla de auditoría
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        evento VARCHAR(50) NOT NULL,
        descripcion TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Crear índice para búsquedas rápidas por usuario y evento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditoria_evento ON auditoria(evento);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at);
    `);

    console.log('Tabla de auditoría creada exitosamente.');

    // Verificar
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'auditoria' 
      ORDER BY ordinal_position;
    `);
    console.log('Columnas de la tabla auditoria:', res.rows);

  } catch (err) {
    console.error('Error al crear tabla de auditoría:', err.message);
  } finally {
    await client.end();
  }
}

createAuditTable();
