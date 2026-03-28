const express = require('express');
const Customer = require('../../models/Customer');
const router = express.Router();

// GET /customers - Listar clientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await Customer.findAll(parseInt(page), parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /customers/:id - Buscar cliente específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(parseInt(id));
    
    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /customers/:id - Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customerData = req.body;
    
    const updated = await Customer.update(parseInt(id), customerData);
    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /customers/:id - Deletar cliente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.delete(parseInt(id));
    res.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;