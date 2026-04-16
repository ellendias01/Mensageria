const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ItemPedido = require('../models/ItemPedido');
const { getPool, withTransaction } = require('../config/database');

class OrderService {

  // 🔒 controle de concorrência (1 por vez)
  static processing = false;

  // 🔁 retry inteligente
  static async withRetry(fn, retries = 3, delay = 100) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {

        // ✅ duplicado = ignora
        if (
          (error && error.code === 'ER_DUP_ENTRY') ||
          (error && error.message && error.message.includes('Duplicate entry'))
        ) {
          console.log(`⚠️ Pedido duplicado detectado, ignorando...`);
          return { success: true, already_exists: true };
        }

        throw error;
      }
    }
  }

  static async processOrder(orderData) {
    return this.withRetry(async () => {
      const db = await getPool();

      // 🔒 evita concorrência
      while (this.processing) {
        console.log("⏳ Aguardando outro processamento terminar...");
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.processing = true;

      try {
        // ✅ evitar duplicidade antes de tudo
        const [existingRows] = await db.execute(
          'SELECT uuid FROM orders WHERE uuid = ?',
          [orderData.uuid]
        );
        const existingOrder = existingRows && existingRows.length ? existingRows[0] : null;

        if (existingOrder) {
          console.log(`⚠️ Pedido ${orderData.uuid} já existe. Ignorando.`);
          return {
            success: true,
            uuid: orderData.uuid,
            already_exists: true
          };
        }

        console.log(`\n📦 PROCESSANDO PEDIDO: ${orderData.uuid}`);

        if (orderData.received_at) {
          console.log(
            `📅 Recebido em: ${new Date(orderData.received_at).toLocaleString()}`
          );
        }

        // 1. calcular totais
        const { orderTotal, itemsWithTotal } = this.calculateTotals(orderData);
        orderData.total = orderTotal;
        orderData.items = itemsWithTotal;

        // 2. cliente
        await Customer.createOrUpdate(orderData.customer);

        // 3. produtos
        for (const item of orderData.items) {
          await Product.createOrUpdate({
            id: item.product_id,
            name: item.product_name,
            unit_price: item.unit_price,
            category: item.category
          });
        }

        const indexedAt = new Date().toISOString();

        // 🔥 TRANSAÇÃO (MySQL)
        await withTransaction(async (conn) => {
          // 4. pedido
          await Order.create(
            {
              ...orderData,
              received_at: orderData.received_at || null,
              indexed_at: indexedAt
            },
            conn
          );

          // 5. itens
          for (const item of orderData.items) {
            await ItemPedido.create(
              {
                order_uuid: orderData.uuid,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.total
              },
              conn
            );
          }
        });

        console.log(`✅ Pedido ${orderData.uuid} processado!`);
        console.log(`💰 Total: R$ ${orderTotal.toFixed(2)}`);
        console.log(`📦 Itens: ${orderData.items.length}`);
        console.log(`🕒 Indexado em: ${indexedAt}\n`);

        return {
          success: true,
          uuid: orderData.uuid,
          total: orderTotal,
          indexed_at: indexedAt,
          received_at: orderData.received_at
        };

      } catch (error) {
        console.error(`❌ Erro ao processar pedido ${orderData.uuid}:`, error.message);
        throw error;

      } finally {
        // 🔓 libera fila
        this.processing = false;
      }
    });
  }

  static calculateTotals(orderData) {
    let orderTotal = 0;

    const itemsWithTotal = orderData.items.map(item => {
      const total = item.unit_price * item.quantity;
      orderTotal += total;

      return {
        ...item,
        total
      };
    });

    return { orderTotal, itemsWithTotal };
  }

  static async getOrderByUuid(uuid) {
    return await Order.findByUuid(uuid);
  }

  static async listOrders(filters = {}, page = 1, limit = 10, orderBy = 'created_at', orderDir = 'DESC') {
    const result = await Order.findAll(filters, page, limit, orderBy, orderDir);

    const ordersWithDetails = [];
    for (const order of result.data) {
      const fullOrder = await Order.findByUuid(order.uuid);
      if (fullOrder) ordersWithDetails.push(fullOrder);
    }

    return {
      data: ordersWithDetails,
      pagination: result.pagination
    };
  }

  static async getStatistics() {
    const db = await getPool();

    const [rows] = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_amount,
        AVG(total) as average_amount,
        SUM(CASE WHEN status = 'created' THEN 1 ELSE 0 END) as created,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'separated' THEN 1 ELSE 0 END) as separated,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as canceled
      FROM orders
    `);

    return rows && rows.length ? rows[0] : null;
  }

  static async updateOrderStatus(uuid, newStatus) {
    const db = await getPool();

    const validStatus = ['created', 'paid', 'separated', 'shipped', 'delivered', 'canceled'];

    if (!validStatus.includes(newStatus)) {
      throw new Error('Status inválido');
    }

    await db.execute(
      `UPDATE orders SET status = ? WHERE uuid = ?`,
      [newStatus, uuid]
    );

    return await this.getOrderByUuid(uuid);
  }
}

module.exports = OrderService;