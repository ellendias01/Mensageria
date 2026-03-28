const { getDatabase } = require('./database');

async function initDB() {
  try {
    const db = await getDatabase();
    console.log('✅ Banco de dados pronto para uso!');
    await db.close();
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  }
}

initDB();