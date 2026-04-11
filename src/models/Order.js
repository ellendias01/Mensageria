const { getDatabase } = require('../config/database');

class Order {
  static async create(orderData) {
    const db = await getDatabase();
    
    // ⚠️ IMPORTANTE: NÃO colocar BEGIN TRANSACTION aqui!
    // A transação já é controlada pelo OrderService
    
    // Inserir pedido
    await db.run(`
      INSERT INTO orders (uuid, created_at, received_at, channel, status, customer_id, 
                         seller_id, seller_name, seller_city, seller_state, total, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,  [orderData.uuid, orderData.created_at, receivedAt, orderData.channel, 
       orderData.status, orderData.customer.id,
       orderData.seller.id, orderData.seller.name, 
       orderData.seller.city, orderData.seller.state, orderData.total,
       indexedAt]);
    
    // Inserir shipment
    if (orderData.shipment) {
      await db.run(`
        INSERT INTO shipments (order_uuid, carrier, service, status, tracking_code)
        VALUES (?, ?, ?, ?, ?)
      `, [orderData.uuid, orderData.shipment.carrier, 
           orderData.shipment.service, orderData.shipment.status, 
           orderData.shipment.tracking_code]);
    }
    
    // Inserir payment
    if (orderData.payment) {
      await db.run(`
        INSERT INTO payments (order_uuid, method, status, transaction_id)
        VALUES (?, ?, ?, ?)
      `, [orderData.uuid, orderData.payment.method, 
           orderData.payment.status, orderData.payment.transaction_id]);
    }
    
    // Inserir metadata
    if (orderData.metadata) {
      await db.run(`
        INSERT INTO metadata (order_uuid, source, user_agent, ip_address)
        VALUES (?, ?, ?, ?)
      `, [orderData.uuid, orderData.metadata.source, 
           orderData.metadata.user_agent, orderData.metadata.ip_address]);
    }
    
    return orderData;
  }
  
  static async findByUuid(uuid) {
    const db = await getDatabase();
    
    const order = await db.get(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.document as customer_document
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.uuid = ?
    `, uuid);
    
    if (!order) return null;
    
    const items = await db.all(`
      SELECT oi.*, p.name as product_name, p.category_id, p.category_name, 
             p.sub_category_id, p.sub_category_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_uuid = ?
    `, uuid);
    
    const shipment = await db.get(`
      SELECT * FROM shipments WHERE order_uuid = ?
    `, uuid);
    
    const payment = await db.get(`
      SELECT * FROM payments WHERE order_uuid = ?
    `, uuid);
    
    const metadata = await db.get(`
      SELECT * FROM metadata WHERE order_uuid = ?
    `, uuid);
    
    return {
      uuid: order.uuid,
      created_at: order.created_at,
      received_at: order.received_at,
      indexed_at: order.indexed_at,
      channel: order.channel,
      total: order.total,
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
        unit_price: item.unit_price,
        quantity: item.quantity,
        total: item.total,
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
    const db = await getDatabase();
    const offset = (page - 1) * limit;
    
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
    
    const orders = await db.all(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.document as customer_document
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereString}
      ORDER BY o.${orderBy} ${orderDir}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const countResult = await db.get(`
      SELECT COUNT(*) as total FROM orders o
      ${whereString}
    `, params);
    
    return {
      data: orders,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit)
      }
    };
  }
}

module.exports = Order;