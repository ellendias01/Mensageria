require('dotenv').config();

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { getPool } = require('./database');

function toMySqlDateTime(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function loadAll(sqliteDb, tableName) {
  return sqliteDb.all(`SELECT * FROM ${tableName}`);
}

async function migrate() {
  const sqlitePath = process.env.SQLITE_PATH
    ? path.resolve(process.env.SQLITE_PATH)
    : path.resolve(__dirname, '../../database/database.sqlite');

  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`Arquivo SQLite não encontrado: ${sqlitePath}`);
  }

  console.log('='.repeat(60));
  console.log('🔁 MIGRAÇÃO SQLITE -> MYSQL');
  console.log('='.repeat(60));
  console.log(`📦 SQLite origem: ${sqlitePath}`);

  const sqliteDb = await open({
    filename: sqlitePath,
    driver: sqlite3.Database
  });

  const mysqlPool = await getPool();
  const mysqlConn = await mysqlPool.getConnection();

  try {
    const [
      customers,
      products,
      orders,
      orderItems,
      shipments,
      payments,
      metadata
    ] = await Promise.all([
      loadAll(sqliteDb, 'customers'),
      loadAll(sqliteDb, 'products'),
      loadAll(sqliteDb, 'orders'),
      loadAll(sqliteDb, 'order_items'),
      loadAll(sqliteDb, 'shipments'),
      loadAll(sqliteDb, 'payments'),
      loadAll(sqliteDb, 'metadata')
    ]);

    const customerIds = new Set(customers.map((c) => c.id));
    const missingCustomers = [];
    for (const o of orders) {
      const cid = o.customer_id;
      if (cid === null || cid === undefined) continue;
      if (!customerIds.has(cid)) {
        missingCustomers.push({
          id: cid,
          name: `Cliente ${cid} (migrado)`,
          email: `migrado+${cid}@local.invalid`,
          document: `MIGRADO-${cid}`,
          created_at: null
        });
        customerIds.add(cid);
      }
    }

    const productIds = new Set(products.map((p) => p.id));
    const missingProducts = [];
    for (const oi of orderItems) {
      const pid = oi.product_id;
      if (pid === null || pid === undefined) continue;
      if (!productIds.has(pid)) {
        missingProducts.push({
          id: pid,
          name: `Produto ${pid} (migrado)`,
          unit_price: oi.unit_price || 0,
          category_id: null,
          category_name: null,
          sub_category_id: null,
          sub_category_name: null,
          created_at: null
        });
        productIds.add(pid);
      }
    }

    const orderUuids = new Set(orders.map((o) => o.uuid));
    const missingOrders = [];
    const nowIso = new Date().toISOString();
    const fallbackCustomerId = 0;

    if (!customerIds.has(fallbackCustomerId)) {
      customers.push({
        id: fallbackCustomerId,
        name: 'Cliente desconhecido (migracao)',
        email: 'migrado+desconhecido@local.invalid',
        document: 'MIGRADO-UNKNOWN',
        created_at: nowIso
      });
      customerIds.add(fallbackCustomerId);
    }

    const relatedOrderUuids = [
      ...orderItems.map((oi) => oi.order_uuid),
      ...shipments.map((s) => s.order_uuid),
      ...payments.map((p) => p.order_uuid),
      ...metadata.map((m) => m.order_uuid)
    ];
    for (const uuid of relatedOrderUuids) {
      if (!uuid) continue;
      if (!orderUuids.has(uuid)) {
        missingOrders.push({
          uuid,
          created_at: nowIso,
          received_at: null,
          channel: 'migracao',
          status: 'created',
          customer_id: fallbackCustomerId,
          seller_id: null,
          seller_name: null,
          seller_city: null,
          seller_state: null,
          total: 0,
          indexed_at: nowIso
        });
        orderUuids.add(uuid);
      }
    }

    customers.push(...missingCustomers);
    products.push(...missingProducts);
    orders.push(...missingOrders);

    console.log(`👥 Clientes: ${customers.length}`);
    console.log(`📱 Produtos: ${products.length}`);
    console.log(`📦 Pedidos: ${orders.length}`);
    console.log(`🧾 Itens: ${orderItems.length}`);
    console.log(`🚚 Shipments: ${shipments.length}`);
    console.log(`💳 Payments: ${payments.length}`);
    console.log(`ℹ️ Metadata: ${metadata.length}`);
    if (missingCustomers.length || missingProducts.length || missingOrders.length) {
      console.log(
        `🛠️ Ajustes de integridade: +${missingCustomers.length} clientes, +${missingProducts.length} produtos e +${missingOrders.length} pedidos placeholder`
      );
    }

    await mysqlConn.beginTransaction();

    for (const c of customers) {
      await mysqlConn.execute(
        `
          INSERT INTO customers (id, name, email, document, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            document = VALUES(document),
            created_at = VALUES(created_at)
        `,
        [c.id, c.name, c.email, c.document, toMySqlDateTime(c.created_at)]
      );
    }

    for (const p of products) {
      await mysqlConn.execute(
        `
          INSERT INTO products (
            id, name, unit_price, category_id, category_name, sub_category_id, sub_category_name, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            unit_price = VALUES(unit_price),
            category_id = VALUES(category_id),
            category_name = VALUES(category_name),
            sub_category_id = VALUES(sub_category_id),
            sub_category_name = VALUES(sub_category_name),
            created_at = VALUES(created_at)
        `,
        [
          p.id,
          p.name,
          p.unit_price,
          p.category_id,
          p.category_name,
          p.sub_category_id,
          p.sub_category_name,
          toMySqlDateTime(p.created_at)
        ]
      );
    }

    for (const o of orders) {
      await mysqlConn.execute(
        `
          INSERT INTO orders (
            uuid, created_at, received_at, channel, status, customer_id, seller_id,
            seller_name, seller_city, seller_state, total, indexed_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            created_at = VALUES(created_at),
            received_at = VALUES(received_at),
            channel = VALUES(channel),
            status = VALUES(status),
            customer_id = VALUES(customer_id),
            seller_id = VALUES(seller_id),
            seller_name = VALUES(seller_name),
            seller_city = VALUES(seller_city),
            seller_state = VALUES(seller_state),
            total = VALUES(total),
            indexed_at = VALUES(indexed_at)
        `,
        [
          o.uuid,
          toMySqlDateTime(o.created_at),
          toMySqlDateTime(o.received_at),
          o.channel,
          o.status,
          o.customer_id,
          o.seller_id,
          o.seller_name,
          o.seller_city,
          o.seller_state,
          o.total,
          toMySqlDateTime(o.indexed_at)
        ]
      );
    }

    for (const oi of orderItems) {
      await mysqlConn.execute(
        `
          INSERT INTO order_items (id, order_uuid, product_id, quantity, unit_price, total)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            order_uuid = VALUES(order_uuid),
            product_id = VALUES(product_id),
            quantity = VALUES(quantity),
            unit_price = VALUES(unit_price),
            total = VALUES(total)
        `,
        [oi.id, oi.order_uuid, oi.product_id, oi.quantity, oi.unit_price, oi.total]
      );
    }

    for (const s of shipments) {
      await mysqlConn.execute(
        `
          INSERT INTO shipments (order_uuid, carrier, service, status, tracking_code)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            carrier = VALUES(carrier),
            service = VALUES(service),
            status = VALUES(status),
            tracking_code = VALUES(tracking_code)
        `,
        [s.order_uuid, s.carrier, s.service, s.status, s.tracking_code]
      );
    }

    for (const p of payments) {
      await mysqlConn.execute(
        `
          INSERT INTO payments (order_uuid, method, status, transaction_id)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            method = VALUES(method),
            status = VALUES(status),
            transaction_id = VALUES(transaction_id)
        `,
        [p.order_uuid, p.method, p.status, p.transaction_id]
      );
    }

    for (const m of metadata) {
      await mysqlConn.execute(
        `
          INSERT INTO metadata (order_uuid, source, user_agent, ip_address)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            source = VALUES(source),
            user_agent = VALUES(user_agent),
            ip_address = VALUES(ip_address)
        `,
        [m.order_uuid, m.source, m.user_agent, m.ip_address]
      );
    }

    await mysqlConn.commit();

    const [countRows] = await mysqlConn.execute(
      'SELECT COUNT(*) AS total_orders FROM orders'
    );
    const totalOrders = countRows && countRows.length ? countRows[0].total_orders : 0;

    console.log('\n✅ Migração concluída com sucesso!');
    console.log(`📦 Total de pedidos agora no MySQL: ${totalOrders}`);
  } catch (error) {
    await mysqlConn.rollback();
    throw error;
  } finally {
    mysqlConn.release();
    await sqliteDb.close();
    await mysqlPool.end();
  }
}

migrate().catch((error) => {
  console.error('\n❌ Falha na migração SQLite -> MySQL');
  console.error(error.message || error);
  process.exit(1);
});

