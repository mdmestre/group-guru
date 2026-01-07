# 🏗️ ARQUITETURA CENTRAL - BAILEYS + WHATSAPP

**Data:** Janeiro 6, 2026  
**Status:** 🟢 Núcleo Funcional | 🟡 Expansão em Andamento

---

## 🎯 VISÃO GERAL DA ARQUITETURA

Todo o código do projeto **se baseia na conexão Baileys ↔ WhatsApp**. Esta é a coluna vertebral de todas as funcionalidades.

```
┌─────────────────────────────────────────────────────────────┐
│                    BAILEYS (WhatsApp Web API)               │
│  └─ Conecta ao WhatsApp Web e expõe API local              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌─────▼─────┐  ┌──▼────────┐
   │  Auth  │  │ Messaging │  │   Events  │
   │ State  │  │   Queue   │  │  Handler  │
   └────────┘  └───────────┘  └───────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │  WhatsApp Connection    │
        │  Service               │
        └────────────┬────────────┘
                     │
        ┌────────────┼────────────────────┐
        │            │                    │
   ┌────▼────┐  ┌────▼─────┐  ┌──────────▼────┐
   │ Dispatch│  │ Broadcast│  │  Conversations│
   │ Service │  │ Service  │  │  Management   │
   └─────────┘  └──────────┘  └───────────────┘
        │            │                    │
        └────────────┼────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   CRM Dashboard         │
        │   (Frontend)            │
        └─────────────────────────┘
```

---

## 📦 COMPONENTES CHAVE

### 1️⃣ **BaileysInstanceService.js** (Núcleo)
- ✅ Cria/gerencia instâncias Baileys
- ✅ Autentica com WhatsApp Web
- ✅ Gerencia estado de conexão
- ✅ Persiste auth em arquivos locais
- ✅ Gerencia múltiplas conexões (multi-tenant)

**Arquivo:** [services/BaileysInstanceService.js](services/BaileysInstanceService.js)

### 2️⃣ **WhatsAppConnectionService.js** (Orquestração)
- ✅ Cria/lista conexões de empresa
- ✅ Valida plano e limites
- ✅ Gerencia ciclo de vida de conexões
- ✅ Integra com sistema de autenticação

**Arquivo:** [services/WhatsAppConnectionService.js](services/WhatsAppConnectionService.js)

### 3️⃣ **MessageQueueService.js** (Fila de Mensagens)
- ✅ Enfileira mensagens com Redis
- ✅ Retry automático (exponential backoff)
- ✅ Controla velocidade de envio
- ✅ Rastreia status de entrega

**Arquivo:** [services/MessageQueueService.js](services/MessageQueueService.js)

### 4️⃣ **DispatchService.js** (Campanha/Broadcast)
- ✅ Orquestra disparos de campanha
- ✅ Segmenta destinatários
- ✅ Gerencia estado de campanha
- ✅ Integra com fila de mensagens

**Arquivo:** [services/DispatchService.js](services/DispatchService.js)

---

## 🔌 FLUXO DE DADOS

### Fluxo 1: Conexão com WhatsApp
```
1. Usuário acessa /connections
2. Clica "Nova Conexão"
3. BaileysInstanceService cria instância
4. Gera QR Code (renderizado no frontend)
5. Usuário escaneia com WhatsApp
6. Baileys autentica com WhatsApp Web
7. Estado de conexão atualizado via Socket.IO
8. Conexão pronta para enviar/receber mensagens
```

### Fluxo 2: Envio de Mensagem Individual
```
1. Usuário seleciona contato
2. Digita mensagem
3. Clica "Enviar"
4. API POST /messages/:connectionId
5. WhatsAppConnectionService valida
6. DispatchService enfileira mensagem
7. MessageQueueService processa fila
8. Baileys envia via WhatsApp Web
9. Status atualizado em tempo real (Socket.IO)
```

### Fluxo 3: Disparos (Broadcast/Campaigns)
```
1. Usuário cria campanha na aba "Disparos"
2. Define: mensagem, mídia, filtros, destinatários
3. Clica "Agendar" ou "Disparar Agora"
4. DispatchService.launchCampaign() chamado
5. Segmenta/filtra contatos
6. Cria jobs para cada destinatário
7. MessageQueueService enfileira ~100-500 por vez
8. Queue processa com limite de velocidade (ex: 10 msgs/min)
9. Baileys envia cada mensagem
10. Acompanhamento em tempo real no dashboard
```

