// check-orders.js - Colocar na raiz do projeto
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkOrders() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database/database.sqlite'),
      driver: sqlite3.Database
    });
    
    console.log('='.repeat(60));
    console.log('📊 VERIFICANDO PEDIDOS NO BANCO');
    console.log('='.repeat(60));
    
    // Total de pedidos
    const total = await db.get('SELECT COUNT(*) as total FROM orders');
    console.log(`\n📦 Total de pedidos: ${total.total}`);
    
    // Últimos 10 pedidos
    const recentes = await db.all(`
      SELECT uuid, indexed_at, received_at, customer_id, total, status 
      FROM orders 
      ORDER BY indexed_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 ÚLTIMOS 10 PEDIDOS PROCESSADOS:');
    for (const order of recentes) {
      console.log(`\n   UUID: ${order.uuid.substring(0, 20)}...`);
      console.log(`   Processado: ${order.indexed_at}`);
      console.log(`   Recebido na fila: ${order.received_at || 'NULL ❌'}`);
      console.log(`   Cliente ID: ${order.customer_id}`);
      console.log(`   Total: R$ ${(order.total || 0).toFixed(2)}`);
      console.log(`   Status: ${order.status}`);
    }
    
    // Verificar pedidos de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const pedidosHoje = await db.all(`
      SELECT uuid, indexed_at, total 
      FROM orders 
      WHERE DATE(indexed_at) = DATE('now')
      ORDER BY indexed_at DESC
    `);
    
    console.log(`\n📅 PEDIDOS DE HOJE (${hoje}): ${pedidosHoje.length}`);
    for (const order of pedidosHoje) {
      console.log(`   - ${order.uuid.substring(0, 16)}... | ${order.indexed_at} | R$ ${order.total}`);
    }
    
    // Verificar received_at nulos
    const nullReceived = await db.get(`
      SELECT COUNT(*) as total FROM orders WHERE received_at IS NULL
    `);
    console.log(`\n⚠️ Pedidos com received_at NULL: ${nullReceived.total}`);
    
    // Verificar os pedidos específicos que você mostrou no log
    const uuids = [
      '4d23db19-886e-45aa-83b7-62393bea8cdd',
      '5c006bcf-3d35-4867-b5aa-1766e5360889',
      'c183ed4e-8900-4dc8-b0c8-be0be1839a07',
      '66df0a26-952d-4fd5-8fa8-22e64fc4a283',
      '12cef5d6-084f-45e6-87be-0a03e247c82b'
    ];
    
    console.log('\n🔍 VERIFICANDO PEDIDOS ESPECÍFICOS DO LOG:');
    for (const uuid of uuids) {
      const order = await db.get('SELECT uuid, indexed_at, received_at FROM orders WHERE uuid = ?', uuid);
      if (order) {
        console.log(`   ✅ ${uuid.substring(0, 20)}... - Processado em: ${order.indexed_at}`);
      } else {
        console.log(`   ❌ ${uuid.substring(0, 20)}... - NÃO ENCONTRADO NO BANCO!`);
      }
    }
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkOrders();