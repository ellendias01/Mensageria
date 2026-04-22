
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    console.log('Tentando conectar com:');
    console.log('Host:', process.env.DB_HOST);
    console.log('Database:', process.env.DB_NAME);
    console.log('User:', process.env.DB_USER);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    
    console.log('✅ Conectado com sucesso!');
    const [rows] = await connection.query('SELECT DATABASE() as current_db');
    console.log('Banco atual:', rows[0].current_db);
    await connection.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testConnection();
