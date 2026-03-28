let currentPage = 1;
let limit = 10;
let totalPages = 1;

const API_URL = 'http://localhost:3001';

// Carregar pedidos ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    carregarPedidos();
    carregarEstatisticas();
});

async function carregarPedidos() {
    const filters = {
        page: currentPage,
        limit: limit,
        orderBy: document.getElementById('orderBy').value,
        orderDir: document.getElementById('orderDir').value,
        codigoCliente: document.getElementById('filterCliente').value,
        status: document.getElementById('filterStatus').value
    };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
    });

    try {
        const response = await fetch(`${API_URL}/orders?${params}`);
        const data = await response.json();
        
        totalPages = data.pagination.totalPages;
        atualizarTabela(data.data);
        atualizarPaginacao();
        
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        document.getElementById('ordersTableBody').innerHTML = 
            '<tr><td colspan="6" class="loading">❌ Erro ao carregar pedidos</td></tr>';
    }
}

function atualizarTabela(orders) {
    const tbody = document.getElementById('ordersTableBody');
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">📭 Nenhum pedido encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr onclick="verDetalhes('${order.uuid}')">
            <td><code>${order.uuid.substring(0, 20)}...</code></td>
            <td><strong>${order.customer.name}</strong><br><small>ID: ${order.customer.id}</small></td>
            <td>${formatarData(order.created_at)}</td>
            <td><span class="status-badge status-${order.status}">${traduzirStatus(order.status)}</span></td>
            <td><strong>${formatarMoeda(order.total)}</strong></td>
            <td><button class="btn-secondary" onclick="event.stopPropagation(); verDetalhes('${order.uuid}')">📋 Ver</button></td>
        </tr>
    `).join('');
}

async function carregarEstatisticas() {
    try {
        const response = await fetch(`${API_URL}/orders/statistics`);
        const stats = await response.json();
        
        document.getElementById('totalOrders').textContent = stats.total_orders || 0;
        document.getElementById('totalValue').textContent = formatarMoeda(stats.total_amount || 0);
        document.getElementById('avgValue').textContent = formatarMoeda(stats.average_amount || 0);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function verDetalhes(uuid) {
    try {
        const response = await fetch(`${API_URL}/orders/${uuid}`);
        const order = await response.json();
        
        if (!order) {
            alert('Pedido não encontrado');
            return;
        }
        
        mostrarModal(order);
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        alert('Erro ao carregar detalhes do pedido');
    }
}

function mostrarModal(order) {
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="order-details">
            <div class="detail-section">
                <h3>📋 Informações Gerais</h3>
                <p><strong>UUID:</strong> <code>${order.uuid}</code></p>
                <p><strong>Data:</strong> ${formatarData(order.created_at)}</p>
                <p><strong>Canal:</strong> ${order.channel || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${traduzirStatus(order.status)}</span></p>
                <p><strong>Total:</strong> <strong style="color: #28a745; font-size: 1.2rem;">${formatarMoeda(order.total)}</strong></p>
            </div>
            
            <div class="detail-section">
                <h3>👤 Cliente</h3>
                <p><strong>ID:</strong> ${order.customer.id}</p>
                <p><strong>Nome:</strong> ${order.customer.name}</p>
                <p><strong>Email:</strong> ${order.customer.email}</p>
                <p><strong>Documento:</strong> ${order.customer.document}</p>
            </div>
            
            <div class="detail-section">
                <h3>🏪 Vendedor</h3>
                <p><strong>ID:</strong> ${order.seller.id}</p>
                <p><strong>Nome:</strong> ${order.seller.name}</p>
                <p><strong>Cidade:</strong> ${order.seller.city}/${order.seller.state}</p>
            </div>
            
            <div class="detail-section">
                <h3>📦 Itens do Pedido</h3>
                <table class="items-table">
                    <thead>
                        <tr><th>Produto</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.quantity}</td>
                                <td>${formatarMoeda(item.unit_price)}</td>
                                <td><strong>${formatarMoeda(item.total)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="detail-section">
                <h3>🚚 Entrega</h3>
                <p><strong>Transportadora:</strong> ${order.shipment?.carrier || 'N/A'}</p>
                <p><strong>Serviço:</strong> ${order.shipment?.service || 'N/A'}</p>
                <p><strong>Código:</strong> ${order.shipment?.tracking_code || 'N/A'}</p>
            </div>
            
            <div class="detail-section">
                <h3>💳 Pagamento</h3>
                <p><strong>Método:</strong> ${order.payment?.method || 'N/A'}</p>
                <p><strong>Status:</strong> ${order.payment?.status || 'N/A'}</p>
                <p><strong>Transação:</strong> ${order.payment?.transaction_id || 'N/A'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('modal').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

function aplicarFiltros() {
    currentPage = 1;
    carregarPedidos();
    carregarEstatisticas();
}

function limparFiltros() {
    document.getElementById('filterCliente').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('orderBy').value = 'created_at';
    document.getElementById('orderDir').value = 'DESC';
    currentPage = 1;
    carregarPedidos();
    carregarEstatisticas();
}

function mudarPagina(direcao) {
    if (direcao === 'prev' && currentPage > 1) {
        currentPage--;
        carregarPedidos();
    } else if (direcao === 'next' && currentPage < totalPages) {
        currentPage++;
        carregarPedidos();
    }
}

function atualizarPaginacao() {
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

function formatarData(data) {
    return new Date(data).toLocaleString('pt-BR');
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function traduzirStatus(status) {
    const statusMap = {
        'created': 'Criado',
        'paid': 'Pago',
        'shipped': 'Enviado',
        'delivered': 'Entregue',
        'canceled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        fecharModal();
    }
}