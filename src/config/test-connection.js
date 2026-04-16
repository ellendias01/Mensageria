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

function generateTestOrder() {
  const uuid =
    `ORD-DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const customer = {
    id: Math.floor(Math.random() * 9000) + 1000,
    name: 'Cliente Demo',
    email: 'cliente.demo@email.com',
    document: '111.222.333-44'
  };

  const seller = {
    id: 55,
    name: 'Tech Store',
    city: 'São Paulo',
    state: 'SP'
  };

  const items = [
    {
      id: 1,
      product_id: Math.floor(Math.random() * 1000) + 9000,
      product_name: 'Produto Demo',
      unit_price: 199.9,
      quantity: 2,
      category: {
        id: 'DEMO',
        name: 'Demonstração',
        sub_category: { id: 'SUB', name: 'Teste' }
      }
    }
  ];

  return {
    uuid,
    created_at: new Date().toISOString(),
    channel: 'web',
    status: 'created',
    customer,
    seller,
    items,
    shipment: {
      carrier: 'Correios',
      service: 'PAC',
      status: 'pending',
      tracking_code: `DEMO${Date.now()}`
    },
    payment: {
      method: 'pix',
      status: 'pending',
      transaction_id: `PAY${Math.random()
        .toString(36)
        .slice(2, 10)}`
    },
    metadata: {
      source: 'test-connection',
      user_agent: 'Test Connection',
      ip_address: '127.0.0.1'
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