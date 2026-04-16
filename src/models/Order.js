const { getPool } = require('../config/database');

function toMySqlDateTime(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

class Order {
  static async create(orderData, conn = null) {
    const executor = conn || (await getPool());
    
    const createdAt = toMySqlDateTime(orderData.created_at);
    const receivedAt = toMySqlDateTime(orderData.received_at);
    const indexedAt = toMySqlDateTime(orderData.indexed_at || new Date());
    
    await executor.execute(
      `
        INSERT INTO orders (
          uuid, created_at, received_at, channel, status, customer_id,
          seller_id, seller_name, seller_city, seller_state, total, indexed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderData.uuid,
        createdAt,
        receivedAt,
        orderData.channel || null,
        orderData.status,
        orderData.customer.id,
        orderData.seller?.id || null,
        orderData.seller?.name || null,
        orderData.seller?.city || null,
        orderData.seller?.state || null,
        orderData.total,
        indexedAt
      ]
    );
    
    // Inserir shipment
    if (orderData.shipment) {
      await executor.execute(
        `
          INSERT INTO shipments (order_uuid, carrier, service, status, tracking_code)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            carrier = VALUES(carrier),
            service = VALUES(service),
            status = VALUES(status),
            tracking_code = VALUES(tracking_code)
        `,
        [
          orderData.uuid,
          orderData.shipment.carrier || null,
          orderData.shipment.service || null,
          orderData.shipment.status || null,
          orderData.shipment.tracking_code || null
        ]
      );
    }
    
    // Inserir payment
    if (orderData.payment) {
      await executor.execute(
        `
          INSERT INTO payments (order_uuid, method, status, transaction_id)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            method = VALUES(method),
            status = VALUES(status),
            transaction_id = VALUES(transaction_id)
        `,
        [
          orderData.uuid,
          orderData.payment.method || null,
          orderData.payment.status || null,
          orderData.payment.transaction_id || null
        ]
      );
    }
    
    // Inserir metadata
    if (orderData.metadata) {
      await executor.execute(
        `
          INSERT INTO metadata (order_uuid, source, user_agent, ip_address)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            source = VALUES(source),
            user_agent = VALUES(user_agent),
            ip_address = VALUES(ip_address)
        `,
        [
          orderData.uuid,
          orderData.metadata.source || null,
          orderData.metadata.user_agent || null,
          orderData.metadata.ip_address || null
        ]
      );
    }
    
    return orderData;
  }
  
  static async findByUuid(uuid) {
    const db = await getPool();
    
    const [orderRows] = await db.execute(
      `
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.document as customer_document
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.uuid = ?
      `,
      [uuid]
    );
    const order = orderRows && orderRows.length ? orderRows[0] : null;
    
    if (!order) return null;
    
    const [items] = await db.execute(
      `
      SELECT oi.*, p.name as product_name, p.category_id, p.category_name, 
             p.sub_category_id, p.sub_category_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_uuid = ?
      `,
      [uuid]
    );
    
    const [shipmentRows] = await db.execute(
      `SELECT * FROM shipments WHERE order_uuid = ?`,
      [uuid]
    );
    const shipment = shipmentRows && shipmentRows.length ? shipmentRows[0] : null;
    
    const [paymentRows] = await db.execute(
      `SELECT * FROM payments WHERE order_uuid = ?`,
      [uuid]
    );
    const payment = paymentRows && paymentRows.length ? paymentRows[0] : null;
    
    const [metadataRows] = await db.execute(
      `SELECT * FROM metadata WHERE order_uuid = ?`,
      [uuid]
    );
    const metadata = metadataRows && metadataRows.length ? metadataRows[0] : null;
    
    return {
      uuid: order.uuid,
      created_at: order.created_at,
      received_at: order.received_at,
      indexed_at: order.indexed_at,
      channel: order.channel,
      total: Number(order.total),
      status: order.status,
      customer: {
        id: order.customer_id,
        name: order.customer_name,
        email: order.customer_email,
        document: order.customer_document
      },
      seller: {
        id: order.seller_id,
        name: order.seller_name,
        city: order.seller_city,
        state: order.seller_state
      },
      items: items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: Number(item.unit_price),
        quantity: item.quantity,
        total: Number(item.total),
        category: {
          id: item.category_id,
          name: item.category_name,
          sub_category: {
            id: item.sub_category_id,
            name: item.sub_category_name
          }
        }
      })),
      shipment: shipment || null,
      payment: payment || null,
      metadata: metadata || null
    };
  }
  
  static async findAll(filters = {}, page = 1, limit = 10, orderBy = 'created_at', orderDir = 'DESC') {
    const db = await getPool();
    const offset = (page - 1) * limit;
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(1000, Number(limit))) : 10;
    const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
    
    let whereClause = [];
    let params = [];
    
    if (filters.uuid) {
      whereClause.push('o.uuid = ?');
      params.push(filters.uuid);
    }
    
    if (filters.codigoCliente) {
      whereClause.push('o.customer_id = ?');
      params.push(filters.codigoCliente);
    }
    
    if (filters.product_id) {
      whereClause.push(`EXISTS (
        SELECT 1 FROM order_items oi 
        WHERE oi.order_uuid = o.uuid AND oi.product_id = ?
      )`);
      params.push(filters.product_id);
    }
    
    if (filters.status) {
      whereClause.push('o.status = ?');
      params.push(filters.status);
    }
    
    const whereString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    const [orders] = await db.execute(
      `
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.document as customer_document
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereString}
      ORDER BY o.${orderBy} ${orderDir}
      LIMIT ${safeLimit} OFFSET ${safeOffset}
      `,
      params
    );
    
    const [countRows] = await db.execute(
      `
        SELECT COUNT(*) as total
        FROM orders o
        ${whereString}
      `,
      params
    );
    const countResult = countRows && countRows.length ? countRows[0] : { total: 0 };
    
    return {
      data: orders,
      pagination: {
        page,
        limit,
        total: Number(countResult.total),
        totalPages: Math.ceil(Number(countResult.total) / limit)
      }
    };
  }
}

module.exports = Order;