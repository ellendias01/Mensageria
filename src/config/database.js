const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db = null;

async function getDatabase() {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, '../../database/database.sqlite'),
      driver: sqlite3.Database
    });
    
    // ✅ CONFIGURAÇÕES PARA EVITAR SQLITE_BUSY
    await db.exec('PRAGMA journal_mode = WAL');        // Write-Ahead Logging
    await db.exec('PRAGMA busy_timeout = 30000');      // Timeout de 30 segundos
    await db.exec('PRAGMA synchronous = NORMAL');      // Balancear performance/segurança
    await db.exec('PRAGMA cache_size = -20000');       // 20MB de cache
    await db.exec('PRAGMA temp_store = MEMORY');       // Usar memória para temporários
    await db.exec('PRAGMA wal_autocheckpoint = 1000'); // Checkpoint a cada 1000 páginas
    
    await initializeDatabase();
  }
  return db;
}

async function initializeDatabase() {
  const db = await getDatabase();
  
  // Criar tabela de clientes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      document TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Criar tabela de produtos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      category_id TEXT,
      category_name TEXT,
      sub_category_id TEXT,
      sub_category_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Criar tabela de pedidos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      uuid TEXT PRIMARY KEY,
      created_at DATETIME NOT NULL,
      received_at DATETIME,
      channel TEXT,
      status TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      seller_id INTEGER,
      seller_name TEXT,
      seller_city TEXT,
      seller_state TEXT,
      total REAL,
      indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  
  // Criar tabela de itens do pedido
  await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_uuid TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL,
      FOREIGN KEY (order_uuid) REFERENCES orders(uuid),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  
  // Criar tabela de shipment
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      order_uuid TEXT PRIMARY KEY,
      carrier TEXT,
      service TEXT,
      status TEXT,
      tracking_code TEXT,
      FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
    )
  `);
  
  // Criar tabela de payments
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      order_uuid TEXT PRIMARY KEY,
      method TEXT,
      status TEXT,
      transaction_id TEXT,
      FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
    )
  `);
  
  // Criar tabela de metadata
  await db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      order_uuid TEXT PRIMARY KEY,
      source TEXT,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
    )
  `);
  
  // Criar índices para melhor performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_received_at ON orders(received_at);
    CREATE INDEX IF NOT EXISTS idx_orders_indexed_at ON orders(indexed_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_uuid ON order_items(order_uuid);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `);
  
  console.log('✅ Banco de dados inicializado com sucesso (modo WAL ativado)!');
}

// Função para verificar e migrar banco de dados existente
async function migrateDatabase() {
    const db = await getDatabase();
    
    try {
        // Verificar se a coluna received_at existe
        const tableInfo = await db.all("PRAGMA table_info(orders)");
        const hasReceivedAt = tableInfo.some(col => col.name === 'received_at');
        
        if (!hasReceivedAt) {
            console.log('⚠️ Coluna received_at não encontrada. Adicionando...');
            await db.exec("ALTER TABLE orders ADD COLUMN received_at DATETIME");
            await db.exec("UPDATE orders SET received_at = indexed_at WHERE received_at IS NULL");
            console.log('✅ Coluna received_at adicionada com sucesso!');
        } else {
            console.log('✅ Coluna received_at já existe!');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro na migração:', error);
        throw error;
    }
}

module.exports = { getDatabase, migrateDatabase };