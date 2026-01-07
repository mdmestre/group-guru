# Checklist de Migração - Frontend Dados Reais

## 📋 Overview
Este arquivo rastreia o progresso da migração de mock data para dados reais em todos os componentes e páginas.

## ✅ Infraestrutura (COMPLETO)
- [x] API Client centralizado (`apiClient.ts`)
- [x] React Query Configuration (`queryClient.ts`)
- [x] RootProvider com QueryClient + Socket
- [x] SocketProvider com invalidação automática
- [x] LoadingState, ErrorState, EmptyState components
- [x] Types para Contact, Campaign, Connection, Dashboard

## 🎣 Hooks de Dados (COMPLETO)
- [x] `useContacts()` - listar contatos
- [x] `useContactStats()` - estatísticas
- [x] `useConversations()` - listar conversas
- [x] `useConversation()` - conversa específica
- [x] `useMessages()` - histórico de mensagens
- [x] `useSendMessage()` - enviar mensagem
- [x] `useCampaigns()` - listar campanhas
- [x] `useCampaign()` - campanha específica
- [x] `useCampaignStats()` - estatísticas
- [x] `useCampaignRecipients()` - destinatários
- [x] `useCreateCampaign()`, `useLaunchCampaign()`, etc
- [x] `useConnections()` - listar conexões
- [x] `useConnection()` - conexão específica
- [x] `useConnectionStats()` - stats
- [x] `useConnectWhatsApp()`, `useDisconnectWhatsApp()`
- [x] `useDashboardMetrics()` - métricas
- [x] `useDashboardActivities()` - atividades
- [x] `useDashboardConnections()` - conexões

## 📄 Páginas (EM PROGRESSO)

### Dashboard (`src/pages/Dashboard.tsx`)
- [x] Remover mock metrics
- [x] Usar `useDashboardMetrics()`
- [x] Usar `useDashboardActivities()`
- [x] Usar `useDashboardConnections()`
- [x] Usar `useContactStats()`
- [x] Adicionar loading, error, empty states
- [x] Real-time sync via Socket.IO
- [ ] Testar com backend real

### Conversas (`src/pages/Conversations.tsx`)
- [ ] Remover mock conversations
- [ ] Usar `useConversations()`
- [ ] Usar `useConversationMessages()`
- [ ] Usar `useSendMessage()`
- [ ] Adicionar loading, error, empty states
- [ ] Infinite scroll para mensagens
- [ ] Real-time message updates
- [ ] Otimistic updates ao enviar

### CRM (`src/pages/CRM.tsx`)
- [ ] Refatorar abas (Contatos, Campanhas, Pipeline)
- [ ] Usar `ContactsPanel` com dados reais
- [ ] Usar `CampaignsPanel` com dados reais
- [ ] Remover `defaultPipeline` e mock deals
- [ ] Implementar pipeline Kanban real
- [ ] Adicionar loading, error, empty states

### Conexões WhatsApp (`src/pages/WhatsAppConnections.tsx`)
- [ ] Usar `useConnections()`
- [ ] Usar `useConnectWhatsApp()`
- [ ] Usar `useDisconnectWhatsApp()`
- [ ] Mostrar QR code real do backend
- [ ] Status em tempo real
- [ ] Remover mock data

### Admin (`src/pages/Admin.tsx`)
- [ ] Analisar o que precisa refatorar
- [ ] Implementar hooks necessários
- [ ] Testar com dados reais

## 🧩 Componentes (EM PROGRESSO)

### Componentes CRM
- [x] `ContactsPanel` - lista de contatos
- [x] `CampaignsPanel` - lista de campanhas
- [ ] `PipelineKanban` - pipeline com dados reais
- [ ] `DealCard` - card de negócio
- [ ] `DealDetails` - detalhes do negócio
- [ ] `ContactForm` - criar/editar contato
- [ ] `CampaignForm` - criar/editar campanha

### Componentes Conversas
- [ ] `ConversationList` - lista de conversas
- [ ] `ConversationWindow` - janela de chat
- [ ] `MessageBubble` - bolha de mensagem
- [ ] `MessageInput` - input de mensagem
- [ ] `TypingIndicator` - indicador de digitação

### Componentes Admin
- [ ] Analisar quais precisam refatorar

## 🔄 Real-time Sync (EM PROGRESSO)
- [x] Socket.IO Provider configurado
- [x] Event handlers para contatos
- [x] Event handlers para mensagens
- [x] Event handlers para campanhas
- [x] Event handlers para conexões
- [ ] Event handlers para dashboard
- [ ] Testing de sync real-time

## 🧪 Testes (NÃO INICIADO)
- [ ] Testar loading states
- [ ] Testar error states
- [ ] Testar empty states
- [ ] Testar data fetching
- [ ] Testar mutations
- [ ] Testar cache invalidation
- [ ] Testar real-time updates

## 📊 Endpoints Backend Necessários (VERIFICAR)

### Contatos
- [ ] `GET /contacts` - listar
- [ ] `GET /contacts/:id` - específico
- [ ] `GET /contacts/stats` - estatísticas
- [ ] `POST /contacts` - criar
- [ ] `PUT /contacts/:id` - atualizar
- [ ] `DELETE /contacts/:id` - deletar

### Conversas
- [ ] `GET /conversations` - listar
- [ ] `GET /conversations/:id` - específica
- [ ] `GET /conversations/:id/messages` - mensagens
- [ ] `POST /conversations/:id/messages` - enviar
- [ ] `POST /conversations/:id/mark-as-read` - marcar como lida
- [ ] `POST /conversations/:id/mute` - mutar
- [ ] `POST /conversations/:id/pin` - fixar

### Campanhas
- [ ] `GET /campaigns` - listar
- [ ] `GET /campaigns/:id` - específica
- [ ] `GET /campaigns/:id/stats` - estatísticas
- [ ] `GET /campaigns/:id/recipients` - destinatários
- [ ] `POST /campaigns` - criar
- [ ] `POST /campaigns/:id/launch` - iniciar
- [ ] `POST /campaigns/:id/pause` - pausar
- [ ] `POST /campaigns/:id/resume` - retomar
- [ ] `POST /campaigns/:id/cancel` - cancelar

### Conexões WhatsApp
- [ ] `GET /connections` - listar
- [ ] `GET /connections/:id` - específica
- [ ] `GET /connections/stats` - estatísticas
- [ ] `POST /connections` - criar
- [ ] `POST /connections/:id/connect` - conectar
- [ ] `POST /connections/:id/disconnect` - desconectar

### Dashboard
- [ ] `GET /dashboard/metrics?periodDays=30` - métricas
- [ ] `GET /dashboard/activities?limit=10` - atividades
- [ ] `GET /dashboard/connections` - status conexões

## 🚨 Problemas Encontrados

(Adicionar problemas conforme descobrir)

## 📝 Notas

- Backend é única fonte de verdade
- Zero dados fictícios em nenhum lugar
- Sempre usar loading, error, empty states
- Cache strategy definida em cada hook
- Real-time sync automático via Socket.IO

## 🎯 Próximas Prioridades

1. Refatorar página Conversas
2. Refatorar página CRM completa
3. Refatorar página WhatsApp Connections
4. Implementar todos os endpoints necessários no backend
5. Testes automatizados

## ✍️ Atualizações

- **2024-01-05**: Infraestrutura e Dashboard completos
- **Próximo**: Conversas e CRM
