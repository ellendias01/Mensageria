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

// ✅ NOVO: Endpoint para testar publicação no Pub/Sub
app.post('/test-publish', async (req, res) => {
  try {
    const { PubSub } = require('@google-cloud/pubsub');
    
    // Caminho das credenciais
    const credPath = path.join(__dirname, '../../service-account.json');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    
    const pubsub = new PubSub({ projectId: 'serjava-demo' });
    const topic = pubsub.topic('aula-demo-pub');
    
    // Gerar pedido de teste
    const testOrder = {
      uuid: `ORD-DEMO-${Date.now()}`,
      created_at: new Date().toISOString(),
      channel: "web",
      status: "created",
      customer: {
        id: Math.floor(Math.random() * 10000) + 1000,
        name: "Cliente Demonstração",
        email: "demo@teste.com",
        document: "111.222.333-44"
      },
      seller: {
        id: 1,
        name: "Loja Demo",
        city: "São Paulo",
        state: "SP"
      },
      items: [{
        id: 1,
        product_id: Math.floor(Math.random() * 1000) + 9000,
        product_name: "Produto Demonstração",
        unit_price: 199.90,
        quantity: 1,
        category: {
          id: "DEMO",
          name: "Demonstração",
          sub_category: { id: "SUB", name: "Teste" }
        }
      }],
      shipment: {
        carrier: "Correios",
        service: "PAC",
        status: "pending",
        tracking_code: `DEMO${Date.now()}`
      },
      payment: {
        method: "pix",
        status: "pending",
        transaction_id: `PAY${Date.now()}`
      },
      metadata: {
        source: "monitor",
        user_agent: "RealTime Monitor",
        ip_address: "127.0.0.1"
      }
    };
    
    // Calcular total
    const total = testOrder.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    testOrder.total = total;
    
    console.log(`📤 Publicando pedido de teste: ${testOrder.uuid}`);
    
    const dataBuffer = Buffer.from(JSON.stringify(testOrder));
    const messageId = await topic.publish(dataBuffer);
    
    console.log(`✅ Mensagem publicada! ID: ${messageId}`);
    
    res.json({ 
      success: true, 
      messageId, 
      order: testOrder,
      message: `Pedido ${testOrder.uuid} publicado com sucesso!`
    });
    
  } catch (error) {
    console.error('❌ Erro ao publicar:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Erro ao publicar mensagem. Verifique as credenciais e permissões.'
    });
  }
});

// Rota principal (frontend)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// ✅ NOVA ROTA: Monitor em tempo real
app.get('/monitor', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/realtime-monitor.html'));
});

// Rota para o teste simples
app.get('/teste', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/teste-simples.html'));
});
// Tratamento de erro de porta
const server = app.listen(PORT, () => {
  console.log(`\n🚀 API rodando na porta ${PORT}`);
  console.log(`📋 Frontend principal: http://localhost:${PORT}`);
  console.log(`📊 Monitor em tempo real: http://localhost:${PORT}/monitor`);
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