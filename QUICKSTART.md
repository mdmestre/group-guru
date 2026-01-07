# 🚀 Quick Start - Refatoração de Páginas

## Como Começar

### 1. Escolha uma página para refatorar
Exemplo: `src/pages/CRM.tsx`

### 2. Identifique os dados mock
```typescript
// ❌ Procure por
const [contacts, setContacts] = useState(mockContacts);
const mockUsers = [...]
const mockDeals = [...]
```

### 3. Substitua pelos hooks
```typescript
// ✅ Use
const { data: contacts, isLoading, error } = useContacts();
const { data: users, isLoading: usersLoading } = useUsers();
const { data: deals, isLoading: dealsLoading } = useDeals();
```

### 4. Adicione tratamento de estados
```typescript
if (isLoading) return <LoadingState />;
if (error) return <ErrorState onRetry={() => refetch()} />;
if (!contacts?.length) return <EmptyState />;
```

### 5. Remova mock data
Delete as variáveis de mock:
```typescript
// ❌ Delete
const defaultPipeline = {...}
const mockUsers = [...]
const mockPersons = [...]
const mockOrganizations = [...]
const mockDeals = [...]
```

## Exemplo Completo - Antes vs Depois

### ❌ ANTES (com mock data)
```typescript
import { useState } from "react";

const mockContacts = [
  { id: "1", name: "João", phone: "+55 11 99999-9999" },
  { id: "2", name: "Maria", phone: "+55 11 88888-8888" }
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState(mockContacts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      {contacts.map(c => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
```

### ✅ DEPOIS (dados reais)
```typescript
import { useContacts } from "@/hooks/useContacts";
import { LoadingState, ErrorState, EmptyState } from "@/components";

export default function ContactsPage() {
  const { data: contacts, isLoading, error, refetch } = useContacts();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!contacts?.length) return <EmptyState title="Sem contatos" />;

  return (
    <div>
      {contacts.map(c => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
```

## Checklist por Página

### Dashboard ✅ DONE
- [x] Remover metrics mock
- [x] Usar `useDashboardMetrics()`
- [x] Usar `useDashboardActivities()`
- [x] Adicionar estados
- [x] Testar com backend

### Conversations TODO
- [ ] Remover mock conversations
- [ ] Usar `useConversations()`
- [ ] Usar `useConversationMessages()`
- [ ] Usar `useSendMessage()`
- [ ] Copiar estrutura de `ConversationsRefactored.tsx`

### CRM TODO
- [ ] Remover `defaultPipeline`
- [ ] Remover `mockUsers`, `mockPersons`, `mockOrganizations`, `mockDeals`
- [ ] Usar `ContactsPanel` (já pronta!)
- [ ] Usar `CampaignsPanel` (já pronta!)
- [ ] Implementar pipeline Kanban com dados reais

### WhatsApp Connections TODO
- [ ] Remover mock connections
- [ ] Usar `useConnections()`
- [ ] Usar `useConnectWhatsApp()`, `useDisconnectWhatsApp()`
- [ ] Mostrar QR code real

### Admin TODO
- [ ] Analisar quais dados precisam refatorar
- [ ] Implementar hooks conforme necessário

## Hooks Disponíveis

### Contatos
```typescript
import {
  useContacts,
  useContactStats,
  useConversations,
  useConversation,
  useMessages,
  useSendMessage,
  useContactsRealtime
} from '@/hooks/useContacts';
```

### Conversas (Novo!)
```typescript
import {
  useConversations,
  useConversation,
  useConversationMessages,
  useSendMessage,
  useMarkAsRead,
  useMuteConversation,
  usePinConversation,
  useConversationsRealtime
} from '@/hooks/useConversations';
```

### Campanhas
```typescript
import {
  useCampaigns,
  useCampaign,
  useCampaignStats,
  useCampaignRecipients,
  useCreateCampaign,
  useLaunchCampaign,
  usePauseCampaign,
  useCancelCampaign,
  useCampaignsRealtime
} from '@/hooks/useCampaigns';
```

### Conexões WhatsApp
```typescript
import {
  useConnections,
  useConnection,
  useConnectionStats,
  useCreateConnection,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useConnectionsRealtime
} from '@/hooks/useConnections';
```

### Dashboard
```typescript
import {
  useDashboardMetrics,
  useDashboardActivities,
  useDashboardConnections
} from '@/hooks/useDashboard';
```

## Componentes Prontos para Usar

### ContactsPanel
```typescript
import { ContactsPanel } from '@/components/crm/ContactsPanel';

<ContactsPanel />
```

### CampaignsPanel
```typescript
import { CampaignsPanel } from '@/components/crm/CampaignsPanel';

<CampaignsPanel />
```

### Estados
```typescript
import { LoadingState } from '@/components/LoadingState';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

<LoadingState message="Carregando..." />
<ErrorState message="Erro!" onRetry={retry} />
<EmptyState title="Vazio" />
```

## Padrão Recomendado

**Use este padrão em TODA página:**

```typescript
import { useMyData } from '@/hooks/useMyData';
import { LoadingState, ErrorState, EmptyState } from '@/components';

export default function MyPage() {
  // 1. Fetch data
  const { data, isLoading, error, refetch } = useMyData();

  // 2. Handle loading
  if (isLoading) return <LoadingState />;

  // 3. Handle error
  if (error) return <ErrorState onRetry={() => refetch()} />;

  // 4. Handle empty
  if (!data?.length) return <EmptyState title="Sem dados" />;

  // 5. Render data
  return (
    <div className="space-y-6">
      {/* Seu conteúdo aqui */}
    </div>
  );
}
```

## Common Patterns

### Listar dados
```typescript
const { data, isLoading, error } = useContacts();
```

### Listar com filtro
```typescript
const { data, isLoading } = useContacts({
  searchTerm: searchTerm,
  sortBy: 'recent'
});
```

### Enviar dados
```typescript
const { mutate, isPending } = useSendMessage();

mutate({ conversationId, text }, {
  onSuccess: () => console.log('Enviado!'),
  onError: (error) => console.error(error)
});
```

### Refetch manual
```typescript
const { refetch } = useContacts();

<Button onClick={() => refetch()}>
  Recarregar
</Button>
```

### Invalidar cache
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['contacts'] });
```

## Debug

### Ver dados em cache
```typescript
// No console
import { queryClient } from '@/lib/queryClient';
console.log(queryClient.getQueryData(['contacts']));
```

### Ver Socket events
```typescript
// No console
socket.onAny((event, args) => {
  console.log('[Socket]', event, args);
});
```

## Troubleshooting

### Dados não atualizam
- Verificar se o backend está rodando
- Verificar se o Socket.IO está conectado
- Testar refetch manual: `refetch()`

### Erros de type
- Verificar se imports estão corretos
- Verificar tipos em `src/types/`
- Rodar `npm run lint`

### Requisições duplicadas
- React Query faz isso em dev mode (expected)
- Em produção tem cache
- Se mesmo em prod, verificar retry policy

## Próximos Passos

1. ✅ Refatorar **Dashboard** (DONE)
2. ⏳ Refatorar **Conversations**
3. ⏳ Refatorar **CRM**
4. ⏳ Refatorar **WhatsApp Connections**
5. ⏳ Refatorar **Admin**

## Precisa de Ajuda?

- Ver `REFACTORING_GUIDE.md` para detalhes
- Ver `MIGRATION_CHECKLIST.md` para progresso
- Ver `ConversationsRefactored.tsx` como exemplo
- Mensagem no slack se tiver dúvida

---

**Cada página segue o mesmo padrão!**
**Rápido, seguro e consistente!** 🚀
