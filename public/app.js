let currentPage = 1;
let limit = 10;
let totalPages = 1;
let totalOrders = 0;
let currentSort = 'DESC';
let filtersVisible = true;
let filterTimeout = null;

const API_URL = 'http://localhost:3001';

// Configurações de cores para status de pagamento
const paymentStatusConfig = {
    'pending': { label: '⏳ Pendente', class: 'payment-status-pending' },
    'processing': { label: '⚙️ Processando', class: 'payment-status-processing' },
    'approved': { label: '✅ Aprovado', class: 'payment-status-approved' },
    'rejected': { label: '❌ Rejeitado', class: 'payment-status-rejected' }
};

// Configurações para métodos de pagamento
const paymentMethodConfig = {
    'credit_card': { label: '💳 Cartão de Crédito', class: 'method-credit_card' },
    'debit_card': { label: '💳 Cartão de Débito', class: 'method-debit_card' },
    'pix': { label: '📱 PIX', class: 'method-pix' },
    'bank_transfer': { label: '🏦 Transferência Bancária', class: 'method-bank_transfer' },
    'boleto': { label: '📄 Boleto', class: 'method-boleto' },
    'cash': { label: '💰 Dinheiro', class: 'method-cash' }
};

// Mapeamento de status do pedido
const orderStatusMap = {
    'pending': '⏳ Pendente',
    'confirmed': '✅ Confirmado',
    'created': '🟡 Criado',
    'paid': '🟢 Pago',
    'separated': '🟠 Separado',
    'shipped': '🟣 Enviado',
    'delivered': '🔵 Entregue',
    'cancelled': '❌ Cancelado'
};

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

// Debounce para busca geral
function aplicarFiltrosDebounced() {
    if (filterTimeout) clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
        aplicarFiltros();
    }, 500);
}

// Toggle sort
function toggleSort() {
    currentSort = currentSort === 'DESC' ? 'ASC' : 'DESC';
    const sortText = document.getElementById('sortText');
    sortText.textContent = currentSort === 'DESC' ? 'Mais recente' : 'Mais antigo';
    currentPage = 1;
    carregarPedidos();
}

// Busca geral COMPLETA em todos os campos
function filtrarLocalmente(order, searchTerm) {
    if (!searchTerm) return true;
    
    searchTerm = searchTerm.toLowerCase().trim();
    
    // Função auxiliar para buscar em objetos aninhados
    function deepSearch(obj, term) {
        if (!obj) return false;
        if (typeof obj === 'string') return obj.toLowerCase().includes(term);
        if (typeof obj === 'number') return String(obj).includes(term);
        if (Array.isArray(obj)) return obj.some(item => deepSearch(item, term));
        if (typeof obj === 'object') {
            return Object.values(obj).some(value => deepSearch(value, term));
        }
        return false;
    }
    
    // Buscar em TODOS os campos do pedido
    return deepSearch(order, searchTerm);
}

