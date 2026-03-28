const express = require('express');
const OrderService = require('../../services/orderService');
const router = express.Router();

// GET /orders - Listar pedidos com paginação e filtros
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      orderBy = 'created_at', 
      orderDir = 'DESC',
      codigoCliente,
      product_id,
      status,
      uuid
    } = req.query;
    
    // Construir filtros
    const filters = {};
    if (codigoCliente) filters.codigoCliente = parseInt(codigoCliente);
    if (product_id) filters.product_id = parseInt(product_id);
    if (status) filters.status = status;
    if (uuid) filters.uuid = uuid;
    
    // Validar orderBy para evitar SQL injection
    const validOrderFields = ['created_at', 'uuid', 'status', 'total'];
    const finalOrderBy = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
    
    const result = await OrderService.listOrders(
      filters, 
      parseInt(page), 
      parseInt(limit), 
      finalOrderBy, 
      orderDir
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// GET /orders/statistics - Estatísticas dos pedidos
router.get('/statistics', async (req, res) => {
  try {
    const stats = await OrderService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /orders/:uuid - Buscar pedido específico
router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const order = await OrderService.getOrderByUuid(uuid);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json(order);
    
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PATCH /orders/:uuid/status - Atualizar status do pedido
router.patch('/:uuid/status', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    const updatedOrder = await OrderService.updateOrderStatus(uuid, status);
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json(updatedOrder);
    
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

module.exports = router;