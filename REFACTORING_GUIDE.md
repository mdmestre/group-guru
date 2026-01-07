# Refatoração do Frontend - Dados Reais do Backend

## 🎯 Objetivo
Migrar completamente o frontend de dados mockados para consumir apenas dados reais do backend, implementando arquitetura limpa, cache inteligente e sincronização em tempo real.

## ✅ O Que Foi Implementado

### 1. **API Client Centralizado** (`src/services/apiClient.ts`)
- Single point of entry para todas as requisições HTTP
- Gerenciamento automático de headers e autenticação
- Tratamento centralizado de erros e tokens expirados
- Métodos simplificados: `get()`, `post()`, `put()`, `patch()`, `delete()`

**Uso:**
```typescript
const data = await ApiClient.get<MyType>('/endpoint');
const created = await ApiClient.post<MyType>('/endpoint', payload);
```

### 2. **Types Estruturados**
Criados tipos TypeScript para cada domínio:
- **`src/types/contact.ts`** - Contatos, conversas, mensagens
- **`src/types/campaign.ts`** - Campanhas e destinatários
- **`src/types/connection.ts`** - Conexões WhatsApp
- **`src/types/dashboard.ts`** - Métricas do dashboard

Todos os types incluem:
- Status enums (not strings)
- Timestamps ISO 8601
- Campos opcionais explícitos
- Relacionamentos de dados

### 3. **React Query Hooks** (Caching Automático)
Implementados hooks para cada recurso com cache inteligente:

#### **Contatos** (`src/hooks/useContacts.ts`)
```typescript
const { data: contacts, isLoading, error } = useContacts();
const { data: stats } = useContactStats();
const { data: conversations } = useConversations();
const { data, refetch } = useConversation(contactId);
const { mutate: sendMessage } = useSendMessage();
const { invalidateContacts, invalidateMessages } = useContactsRealtime();
```

#### **Campanhas** (`src/hooks/useCampaigns.ts`)
```typescript
const { data: campaigns, isLoading } = useCampaigns();
const { data: campaign } = useCampaign(campaignId);
const { data: stats } = useCampaignStats(campaignId);
const { data: recipients } = useCampaignRecipients(campaignId);
const { mutate: launch } = useLaunchCampaign();
const { mutate: pause } = usePauseCampaign();
const { invalidateCampaigns, invalidateCampaignStats } = useCampaignsRealtime();
```

#### **Conexões** (`src/hooks/useConnections.ts`)
```typescript
const { data: connections } = useConnections();
const { data: connection } = useConnection(connectionId);
const { data: stats } = useConnectionStats();
const { mutate: connect } = useConnectWhatsApp();
const { mutate: disconnect } = useDisconnectWhatsApp();
const { invalidateConnections } = useConnectionsRealtime();
```

#### **Dashboard** (`src/hooks/useDashboard.ts`)
```typescript
const { data: metrics } = useDashboardMetrics({ periodDays: 30 });
const { data: activities } = useDashboardActivities(limit);
const { data: connections } = useDashboardConnections();
```

**Cache Strategy:**
- Metrics: 1 minuto (precisão importante)
- Contatos: 5 minutos (muda menos frequente)
- Campanhas: 2 minutos (status muda frequentemente)
- Conversas: 30 segundos (real-time importante)
- Conexões: 30 segundos (status crítico)

### 4. **Socket.IO Provider** (`src/contexts/SocketProvider.tsx`)
Real-time synchronization com invalidação automática de cache:

```typescript
<SocketProvider>
  <App />
</SocketProvider>
```

**Eventos Sincronizados:**
- `message:new` → Invalida conversas e contatos
- `message:delivered/read` → Invalida mensagens
- `contact:new/updated` → Invalida contatos
- `campaign:status_changed` → Invalida campanha
- `campaign:progress` → Invalida stats
- `connection:status_changed` → Invalida conexão
- `dashboard:metrics_updated` → Invalida métricas

### 5. **Componentes de Estado**

#### **LoadingState** (`src/components/LoadingState.tsx`)
```typescript
<LoadingState message="Carregando dados..." />
```

#### **ErrorState** (`src/components/ErrorState.tsx`)
```typescript
<ErrorState
  message="Erro ao carregar"
  onRetry={() => refetch()}
/>
```

#### **EmptyState** (`src/components/EmptyState.tsx`)
```typescript
<EmptyState
  title="Nenhum dado"
  description="Comece criando um novo item"
  actionLabel="Criar"
  onAction={() => {}}
/>
```

### 6. **Dashboard Refatorado** (`src/pages/Dashboard.tsx`)
✅ **Migrado de mock data para dados reais**
- Métricas em tempo real do backend
- Atividades recentes da empresa
- Status de conexões WhatsApp
- Loading, error e empty states
- Estatísticas de contatos

### 7. **Componentes CRM Reutilizáveis**

#### **ContactsPanel** (`src/components/crm/ContactsPanel.tsx`)
- Lista de contatos real com paginação
- Busca e filtros
- Estatísticas (total, ativos, com mensagens)
- Links para conversa
- Tags e badges dinâmicas

#### **CampaignsPanel** (`src/components/crm/CampaignsPanel.tsx`)
- Lista de campanhas com status real
- Filtros por status
- Barra de progresso de entrega
- Ações (iniciar, pausar, retomar)
- Estatísticas agregadas

