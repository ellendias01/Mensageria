const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ItemPedido = require('../models/ItemPedido');
const { getDatabase } = require('../config/database');

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
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️ Pedido duplicado detectado, ignorando...`);
          return { success: true, already_exists: true };
        }

        // 🔒 banco ocupado
        if (error.message && error.message.includes('SQLITE_BUSY') && i < retries - 1) {
          const waitTime = delay * Math.pow(2, i);
          console.log(`⏳ Banco ocupado, retry ${i + 1}/${retries} em ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        throw error;
      }
    }
  }

  static async processOrder(orderData) {
    return this.withRetry(async () => {

      const db = await getDatabase();

      // 🔒 evita concorrência
      while (this.processing) {
        console.log("⏳ Aguardando outro processamento terminar...");
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.processing = true;

      try {
        // ✅ evitar duplicidade antes de tudo
        const existingOrder = await db.get(
          'SELECT uuid FROM orders WHERE uuid = ?',
          [orderData.uuid]
        );

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
          orderData.received_at = new Date().toISOString();
          console.log(`📅 Recebido em: ${new Date(orderData.received_at).toLocaleString()}`);
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

        // 🔥 TRANSAÇÃO SEGURA
        await db.exec('BEGIN IMMEDIATE');

        try {
          // 4. pedido
           await Order.create({
      ...orderData,
      received_at: orderData.received_at,  // Garantir que está sendo passado
      indexed_at: new Date().toISOString()
    })

          // 5. itens
          for (const item of orderData.items) {
            await ItemPedido.create({
              order_uuid: orderData.uuid,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total
            });
          }

          // ✅ commit
          await db.exec('COMMIT');

        } catch (error) {
          console.log("💥 Erro dentro da transação, fazendo ROLLBACK...");
          await db.exec('ROLLBACK');
          throw error;
        }

        const indexedAt = new Date().toISOString();

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
    const db = await getDatabase();

    return await db.get(`
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
  }

  static async updateOrderStatus(uuid, newStatus) {
    const db = await getDatabase();

    const validStatus = ['created', 'paid', 'separated', 'shipped', 'delivered', 'canceled'];

    if (!validStatus.includes(newStatus)) {
      throw new Error('Status inválido');
    }

    await db.run(
      `UPDATE orders SET status = ? WHERE uuid = ?`,
      [newStatus, uuid]
    );

    return await this.getOrderByUuid(uuid);
  }
}

module.exports = OrderService;