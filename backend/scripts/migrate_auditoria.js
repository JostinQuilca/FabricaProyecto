const { Client } = require('pg');

const client = new Client({
  host: 'dpg-d8tj328g4nts73cv5bb0-a.virginia-postgres.render.com',
  port: 5432,
  database: 'bd_proyecto_fabrica',
  user: 'bd_proyecto_fabrica_user',
  password: 'NnZkLsD4hPWvl6J6hKWpY5OVQr3WjohZ',
  ssl: { rejectUnauthorized: false }
});

const migrateAuditoria = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await client.connect();

    console.log('Creando tabla de auditoría...');
    await client.query(`
      -- Tabla de auditoría (HU-S1.2)
      CREATE TABLE IF NOT EXISTS auditoria (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
          accion VARCHAR(255) NOT NULL,
          entidad VARCHAR(100),
          entidad_id INTEGER,
          detalles TEXT,
          ip_address VARCHAR(45),
          fecha_hora TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Índices para optimizar consultas frecuentes
      CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria(usuario_id);
      CREATE INDEX IF NOT EXISTS idx_auditoria_fecha_hora ON auditoria(fecha_hora);
      CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad);
    `);

    console.log('Tabla "auditoria" creada exitosamente.');

    // Verificar estructura
    const cols = await client.query(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='auditoria' ORDER BY ordinal_position"
    );
    console.log('\nEstructura de la tabla "auditoria":');
    cols.rows.forEach(c => {
      console.log(`  ${c.column_name} | ${c.data_type} | nullable: ${c.is_nullable} | default: ${c.column_default || 'none'}`);
    });

    // Verificar FK
    const fks = await client.query(`
      SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'auditoria'
    `);
    console.log('\nForeign Keys:');
    fks.rows.forEach(fk => {
      console.log(`  auditoria.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
    });

    // Verificar índices
    const indexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'auditoria'
    `);
    console.log('\nÍndices:');
    indexes.rows.forEach(idx => {
      console.log(`  ${idx.indexname}`);
    });

    // Listar todas las tablas para confirmar
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    console.log('\n=== Todas las tablas en la BD ===');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

  } catch (error) {
    console.error('Error al crear tabla de auditoría:', error.message);
  } finally {
    await client.end();
  }
};

migrateAuditoria();
