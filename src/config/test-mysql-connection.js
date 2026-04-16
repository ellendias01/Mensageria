require('dotenv').config();

const mysql = require('mysql2/promise');

function getEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

async function main() {
  const host = getEnv('MYSQL_HOST', '127.0.0.1');
  const port = Number(getEnv('MYSQL_PORT', '3306'));
  const user = getEnv('MYSQL_USER', 'root');
  const password = getEnv('MYSQL_PASSWORD', '');
  const database = getEnv('MYSQL_DATABASE', '');

  console.log('='.repeat(60));
  console.log('🧪 TESTE DE CONEXÃO - MySQL');
  console.log('='.repeat(60));
  console.log(`Host: ${host}:${port}`);
  console.log(`User: ${user}`);
  console.log(`Database: ${database || '(não informado)'}`);

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: database || undefined
  });

  try {
    await connection.ping();
    const [rows] = await connection.query(
      'SELECT VERSION() AS version, DATABASE() AS currentDatabase'
    );

    const info = Array.isArray(rows) && rows.length ? rows[0] : {};
    console.log('\n✅ Conectou com sucesso!');
    console.log(`Versão: ${info.version || '(desconhecida)'}`);
    console.log(
      `Database atual: ${info.currentDatabase || '(nenhuma selecionada)'}`
    );
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Falha ao conectar no MySQL');
  console.error(err && err.message ? `Motivo: ${err.message}` : err);
  process.exitCode = 1;
});