// Carregar pedidos com suporte a todos os filtros
async function carregarPedidos() {
    const searchGeneral = document.getElementById('filterGeneral')?.value || '';
    const filterUuid = document.getElementById('filterUuid')?.value || '';
    const filterCliente = document.getElementById('filterCliente')?.value || '';
    const filterProduto = document.getElementById('filterProduto')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const filterPaymentStatus = document.getElementById('filterPaymentStatus')?.value || '';
    const filterPaymentMethod = document.getElementById('filterPaymentMethod')?.value || '';
    
    // Construir filtros para a API
    const filters = {
        page: currentPage,
        limit: limit,
        orderBy: 'created_at',
        orderDir: currentSort
    };
    
    if (filterUuid) filters.uuid = filterUuid;
    if (filterCliente) filters.codigoCliente = filterCliente;
    if (filterProduto) filters.product_id = filterProduto;
    if (filterStatus) filters.status = filterStatus;
    if (filterPaymentStatus) filters.payment_status = filterPaymentStatus;
    if (filterPaymentMethod) filters.payment_method = filterPaymentMethod;

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') params.append(key, value);
    });

    try {
        const response = await fetch(`${API_URL}/orders?${params}`);
        const data = await response.json();
        
        let orders = data.data || [];
        
        // Aplicar filtro geral (busca em todos os campos)
        if (searchGeneral) {
            orders = orders.filter(order => filtrarLocalmente(order, searchGeneral));
            totalPages = Math.ceil(orders.length / limit);
            totalOrders = orders.length;
            const startIndex = (currentPage - 1) * limit;
            orders = orders.slice(startIndex, startIndex + limit);
        } else {
            totalPages = data.pagination?.totalPages || 1;
            totalOrders = data.pagination?.total || 0;
        }
        
        atualizarLista(orders);
        atualizarPaginacao();
        carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        document.getElementById('ordersList').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Erro ao carregar pedidos</h3>
                <p>Verifique se o servidor está rodando na porta 3001</p>
                <p style="font-size:0.8rem; margin-top:10px;">💡 Execute: npm start</p>
            </div>
        `;
    }
}

// Atualizar lista de pedidos
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
        const paymentStatus = paymentStatusConfig[order.payment?.status] || { label: order.payment?.status || 'N/A', class: 'payment-status-pending' };
        const paymentMethod = paymentMethodConfig[order.payment?.method] || { label: order.payment?.method || 'N/A', class: 'method-default' };
        const orderStatus = orderStatusMap[order.status] || order.status;
        
        return `
        <div class="order-card" onclick="verDetalhes('${order.uuid}')">
            <div class="order-header">
                <div class="order-title">
                    <div class="order-uuid">
                        <code>${order.uuid}</code>
                        <span class="status-badge status-${order.status}" style="margin-left: 12px;">
                            ${orderStatus}
                        </span>
                    </div>
                    <div class="order-meta">
                        <span>👤 Cliente: ${order.customer?.name || 'N/A'} (ID: ${order.customer?.id || 'N/A'})</span>
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
                    <p>${order.seller?.name || 'N/A'}</p>
                    <p style="font-size:0.75rem; color:#666;">${order.seller?.city || ''}/${order.seller?.state || ''}</p>
                </div>
                <div class="detail-item">
                    <p>🚚 ENVIO</p>
                    <p>${order.shipment?.carrier || 'N/A'} - ${order.shipment?.service || 'N/A'}</p>
                    <p style="font-size:0.75rem; font-family:monospace;">${order.shipment?.tracking_code || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <p>💳 PAGAMENTO</p>
                    <p>${paymentMethod.label}</p>
                    <p class="${paymentStatus.class}" style="font-size:0.75rem; display:inline-block; padding:2px 8px; border-radius:12px;">
                        ${paymentStatus.label}
                    </p>
                </div>
                <div class="detail-item">
                    <p>📦 ITENS</p>
                    <p>${order.items?.length || 0} ${order.items?.length === 1 ? 'item' : 'itens'}</p>
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

// Sincronizar dados
async function sincronizarDados() {
    console.log('🔄 Sincronizando dados...');
    currentPage = 1;
    await carregarPedidos();
    await carregarEstatisticas();
    
    const toast = document.createElement('div');
    toast.textContent = '✅ Dados sincronizados com o banco!';
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; 
        background: #28a745; color: white; padding: 10px 20px; 
        border-radius: 8px; z-index: 9999;
        animation: fadeInOut 3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Mostrar modal
function mostrarModal(order) {
    const modalBody = document.getElementById('modalBody');
    const diffText = calcularDiferencaDatas(order.created_at, order.indexed_at);
    const diffRecebimento = calcularDiferencaDatas(order.created_at, order.received_at);
    const paymentStatus = paymentStatusConfig[order.payment?.status] || { label: order.payment?.status || 'N/A', class: 'payment-status-pending' };
    const paymentMethod = paymentMethodConfig[order.payment?.method] || { label: order.payment?.method || 'N/A', class: 'method-default' };
    const orderStatus = orderStatusMap[order.status] || order.status;
    
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
                <p><strong>Status do Pedido:</strong> <span class="status-badge status-${order.status}">${orderStatus}</span></p>
                <p><strong>Total:</strong> <strong style="color:#28a745; font-size:1.2rem;">${formatarMoeda(order.total)}</strong></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>👤 Cliente</h3>
            <div class="detail-grid">
                <p><strong>ID:</strong> ${order.customer?.id || 'N/A'}</p>
                <p><strong>Nome:</strong> ${order.customer?.name || 'N/A'}</p>
                <p><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
                <p><strong>Documento (CPF/CNPJ):</strong> ${order.customer?.document || 'N/A'}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🏪 Vendedor</h3>
            <div class="detail-grid">
                <p><strong>ID:</strong> ${order.seller?.id || 'N/A'}</p>
                <p><strong>Nome:</strong> ${order.seller?.name || 'N/A'}</p>
                <p><strong>Cidade:</strong> ${order.seller?.city || ''}/${order.seller?.state || ''}</p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📦 Itens do Pedido</h3>
            <table class="items-table">
                <thead>
                    <tr><th>Produto</th><th>ID</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                    ${order.items?.map(item => `
                        <tr>
                            <td>${item.product_name || 'N/A'}</td>
                            <td>${item.product_id || 'N/A'}</td>
                            <td>${item.quantity || 0}</td>
                            <td>${formatarMoeda(item.unit_price || 0)}</td>
                            <td><strong>${formatarMoeda(item.total || 0)}</strong></td>
                        </tr>
                    `).join('') || '<tr><td colspan="5">Nenhum item encontrado</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <div class="detail-section">
            <h3>🚚 Entrega</h3>
            <div class="detail-grid">
                <p><strong>Transportadora:</strong> ${order.shipment?.carrier || 'N/A'}</p>
                <p><strong>Serviço:</strong> ${order.shipment?.service || 'N/A'}</p>
                <p><strong>Status:</strong> ${order.shipment?.status || 'N/A'}</p>
                <p><strong>Código de Rastreio:</strong> <code>${order.shipment?.tracking_code || 'N/A'}</code></p>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>💳 Pagamento</h3>
            <div class="detail-grid">
                <p><strong>Método:</strong> ${paymentMethod.label}</p>
                <p><strong>Status:</strong> <span class="${paymentStatus.class}" style="padding:2px 8px; border-radius:12px; display:inline-block;">${paymentStatus.label}</span></p>
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
    const generalInput = document.getElementById('filterGeneral');
    const uuidInput = document.getElementById('filterUuid');
    const clienteInput = document.getElementById('filterCliente');
    const produtoInput = document.getElementById('filterProduto');
    const statusSelect = document.getElementById('filterStatus');
    
    if (generalInput) generalInput.value = '';
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