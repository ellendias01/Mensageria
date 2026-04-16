const { getPool } = require('../config/database');

class ItemPedido {
  static async create(itemData, conn = null) {
    const executor = conn || (await getPool());
    
    await executor.execute(
      `
        INSERT INTO order_items (order_uuid, product_id, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        itemData.order_uuid,
        itemData.product_id,
        itemData.quantity,
        itemData.unit_price,
        itemData.total
      ]
    );
    
    return itemData;
  }
}

module.exports = ItemPedido;