---

## 🗄️ BANCO DE DADOS

### Tabelas Críticas para Disparos
```sql
-- Campanha/Broadcast
CREATE TABLE campaigns (
  id VARCHAR PRIMARY KEY,
  company_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  type VARCHAR (broadcast, scheduled, automated),
  message_template TEXT NOT NULL,
  media_url VARCHAR,
  media_type VARCHAR,
  connection_id VARCHAR,
  status VARCHAR (draft, scheduled, running, paused, completed),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_recipients INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fila de Mensagens
CREATE TABLE message_queue (
  id VARCHAR PRIMARY KEY,
  campaign_id VARCHAR,
  recipient_id VARCHAR,
  contact_id VARCHAR,
  message_template TEXT,
  status VARCHAR (pending, sent, failed, delivered),
  attempts INT DEFAULT 0,
  error_message VARCHAR,
  created_at TIMESTAMP,
  sent_at TIMESTAMP
);

-- Contatos (para segmentação)
CREATE TABLE contacts (
  id VARCHAR PRIMARY KEY,
  company_id VARCHAR NOT NULL,
  name VARCHAR,
  phone VARCHAR UNIQUE,
  email VARCHAR,
  tags VARCHAR[],
  segment_id VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎛️ ROTAS DE API (Backend)

### Conexões WhatsApp
```
POST   /connections                    - Criar nova conexão
GET    /connections                    - Listar conexões
GET    /connections/:id                - Obter detalhes
DELETE /connections/:id                - Deletar conexão
POST   /connections/:id/disconnect    - Desconectar
```

### Disparos/Campanhas
```
POST   /campaigns                       - Criar campanha
GET    /campaigns                       - Listar campanhas
GET    /campaigns/:id                   - Obter detalhes
PATCH  /campaigns/:id                   - Atualizar campanha
DELETE /campaigns/:id                   - Deletar campanha
POST   /campaigns/:id/launch            - Disparar agora
POST   /campaigns/:id/pause             - Pausar disparo
POST   /campaigns/:id/resume            - Retomar disparo
GET    /campaigns/:id/stats             - Estatísticas
GET    /campaigns/:id/recipients        - Lista de destinatários
GET    /campaigns/:id/messages          - Mensagens enviadas
```

### Mensagens Individuais
```
POST   /messages                        - Enviar mensagem
GET    /messages/:contactId             - Histórico de mensagens
GET    /messages/:contactId/status      - Status de entrega
```

---

## 📡 EVENTOS SOCKET.IO (Real-time)

### Eventos de Conexão
```javascript
socket.on('connection-status', {
  status: 'connecting|connected|disconnected',
  connectionId: '...',
  qrCode: '...' // Quando status = connecting
});

socket.on('connection-error', {
  connectionId: '...',
  error: 'Erro na conexão'
});
```

### Eventos de Mensagem
```javascript
socket.on('message-sent', {
  messageId: '...',
  contactId: '...',
  timestamp: '...',
  status: 'sent|delivered|read'
});

socket.on('message-received', {
  messageId: '...',
  contactId: '...',
  text: '...',
  timestamp: '...'
});
```

### Eventos de Campanha
```javascript
socket.on('campaign-started', {
  campaignId: '...',
  totalRecipients: 100
});

socket.on('campaign-progress', {
  campaignId: '...',
  sent: 25,
  failed: 2,
  pending: 73
});

