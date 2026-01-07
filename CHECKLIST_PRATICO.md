# ✅ CHECKLIST PRÁTICO - COMECE AQUI

**Use este arquivo como seu checklist diário de implementação**

---

## 📅 SEMANA 1: DIAS 1-5

### ⏱️ DIA 1 (Janeiro 8) - Setup Inicial
**Duração:** 4-5 horas  
**Meta:** Estrutura de arquivos criada e testada no navegador

- [ ] Criar pasta `src/features/campaigns/`
- [ ] Criar subpastas: components, hooks, models, services
- [ ] Criar arquivo `types.ts` com tipos TypeScript
- [ ] Criar arquivo `campaignService.ts` com API calls
- [ ] Criar hooks: `useCampaigns.ts`, `useCreateCampaign.ts`, `useCampaignStats.ts`
- [ ] Criar `DisparosTab.tsx` (componente principal)
- [ ] Adicionar import de `DisparosTab` no `CRM.tsx`
- [ ] Adicionar tab "Disparos" no CRM
- [ ] Testar no navegador: http://localhost:5173/crm (aba Disparos deve aparecer)
- [ ] Commit: "feat: setup inicial da aba de disparos"

**Código Pronto:** [FASE_4_QUICKSTART.md - PASSO 1](FASE_4_QUICKSTART.md#-passo-1-setup-inicial)

---

### ⏱️ DIA 2 (Janeiro 9) - Dashboard de Campanhas
**Duração:** 6-7 horas  
**Meta:** Dashboard com listagem de campanhas funcionando

- [ ] Criar `CampaignsActive.tsx`
- [ ] Implementar listagem de campanhas (`useCampaigns`)
- [ ] Criar componente `CampaignCard.tsx`
- [ ] Adicionar KPI cards (enviadas, falhadas, taxa)
- [ ] Implementar filtros por status
- [ ] Adicionar sorting por data/progresso
- [ ] Integrar Socket.IO para real-time updates
- [ ] Testar: listar campanhas do backend
- [ ] Testar: atualização em tempo real
- [ ] Adicionar botões de ação (Pausar, Ver Detalhes)
- [ ] Commit: "feat: dashboard de campanhas ativas"

**Referência:** [FASE_4_DISPAROS_PLANO.md - 4.2](FASE_4_DISPAROS_PLANO.md#-fase-42-dashboard-de-campanhas-3-4-dias)

---

### ⏱️ DIA 3 (Janeiro 10) - Formulário Part 1
**Duração:** 6-7 horas  
**Meta:** Formulário multi-step com steps 1-2 funcionando

- [ ] Criar `CreateCampaign.tsx` com React Hook Form
- [ ] Implementar Step 1: Informações Básicas
  - [ ] Campo: Nome
  - [ ] Campo: Descrição
  - [ ] Seletor: Conexão WhatsApp
  - [ ] Botão: Próximo
- [ ] Implementar Step 2: Destinatários
  - [ ] Radio: Todos os contatos
  - [ ] Radio: Segmento
  - [ ] Multi-select: Tags
  - [ ] Filtro customizado
  - [ ] Mostrar total de contatos
  - [ ] Botões: Voltar/Próximo
- [ ] Adicionar validação em cada step
- [ ] Testar navegação entre steps
- [ ] Commit: "feat: formulário de campanha (steps 1-2)"

---

### ⏱️ DIA 4 (Janeiro 11) - Formulário Part 2
**Duração:** 6-7 horas  
**Meta:** Formulário com steps 3-4 completo

- [ ] Implementar Step 3: Mensagem
  - [ ] Textarea: Conteúdo
  - [ ] Suporte a variáveis ({{name}}, {{email}})
  - [ ] Upload de mídia (drag-drop)
  - [ ] Seletor: Tipo de mídia
  - [ ] Preview da mensagem
  - [ ] Botões: Voltar/Próximo
- [ ] Implementar Step 4: Agendamento
  - [ ] Radio: Disparar Agora
  - [ ] Radio: Agendar Para
  - [ ] Calendar + Time Picker
  - [ ] Seletor: Timezone
  - [ ] Slider: Mensagens por minuto
  - [ ] Slider: Delay entre envios
  - [ ] Botões: Voltar/Disparar
- [ ] Adicionar confirmação antes de disparar
- [ ] Testar fluxo completo
- [ ] Commit: "feat: formulário de campanha (steps 3-4)"

---

### ⏱️ DIA 5 (Janeiro 12) - Integração e Testes
**Duração:** 4-5 horas  
**Meta:** Primeira campanha criada e testada

- [ ] Testar criação de campanha (POST /campaigns)
- [ ] Testar validação de inputs
- [ ] Testar preview de mensagem
- [ ] Testar agendamento
- [ ] Testar disparo de campanha (POST /campaigns/:id/launch)
- [ ] Testar atualização em dashboard
- [ ] Testar error handling
- [ ] Commit: "feat: integração e testes da campanha"

**Resultado Esperado:** Uma campanha funcional enviada com sucesso! 🎉

---

## 📅 SEMANA 2: DIAS 6-7

### ⏱️ DIA 6 (Janeiro 13) - Acompanhamento e Histórico
**Duração:** 5-6 horas  
**Meta:** Monitoramento em tempo real + histórico funcional

- [ ] Criar `CampaignDetails.tsx` (modal)
  - [ ] Mostrar status e progresso
  - [ ] Gráfico de progresso
  - [ ] KPIs em tempo real
  - [ ] Timeline de eventos
  - [ ] Botões: Pausar, Cancelar
- [ ] Criar `CampaignHistory.tsx`
  - [ ] Tabela com histórico
  - [ ] Colunas: Nome, Status, Data, Taxa
  - [ ] Filtros e busca
  - [ ] Botões: Duplicar, Ver, Deletar
- [ ] Integrar Socket.IO para progresso em tempo real
- [ ] Testar atualização de progresso
- [ ] Commit: "feat: acompanhamento e histórico de campanhas"

---

### ⏱️ DIA 7 (Janeiro 14) - Templates e Polimento
**Duração:** 5-6 horas  
**Meta:** Sistema completo pronto para produção

- [ ] Criar `TemplateManager.tsx`
  - [ ] Listar templates
  - [ ] Criar template
  - [ ] Editar template
  - [ ] Deletar template
  - [ ] Suporte a variáveis
- [ ] Refinamento de UI/UX
  - [ ] Cores e ícones consistentes
  - [ ] Responsivo (mobile, tablet, desktop)
  - [ ] Loading states
  - [ ] Error handling
- [ ] Testes finais
  - [ ] Fluxo completo (criar → disparar → monitorar)
  - [ ] Real-time updates
  - [ ] Performance
- [ ] Commit: "feat: templates de mensagem + polimento final"

**Resultado Final:** Aba "Disparos" 100% funcional! ✨

---

## 🎯 CHECKLIST POR COMPONENTE

### DisparosTab.tsx
- [ ] 4 sub-abas implementadas
- [ ] Lazy loading dos componentes
- [ ] Loading state durante carregamento
- [ ] Error state com retry

### CampaignsActive.tsx
- [ ] Listagem de campanhas
- [ ] KPI cards
- [ ] Filtros funcionando
- [ ] Real-time updates
- [ ] Botões de ação
- [ ] Empty state

### CreateCampaign.tsx
- [ ] Multi-step form (4 steps)
- [ ] Validação em cada step
- [ ] Persistência de dados entre steps
- [ ] Preview de mensagem
- [ ] Upload de mídia
- [ ] Suporte a variáveis
- [ ] Agendamento funcional
- [ ] Confirmação antes de disparar

### CampaignDetails.tsx
- [ ] Modal responsivo
- [ ] Gráfico de progresso
- [ ] Estatísticas em tempo real
- [ ] Timeline de eventos
- [ ] Botões de ação (pausar, cancelar)
- [ ] Exportação de relatório

### CampaignHistory.tsx
- [ ] Tabela com dados
- [ ] Sorting por coluna
- [ ] Filtros por status/data
- [ ] Busca por nome
- [ ] Botões de ação
- [ ] Paginação

### TemplateManager.tsx
- [ ] Listar templates
- [ ] Criar novo template
- [ ] Editar template
- [ ] Deletar template
- [ ] Preview
- [ ] Validação

---

## 🔌 INTEGRAÇÃO COM BACKEND

### Endpoints Esperados (Verifique)
- [ ] POST /campaigns - Criar
- [ ] GET /campaigns - Listar
- [ ] GET /campaigns/:id - Obter
- [ ] PATCH /campaigns/:id - Atualizar
- [ ] DELETE /campaigns/:id - Deletar
- [ ] POST /campaigns/:id/launch - Disparar
- [ ] POST /campaigns/:id/pause - Pausar
- [ ] POST /campaigns/:id/resume - Retomar
- [ ] POST /campaigns/:id/cancel - Cancelar
- [ ] GET /campaigns/:id/stats - Estatísticas
- [ ] GET /campaigns/:id/recipients - Destinatários

**Se algum estiver faltando:** Consulte [routes/campaigns.js](routes/campaigns.js)

---

## 🔔 EVENTOS SOCKET.IO

### Eventos a Ouvir
- [ ] `campaign-started` - Campanha iniciada
- [ ] `campaign-progress` - Atualização de progresso
- [ ] `campaign-completed` - Campanha concluída
- [ ] `campaign-error` - Erro na campanha
- [ ] `message-sent` - Mensagem enviada
- [ ] `message-failed` - Falha ao enviar

### Implementar Listeners
```javascript
socket.on('campaign-progress', (data) => {
  // Atualizar UI
});
```

---

## 🧪 TESTES ESSENCIAIS

### Teste 1: Criar Campanha
- [ ] Preencher formulário
- [ ] Selecionar conexão
- [ ] Disparar campanha
- [ ] Verificar se aparece em "Campanhas Ativas"

### Teste 2: Monitorar em Tempo Real
- [ ] Criar campanha
- [ ] Observar progresso em tempo real
- [ ] Verificar contador de enviadas
- [ ] Verificar contador de falhas

### Teste 3: Histórico
- [ ] Concluir uma campanha
- [ ] Verificar se aparece em "Histórico"
- [ ] Verificar informações (status, taxa, etc)

### Teste 4: Template
- [ ] Criar template
- [ ] Usar template em nova campanha
- [ ] Verificar se variáveis funcionam

### Teste 5: Agendamento
- [ ] Agendar campanha para daqui a 1 minuto
- [ ] Aguardar
- [ ] Verificar se disparou automaticamente

---

## 🐛 TROUBLESHOOTING DURANTE IMPLEMENTAÇÃO

| Problema | Solução |
|----------|---------|
| Backend retorna 404 | Verifique se o endpoint existe em routes/campaigns.js |
| Socket.IO não conecta | Verifique URL do VITE_API_URL no .env |
| Campanhas não carregam | Verifique se há campanhas no banco (POST /campaigns) |
| Componente não renderiza | Verifique console do navegador (F12) |
| Real-time não funciona | Verifique event listener e emit no backend |
| Upload de mídia falha | Verifique tamanho do arquivo e permissões |
| Variáveis não substituem | Verifique formato {{variable}} |

---

## 📊 PROGRESS TRACKING

### Meta Semanal
- [x] Entender arquitetura (DIA 0)
- [ ] Setup inicial (DIA 1)
- [ ] Dashboard (DIA 2)
- [ ] Formulário (DIAS 3-4)
- [ ] Integração (DIA 5)
- [ ] Acompanhamento (DIA 6)
- [ ] Templates & Polimento (DIA 7)

### Progresso Total
```
DIA 1: ██░░░░░░░░░░░░░░░░ 10%
DIA 2: ████░░░░░░░░░░░░░░ 20%
DIA 3: ██████░░░░░░░░░░░░ 30%
DIA 4: ████████░░░░░░░░░░ 40%
DIA 5: ██████████░░░░░░░░ 50%
DIA 6: ███████████░░░░░░░ 70%
DIA 7: ████████████████░░ 90%
FINAL: ████████████████░░ 95% (+ refinamentos)
```

---

## 📝 COMMITS ESPERADOS

1. `feat: setup inicial da aba de disparos`
2. `feat: dashboard de campanhas ativas`
3. `feat: formulário de campanha (steps 1-2)`
4. `feat: formulário de campanha (steps 3-4)`
5. `feat: integração e testes da campanha`
6. `feat: acompanhamento e histórico de campanhas`
7. `feat: templates de mensagem + polimento final`

---

## 🎁 BONUS: OTIMIZAÇÕES (Depois)

- [ ] Adicionar notificações de sucesso/erro
- [ ] Implementar search de campanhas
- [ ] Adicionar dark mode
- [ ] Otimizar queries do banco
- [ ] Adicionar mais gráficos
- [ ] Suportar mais tipos de mídia
- [ ] Implementar rate limiting
- [ ] Adicionar logging detalhado

---

## 📞 REFERÊNCIAS RÁPIDAS

| Recurso | Link |
|---------|------|
| Arquitetura | [ARCHITECTURE_BAILEYS_CORE.md](ARCHITECTURE_BAILEYS_CORE.md) |
| Status do Código | [CODIGO_REVISAO_STATUS.md](CODIGO_REVISAO_STATUS.md) |
| Plano Detalhado | [FASE_4_DISPAROS_PLANO.md](FASE_4_DISPAROS_PLANO.md) |
| Quick Start | [FASE_4_QUICKSTART.md](FASE_4_QUICKSTART.md) |
| Backend Setup | [BACKEND_SETUP.md](BACKEND_SETUP.md) |
| Rotas de Campanha | [routes/campaigns.js](routes/campaigns.js) |

---

## ✨ RESULTADO FINAL

Quando marcar tudo como feito ✅:

```
┌───────────────────────────────────────────┐
│  ABA DE DISPAROS 100% FUNCIONAL! 🎉       │
├───────────────────────────────────────────┤
│ ✅ Criar campanhas                        │
│ ✅ Enviar em massa                        │
│ ✅ Acompanhar em tempo real               │
│ ✅ Ver histórico                          │
│ ✅ Gerenciar templates                    │
│ ✅ Agendar campanhas                      │
│ ✅ Upload de mídia                        │
│ ✅ Suporte a variáveis                    │
└───────────────────────────────────────────┘
```

---

**Data de Início:** Janeiro 8, 2026  
**Data de Conclusão Esperada:** Janeiro 14, 2026  
**Duração Total:** 32-38 horas úteis

**BOA SORTE! 🚀**

Imprima este documento ou deixe aberto enquanto trabalha!
