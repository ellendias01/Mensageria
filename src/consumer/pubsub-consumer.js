const { PubSub } = require('@google-cloud/pubsub');
const path = require('path');
const OrderService = require('../services/orderService');

// Configurar credenciais
const credPath = path.join(__dirname, '../../service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

console.log('='.repeat(60));
console.log('🚀 CONSUMIDOR PUB/SUB - GRUPO 2');
console.log('='.repeat(60));

const pubsub = new PubSub({
  projectId: 'serjava-demo'
});

const SUBSCRIPTION_NAME = 'sub-grupo2';  // Subscription que você tem
const TOPIC_NAME = 'aula-demo-pub';

let messageCount = 0;
let isConnected = false;

async function processMessage(message) {
  try {
    messageCount++;
    const receivedAt = new Date();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📨 MENSAGEM #${messageCount}`);
    console.log('='.repeat(60));
    console.log(`🆔 Message ID: ${message.id}`);
    console.log(`⏰ Recebida em: ${receivedAt.toLocaleString()}`);
    console.log(`📦 Tamanho: ${message.data.length} bytes`);
    
    // Parse da mensagem
    const orderData = JSON.parse(message.data.toString());
    
    console.log(`\n📋 DADOS DO PEDIDO:`);
    console.log(`   UUID: ${orderData.uuid}`);
    console.log(`   Canal: ${orderData.channel}`);
    console.log(`   Status: ${orderData.status}`);
    console.log(`   Data do pedido: ${orderData.created_at}`);
    
    console.log(`\n👤 CLIENTE:`);
    console.log(`   ID: ${orderData.customer.id}`);
    console.log(`   Nome: ${orderData.customer.name}`);
    console.log(`   Email: ${orderData.customer.email}`);
    
    console.log(`\n📦 ITENS (${orderData.items.length}):`);
    orderData.items.forEach((item, idx) => {
      const subtotal = item.unit_price * item.quantity;
      console.log(`   ${idx + 1}. ${item.product_name} - ${item.quantity}x R$ ${item.unit_price.toFixed(2)} = R$ ${subtotal.toFixed(2)}`);
    });
    
    // Processar pedido
    console.log(`\n🔄 Processando pedido...`);
    const result = await OrderService.processOrder(orderData);
    
    if (result.success) {
      console.log(`\n✅ PEDIDO PROCESSADO COM SUCESSO!`);
      console.log(`   💵 Total do pedido: R$ ${result.total.toFixed(2)}`);
      console.log(`   🕒 Indexado em: ${result.indexed_at}`);
      console.log(`   💾 Banco de dados: SQLite`);
      
      // Confirmar mensagem
      message.ack();
      console.log(`\n✅ Mensagem confirmada (ACK) e removida da fila.`);
    } else {
      throw new Error('Falha no processamento');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error(`\n❌ ERRO AO PROCESSAR MENSAGEM:`);
    console.error(`   ${error.message}`);
    console.log(`\n⚠️ Mensagem será reenviada (NACK)...`);
    message.nack();
  }
}

async function startConsumer() {
  console.log(`\n📡 Conectando à subscription: ${SUBSCRIPTION_NAME}`);
  console.log(`🏢 Projeto: serjava-demo`);
  console.log(`🔑 Usando conta de serviço: sa-pubsub-grupo2`);
  
  try {
    // Obter a subscription diretamente (sem verificar existência)
    const subscription = pubsub.subscription(SUBSCRIPTION_NAME, {
      // Configurações para melhor performance
      flowControl: {
        maxMessages: 10,
        allowExcessMessages: true
      }
    });
    
    // Configurar listeners
    subscription.on('message', processMessage);
    
    subscription.on('error', (error) => {
      console.error(`\n❌ ERRO NA SUBSCRIPTION:`);
      console.error(`   ${error.message}`);
      
      if (error.message.includes('PERMISSION_DENIED')) {
        console.log(`\n⚠️ PROBLEMA DE PERMISSÃO:`);
        console.log(`   A conta de serviço não tem permissão para acessar a subscription.`);
        console.log(`\n💡 SOLUÇÕES:`);
        console.log(`   1. Verifique se o arquivo service-account.json está correto`);
        console.log(`   2. Confirme com o professor se o nome da subscription é "${SUBSCRIPTION_NAME}"`);
        console.log(`   3. Peça ao professor para conceder permissão de "pubsub.subscriber" para a conta`);
        console.log(`   4. Verifique se o projeto é realmente "serjava-demo"\n`);
      } else if (error.message.includes('NOT_FOUND')) {
        console.log(`\n⚠️ SUBSCRIPTION NÃO ENCONTRADA:`);
        console.log(`   A subscription "${SUBSCRIPTION_NAME}" não existe no projeto.`);
        console.log(`\n💡 SOLUÇÕES:`);
        console.log(`   1. Verifique se o nome está correto`);
        console.log(`   2. Peça ao professor para criar a subscription`);
        console.log(`   3. Use o comando para listar subscriptions disponíveis (se tiver permissão)\n`);
      }
    });
    
    subscription.on('close', () => {
      console.log('\n🔌 Conexão com Pub/Sub fechada.');
    });
    
    console.log(`\n✅ CONSUMIDOR INICIADO COM SUCESSO!`);
    console.log(`⏳ Aguardando mensagens do Pub/Sub...`);
    console.log(`💡 Para testar, peça ao professor para enviar mensagens para o tópico.\n`);
    
    isConnected = true;
    
  } catch (error) {
    console.error(`\n❌ ERRO AO INICIAR CONSUMIDOR:`);
    console.error(`   ${error.message}`);
    console.log(`\n💡 Se o erro persistir, use o modo MOCK para testes:`);
    console.log(`   npm run mock-consumer\n`);
  }
}

// Tratamento de encerramento
process.on('SIGINT', () => {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 ESTATÍSTICAS DE EXECUÇÃO:`);
  console.log(`   Mensagens processadas: ${messageCount}`);
  console.log(`   Status: ${isConnected ? 'Conectado' : 'Desconectado'}`);
  console.log('='.repeat(60));
  console.log('🛑 Encerrando consumidor...\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando consumidor...\n');
  process.exit(0);
});

// Iniciar
startConsumer();