socket.on('campaign-completed', {
  campaignId: '...',
  totalSent: 98,
  totalFailed: 2,
  duration: 3600000 // ms
});
```

---

## 🔐 AUTENTICAÇÃO & SEGURANÇA

### JWT + Context
- ✅ Login gera JWT com `companyId` e `userId`
- ✅ Middleware valida JWT em todas as rotas
- ✅ `req.companyId` extraído do token
- ✅ Queries filtram por `company_id`

### Multi-tenancy
- ✅ Cada empresa tem conexões WhatsApp próprias
- ✅ Contatos isolados por company
- ✅ Campanhas isoladas por company
- ✅ RLS Policies (Row Level Security) em PostgreSQL

### Limites de Plano
- ✅ `subscription.max_instances` limita conexões
- ✅ `subscription.max_contacts` limita contatos
- ✅ `subscription.max_messages_per_day` limita envios

---

## 🚀 PRÓXIMAS FASES

### FASE 4: ABA DE DISPAROS (Em Desenvolvimento)
**Objetivo:** Interface completa para gerenciar campanhas de broadcast

#### 4.1 - Criar Componente da Aba
- [ ] Componente `DisparosTab.tsx` no CRM
- [ ] Layout com 4 sub-abas:
  1. **Campanhas Ativas** - Dashboard
  2. **Criar Campanha** - Formulário
  3. **Histórico** - Logs e estatísticas
  4. **Modelos** - Templates de mensagem

#### 4.2 - Dashboard de Campanhas
- [ ] Lista de campanhas com status
- [ ] Cards de KPIs (enviadas, falhadas, taxa de entrega)
- [ ] Gráfico de progresso em tempo real
- [ ] Filtros por status, data, conexão

#### 4.3 - Formulário de Criação
- [ ] Seleção de conexão WhatsApp
- [ ] Escolha de segmento/filtro de contatos
- [ ] Editor visual de mensagem
- [ ] Suporte a variáveis ({{nome}}, {{email}})
- [ ] Upload de mídia (imagem, vídeo, documento)
- [ ] Agendamento (Disparar Agora / Agendar Para)
- [ ] Controle de velocidade (msgs/min)
- [ ] Preview da mensagem

#### 4.4 - Acompanhamento em Tempo Real
- [ ] Contador de mensagens (enviadas, falhadas, aguardando)
- [ ] Log de eventos
- [ ] Pausa/Retomada de campanha
- [ ] Cancelamento de campanha
- [ ] Exportar relatório

#### 4.5 - Melhorias de Backend
- [ ] Validação de fila (evitar duplicatas)
- [ ] Retry automático com backoff
- [ ] Webhook para eventos de entrega
- [ ] Agendamento com cron jobs
- [ ] Suporte a filtros avançados

---

## 🔧 STACK TÉCNICO

### Backend
- **Node.js** + **Express**
- **Baileys** (WhatsApp Web API)
- **BullMQ** + **Redis** (Fila de mensagens)
- **PostgreSQL** (Banco de dados)
- **Socket.IO** (Real-time)
- **JWT** (Autenticação)

### Frontend
- **React** + **TypeScript**
- **Vite** (Build)
- **Tailwind CSS** (Estilos)
- **shadcn/ui** (Componentes)
- **React Query** (Data fetching)
- **Socket.IO Client** (Real-time)

---

## 📊 MÉTRICAS E MONITORAMENTO

### Métricas Críticas
- Taxa de envio (msgs/min)
- Taxa de entrega (%)
- Taxa de erro (%)
- Latência média (ms)
- Conexões ativas
- Tamanho da fila

### Logs
- [logs/](logs/) - Arquivo de log
- `[connections]` - Eventos de conexão
- `[messages]` - Eventos de mensagem
- `[campaigns]` - Eventos de campanha
- `[queue]` - Eventos da fila

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Núcleo (Já Implementado ✅)
- [x] BaileysInstanceService
- [x] WhatsAppConnectionService
- [x] MessageQueueService
- [x] DispatchService
- [x] Rotas de API
- [x] Socket.IO events
- [x] Autenticação JWT

### Aba de Disparos (Em Progresso 🟡)
- [ ] Componente DisparosTab
- [ ] Dashboard de campanhas
- [ ] Formulário de criação
- [ ] Acompanhamento em tempo real
- [ ] Melhorias de backend

### Otimizações (Próximo 🔜)
- [ ] Suporte a webhooks
- [ ] Agendamento avançado
- [ ] Filtros complexos
- [ ] Relatórios detalhados
- [ ] A/B testing

---

## 🤝 SUPORTE

Para dúvidas ou problemas:
1. Consulte [BACKEND_SETUP.md](BACKEND_SETUP.md)
2. Verifique logs em [logs/](logs/)
3. Teste endpoints com Postman/cURL
4. Ative debug com `DEBUG=*` no terminal

---

**Última atualização:** 6 de janeiro de 2026
