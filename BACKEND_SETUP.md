# 🚀 Como Começar - Backend Endpoints

## ✅ Endpoints Implementados

### Dashboard
- ✅ `GET /dashboard/metrics` - Métricas agregadas
- ✅ `GET /dashboard/activities` - Atividades recentes
- ✅ `GET /dashboard/connections` - Status das conexões

### Contatos
- ✅ `GET /contacts` - Listar contatos
- ✅ `GET /contacts/:id` - Obter contato específico
- ✅ `GET /contacts/stats` - Estatísticas
- ✅ `POST /contacts` - Criar novo contato

### Conversas
- ✅ `GET /conversations` - Listar conversas
- ✅ `GET /conversations/:id` - Obter conversa específica
- ✅ `GET /conversations/:id/messages` - Obter mensagens
- ✅ `POST /conversations/:id/messages` - Enviar mensagem
- ✅ `POST /conversations/:id/mark-as-read` - Marcar como lida

## 🔧 Setup Recomendado

### 1. Verificar Variables de Ambiente

```bash
# .env
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@seu_cluster.mongodb.net/seu_database
JWT_SECRET=seu_secret_aqui
```

### 2. Iniciar Backend

```bash
# Terminal 1 - Backend
cd group-guru
npm install
npm run dev
# ou
node server.js
```

### 3. Iniciar Frontend

```bash
# Terminal 2 - Frontend
cd group-guru
npm run dev
```

Abra http://localhost:5173 (ou a porta do Vite)

## 📝 Estrutura de Dados

### Contacts Collection
```javascript
{
  _id: ObjectId,
  companyId: string,
  jid: string,
  name: string,
  phone: string,
  profile_picture_url: string,
  last_message_time: ISO8601,
  message_count: number,
  is_active: boolean,
  tags: [string],
  custom_fields: object,
  created_at: ISO8601,
  updated_at: ISO8601
}
```

### Conversations Collection
```javascript
{
  _id: ObjectId,
  companyId: string,
  contact_id: string,
  contact: {
    name: string,
    phone: string,
    profile_picture_url: string
  },
  last_message: {
    id: string,
    text: string,
    direction: 'in' | 'out',
    timestamp: ISO8601
  },
  message_count: number,
  unread_count: number,
  is_pinned: boolean,
  is_muted: boolean,
  created_at: ISO8601,
  updated_at: ISO8601
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  companyId: string,
  conversation_id: string,
  contact_id: string,
  user_id: string,
  direction: 'in' | 'out',
  text: string,
  media_url: string,
  media_type: 'image' | 'video' | 'audio' | 'document',
  status: 'sent' | 'delivered' | 'read' | 'failed',
  timestamp: ISO8601
}
```

### Activities Collection
```javascript
{
  _id: ObjectId,
  companyId: string,
  type: 'message_received' | 'message_sent' | 'contact_added' | 'campaign_launched' | 'campaign_completed',
  description: string,
  contactName: string,
  timestamp: ISO8601,
  metadata: object
}
```

## 🧪 Testar com cURL

### Dashboard Metrics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/dashboard/metrics?periodDays=30
```

### Listar Contatos
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/contacts
```

### Listar Conversas
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/conversations
```

### Enviar Mensagem
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá!"}' \
  http://localhost:3001/conversations/CONVERSATION_ID/messages
```

## 🐛 Troubleshooting

### Erro: "Cannot GET /dashboard/metrics"
- ✅ RESOLVIDO - Endpoints implementados
- Certifique-se de ter o token válido
- Verificar se backend está rodando na porta 3001

### Erro: "Database not available"
- Verificar MongoDB URI
- Verificar se MongoDB está rodando
- Verificar conexão de internet

### Erro: 401 Unauthorized
- Fazer login primeiro para obter token
- Token está em localStorage após login
- Verificar se JWT_SECRET está correto

## 📈 Próximos Passos

1. ✅ Endpoints implementados
2. ⏳ Frontend refatorado (já feito na tarefa anterior)
3. ⏳ Testar cada página com dados reais
4. ⏳ Implementar Socket.IO events no backend (opcional)

## 📚 Documentação da Refatoração

Ver arquivos:
- `REFACTORING_GUIDE.md` - Guia técnico
- `QUICKSTART.md` - Exemplos rápidos
- `IMPLEMENTATION_SUMMARY.md` - Resumo

---

**Tudo pronto para funcionar! 🎉**
