# 🚀 GUIA RÁPIDO - COMECE AQUI (FASE 4)

**Objetivo:** Implementar a aba de disparos em 1-2 semanas  
**Data de Início:** Janeiro 8, 2026  
**Tempo Total Estimado:** 30-40 horas

---

## 📍 LOCALIZAÇÃO ATUAL

```
Baileys Connection ✅ PRONTO
        ↓
    WhatsApp API ✅ PRONTO
        ↓
  Message Queue ✅ PRONTO
        ↓
  Dispatch Service ✅ PRONTO
        ↓
Backend Routes ✅ PRONTO
        ↓
🟡 ABA DE DISPAROS (VOCÊ ESTÁ AQUI)
```

---

## 🎯 RESULTADO FINAL

Quando terminar, você terá:

```
CRM Page
├── Pipeline (ja existe)
├── Lead Scoring (ja existe)
├── Custom Fields (ja existe)
├── Segments (ja existe)
├── Automations (ja existe)
└── 🆕 DISPAROS ← VOCÊ VAI CRIAR
    ├── Sub-aba 1: Campanhas Ativas
    ├── Sub-aba 2: Criar Campanha
    ├── Sub-aba 3: Histórico
    └── Sub-aba 4: Modelos
```

---

## ⏰ CRONOGRAMA POR DIA

### Dia 1 (8 de Jan) - Setup Inicial
**Tempo:** 4-5 horas

```
✓ Criar pasta src/features/campaigns/
✓ Criar tipos TypeScript
✓ Criar hooks básicos
✓ Criar componente DisparosTab.tsx
✓ Integrar no CRM.tsx
✓ Testar no navegador (tela em branco é ok)
```

### Dia 2 (9 de Jan) - Dashboard
**Tempo:** 6-7 horas

```
✓ Criar CampaignsActive.tsx
✓ Implementar listagem de campanhas
✓ Criar cards com KPIs
✓ Integrar Socket.IO real-time
✓ Adicionar filtros
✓ Testar com dados do backend
```

### Dia 3 (10 de Jan) - Formulário Parte 1
**Tempo:** 6-7 horas

```
✓ Criar CreateCampaign.tsx
✓ Implementar multi-step form (steps 1-2)
✓ Adicionar validação
✓ Testar seleção de conexão e segmento
```

### Dia 4 (11 de Jan) - Formulário Parte 2
**Tempo:** 6-7 horas

```
✓ Implementar step 3 (Mensagem)
✓ Adicionar upload de mídia
✓ Suportar variáveis ({{name}})
✓ Preview de mensagem
```

### Dia 5 (12 de Jan) - Agendamento
**Tempo:** 4-5 horas

```
✓ Implementar step 4 (Agendamento)
✓ Adicionar calendar + time picker
✓ Testar disparo de campanha
✓ Validar toda a jornada
```

### Dia 6 (13 de Jan) - Detalhes e Histórico
**Tempo:** 5-6 horas

```
✓ Criar CampaignDetails.tsx (modal)
✓ Adicionar acompanhamento em tempo real
✓ Criar CampaignHistory.tsx (tabela)
✓ Testar navegação entre componentes
```

### Dia 7 (14 de Jan) - Templates e Polimento
**Tempo:** 5-6 horas

```
✓ Criar TemplateManager.tsx
✓ CRUD de templates
✓ Refinamento de UI/UX
✓ Testes finais
✓ Deploy e validação
```

---

## 🗂️ ESTRUTURA DE ARQUIVOS

Você vai criar:

```
src/features/campaigns/
├── components/
│   ├── DisparosTab.tsx                (~ 150 linhas)
│   ├── CampaignsActive.tsx            (~ 200 linhas)
│   ├── CreateCampaign.tsx             (~ 400 linhas)
│   ├── CampaignDetails.tsx            (~ 250 linhas)
│   ├── CampaignHistory.tsx            (~ 200 linhas)
│   ├── TemplateManager.tsx            (~ 200 linhas)
│   └── CampaignCard.tsx               (~ 100 linhas)
├── hooks/
│   ├── useCampaigns.ts                (~ 30 linhas)
│   ├── useCreateCampaign.ts           (~ 40 linhas)
│   ├── useCampaignStats.ts            (~ 25 linhas)
│   └── useTemplates.ts                (~ 30 linhas)
├── models/
│   └── types.ts                       (~ 100 linhas)
├── services/
│   └── campaignService.ts             (~ 80 linhas)
└── README.md                          (Documentação)

Total: ~2500-3000 linhas de código
```

---

## 💻 PASSO 1: SETUP INICIAL

### 1.1 Criar Diretório
```bash
mkdir -p src/features/campaigns/{components,hooks,models,services}
```

### 1.2 Criar Tipos TypeScript
**Arquivo:** `src/features/campaigns/models/types.ts`

```typescript
export interface Campaign {
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

export interface CampaignRecipient {
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

export interface CampaignTemplate {
  id: string;
  companyId: string;
  name: string;
  content: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
  successRate: number;
}
```

### 1.3 Criar Hook useCampaigns
**Arquivo:** `src/features/campaigns/hooks/useCampaigns.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../models/types';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.list(),
    refetchInterval: 5000 // Atualizar a cada 5s
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Campaign>) => campaignService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignService.launch(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });
}
```

### 1.4 Criar Service
**Arquivo:** `src/features/campaigns/services/campaignService.ts`

