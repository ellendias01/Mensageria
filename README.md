# 📦 Sistema de Mensageria - Pedidos com Pub/Sub e MySQL

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-blue.svg)](https://www.mysql.com/)
[![Google Cloud Pub/Sub](https://img.shields.io/badge/Google%20Cloud-Pub%2FSub-orange.svg)](https://cloud.google.com/pubsub)

Sistema de processamento de pedidos com:
- consumo assíncrono via Google Cloud Pub/Sub
- persistência em MySQL
- API REST com filtros, paginação e estatísticas
- frontend para consulta e detalhamento dos pedidos

---

## 📋 Visão geral

Este projeto foi desenvolvido como atividade da disciplina **Computação em Nuvem 2** da FATEC DSM.

Fluxo principal:
1. uma mensagem de pedido chega no tópico/subscription do Pub/Sub
2. o consumidor processa e persiste no MySQL
3. a API REST disponibiliza os dados
4. o frontend consome a API para exibir cards, filtros e detalhes

---

## ✅ Funcionalidades

- Consumidor Pub/Sub com `ACK/NACK`
- Idempotência por `uuid` (evita duplicidade)
- Persistência relacional em MySQL
- API REST para pedidos e clientes
- Filtros e paginação em `/orders`
- Estatísticas agregadas em `/orders/statistics`
- Frontend com lista, modal de detalhes e sincronização
- Script de migração SQLite → MySQL

---

## 🏗️ Arquitetura

```text
Google Cloud Pub/Sub -> pubsub-consumer (Node.js) -> MySQL
                                          |
                                          v
                                   API REST (Express)
                                          |
                                          v
                                   Frontend (HTML/CSS/JS)
```

---

## 🧱 Estrutura do projeto

```text
Mensageria/
├── public/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── realtime-monitor.html
├── src/
│   ├── api/
│   │   ├── server.js
│   │   └── routes/
│   │       ├── orders.js
│   │       └── customers.js
│   ├── config/
│   │   ├── database.js
│   │   ├── initDB.js
│   │   ├── test-connection.js
│   │   ├── test-mysql-connection.js
│   │   ├── migrate-sqlite-to-mysql.js
│   │   ├── setup-pubsub.js
│   │   └── check-messages.js
│   ├── consumer/
│   │   ├── pubsub-consumer.js
│   │   └── mock-consumer.js
│   ├── models/
│   │   ├── Order.js
│   │   ├── Customer.js
│   │   ├── Product.js
│   │   └── ItemPedido.js
│   └── services/
│       └── orderService.js
├── database/
│   ├── database.sqlite              # legado/local (origem de migração)
│   ├── database.sqlite-wal          # artefato local do SQLite
│   └── schema.sql
├── check-orders.js
├── .env.example
├── package.json
└── README.md
```

---

## 🗃️ Modelo de dados (MySQL)

Tabelas principais:
- `customers`
- `products`
- `orders`
- `order_items`
- `shipments`
- `payments`
- `metadata`

Relacionamentos:
- `orders.customer_id -> customers.id`
- `order_items.order_uuid -> orders.uuid`
- `order_items.product_id -> products.id`
- `shipments.order_uuid -> orders.uuid`
- `payments.order_uuid -> orders.uuid`
- `metadata.order_uuid -> orders.uuid`

---

## ⚙️ Configuração

### Pré-requisitos

- Node.js 20+
- npm 10+
- MySQL acessível
- credencial GCP (service account) para Pub/Sub

### Variáveis de ambiente (`.env`)

Use `.env.example` como base:

```bash
copy .env.example .env
```

Campos usados:
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- opcional: `MYSQL_POOL_SIZE`

Credencial GCP:
- recomendado: `service-account.json` na raiz
- opcional: `GOOGLE_APPLICATION_CREDENTIALS` apontando para o arquivo

---

## 🚀 Como rodar

### 1) Instalar dependências

```bash
npm install
```

### 2) Inicializar schema MySQL

```bash
npm run init-db
```

### 3) Subir API

```bash
npm start
```

API e frontend em `http://localhost:3001`

### 4) Subir consumidor real (terminal separado)

```bash
npm run pubsub-consumer
```

### 5) (Opcional) Gerar dados mock

```bash
npm run mock-consumer
```

---

## 🧪 Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm start` | Inicia API + frontend |
| `npm run dev` | API com nodemon |
| `npm run init-db` | Garante schema MySQL |
| `npm run pubsub-consumer` | Consumidor real do Pub/Sub |
| `npm run mock-consumer` | Gera pedidos de teste local |
| `npm run test-mysql` | Testa conexão com MySQL |
| `npm run test-connection` | Publica pedido de teste no tópico |
| `npm run check-db` | Consulta e resume dados persistidos |
| `npm run migrate-sqlite-to-mysql` | Migra dados legados SQLite para MySQL |

---

## 🔄 Migração SQLite -> MySQL

Se você tem pedidos antigos no SQLite e quer trazer para o MySQL:

```bash
npm run migrate-sqlite-to-mysql
```

Observações:
- usa `database/database.sqlite` por padrão
- também aceita `SQLITE_PATH` para caminho customizado
- faz `upsert`, então não duplica linhas já migradas

---

## 📡 Endpoints

### Pedidos

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/orders` | Lista pedidos com filtros/paginação |
| `GET` | `/orders/:uuid` | Retorna um pedido detalhado |
| `PATCH` | `/orders/:uuid/status` | Atualiza status |
| `GET` | `/orders/statistics` | Retorna estatísticas agregadas |

### Clientes

| Método | Endpoint |
| --- | --- |
| `GET` | `/customers` |
| `GET` | `/customers/:id` |
| `PUT` | `/customers/:id` |
| `DELETE` | `/customers/:id` |

### Outros

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Health check da API |
| `POST` | `/test-publish` | Publica pedido de teste no Pub/Sub |

---

## 🖥️ Frontend

Recursos:
- cards com pedidos e status
- filtros por UUID, cliente, produto e status
- paginação
- modal de detalhes do pedido
- exibição de `created_at`, `received_at` e `indexed_at`

Obs.: quando `received_at` não existe (ex.: dados antigos/mock), o frontend usa a data de indexação como fallback visual.

---

## 🔐 Segurança

- não versionar `.env`
- não versionar `service-account.json`
- usar `.env.example` sem segredos
- manter `.gitignore` atualizado

---

## 🧑‍💻 Autores

- Éllen Dias Farias — [@ellendias01](https://github.com/ellendias01)
- Habbiner Andrade — [@habbiner](https://github.com/habbiner)
- Gabriel Abramovick Bortoliero — [@Bortoliero](https://github.com/Bortoliero)

---

## 📝 Licença

MIT (uso acadêmico)

