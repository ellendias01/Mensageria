Perfeito — corrigi **toda a formatação** do seu README pra você já copiar e colar direto no GitHub sem quebrar nada 👇

---

# 📦 Sistema de Mensageria - Gerenciamento de Pedidos

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://www.sqlite.org/)
[![Google Cloud Pub/Sub](https://img.shields.io/badge/Google%20Cloud-Pub%2FSub-orange.svg)](https://cloud.google.com/pubsub)

> Sistema completo de processamento de pedidos com consumo de mensagens via Google Cloud Pub/Sub, persistência em SQLite e API RESTful.

---

## 📋 Sobre o Projeto

Este projeto foi desenvolvido como atividade da disciplina **Computação em Nuvem 2** da **FATEC - Desenvolvimento de Software Multiplataforma**.

O sistema implementa um consumidor de mensagens do Google Cloud Pub/Sub para processar pedidos de um marketplace, persistindo os dados em um banco relacional e disponibilizando uma API RESTful para consulta.

---

## 🎯 Funcionalidades

* ✅ Consumidor Pub/Sub (assíncrono)
* ✅ Persistência em SQLite
* ✅ API RESTful completa
* ✅ Paginação e filtros
* ✅ Cálculo automático de totais
* ✅ Interface Web
* ✅ Timestamp de processamento

---

## 🏗️ Arquitetura do Sistema

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Google Cloud    │     │ Consumidor       │     │ SQLite DB       │
│ Pub/Sub         │────▶│ (Node.js)        │────▶│ (Persistência)  │
│ (Mensagens)     │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ API REST         │
                       │ (Express.js)     │
                       └──────────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ Frontend         │
                       │ (HTML/CSS/JS)    │
                       └──────────────────┘
```

---

## 🚀 Tecnologias Utilizadas

| Tecnologia           | Descrição            |
| -------------------- | -------------------- |
| Node.js              | Ambiente de execução |
| Express.js           | API REST             |
| SQLite3              | Banco de dados       |
| Google Cloud Pub/Sub | Mensageria           |
| HTML/CSS/JS          | Frontend             |

---

## 📁 Estrutura do Projeto

```text
projeto-mensageria/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── api/
│   │   ├── server.js
│   │   └── routes/
│   │       ├── orders.js
│   │       └── customers.js
│   ├── config/
│   │   ├── database.js
│   │   └── initDB.js
│   ├── consumer/
│   │   ├── real-consumer.js
│   │   └── mock-consumer.js
│   ├── models/
│   ├── services/
│   └── utils/
├── database/
├── package.json
└── README.md
```

---

## 🗄️ Modelo de Dados (DER)

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ customers   │     │ orders      │     │ products    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │◄────│ customer_id │     │ id (PK)     │
│ name        │     │ uuid (PK)   │     │ name        │
│ email       │     │ created_at  │     │ unit_price  │
│ document    │     │ status      │     └─────────────┘
└─────────────┘     │ total       │
                    └─────────────┘
                           ▲
                           │
                    ┌─────────────┐
                    │ order_items │
                    ├─────────────┤
                    │ id (PK)     │
                    │ order_uuid  │
                    │ product_id  │
                    │ quantity    │
                    │ unit_price  │
                    │ total       │
                    └─────────────┘
```

---

## 🔧 Instalação e Configuração

### Pré-requisitos

* Node.js 20+
* npm 10+
* Conta no Google Cloud

---

### Passo a passo

### 1. Clone o repositório

```bash
git clone https://github.com/ellendias01/Mensageria.git
cd Mensageria
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Google Cloud

* Coloque o `service-account.json` na raiz do projeto

---

### 4. Inicialize o banco

```bash
npm run init-db
```

---

### 5. Execute o sistema

Terminal 1:

```bash
npm start
```

Acesse: [http://localhost:3001](http://localhost:3001)

Terminal 2:

```bash
npm run consumer
```

Ou para testes:

```bash
npm run mock-consumer
```

---

## 📡 Endpoints

### Pedidos

| Método | Endpoint             | Descrição         |
| ------ | -------------------- | ----------------- |
| GET    | /orders              | Lista pedidos     |
| GET    | /orders/:uuid        | Pedido específico |
| PATCH  | /orders/:uuid/status | Atualiza status   |
| GET    | /orders/statistics   | Estatísticas      |

---

### Clientes

| Método | Endpoint       |
| ------ | -------------- |
| GET    | /customers     |
| GET    | /customers/:id |
| PUT    | /customers/:id |
| DELETE | /customers/:id |

---

## 🎨 Frontend

* 📊 Dashboard com estatísticas
* 🔍 Filtros
* 📄 Paginação
* 📋 Modal de detalhes
* 📱 Responsivo

---

## 🧪 Testes

### Dados mockados

```bash
npm run mock-consumer
```

### Ver banco

```bash
npm run check-db
```

### Testar Pub/Sub

```bash
npm run test-connection
```

---

## 📊 Status dos Pedidos

| Status    | Descrição |
| --------- | --------- |
| created   | Criado    |
| paid      | Pago      |
| shipped   | Enviado   |
| delivered | Entregue  |
| canceled  | Cancelado |

---

## 🔐 Segurança

* Não subir `service-account.json`
* Usar `.env`
* `.gitignore` configurado

---

## 👥 Autora

**Éllen Dias Farias**

---

## 📝 Licença

MIT (uso acadêmico)

---

## 📌 Comandos Rápidos

| Comando               | Descrição       |
| --------------------- | --------------- |
| npm start             | API + Front     |
| npm run consumer      | Consumidor real |
| npm run mock-consumer | Teste           |
| npm run check-db      | Ver banco       |
| npm run init-db       | Reset DB        |

---

## 🚀 Atualizar no GitHub

```bash
git add README.md
git commit -m "README corrigido e formatado"
git push
```

---

