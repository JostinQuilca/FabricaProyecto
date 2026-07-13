const { client } = require('../src/config/database');

async function check() {
  await client.connect();
  
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Tables:', tables.rows);
  
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='auditoria'");
  console.log('Audit columns:', cols.rows);
  
  await client.end();
}
check();