## 🔄 Fluxo de Dados

```
Backend API
    ↓
[ApiClient] → [React Query] → [Component Hooks]
    ↑                              ↓
[Socket.IO] ←← [Cache Invalidation]
    ↓
[Real-time Updates]
```

## 🏗️ Arquitetura

### Camadas:
1. **API Layer** - `ApiClient` centralizado
2. **Data Layer** - React Query hooks
3. **Sync Layer** - Socket.IO provider
4. **UI Layer** - Componentes com loading/error/empty states
5. **Page Layer** - Páginas usando os hooks

### Princípios:
- ✅ Backend é única fonte de verdade
- ✅ Zero dados fictícios
- ✅ Desacoplado (componentes não conhecem API)
- ✅ Preparado para multi-tenant
- ✅ Cache inteligente
- ✅ Sync em tempo real
- ✅ Error handling robusto

## 🚀 Como Usar

### Refatorar Uma Página Existente

1. **Remover mock data:**
```typescript
// ❌ Remover
const [contacts, setContacts] = useState(mockContacts);

// ✅ Adicionar
const { data: contacts, isLoading, error } = useContacts();
```

2. **Adicionar estados:**
```typescript
if (isLoading) return <LoadingState />;
if (error) return <ErrorState onRetry={() => refetch()} />;
if (!contacts?.length) return <EmptyState />;
```

3. **Usar dados reais:**
```typescript
<ContactCard contact={contact} />
```

### Exemplos Completos

#### Contatos
```typescript
import { useContacts, useSendMessage } from '@/hooks/useContacts';
import { LoadingState, ErrorState, EmptyState } from '@/components';

export function ContactsPage() {
  const { data: contacts, isLoading, error, refetch } = useContacts();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!contacts?.length) return <EmptyState title="Sem contatos" />;

  return (
    <div>
      {contacts.map(contact => (
        <div key={contact.id}>{contact.name}</div>
      ))}
    </div>
  );
}
```

#### Campanhas com Ações
```typescript
import { useCampaigns, useLaunchCampaign } from '@/hooks/useCampaigns';

export function CampaignsPage() {
  const { data: campaigns } = useCampaigns();
  const { mutate: launch, isPending } = useLaunchCampaign();

  return (
    <div>
      {campaigns?.map(campaign => (
        <button
          key={campaign.id}
          onClick={() => launch(campaign.id)}
          disabled={isPending}
        >
          Iniciar
        </button>
      ))}
    </div>
  );
}
```

#### Real-time Sync
```typescript
import { useSocket } from '@/contexts/SocketProvider';
import { useContacts } from '@/hooks/useContacts';

export function LiveContacts() {
  const socket = useSocket();
  const { data: contacts, refetch } = useContacts();

  // Socket já invalida cache automaticamente!
  // Basta refetch quando necessário
  
  return (
    <div>
      {socket.isConnected && (
        <div className="text-green-600">🟢 Sincronizado em tempo real</div>
      )}
      {contacts?.map(c => <div key={c.id}>{c.name}</div>)}
    </div>
  );
}
```

## 📋 Próximas Etapas

### Refatorar CRM Completo
- [ ] Integrar `ContactsPanel` na página CRM
- [ ] Integrar `CampaignsPanel` na página CRM
- [ ] Refatorar pipeline Kanban com dados reais
- [ ] Remover todos os `defaultPipeline` e `mockDeals`

### Refatorar Conversas
- [ ] Usar `useConversations` para listar conversas
- [ ] Usar `useMessages` para carregar histórico
- [ ] Usar `useSendMessage` para enviar
- [ ] Socket.IO para sync real-time de mensagens

### Refatorar Conexões WhatsApp
- [ ] Usar `useConnections` para listar
- [ ] Usar `useConnectWhatsApp` para conectar
- [ ] Mostrar QR code real do backend
- [ ] Status atualizado em tempo real

### Endpoints Backend Necessários

Se ainda não existem, criar:
- `GET /dashboard/metrics?periodDays=30`
- `GET /dashboard/activities?limit=10`
- `GET /dashboard/connections`
- `GET /contacts`
- `GET /contacts/stats`
- `GET /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`

## 🛠️ Debug

### Visualizar Cache
```typescript
// No console do navegador
import { useQueryClient } from '@tanstack/react-query';
const qc = useQueryClient();
console.log(qc.getQueryData(['contacts']));
```

### Monitorar Socket Events
```typescript
socket.on('*', (event, data) => {
  console.log('[Socket Event]', event, data);
});
```

### DevTools
```bash
npm install @tanstack/react-query-devtools
```

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools />
</QueryClientProvider>
```

## ⚠️ Checklist de Migração

Para cada página/componente:
- [ ] Remover todo mock data
- [ ] Implementar hooks de dados
- [ ] Adicionar loading state
- [ ] Adicionar error state com retry
- [ ] Adicionar empty state
- [ ] Testar com backend real
- [ ] Testar Socket.IO updates
- [ ] Verificar cache strategy

## 📞 Suporte

Dúvidas sobre:
- **React Query**: https://tanstack.com/query/latest
- **Socket.IO**: https://socket.io/docs/
- **TypeScript**: https://www.typescriptlang.org/docs/

Todos os componentes seguem a mesma arquitetura! 🎉
