# 📋 FASE 4: ABA DE DISPAROS - PLANO DETALHADO

**Objetivo:** Implementar interface completa para gerenciar campanhas de broadcast/disparos via WhatsApp  
**Duração Estimada:** 2-3 semanas (30-40 horas)  
**Começar em:** Janeiro 8, 2026

---

## 📊 VISÃO GERAL DA FASE 4

A aba de disparos será a interface central para gerenciar campanhas de envio em massa via WhatsApp. Toda a lógica de backend (Baileys, MessageQueue, DispatchService) já existe - esta fase é implementar a interface do usuário e integrações finais.

### Estrutura da Aba

```
┌─────────────────────────────────────────────────────┐
│              ABA DISPAROS (Broadcasting)            │
├─────────────────────────────────────────────────────┤
│ Sub-abas:                                           │
│  [Ativas]  [Criar]  [Histórico]  [Modelos]         │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ Selecione a sub-aba para começar              │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 FASE 4.1: SETUP INICIAL (2-3 dias)

### O QUE SERÁ FEITO
1. Criar componente `DisparosTab.tsx` no CRM
2. Criar sub-componentes para cada aba
3. Configurar hooks de data fetching
4. Integrar Socket.IO para real-time

### ARQUIVOS A CRIAR

#### 1. Componente Principal
```
src/pages/components/crm/
└── DisparosTab.tsx                          (~ 200 linhas)
```

**Conteúdo:**
```typescript
// Sub-abas
const [activeDispatchTab, setActiveDispatchTab] = useState('campaigns');

// Tabs: 
// - 'campaigns' → CampaignsActive
// - 'create' → CreateCampaign
// - 'history' → CampaignHistory
// - 'templates' → TemplateManager
```

#### 2. Componentes de Sub-abas
```
src/features/campaigns/
├── components/
│   ├── CampaignsActive.tsx              (Dashboard)
│   ├── CreateCampaign.tsx               (Formulário)
│   ├── CampaignHistory.tsx              (Histórico)
│   └── TemplateManager.tsx              (Templates)
├── hooks/
│   ├── useCampaigns.ts                  (Listar campanhas)
│   ├── useCreateCampaign.ts             (Criar campanha)
│   └── useCampaignStats.ts              (Estatísticas)
├── models/
│   └── types.ts                         (Tipos TypeScript)
└── services/
    └── campaignService.ts               (API calls)
