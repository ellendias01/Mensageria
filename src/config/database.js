require('dotenv').config();

const mysql = require('mysql2/promise');

let pool = null;
let schemaReady = false;
let schemaReadyPromise = null;

function getEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

async function ensureSchema(p) {
  if (schemaReady) return;
  if (schemaReadyPromise) {
    await schemaReadyPromise;
    return;
  }

  schemaReadyPromise = (async () => {
    // Tabelas (MySQL/InnoDB)
    await p.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        document VARCHAR(64) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        category_id VARCHAR(64),
        category_name VARCHAR(255),
        sub_category_id VARCHAR(64),
        sub_category_name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS orders (
        uuid VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL,
        received_at DATETIME NULL,
        channel VARCHAR(64),
        status VARCHAR(32) NOT NULL,
        customer_id INT NOT NULL,
        seller_id INT,
        seller_name VARCHAR(255),
        seller_city VARCHAR(255),
        seller_state VARCHAR(64),
        total DECIMAL(12,2),
        indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (uuid),
        KEY idx_orders_customer_id (customer_id),
        KEY idx_orders_created_at (created_at),
        KEY idx_orders_received_at (received_at),
        KEY idx_orders_indexed_at (indexed_at),
        KEY idx_orders_status (status),
        CONSTRAINT fk_orders_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
          ON UPDATE RESTRICT ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT NOT NULL AUTO_INCREMENT,
        order_uuid VARCHAR(64) NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2),
        PRIMARY KEY (id),
        KEY idx_order_items_order_uuid (order_uuid),
        KEY idx_order_items_product_id (product_id),
        CONSTRAINT fk_order_items_order_uuid FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
          ON UPDATE RESTRICT ON DELETE RESTRICT,
        CONSTRAINT fk_order_items_product_id FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE RESTRICT ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        order_uuid VARCHAR(64) NOT NULL,
        carrier VARCHAR(255),
        service VARCHAR(255),
        status VARCHAR(64),
        tracking_code VARCHAR(255),
        PRIMARY KEY (order_uuid),
        CONSTRAINT fk_shipments_order_uuid FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
          ON UPDATE RESTRICT ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS payments (
        order_uuid VARCHAR(64) NOT NULL,
        method VARCHAR(64),
        status VARCHAR(64),
        transaction_id VARCHAR(255),
        PRIMARY KEY (order_uuid),
        CONSTRAINT fk_payments_order_uuid FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
          ON UPDATE RESTRICT ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS metadata (
        order_uuid VARCHAR(64) NOT NULL,
        source VARCHAR(255),
        user_agent TEXT,
        ip_address VARCHAR(64),
        PRIMARY KEY (order_uuid),
        CONSTRAINT fk_metadata_order_uuid FOREIGN KEY (order_uuid) REFERENCES orders(uuid)
          ON UPDATE RESTRICT ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    schemaReady = true;
  })();

  await schemaReadyPromise;
}

async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: getEnv('MYSQL_HOST', '127.0.0.1'),
      port: Number(getEnv('MYSQL_PORT', '3306')),
      user: getEnv('MYSQL_USER', 'root'),
      password: getEnv('MYSQL_PASSWORD', ''),
      database: getEnv('MYSQL_DATABASE', undefined),
      waitForConnections: true,
      connectionLimit: Number(getEnv('MYSQL_POOL_SIZE', '10')),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }

  await ensureSchema(pool);
  return pool;
}

async function withTransaction(fn) {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { getPool, withTransaction };