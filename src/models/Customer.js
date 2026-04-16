const { getPool } = require('../config/database');

class Customer {
  static async createOrUpdate(customerData, conn = null) {
    const executor = conn || (await getPool());
    
    try {
      await executor.execute(
        `
          INSERT INTO customers (id, name, email, document)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            document = VALUES(document)
        `,
        [customerData.id, customerData.name, customerData.email, customerData.document]
      );
      
      console.log(`✅ Cliente ${customerData.id} - ${customerData.name} salvo com sucesso!`);
      return customerData;
      
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    const db = await getPool();
    
    try {
      const [rows] = await db.execute(`SELECT * FROM customers WHERE id = ?`, [id]);
      const customer = rows && rows.length ? rows[0] : null;
      
      return customer;
      
    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      throw error;
    }
  }
  
  static async findAll(page = 1, limit = 10) {
    const db = await getPool();
    const offset = (page - 1) * limit;
    
    try {
      const [customers] = await db.execute(
        `
        SELECT * FROM customers
        ORDER BY id
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
      );
      
      const [totalRows] = await db.execute('SELECT COUNT(*) as total FROM customers');
      const total = totalRows && totalRows.length ? totalRows[0] : { total: 0 };
      
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
    const db = await getPool();
    
    try {
      await db.execute(
        `
        UPDATE customers 
        SET name = ?, email = ?, document = ?
        WHERE id = ?
        `,
        [customerData.name, customerData.email, customerData.document, id]
      );
      
      return await this.findById(id);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar cliente:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    const db = await getPool();
    
    try {
      // Verificar se o cliente tem pedidos
      const [orderRows] = await db.execute(
        `SELECT COUNT(*) as count FROM orders WHERE customer_id = ?`,
        [id]
      );
      const orders = orderRows && orderRows.length ? orderRows[0] : { count: 0 };
      
      if (orders.count > 0) {
        throw new Error('Cliente possui pedidos, não pode ser excluído');
      }
      
      await db.execute('DELETE FROM customers WHERE id = ?', [id]);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao deletar cliente:', error);
      throw error;
    }
  }
}

module.exports = Customer;