```

#### 3. Tipos TypeScript
```
src/features/campaigns/models/types.ts
```

**Tipos:**
```typescript
interface Campaign {
  id: string;
  companyId: string;
  connectionId: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'scheduled' | 'automated';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  messageTemplate: string;
  mediaUrl?: string;
  mediaType?: string;
  targetFilters: {
    segmentIds?: string[];
    tags?: string[];
    customField?: { field: string; operator: string; value: any };
  };
  recipientsCount: number;
  sentCount: number;
  failedCount: number;
  messagesPerMinute: number;
  delayBetweenMessages: number;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface CampaignRecipient {
  id: string;
  campaignId: string;
  contactId: string;
  phone: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
}
```

### TAREFAS

- [ ] Criar arquivo `DisparosTab.tsx`
- [ ] Criar pasta `src/features/campaigns/`
- [ ] Definir tipos em `types.ts`
- [ ] Criar hooks básicos
- [ ] Integrar no CRM.tsx (adicionar aba)
- [ ] Testes básicos no navegador

### DEPENDÊNCIAS
- ✅ Backend: Rotas de campanhas já existem
- ✅ Backend: Services já existem
- ❌ Frontend: Componentes sub-abas (próxima etapa)

---

## 🎨 FASE 4.2: DASHBOARD DE CAMPANHAS (3-4 dias)

### O QUE SERÁ FEITO
Criar dashboard visual com:
- Lista de campanhas ativas
- KPIs (enviadas, falhadas, rate de entrega)
- Gráfico de progresso em tempo real
- Ações rápidas (pausar, retomar, cancelar)

### COMPONENTE: CampaignsActive.tsx

#### Layout
```
┌──────────────────────────────────────────────────┐
│ Campanhas Ativas                  [+ Nova]       │
├──────────────────────────────────────────────────┤
│                                                  │
│ KPI Cards:                                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │  100%   │ │   95%   │ │   500   │ │  1h30m │ │
│ │ Entrega │ │ Sucesso │ │ Enviadas│ │ Tempo  │ │
│ └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│                                                  │
│ Campanha #1: "Promoção Ano Novo"               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Status: RUNNING ▓▓▓░░░░░░░ 50%             │ │
│ │ 500 enviadas / 1000 pendentes               │ │
│ │ Taxa: 10 msgs/min                           │ │
│ │ [Pausar] [Cancelar] [Ver Detalhes]         │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Campanha #2: "Black Friday"                    │
│ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

#### Features
- [ ] Listar campanhas com `useCampaigns()`
- [ ] Cartões com informações de campanha
- [ ] Barra de progresso animada
- [ ] KPI cards com ícones
- [ ] Botões de ação (Pausar, Retomar, Cancelar, Ver Detalhes)
- [ ] Real-time updates via Socket.IO
- [ ] Filtros por status
- [ ] Ordenação por data/progresso

#### Dados para KPI
```javascript
// Agregação por company_id
const stats = {
  deliveryRate: (sentCount / totalCount) * 100,
  successRate: (deliveredCount / sentCount) * 100,
  totalSent: sentCount,
  estimatedDuration: (totalCount / messagesPerMinute) * 60000
};
```

### TAREFAS

- [ ] Criar `CampaignsActive.tsx`
- [ ] Criar `useCampaigns.ts` hook
- [ ] Criar `campaignService.ts` com API calls
- [ ] Componente para card de campanha
- [ ] Integrar Socket.IO para atualização em tempo real
- [ ] Testes com dados mock
- [ ] UI refinement com Tailwind

---

## ✏️ FASE 4.3: FORMULÁRIO DE CRIAÇÃO (4-5 dias)

### O QUE SERÁ FEITO
Criar formulário completo para criar campanhas com:
- Seleção de conexão WhatsApp
- Seleção de segmento/filtro de contatos
- Editor visual de mensagem
- Upload de mídia
- Agendamento
- Preview

### COMPONENTE: CreateCampaign.tsx

#### Etapas do Formulário (Multi-step)

```
Passo 1: BÁSICO
┌─────────────────────────────────┐
│ Nome da Campanha: ___________   │
│ Descrição:                      │
│ ________________________        │
│                                 │
│ Conexão WhatsApp: [Selector]   │
│ [Próximo →]                     │
└─────────────────────────────────┘

Passo 2: DESTINATÁRIOS
┌─────────────────────────────────┐
│ Selecione Destinatários:        │
│ ☐ Todos os contatos (1000)      │
│ ☐ Segmento: [Dropdown]          │
│ ☐ Tags: [Multi-select]          │
│ ☐ Filtro customizado:           │
│    Campo: [Dropdown]            │
│    Operador: [=, >, <, contains]│
│    Valor: __________________    │
│                                 │
│ Total de contatos: 250          │
│ [← Voltar] [Próximo →]          │
└─────────────────────────────────┘

Passo 3: MENSAGEM
┌─────────────────────────────────┐
│ Conteúdo da Mensagem:           │
│ ___________________________     │
│ ___________________________     │
│ ___________________________     │
│                                 │
│ [Variáveis: {{nome}}, {{email}}]│
│ Mídia: [Upload] ou [URL]        │
│ Tipo: [Imagem] [Vídeo] [Doc]   │
│                                 │
│ Preview:                        │
│ ┌──────────────────────────┐    │
│ │ Olá {{nome}}, aproveite│    │
│ │ nossa promoção! 🎉       │    │
│ └──────────────────────────┘    │
│ [← Voltar] [Próximo →]          │
└─────────────────────────────────┘

Passo 4: AGENDAMENTO
┌─────────────────────────────────┐
│ Quando disparar?                │
│ ☐ Disparar Agora                │
│ ☐ Agendar para:                 │
│   Data: [Calendar]              │
│   Hora: [Time Picker]           │
│   Timezone: [Selector]          │
│                                 │
│ Velocidade de Envio:            │
│ Mensagens por minuto: [10] ◄─► │
│ Delay entre envios: [6000]ms    │
│                                 │
│ [← Voltar] [Disparar!]          │
└─────────────────────────────────┘
```

#### Features

- [ ] Step-by-step form com React Hook Form
- [ ] Validação em cada passo
- [ ] Preview de mensagem
- [ ] Upload de mídia (drag-drop)
- [ ] Suporte a variáveis ({{name}}, {{email}})
- [ ] Calendar + Time picker
- [ ] Seletor de timezone
- [ ] Confirmação antes de disparar
- [ ] Suporte a agendamento

#### Dados Salvos
```typescript
{
  companyId: "...",
  connectionId: "...",
  name: "Promoção Ano Novo",
  targetFilters: { tags: ["clientes", "vip"] },
  messageTemplate: "Olá {{name}}, aproveite {{discount}}% de desconto!",
  mediaUrl: "https://...",
  mediaType: "image",
  messagesPerMinute: 10,
  delayBetweenMessages: 6000,
  scheduledFor: "2026-01-10T09:00:00Z",
  createdBy: "user_123"
}
```

### TAREFAS

- [ ] Criar `CreateCampaign.tsx`
- [ ] Configurar React Hook Form com multi-step
- [ ] Componente de editor de mensagem
- [ ] Upload de mídia
- [ ] Calendar + Time picker
- [ ] Variáveis de template
- [ ] Validação
- [ ] Testes

---

## 📊 FASE 4.4: ACOMPANHAMENTO EM TEMPO REAL (3-4 dias)

### O QUE SERÁ FEITO
Criar interface de monitoramento de campanha durante execução

### COMPONENTE: CampaignDetails.tsx (Modal/Page)

#### Layout
```
┌──────────────────────────────────────────────────┐
│ Campanha: "Promoção Ano Novo"                   │
│ Status: RUNNING                    [X] Fechar   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Progresso:                                       │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░ 27% (500/1800)   │
│                                                  │
│ Estatísticas:                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐    │
│ │ Enviadas │ Aguard.  │ Falhas   │ Taxa     │    │
│ │   500    │  1300    │   0      │ 10/min   │    │
│ └──────────┴──────────┴──────────┴──────────┘    │
│                                                  │
│ Timeline de Eventos:                            │
│ 09:45 ✓ Campanha iniciada - 1800 destinatários  │
│ 10:00 ✓ 500 mensagens enviadas                  │
│ 10:15 ✓ 1000 mensagens enviadas                 │
│                                                  │
│ Ações:                                           │
│ [Pausar] [Cancelar] [Exportar Relatório]        │
│                                                  │
│ [← Voltar para Campanhas]                       │
└──────────────────────────────────────────────────┘
```

#### Features

- [ ] Gráfico de progresso em tempo real
- [ ] Estatísticas ao vivo
- [ ] Timeline de eventos
- [ ] Ações (pausar, retomar, cancelar)
- [ ] Atualização via Socket.IO a cada 5-10s
- [ ] Exportar relatório (CSV/PDF)
- [ ] Histórico de tentativas (retry)

### TAREFAS

- [ ] Criar `CampaignDetails.tsx` e modal wrapper
- [ ] Socket.IO listener para `campaign-progress`
- [ ] Gráfico com Chart.js ou Recharts
- [ ] Exportação de relatório
- [ ] Testes com dados simulados

---

## 📈 FASE 4.5: HISTÓRICO E TEMPLATES (3-4 dias)

### COMPONENTE 1: CampaignHistory.tsx

#### Features
- [ ] Tabela com histórico de campanhas
- [ ] Filtros por status, data, conexão
- [ ] Busca por nome
- [ ] Colunas: Nome, Status, Data, Enviadas, Taxa de Sucesso
- [ ] Ação: Duplicar campanha
- [ ] Ação: Ver detalhes
- [ ] Ação: Deletar

#### Layout
```
┌──────────────────────────────────────────────────┐
│ Histórico de Campanhas                          │
├──────────────────────────────────────────────────┤
│ Filtros: [Status ▼] [Data ▼] [Buscar...]       │
│                                                  │
│ Campanha                | Status    | Taxa     │
│ ────────────────────────┼───────────┼─────────│
│ Promoção Ano Novo      │ COMPLETED │ 97%     │
│ Black Friday           │ COMPLETED │ 95%     │
│ Welcome Series         │ RUNNING   │ 100%    │
│ Newsletter Jan         │ DRAFT     │ —       │
│                                                  │
│ [← Página Anterior] [Próxima →]                │
└──────────────────────────────────────────────────┘
```

### COMPONENTE 2: TemplateManager.tsx

#### Features
- [ ] Listar templates salvos
- [ ] Criar novo template
- [ ] Editor de template
- [ ] Suporte a variáveis
- [ ] Preview
- [ ] Duplicar template
- [ ] Deletar template

#### Layout
```
┌──────────────────────────────────────────────────┐
│ Modelos de Mensagem                 [+ Novo]    │
├──────────────────────────────────────────────────┤
│                                                  │
│ Template: "Boas-vindas"                        │
│ ┌──────────────────────────────────────────┐    │
│ │ Olá {{name}}, bem-vindo!                │    │
│ │ Sua empresa: {{company}}                │    │
│ │ Especial para você: {{special_offer}}   │    │
│ └──────────────────────────────────────────┘    │
│ [Editar] [Duplicar] [Deletar]                  │
│                                                  │
│ Template: "Promoção"                           │
│ └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### TAREFAS

- [ ] Criar `CampaignHistory.tsx`
- [ ] Criar `TemplateManager.tsx`
- [ ] Tabela com sorting/filtering
- [ ] CRUD de templates
- [ ] Variáveis dinâmicas

---

## 🔧 FASE 4.6: MELHORIAS DE BACKEND (2-3 dias)

### O QUE FAZER

#### 1. Validações Adicionais
```javascript
// routes/campaigns.js

// Validar:
// - Conexão existe e está conectada
// - Segmento existe e tem contatos
// - Mensagem não é vazia
// - messagesPerMinute está dentro dos limites do plano
```

#### 2. Webhook para Eventos
```javascript
// Quando mensagem é entregue/lida:
// POST /webhooks/campaign-event
// {
//   campaignId, 
//   recipientId, 
//   event: 'sent|delivered|read|failed',
//   timestamp
// }
```

#### 3. Retry Logic Melhorado
```javascript
// MessageQueueService
// - Retry automático: 3 tentativas
// - Backoff: 2s, 4s, 8s
// - Log detalhado de erros
```

#### 4. Agendamento com Cron
```javascript
// Para campanhas agendadas:
// - node-cron ou node-schedule
// - Verificar a cada minuto
// - Disparar quando chegar a hora
```

### TAREFAS

- [ ] Adicionar validações
- [ ] Implementar webhook
- [ ] Melhorar retry logic
- [ ] Configurar cron jobs
- [ ] Testes de carga

---

## 📱 FASE 4.7: INTEGRAÇÃO NO CRM.tsx (1-2 dias)

### O QUE FAZER

Adicionar a aba de disparos no CRM.tsx:

```typescript
// src/pages/CRM.tsx

// Dentro do <Tabs>:
<TabsTrigger value="disparos">
  <Send className="h-4 w-4 mr-2" />
  Disparos
</TabsTrigger>

<TabsContent value="disparos">
  <Suspense fallback={<LoadingState />}>
    <DisparosTab />
  </Suspense>
</TabsContent>
```

### TAREFAS

- [ ] Importar `DisparosTab`
- [ ] Adicionar aba no CRM
- [ ] Lazy loading
- [ ] Testes de integração

---

## 📋 CHECKLIST COMPLETO DA FASE 4

### 4.1 Setup Inicial
- [ ] `DisparosTab.tsx` criado
- [ ] Pasta `src/features/campaigns/` estruturada
- [ ] Tipos TypeScript definidos
- [ ] Hooks básicos criados
- [ ] Integrado no CRM

### 4.2 Dashboard de Campanhas
- [ ] `CampaignsActive.tsx` implementado
- [ ] `useCampaigns.ts` hook funcional
- [ ] API calls configuradas
- [ ] Real-time updates via Socket.IO
- [ ] Filtros e ordenação funcionando

### 4.3 Formulário de Criação
- [ ] `CreateCampaign.tsx` multi-step
- [ ] Validação em cada passo
- [ ] Preview de mensagem
- [ ] Upload de mídia
- [ ] Agendamento funcional

### 4.4 Acompanhamento Real-time
- [ ] `CampaignDetails.tsx` (modal/page)
- [ ] Gráfico de progresso
- [ ] Timeline de eventos
- [ ] Ações (pausar, cancelar)
- [ ] Exportação de relatório

### 4.5 Histórico e Templates
- [ ] `CampaignHistory.tsx` com tabela
- [ ] `TemplateManager.tsx` CRUD
- [ ] Variáveis dinâmicas
- [ ] Duplicação de templates

### 4.6 Melhorias Backend
- [ ] Validações adicionais
- [ ] Webhook para eventos
- [ ] Retry logic melhorado
- [ ] Cron jobs para agendamento

### 4.7 Integração CRM
- [ ] Aba "Disparos" adicionada
- [ ] Lazy loading
- [ ] Testes de integração

---

## 🚀 PRÓXIMAS FASES (ROADMAP)

### FASE 5: A/B TESTING (Semana 11-12)
- [ ] Variants de mensagem
- [ ] Teste automático
- [ ] Resultados estatísticos

### FASE 6: INTEGRAÇÕES (Semana 13-14)
- [ ] Zapier
- [ ] Integromat
- [ ] Webhooks customizados

### FASE 7: IA E AUTOMAÇÃO (Semana 15-16)
- [ ] Sugestões de melhor horário
- [ ] Análise de sentimento
- [ ] Respostas automáticas inteligentes

---

## 🔗 REFERÊNCIAS

- [ARCHITECTURE_BAILEYS_CORE.md](ARCHITECTURE_BAILEYS_CORE.md)
- [services/DispatchService.js](services/DispatchService.js)
- [routes/campaigns.js](routes/campaigns.js)
- [PHASE_2_STATUS.md](PHASE_2_STATUS.md)

---

**Versão:** 1.0  
**Data:** Janeiro 6, 2026  
**Pronto para começar?** Consulte o próximo passo em 4.1!
