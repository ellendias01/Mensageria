const { getDatabase } = require('../config/database');

class Customer {
  static async createOrUpdate(customerData) {
    const db = await getDatabase();
    
    try {
      await db.run(`
        INSERT OR REPLACE INTO customers (id, name, email, document)
        VALUES (?, ?, ?, ?)
      `, [customerData.id, customerData.name, 
           customerData.email, customerData.document]);
      
      console.log(`✅ Cliente ${customerData.id} - ${customerData.name} salvo com sucesso!`);
      return customerData;
      
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    const db = await getDatabase();
    
    try {
      const customer = await db.get(`
        SELECT * FROM customers WHERE id = ?
      `, id);
      
      return customer;
      
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      throw error;
    }
  }
  
  static async findAll(page = 1, limit = 10) {
    const db = await getDatabase();
    const offset = (page - 1) * limit;
    
    try {
      const customers = await db.all(`
        SELECT * FROM customers
        ORDER BY id
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      const total = await db.get('SELECT COUNT(*) as total FROM customers');
      
      return {
        data: customers,
        pagination: {
          page,
          limit,
          total: total.total,
          totalPages: Math.ceil(total.total / limit)
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao listar clientes:', error);
      throw error;
    }
  }
  
  static async update(id, customerData) {
    const db = await getDatabase();
    
    try {
      await db.run(`
        UPDATE customers 
        SET name = ?, email = ?, document = ?
        WHERE id = ?
      `, [customerData.name, customerData.email, customerData.document, id]);
      
      return await this.findById(id);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    const db = await getDatabase();
    
    try {
      // Verificar se o cliente tem pedidos
      const orders = await db.get(`
        SELECT COUNT(*) as count FROM orders WHERE customer_id = ?
      `, id);
      
      if (orders.count > 0) {
        throw new Error('Cliente possui pedidos, não pode ser excluído');
      }
      
      await db.run('DELETE FROM customers WHERE id = ?', id);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error);
      throw error;
    }
  }
}

module.exports = Customer;