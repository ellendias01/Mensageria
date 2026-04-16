const { getPool } = require('../config/database');

class Product {
  static async createOrUpdate(productData, conn = null) {
    const executor = conn || (await getPool());
    
    await executor.execute(
      `
        INSERT INTO products (
          id, name, unit_price, category_id, category_name, sub_category_id, sub_category_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          unit_price = VALUES(unit_price),
          category_id = VALUES(category_id),
          category_name = VALUES(category_name),
          sub_category_id = VALUES(sub_category_id),
          sub_category_name = VALUES(sub_category_name)
      `,
      [
        productData.id,
        productData.name,
        productData.unit_price,
        productData.category?.id || null,
        productData.category?.name || null,
        productData.category?.sub_category?.id || null,
        productData.category?.sub_category?.name || null
      ]
    );
    
    return productData;
  }
}

module.exports = Product;