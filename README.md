# 📦 Sistema de Mensageria - Gerenciamento de Pedidos

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://www.sqlite.org/)
[![Google Cloud Pub/Sub](https://img.shields.io/badge/Google%20Cloud-Pub%2FSub-orange.svg)](https://cloud.google.com/pubsub)

> Sistema completo de processamento de pedidos com consumo de mensagens via Google Cloud Pub/Sub, persistência em SQLite e API RESTful.

## 📋 Sobre o Projeto

Este projeto foi desenvolvido como atividade da disciplina **Computação em Nuvem 2** da **FATEC - Desenvolvimento de Software Multiplataforma**. O sistema implementa um consumidor de mensagens do Google Cloud Pub/Sub para processar pedidos de um marketplace, persistindo os dados em um banco de dados relacional e disponibilizando uma API RESTful para consulta.

### 🎯 Funcionalidades

- ✅ **Consumidor Pub/Sub**: Leitura assíncrona de mensagens do Google Cloud Pub/Sub
- ✅ **Persistência de Dados**: Armazenamento em SQLite com estrutura normalizada
- ✅ **API RESTful**: Endpoints completos para consulta de pedidos
- ✅ **Paginação e Filtros**: Navegação eficiente em grandes volumes de dados
- ✅ **Cálculos Automáticos**: Valor total de pedidos e itens
- ✅ **Interface Web**: Frontend amigável para visualização de dados
- ✅ **Timestamp de Indexação**: Registro automático da hora de processamento

## 🏗️ Arquitetura do Sistema
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Google Cloud │ │ Consumidor │ │ SQLite DB │
│ Pub/Sub │────▶│ (Node.js) │────▶│ (Persistência)│
│ (Mensagens) │ │ │ │ │
└─────────────────┘ └──────────────────┘ └─────────────────┘
│
▼
┌──────────────────┐
│ API REST │
│ (Express.js) │
└──────────────────┘
│
▼
┌──────────────────┐
│ Frontend │
│ (HTML/CSS/JS) │
└──────────────────┘



## 🚀 Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| **Node.js** | Ambiente de execução JavaScript |
| **Express.js** | Framework web para API REST |
| **SQLite3** | Banco de dados relacional leve |
| **Google Cloud Pub/Sub** | Serviço de mensageria assíncrona |
| **HTML/CSS/JS** | Frontend para visualização |

## 📁 Estrutura do Projeto
projeto-mensageria/
├── public/ # Frontend
│ ├── index.html # Página principal
│ ├── style.css # Estilos
│ └── app.js # Lógica do frontend
├── src/
│ ├── api/ # API REST
│ │ ├── server.js # Servidor Express
│ │ └── routes/ # Rotas da API
│ │ ├── orders.js
│ │ └── customers.js
│ ├── config/ # Configurações
│ │ ├── database.js # Conexão SQLite
│ │ └── initDB.js # Inicialização do banco
│ ├── consumer/ # Consumidores
│ │ ├── real-consumer.js # Consumidor real Pub/Sub
│ │ └── mock-consumer.js # Consumidor mock para testes
│ ├── models/ # Modelos de dados
│ │ ├── Order.js
│ │ ├── Customer.js
│ │ ├── Product.js
│ │ └── ItemPedido.js
│ ├── services/ # Lógica de negócio
│ │ └── orderService.js
│ └── utils/ # Utilitários
│ └── check-db.js # Verificação do banco
├── database/ # Banco de dados
│ └── database.sqlite # Arquivo do banco
├── package.json # Dependências
└── README.md # Documentação



## 🗄️ Modelo de Dados (DER)
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ customers │ │ orders │ │ products │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ id (PK) │◄───│ customer_id │ │ id (PK) │
│ name │ │ uuid (PK) │ │ name │
│ email │ │ created_at │ │ unit_price │
│ document │ │ status │ └─────────────┘
└─────────────┘ │ total │ ▲
└─────────────┘ │
│ │
▼ │
┌─────────────┐ │
│ order_items │ │
├─────────────┤ │
│ id (PK) │ │
│ order_uuid │──────────┤
│ product_id │──────────┘
│ quantity │
│ unit_price │
│ total │
└─────────────┘



## 🔧 Instalação e Configuração

### Pré-requisitos

- Node.js 20.x ou superior
- npm 10.x ou superior
- Conta no Google Cloud Platform (para Pub/Sub)

### Passo a Passo

1. **Clone o repositório**
``````bash
git clone https://github.com/ellendias01/Mensageria.git
cd Mensageria
Instale as dependências

```bash
npm install
Configure as credenciais do Google Cloud

Coloque o arquivo service-account.json na raiz do projeto

Solicite ao administrador as permissões necessárias

Inicialize o banco de dados

```bash
npm run init-db
Execute o sistema

Terminal 1 - API e Frontend:

```bash
npm start
Acesse: http://localhost:3001

Terminal 2 - Consumidor (opcional):

```bash
npm run consumer
Para testes com dados mockados:

```bash
npm run mock-consumer
📡 Endpoints da API
Pedidos
Método	Endpoint	Descrição
GET	/orders	Lista pedidos com paginação e filtros
GET	/orders/:uuid	Busca pedido específico
PATCH	/orders/:uuid/status	Atualiza status do pedido
GET	/orders/statistics	Retorna estatísticas
Parâmetros de Filtro (GET /orders)
Parâmetro	Tipo	Descrição
page	number	Número da página (padrão: 1)
limit	number	Itens por página (padrão: 10)
orderBy	string	Campo para ordenação (created_at, total, status)
orderDir	string	Direção (ASC/DESC)
codigoCliente	number	Filtrar por ID do cliente
product_id	number	Filtrar por ID do produto
status	string	Filtrar por status
Clientes
Método	Endpoint	Descrição
GET	/customers	Lista clientes
GET	/customers/:id	Busca cliente específico
PUT	/customers/:id	Atualiza cliente
DELETE	/customers/:id	Remove cliente
🎨 Frontend
O sistema inclui uma interface web amigável disponível em http://localhost:3001 com:

📊 Cards com estatísticas em tempo real

🔍 Filtros por cliente e status

📅 Ordenação por data ou valor

📄 Paginação automática

📋 Modal com detalhes completos do pedido

🎨 Design responsivo e moderno

🧪 Testes
Teste com Dados Mockados
Para testar o sistema sem depender do Pub/Sub:

```bash
npm run mock-consumer
Isso gerará 10 pedidos de exemplo e os processará no banco de dados.

Verificar Dados no Banco
```bash
npm run check-db
Testar Conexão com Pub/Sub
```bash
npm run test-connection
📊 Status dos Pedidos
Status	Descrição
created	Pedido criado, aguardando pagamento
paid	Pagamento confirmado
shipped	Pedido enviado
delivered	Pedido entregue
canceled	Pedido cancelado
🔐 Segurança
Arquivo de credenciais: Nunca compartilhe o arquivo service-account.json

.gitignore: Configurado para evitar envio de credenciais e dependências

Variáveis de ambiente: Use .env para configurações sensíveis

👥 Autores
Nome	RA	GitHub
Éllen Dias Farias	[Seu RA]	@ellendias01
📝 Licença
Este projeto é de uso acadêmico e está sob a licença MIT.

🙏 Agradecimentos
FATEC - Desenvolvimento de Software Multiplataforma

Professor da disciplina Computação em Nuvem 2

📌 Comandos Rápidos
Comando	Descrição
npm start	Inicia API + Frontend
npm run consumer	Inicia consumidor real
npm run mock-consumer	Gera dados de teste
npm run test-connection	Testa conexão Pub/Sub
npm run check-db	Verifica dados no banco
npm run init-db	Reinicializa banco de dados
Desenvolvido com ❤️ para a disciplina de Computação em Nuvem 2



## 📤 Como atualizar o README no GitHub

1. **Salve o conteúdo acima no arquivo `README.md`**

2. **Adicione e faça commit:**
``````bash
git add README.md
git commit -m "Atualiza README com documentação completa do projeto" 
