const { getPool } = require('./database');

async function initDB() {
  try {
    await getPool();
    console.log('✅ Banco de dados MySQL pronto para uso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}

initDB();