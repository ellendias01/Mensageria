const express = require('express');
const cors = require('cors');
const path = require('path');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../public')));

// Rotas da API
app.use('/orders', ordersRouter);
app.use('/customers', customersRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'API de Gerenciamento de Pedidos'
  });
});

// Rota principal (frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Tratamento de erro de porta
const server = app.listen(PORT, () => {
  console.log(`\n🚀 API rodando na porta ${PORT}`);
  console.log(`📋 Frontend: http://localhost:${PORT}`);
  console.log(`📋 API: http://localhost:${PORT}/orders\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n❌ Porta ${PORT} já está em uso!`);
    console.log(`\n💡 Soluções:`);
    console.log(`   1. Matar o processo: netstat -ano | findstr :${PORT}`);
    console.log(`   2. Usar porta diferente: $env:PORT=3002; npm start\n`);
  } else {
    console.error('Erro:', err);
  }
});