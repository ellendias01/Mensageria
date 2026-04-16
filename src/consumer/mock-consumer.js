const OrderService = require('../services/orderService');
const { getPool } = require('../config/database');

console.log('='.repeat(60));
console.log('🎭 CONSUMIDOR MOCK - MODO DE TESTE');
console.log('='.repeat(60));
console.log('⚠️  Usando dados simulados (sem Pub/Sub real)');
console.log('💡 Este modo é apenas para testar a API e o banco de dados\n');

// Função para gerar UUID único
function generateUUID() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

// Gerar dados de exemplo variados
function generateMockOrders() {
  const customers = [
    { id: 1001, name: "Maria Silva", email: "maria@email.com", document: "111.222.333-44" },
    { id: 1002, name: "João Santos", email: "joao@email.com", document: "222.333.444-55" },
    { id: 1003, name: "Ana Oliveira", email: "ana@email.com", document: "333.444.555-66" },
    { id: 1004, name: "Pedro Costa", email: "pedro@email.com", document: "444.555.666-77" }
  ];
  
  const products = [
    { id: 2001, name: "Smartphone Galaxy", price: 2500.00, category: "Eletrônicos" },
    { id: 2002, name: "Notebook Dell", price: 4500.00, category: "Computadores" },
    { id: 2003, name: "Fone Bluetooth", price: 150.00, category: "Acessórios" },
    { id: 2004, name: "Carregador Portátil", price: 80.00, category: "Acessórios" }
  ];
  
  const statuses = ['created', 'paid', 'shipped', 'delivered'];
  const channels = ['web', 'mobile_app', 'api'];
  
  const orders = [];
  
  // Gerar 10 pedidos de exemplo
  for (let i = 0; i < 10; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const numItems = Math.floor(Math.random() * 3) + 1;
    const items = [];
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      items.push({
        id: j + 1,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: quantity,
        category: {
          id: product.category.toUpperCase().substr(0, 4),
          name: product.category,
          sub_category: {
            id: "SUB" + product.id,
            name: product.name.split(' ')[0]
          }
        }
      });
    }
    
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30));
    
    orders.push({
      uuid: generateUUID(),
      created_at: orderDate.toISOString(),
      channel: channels[Math.floor(Math.random() * channels.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      customer: customer,
      seller: {
        id: 55,
        name: "Tech Store",
        city: "São Paulo",
        state: "SP"
      },
      items: items,
      shipment: {
        carrier: "Correios",
        service: "PAC",
        status: "shipped",
        tracking_code: `BR${Math.random().toString(36).substr(2, 8).toUpperCase()}`
      },
      payment: {
        method: Math.random() > 0.5 ? "pix" : "credit_card",
        status: "approved",
        transaction_id: `pay_${Math.random().toString(36).substr(2, 10)}`
      },
      metadata: {
        source: "mock",
        user_agent: "Mock Consumer",
        ip_address: "127.0.0.1"
      }
    });
  }
  
  return orders;
}

async function processMockOrders() {
  const orders = generateMockOrders();
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`📦 Gerados ${orders.length} pedidos de exemplo para processamento\n`);
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    console.log(`[${i + 1}/${orders.length}] Processando pedido: ${order.uuid}`);
    console.log(`   Cliente: ${order.customer.name}`);
    console.log(`   Itens: ${order.items.length}`);
    
    const total = order.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    console.log(`   Total esperado: R$ ${total.toFixed(2)}`);
    
    try {
      const result = await OrderService.processOrder(order);
      if (result.success) {
        successCount++;
        console.log(`   ✅ Sucesso! Total processado: R$ ${result.total.toFixed(2)}`);
      } else {
        errorCount++;
        console.log(`   ⚠️ Processado com avisos`);
      }
    } catch (error) {
      errorCount++;
      console.error(`   ❌ Erro: ${error.message}`);
    }
    console.log('');
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('='.repeat(60));
  console.log('📊 RESUMO DO PROCESSAMENTO MOCK:');
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📦 Total: ${orders.length}`);
  console.log('='.repeat(60));
  
  // Verificar dados no banco
  const db = await getPool();
  const [orderRows] = await db.execute('SELECT COUNT(*) as total FROM orders');
  const [customerRows] = await db.execute('SELECT COUNT(*) as total FROM customers');
  const [productRows] = await db.execute('SELECT COUNT(*) as total FROM products');
  const [valueRows] = await db.execute('SELECT SUM(total) as total FROM orders');
  const orderCount = orderRows && orderRows.length ? orderRows[0] : { total: 0 };
  const customerCount = customerRows && customerRows.length ? customerRows[0] : { total: 0 };
  const productCount = productRows && productRows.length ? productRows[0] : { total: 0 };
  const totalValue = valueRows && valueRows.length ? valueRows[0] : { total: 0 };
  
  console.log('\n📈 ESTATÍSTICAS DO BANCO DE DADOS:');
  console.log(`   📦 Pedidos: ${orderCount.total}`);
  console.log(`   👥 Clientes: ${customerCount.total}`);
  console.log(`   📱 Produtos: ${productCount.total}`);
  console.log(`   💰 Valor total: R$ ${(Number(totalValue.total) || 0).toFixed(2)}`);
  console.log('\n✅ Processamento MOCK concluído!');
  console.log('💡 Agora você pode testar a API:');
  console.log('   curl http://localhost:3001/orders');
  console.log('   curl http://localhost:3001/orders/statistics\n');
  
}

// Executar
processMockOrders().catch(console.error);