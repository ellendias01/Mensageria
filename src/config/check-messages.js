const { PubSub } = require('@google-cloud/pubsub');
const path = require('path');

const credPath = path.join(__dirname, '../../service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

const pubsub = new PubSub({ projectId: 'serjava-demo' });
const SUBSCRIPTION_NAME = 'sub-grupo2';

async function checkSubscription() {
  try {
    console.log('='.repeat(60));
    console.log('🔍 VERIFICANDO SUBSCRIPTION');
    console.log('='.repeat(60));
    console.log(`\n📡 Subscription: ${SUBSCRIPTION_NAME}`);
    console.log(`🏢 Projeto: serjava-demo\n`);
    
    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
    
    // Tentar obter métricas da subscription
    try {
      const [metadata] = await subscription.getMetadata();
      console.log('📊 Métricas da subscription:');
      console.log(`   Tópico vinculado: ${metadata.topic}`);
      console.log(`   Criada em: ${metadata.createTime}`);
      
      // Verificar mensagens não lidas (aproximado)
      if (metadata.config && metadata.config.messageRetentionDuration) {
        console.log(`   Retenção: ${metadata.config.messageRetentionDuration}`);
      }
      console.log(`   Estado: ${metadata.state || 'Ativa'}\n`);
      
    } catch (error) {
      if (error.message.includes('PERMISSION_DENIED')) {
        console.log('❌ Sem permissão para ver metadados');
        console.log('   Apenas tentando receber mensagens...\n');
      }
    }
    
    // Tentar receber mensagens por 30 segundos
    console.log('⏳ Aguardando mensagens por 30 segundos...');
    console.log('   (Pressione Ctrl+C para parar)\n');
    
    let messageCount = 0;
    
    const timeout = setTimeout(() => {
      console.log(`\n⏰ Tempo esgotado. Total de mensagens recebidas: ${messageCount}`);
      console.log('\n💡 Se não recebeu mensagens:');
      console.log('   1. O tópico pode estar vazio');
      console.log('   2. As mensagens já foram consumidas por outro grupo');
      console.log('   3. Peça para o professor enviar novas mensagens\n');
      process.exit(0);
    }, 30000);
    
    subscription.on('message', (message) => {
      messageCount++;
      console.log(`\n📨 [${messageCount}] MENSAGEM RECEBIDA!`);
      console.log(`   ID: ${message.id}`);
      console.log(`   Publicada em: ${message.publishTime}`);
      console.log(`   Tamanho: ${message.data.length} bytes`);
      
      try {
        const data = JSON.parse(message.data.toString());
        console.log(`   Pedido UUID: ${data.uuid || 'N/A'}`);
        console.log(`   Cliente: ${data.customer?.name || 'N/A'}`);
      } catch (e) {
        console.log(`   Dados: ${message.data.toString().substring(0, 100)}...`);
      }
      
      console.log(`   ✅ Mensagem lida!`);
      message.ack();
      console.log(`   (Aguardando mais mensagens...)\n`);
    });
    
    subscription.on('error', (error) => {
      console.error(`❌ Erro: ${error.message}`);
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
  }
}

checkSubscription();