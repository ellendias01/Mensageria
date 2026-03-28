const { PubSub } = require('@google-cloud/pubsub');
const path = require('path');

// Configurar credenciais
const credPath = path.join(__dirname, '../../service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

console.log('='.repeat(60));
console.log('📤 PUBLICADOR DE TESTE - Pub/Sub');
console.log('='.repeat(60));

const pubsub = new PubSub({
  projectId: 'serjava-demo'
});

// Nome do tópico (conforme o professor configurou)
const TOPIC_NAME = 'aula-demo-pub';

// Gerar pedido de exemplo
function generateTestOrder() {
  const orderId = `ORD-TEST-${Date.now()}`;
  
  return {
    uuid: orderId,
    created_at: new Date().toISOString(),
    channel: "test_publisher",
    status: "created",
    customer: {
      id: 9999,
      name: "Cliente Teste Pub/Sub",
      email: "teste@pubsub.com",
      document: "111.222.333-44"
    },
    seller: {
      id: 1,
      name: "Loja Teste",
      city: "São Paulo",
      state: "SP"
    },
    items: [
      {
        id: 1,
        product_id: 9999,
        product_name: "Produto Teste",
        unit_price: 100.00,
        quantity: 2,
        category: {
          id: "TEST",
          name: "Teste",
          sub_category: {
            id: "SUB",
            name: "Subteste"
          }
        }
      }
    ],
    shipment: {
      carrier: "Correios",
      service: "PAC",
      status: "pending",
      tracking_code: `TRK${Date.now()}`
    },
    payment: {
      method: "pix",
      status: "pending",
      transaction_id: `PAY${Date.now()}`
    },
    metadata: {
      source: "test_publisher",
      user_agent: "Test Script",
      ip_address: "127.0.0.1"
    }
  };
}

async function publishTestMessage() {
  try {
    console.log(`\n📡 Configuração:`);
    console.log(`   Projeto: serjava-demo`);
    console.log(`   Tópico: ${TOPIC_NAME}\n`);
    
    // Verificar se o tópico existe
    const topic = pubsub.topic(TOPIC_NAME);
    
    try {
      const [exists] = await topic.exists();
      if (!exists) {
        console.log(`⚠️ Tópico "${TOPIC_NAME}" não encontrado!`);
        console.log(`💡 Verifique com o professor se este é o nome correto.\n`);
        return;
      }
      console.log(`✅ Tópico encontrado!\n`);
    } catch (error) {
      if (error.message.includes('PERMISSION_DENIED')) {
        console.log(`⚠️ Sem permissão para verificar o tópico.`);
        console.log(`💡 Tentando publicar mesmo assim...\n`);
      }
    }
    
    // Gerar pedido de teste
    const order = generateTestOrder();
    const total = order.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    
    console.log(`📦 Pedido de teste:`);
    console.log(`   UUID: ${order.uuid}`);
    console.log(`   Cliente: ${order.customer.name}`);
    console.log(`   Itens: ${order.items.length}`);
    console.log(`   Total: R$ ${total.toFixed(2)}\n`);
    
    // Publicar mensagem
    const dataBuffer = Buffer.from(JSON.stringify(order));
    const messageId = await topic.publish(dataBuffer);
    
    console.log(`✅ MENSAGEM PUBLICADA COM SUCESSO!`);
    console.log(`   Message ID: ${messageId}`);
    console.log(`   Publicado em: ${new Date().toISOString()}`);
    console.log(`\n💡 Verifique o terminal do consumidor para ver o processamento!\n`);
    
  } catch (error) {
    console.error(`❌ Erro ao publicar: ${error.message}`);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log(`\n⚠️ PERMISSÃO NEGADA!`);
      console.log(`\n🔧 Envie esta mensagem ao professor:`);
      console.log(`   "Preciso da permissão roles/pubsub.publisher para a conta`);
      console.log(`    sa-pubsub-grupo2@serjava-demo.iam.gserviceaccount.com`);
      console.log(`    no tópico ${TOPIC_NAME}"\n`);
    } else if (error.message.includes('NOT_FOUND')) {
      console.log(`\n⚠️ Tópico não encontrado!`);
      console.log(`   Verifique com o professor o nome correto do tópico.\n`);
    }
  }
}

// Executar
publishTestMessage();