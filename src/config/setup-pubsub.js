const { PubSub } = require('@google-cloud/pubsub');
const path = require('path');

// Configurar credenciais
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '../../service-account.json');

const pubsub = new PubSub();

// Configurações
const projectId = 'serjava-demo';
const topicName = 'aula-demo-pub';  // Nome do tópico
const subscriptionName = 'sub-grupo2';  // Nome da subscription (sua assinatura)

async function setupPubSub() {
  try {
    console.log('🔧 Configurando Pub/Sub...\n');
    console.log(`📋 Projeto: ${projectId}`);
    console.log(`📝 Tópico: ${topicName}`);
    console.log(`🔔 Subscription: ${subscriptionName}\n`);
    
    // 1. Criar ou verificar tópico
    console.log('1️⃣ Verificando/Criando tópico...');
    const topic = pubsub.topic(topicName);
    const [topicExists] = await topic.exists();
    
    if (!topicExists) {
      await topic.create();
      console.log(`   ✅ Tópico "${topicName}" criado com sucesso!`);
    } else {
      console.log(`   ✅ Tópico "${topicName}" já existe.`);
    }
    
    // 2. Criar ou verificar subscription
    console.log('\n2️⃣ Verificando/Criando subscription...');
    const subscription = pubsub.subscription(subscriptionName);
    const [subExists] = await subscription.exists();
    
    if (!subExists) {
      await topic.createSubscription(subscriptionName);
      console.log(`   ✅ Subscription "${subscriptionName}" criada com sucesso!`);
    } else {
      console.log(`   ✅ Subscription "${subscriptionName}" já existe.`);
    }
    
    console.log('\n✅ Configuração concluída com sucesso!\n');
    console.log('📌 Agora você pode:');
    console.log('   - Executar o consumidor: npm run consumer');
    console.log('   - Publicar mensagens: npm run publish-test');
    console.log('   - Verificar subscription: npm run check-sub\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verifique se o arquivo service-account.json está correto');
    console.log('2. Confirme se o projeto "serjava-demo" existe no Google Cloud');
    console.log('3. Verifique se a conta de serviço tem permissões\n');
  }
}

setupPubSub();