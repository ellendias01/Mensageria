const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const ItemPedido = require('../models/ItemPedido');
const { getDatabase } = require('../config/database');

class OrderService {
  
  /**
   * Processa um pedido recebido do Pub/Sub
   */
  static async processOrder(orderData) {
    const db = await getDatabase();
    
    try {
      console.log(`📦 Processando pedido: ${orderData.uuid}`);
      console.log(`   📅 Data de recebimento: ${new Date().toLocaleString('pt-BR')}`);
      
      // 1. Calcular totais
      const { orderTotal, itemsWithTotal } = this.calculateTotals(orderData);
      orderData.total = orderTotal;
      orderData.items = itemsWithTotal;
      
      // 2. Salvar ou atualizar cliente
      await Customer.createOrUpdate(orderData.customer);
      
      // 3. Salvar produtos
      for (const item of orderData.items) {
        await Product.createOrUpdate({
          id: item.product_id,
          name: item.product_name,
          unit_price: item.unit_price,
          category: item.category
        });
      }
      
      // 4. Salvar pedido (já inclui indexed_at)
      await Order.create(orderData);
      
      // 5. Salvar itens do pedido
      for (const item of orderData.items) {
        await ItemPedido.create({
          order_uuid: orderData.uuid,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        });
      }
      
      console.log(`✅ Pedido ${orderData.uuid} processado com sucesso!`);
      console.log(`   Total: R$ ${orderTotal.toFixed(2)}`);
      console.log(`   Itens: ${orderData.items.length}`);
      console.log(`   💾 Data de salvamento: ${new Date().toLocaleString('pt-BR')}`);
      
      return {
        success: true,
        uuid: orderData.uuid,
        total: orderTotal,
        received_at: new Date().toISOString(),
        saved_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Erro ao processar pedido ${orderData.uuid}:`, error);
      throw error;
    }
  }
  
  /**
   * Calcula os totais do pedido e itens
   */
  static calculateTotals(orderData) {
    let orderTotal = 0;
    
    const itemsWithTotal = orderData.items.map(item => {
      const itemTotal = item.unit_price * item.quantity;
      orderTotal += itemTotal;
      
      return {
        ...item,
        total: itemTotal
      };
    });
    
    return { orderTotal, itemsWithTotal };
  }
  
  /**
   * Busca pedido por UUID com todos os detalhes
   */
  static async getOrderByUuid(uuid) {
    try {
      const order = await Order.findByUuid(uuid);
      
      if (!order) {
        return null;
      }
      
      // Calcular totais novamente para garantir consistência
      let total = 0;
      order.items.forEach(item => {
        total += item.total;
      });
      order.total = total;
      
      return order;
      
    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      throw error;
    }
  }
  
  /**
   * Lista pedidos com filtros e paginação
   */
  static async listOrders(filters = {}, page = 1, limit = 10, orderBy = 'created_at', orderDir = 'DESC') {
    try {
      const result = await Order.findAll(filters, page, limit, orderBy, orderDir);
      
      // Buscar dados completos para cada pedido
      const ordersWithDetails = [];
      for (const order of result.data) {
        const fullOrder = await Order.findByUuid(order.uuid);
        if (fullOrder) {
          ordersWithDetails.push(fullOrder);
        }
      }
      
      return {
        data: ordersWithDetails,
        pagination: result.pagination
      };
      
    } catch (error) {
      console.error('❌ Erro ao listar pedidos:', error);
      throw error;
    }
  }
  
  /**
   * Obtém estatísticas dos pedidos
   */
  static async getStatistics() {
    const db = await getDatabase();
    
    try {
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'created' THEN 1 ELSE 0 END) as created,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
          SUM(CASE WHEN status = 'separated' THEN 1 ELSE 0 END) as separated,
          SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as canceled,
          SUM(total) as total_amount,
          AVG(total) as average_amount
        FROM orders
      `);
      
      return stats;
      
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      throw error;
    }
  }
  
  /**
   * Atualiza status do pedido
   */
  static async updateOrderStatus(uuid, newStatus) {
    const db = await getDatabase();
    
    const validStatus = ['created', 'paid', 'separated', 'shipped', 'delivered', 'canceled'];
    if (!validStatus.includes(newStatus)) {
      throw new Error('Status inválido');
    }
    
    try {
      await db.run(`
        UPDATE orders 
        SET status = ?
        WHERE uuid = ?
      `, [newStatus, uuid]);
      
      const updatedOrder = await this.getOrderByUuid(uuid);
      
      console.log(`🔄 Status do pedido ${uuid} atualizado para: ${newStatus}`);
      
      return updatedOrder;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }
}

module.exports = OrderService;