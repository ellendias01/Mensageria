let currentPage = 1;
let limit = 10;
let totalPages = 1;
let totalOrders = 0;
let currentSort = 'DESC';
let filtersVisible = true;

const API_URL = 'http://localhost:3001';

// Toggle filters
function toggleFilters() {
    const body = document.getElementById('filtersBody');
    const icon = document.getElementById('toggleIcon');
    const btnText = document.querySelector('.toggle-filters-btn');
    
    if (filtersVisible) {
        body.style.display = 'none';
        icon.textContent = '▼';
        btnText.innerHTML = '<span id="toggleIcon">▼</span> Mostrar';
        filtersVisible = false;
    } else {
        body.style.display = 'block';
        icon.textContent = '▲';
        btnText.innerHTML = '<span id="toggleIcon">▲</span> Ocultar';
        filtersVisible = true;
    }
}

// Toggle sort
function toggleSort() {
    currentSort = currentSort === 'DESC' ? 'ASC' : 'DESC';
    const sortText = document.getElementById('sortText');
    sortText.textContent = currentSort === 'DESC' ? 'Mais recente' : 'Mais antigo';
    currentPage = 1;
    carregarPedidos();
}

// Carregar pedidos
async function carregarPedidos() {
    const filters = {
        page: currentPage,
        limit: limit,
        orderBy: 'created_at',
        orderDir: currentSort,
        codigoCliente: document.getElementById('filterCliente')?.value,
        product_id: document.getElementById('filterProduto')?.value,
        status: document.getElementById('filterStatus')?.value,
        uuid: document.getElementById('filterUuid')?.value
    };

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') params.append(key, value);
    });

    try {
        const response = await fetch(`${API_URL}/orders?${params}`);
        const data = await response.json();
        
        totalPages = data.pagination.totalPages;
        totalOrders = data.pagination.total;
        
        atualizarLista(data.data);
        atualizarPaginacao();
        carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        document.getElementById('ordersList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Erro ao carregar pedidos</h3>
                <p>Verifique se o servidor está rodando</p>
            </div>
        `;
    }
}

// Atualizar lista
function atualizarLista(orders) {
    const container = document.getElementById('ordersList');
    const resultsCount = document.getElementById('resultsCount');
    const totalCount = document.getElementById('totalCount');
    
    if (resultsCount) resultsCount.textContent = orders?.length || 0;
    if (totalCount) totalCount.textContent = totalOrders;
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>Nenhum pedido encontrado</h3>
                <p>Tente ajustar os filtros de busca</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const diffText = calcularDiferencaDatas(order.created_at, order.indexed_at);
        const tempoRecebimento = calcularDiferencaDatas(order.created_at, order.received_at);
        
        return `
        <div class="order-card" onclick="verDetalhes('${order.uuid}')">
            <div class="order-header">
                <div class="order-title">
                    <div class="order-uuid">
                        <code>${order.uuid}</code>
                        <span class="status-badge status-${order.status}" style="margin-left: 12px;">
                            ${traduzirStatus(order.status)}
                        </span>
                    </div>
                    <div class="order-meta">
                        <span>👤 Cliente: ${order.customer.name} (ID: ${order.customer.id})</span>
                        <span>📱 Canal: ${order.channel || 'N/A'}</span>
                        <span>📅 Pedido: ${formatarData(order.created_at)}</span>
                    </div>
                </div>
                <div class="order-total">
                    <div class="label">Total do Pedido</div>
                    <div class="value">${formatarMoeda(order.total)}</div>
                </div>
            </div>
            
            <div class="order-details-grid">
                <div class="detail-item">
                    <p>🏪 VENDEDOR</p>
                    <p>${order.seller.name}</p>
                    <p style="font-size:0.75rem; color:#666;">${order.seller.city}/${order.seller.state}</p>
                </div>
                <div class="detail-item">
                    <p>🚚 ENVIO</p>
                    <p>${order.shipment?.carrier || 'N/A'} - ${order.shipment?.service || 'N/A'}</p>
                    <p style="font-size:0.75rem; font-family:monospace;">${order.shipment?.tracking_code || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <p>💳 PAGAMENTO</p>
                    <p>${order.payment?.method || 'N/A'}</p>
                    <p class="${order.payment?.status === 'approved' ? 'status-paid' : 'status-created'}" style="font-size:0.75rem;">
                        ${order.payment?.status || 'N/A'}
                    </p>
                </div>
                <div class="detail-item">
                    <p>📦 ITENS</p>
                    <p>${order.items.length} ${order.items.length === 1 ? 'item' : 'itens'}</p>
                </div>
            </div>
            
            <div class="order-footer">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <span>📅 Pedido: ${formatarData(order.created_at)}</span>
                    <span>📥 Recebido: ${order.received_at ? formatarData(order.received_at) : 'N/A'}</span>
                    <span>💾 Indexado: ${order.indexed_at ? formatarData(order.indexed_at) : 'N/A'}</span>
                    ${diffText ? `<span class="diff-badge">⏱️ Processado ${diffText}</span>` : ''}
                    ${tempoRecebimento ? `<span class="diff-badge" style="background:#e3f2fd; color:#1565c0;">📥 Recebido ${tempoRecebimento}</span>` : ''}
                </div>
            </div>
        </div>
    `}).join('');
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(`${API_URL}/orders/statistics`);
        const stats = await response.json();
        
        const totalOrdersElem = document.getElementById('totalOrders');
        const totalValueElem = document.getElementById('totalValue');
        const avgValueElem = document.getElementById('avgValue');
        
        if (totalOrdersElem) totalOrdersElem.textContent = stats.total_orders || 0;
        if (totalValueElem) totalValueElem.textContent = formatarMoeda(stats.total_amount || 0);
        if (avgValueElem) avgValueElem.textContent = formatarMoeda(stats.average_amount || 0);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Ver detalhes
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

// Mostrar modal
function mostrarModal(order) {
    const modalBody = document.getElementById('modalBody');
    const diffText = calcularDiferencaDatas(order.created_at, order.indexed_at);
    const diffRecebimento = calcularDiferencaDatas(order.created_at, order.received_at);
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>📋 Informações Gerais</h3>
            <div class="detail-grid">
                <p><strong>UUID:</strong> <code>${order.uuid}</code></p>
                <p><strong>Data do Pedido:</strong> ${formatarDataCompleta(order.created_at)}</p>
                <p><strong>Data de Recebimento:</strong> ${order.received_at ? formatarDataCompleta(order.received_at) : 'N/A'}</p>
                <p><strong>Data de Indexação:</strong> ${order.indexed_at ? formatarDataCompleta(order.indexed_at) : 'N/A'}</p>
                ${diffRecebimento ? `<p><strong>📥 Tempo até recebimento:</strong> <span class="diff-highlight">${diffRecebimento}</span></p>` : ''}
                ${diffText ? `<p><strong>⏱️ Tempo de processamento:</strong> <span class="diff-highlight">${diffText}</span></p>` : ''}
                <p><strong>Canal:</strong> ${order.channel || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${order.status}">${traduzirStatus(order.status)}</span></p>
                <p><strong>Total:</strong> <strong style="color:#28a745; font-size:1.2rem;">${formatarMoeda(order.total)}</strong></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>👤 Cliente</h3>
            <div class="detail-grid">
                <p><strong>ID:</strong> ${order.customer.id}</p>
                <p><strong>Nome:</strong> ${order.customer.name}</p>
                <p><strong>Email:</strong> ${order.customer.email}</p>
                <p><strong>Documento:</strong> ${order.customer.document}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🏪 Vendedor</h3>
            <div class="detail-grid">
                <p><strong>ID:</strong> ${order.seller.id}</p>
                <p><strong>Nome:</strong> ${order.seller.name}</p>
                <p><strong>Cidade:</strong> ${order.seller.city}/${order.seller.state}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📦 Itens do Pedido</h3>
            <table class="items-table">
                <thead>
                    <tr><th>Produto</th><th>ID</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>${item.product_id}</td>
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
            <div class="detail-grid">
                <p><strong>Transportadora:</strong> ${order.shipment?.carrier || 'N/A'}</p>
                <p><strong>Serviço:</strong> ${order.shipment?.service || 'N/A'}</p>
                <p><strong>Status:</strong> ${order.shipment?.status || 'N/A'}</p>
                <p><strong>Código:</strong> <code>${order.shipment?.tracking_code || 'N/A'}</code></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>💳 Pagamento</h3>
            <div class="detail-grid">
                <p><strong>Método:</strong> ${order.payment?.method || 'N/A'}</p>
                <p><strong>Status:</strong> ${order.payment?.status || 'N/A'}</p>
                <p><strong>Transação:</strong> <code>${order.payment?.transaction_id || 'N/A'}</code></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>ℹ️ Metadados</h3>
            <div class="detail-grid">
                <p><strong>Origem:</strong> ${order.metadata?.source || 'N/A'}</p>
                <p><strong>IP:</strong> ${order.metadata?.ip_address || 'N/A'}</p>
                <p><strong>User Agent:</strong> <small>${order.metadata?.user_agent || 'N/A'}</small></p>
            </div>
        </div>
    `;
    
    document.getElementById('modal').style.display = 'block';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

// Aplicar filtros
function aplicarFiltros() {
    currentPage = 1;
    carregarPedidos();
}

// Limpar filtros
function limparFiltros() {
    const uuidInput = document.getElementById('filterUuid');
    const clienteInput = document.getElementById('filterCliente');
    const produtoInput = document.getElementById('filterProduto');
    const statusSelect = document.getElementById('filterStatus');
    
    if (uuidInput) uuidInput.value = '';
    if (clienteInput) clienteInput.value = '';
    if (produtoInput) produtoInput.value = '';
    if (statusSelect) statusSelect.value = '';
    
    currentPage = 1;
    carregarPedidos();
}

// Mudar página
function mudarPagina(direcao) {
    if (direcao === 'prev' && currentPage > 1) {
        currentPage--;
        carregarPedidos();
    } else if (direcao === 'next' && currentPage < totalPages) {
        currentPage++;
        carregarPedidos();
    }
}

// Ir para página específica
function irParaPagina(page) {
    currentPage = page;
    carregarPedidos();
}

// Atualizar paginação
function atualizarPaginacao() {
    const pageNumbersDiv = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    
    if (!pageNumbersDiv) return;
    
    let pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        pages.push(1);
        
        if (currentPage > 3) pages.push('...');
        
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }
    
    pageNumbersDiv.innerHTML = pages.map(page => {
        if (page === '...') {
            return '<span class="page-dots">...</span>';
        }
        return `
            <div class="page-number ${page === currentPage ? 'active' : ''}" 
                 onclick="irParaPagina(${page})">
                ${page}
            </div>
        `;
    }).join('');
}

// Formatar data resumida
function formatarData(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formatar data completa
function formatarDataCompleta(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Calcular diferença entre datas
function calcularDiferencaDatas(dataInicio, dataFim) {
    if (!dataInicio || !dataFim) return null;
    
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diffMs = fim - inicio;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    
    if (diffDias > 0) {
        return `${diffDias} dia(s) depois`;
    } else if (diffHoras > 0) {
        return `${diffHoras} hora(s) depois`;
    } else if (diffMin > 0) {
        return `${diffMin} minuto(s) depois`;
    } else if (diffMs > 0) {
        return `${Math.floor(diffMs / 1000)} segundo(s) depois`;
    } else {
        return `${Math.abs(Math.floor(diffMs / 1000))} segundo(s) antes`;
    }
}

// Formatar moeda
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Traduzir status
function traduzirStatus(status) {
    const statusMap = {
        'created': 'Criado',
        'paid': 'Pago',
        'separated': 'Separado',
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    carregarPedidos();
});