```typescript
import { apiFetch } from '@/lib/api';
import { Campaign, CampaignRecipient, CampaignTemplate } from '../models/types';

export const campaignService = {
  // Campanhas
  list: async (): Promise<Campaign[]> => {
    return apiFetch('/campaigns', { method: 'GET' });
  },

  create: async (data: Partial<Campaign>): Promise<Campaign> => {
    return apiFetch('/campaigns', { method: 'POST', body: JSON.stringify(data) });
  },

  launch: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/launch`, { method: 'POST' });
  },

  pause: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/pause`, { method: 'POST' });
  },

  resume: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/resume`, { method: 'POST' });
  },

  cancel: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/cancel`, { method: 'POST' });
  },

  getStats: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/stats`, { method: 'GET' });
  },

  getRecipients: async (campaignId: string) => {
    return apiFetch(`/campaigns/${campaignId}/recipients`, { method: 'GET' });
  }
};
```

### 1.5 Criar Componente Principal
**Arquivo:** `src/features/campaigns/components/DisparosTab.tsx`

```typescript
import React, { useState, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Plus, History, FileText } from 'lucide-react';
import { LoadingState } from '@/components';

const CampaignsActive = lazy(() => import('./CampaignsActive').then(m => ({ default: m.CampaignsActive })));
const CreateCampaign = lazy(() => import('./CreateCampaign').then(m => ({ default: m.CreateCampaign })));
const CampaignHistory = lazy(() => import('./CampaignHistory').then(m => ({ default: m.CampaignHistory })));
const TemplateManager = lazy(() => import('./TemplateManager').then(m => ({ default: m.TemplateManager })));

export function DisparosTab() {
  const [activeDispatchTab, setActiveDispatchTab] = useState('campaigns');

  return (
    <div className="space-y-4">
      <Tabs value={activeDispatchTab} onValueChange={setActiveDispatchTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 mr-2" />
            Campanhas Ativas
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Criar Campanha
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modelos
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<LoadingState />}>
          <TabsContent value="campaigns">
            <CampaignsActive />
          </TabsContent>
          <TabsContent value="create">
            <CreateCampaign />
          </TabsContent>
          <TabsContent value="history">
            <CampaignHistory />
          </TabsContent>
          <TabsContent value="templates">
            <TemplateManager />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

export default DisparosTab;
```

### 1.6 Integrar no CRM
**Arquivo:** `src/pages/CRM.tsx`

Adicione no import:
```typescript
import DisparosTab from '@/features/campaigns/components/DisparosTab';
```

Adicione na aba (dentro do `<Tabs>`):
```tsx
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

### 1.7 Testar
```bash
npm run dev
# Acesse http://localhost:5173
# Navegue até CRM → Disparos
# Deve aparecer com 4 sub-abas vazias (é normal!)
```

---

## 🎨 PASSO 2: DASHBOARD (CampaignsActive)

Começar por aqui: [FASE_4_DISPAROS_PLANO.md - Seção 4.2](FASE_4_DISPAROS_PLANO.md#-fase-42-dashboard-de-campanhas-3-4-dias)

---

## 📋 PRÓXIMOS PASSOS

1. ✅ Leia este arquivo
2. ✅ Siga a seção "PASSO 1: SETUP INICIAL"
3. ➡️ Crie os arquivos listados
4. ➡️ Teste no navegador
5. ➡️ Siga para "PASSO 2: DASHBOARD"
6. ➡️ Consulte [FASE_4_DISPAROS_PLANO.md](FASE_4_DISPAROS_PLANO.md) para detalhes completos

---

## 💡 DICAS

### Dica 1: Use o Backend que já Existe
Todos os endpoints já existem:
- `POST /campaigns` - Criar
- `GET /campaigns` - Listar
- `POST /campaigns/:id/launch` - Disparar
- Etc.

Você só precisa criar a interface!

### Dica 2: Socket.IO Real-time
Para atualizar em tempo real, ouça eventos:
```typescript
useEffect(() => {
  socket.on('campaign-progress', (data) => {
    queryClient.setQueryData(['campaigns', data.campaignId], old => ({
      ...old,
      sentCount: data.sentCount,
      failedCount: data.failedCount
    }));
  });
}, []);
```

### Dica 3: Reutilize Componentes
Use componentes do shadcn/ui que já existem:
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Button`, `Input`, `Select`, `Tabs`
- `Progress`, `Badge`
- `Dialog`, `Popover`

### Dica 4: Teste Pequeno, Sempre
- Crie 1 sub-aba por dia
- Teste cada uma antes de prosseguir
- Use dados mock se backend não estiver pronto

---

## 🆘 SE TRAVOU

### Problema 1: Backend retorna erro 404
**Solução:** Verifique se o backend está rodando:
```bash
npm run server
```

### Problema 2: Socket.IO não conecta
**Solução:** Verifique a URL no `.env`:
```
VITE_API_URL=http://localhost:3001
```

### Problema 3: Campanha não aparece na listagem
**Solução:** Crie uma campanha primeiro via POST /campaigns

### Problema 4: Componente não renderiza
**Solução:** Verifique o console do navegador (F12) para erros

---

## 📞 CONTATO

Se precisar de ajuda:
1. Consulte [FASE_4_DISPAROS_PLANO.md](FASE_4_DISPAROS_PLANO.md)
2. Consulte [ARCHITECTURE_BAILEYS_CORE.md](ARCHITECTURE_BAILEYS_CORE.md)
3. Verifique logs em [logs/](logs/)
4. Teste manualmente com cURL

---

**Versão:** 1.0  
**Pronto para começar?** Agora é com você! 🚀

**Data de Início Recomendada:** Janeiro 8, 2026  
**Próxima Revisão:** Janeiro 20, 2026
