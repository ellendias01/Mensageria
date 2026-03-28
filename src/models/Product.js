const { getDatabase } = require('../config/database');

class Product {
  static async createOrUpdate(productData) {
    const db = await getDatabase();
    
    await db.run(`
      INSERT OR REPLACE INTO products (id, name, unit_price, category_id, 
                                      category_name, sub_category_id, sub_category_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [productData.id, productData.name, productData.unit_price,
         productData.category?.id, productData.category?.name,
         productData.category?.sub_category?.id, productData.category?.sub_category?.name]);
    
    return productData;
  }
}

module.exports = Product;