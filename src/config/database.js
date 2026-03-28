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
  
  console.log('✅ Banco de dados inicializado com sucesso!');
}

module.exports = { getDatabase };