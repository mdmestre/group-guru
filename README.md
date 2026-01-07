
PROJETO BASEADO EM:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Baileys (WhatsApp Web API)
- Socket.IO (WebSocket real-time)
- Express.js (Backend)
- MongoDB (Opcional - para persistência)

# Integração Backend Baileys + Frontend

## Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
# API Configuration
VITE_API_URL=http://localhost:3001

# JWT Secret (change this in production!)
JWT_SECRET=please_change_this_secret_in_production

# MongoDB URI (opcional - para persistência)
# MONGODB_URI=mongodb://localhost:27017/whatsapp
# Ou use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Iniciando o Projeto

### Backend

```bash
npm run server
```

O servidor estará rodando em `http://localhost:3001`

### Frontend

```bash
npm run dev
```

O frontend estará rodando em `http://localhost:5173` (ou outra porta conforme Vite)

## Autenticação (JWT)

Backend expõe `/auth/register` e `/auth/login` que retornam um token JWT.

Quick start para testar auth:

1. Registrar um usuário:

```bash
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"secret123","clientId":"client_alpha","name":"Admin"}'
```

2. Login e obter token:

```bash
curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"secret123"}'
```

3. Frontend

- O projeto inclui um `AuthProvider` (`src/lib/auth.tsx`) e um wrapper `apiFetch` (`src/lib/api.ts`).
- A página `Login` está disponível em `/login` e armazena `token`, `userEmail`, `clientId` no `localStorage`.
- `apiFetch` automaticamente adiciona o header `Authorization: Bearer <token>` nas requisições.

## Integração WhatsApp

### Endpoints REST Principais

- `POST /clients/:clientId/connect` - Conectar WhatsApp (gera QR Code)
- `GET /groups` - Listar grupos do WhatsApp (requer autenticação)
- `POST /upload-numbers` - Fazer upload de números para processar
- `POST /set-group` - Selecionar grupo para adicionar membros
- `POST /start-cycle` - Iniciar ciclo de adições
- `POST /pause-cycle` - Pausar ciclo de adições
- `GET /crm/contacts` - Listar contatos
- `POST /crm/send-message` - Enviar mensagem
- `GET /crm/messages/:phone` - Obter mensagens de um contato

### Eventos Socket.IO

O backend emite os seguintes eventos via Socket.IO:

- `status` - Status da conexão WhatsApp (disconnected, connecting, connected) + QR Code + ciclo + números
- `qr` - QR Code para conexão (compatibilidade)
- `connected` - WhatsApp conectado com sucesso (compatibilidade)
- `new-message` - Nova mensagem recebida/enviada
- `handover` - Transbordo para atendimento humano

**Importante**: Todos os eventos são emitidos para a room específica do `clientId`, garantindo isolamento multi-tenant.

### Como Funciona

1. **Conexão WhatsApp**:
   - Frontend chama `POST /clients/:clientId/connect`
   - Backend cria/retorna instância Baileys para o clientId
   - QR Code é gerado e emitido via Socket.IO evento `status` (com `qrCode` no payload)
   - Quando conectado, evento `connected` é emitido

2. **Real-time Updates**:
   - Socket.IO conecta automaticamente usando token JWT
   - Cliente é automaticamente adicionado à room do seu `clientId`
   - Eventos são recebidos apenas para o cliente autenticado

3. **Multi-instance (SaaS)**:
   - Cada `clientId` tem sua própria instância Baileys isolada
   - Dados são persistidos em arquivos separados (`auth/client_{clientId}/`) e MongoDB
   - Eventos Socket.IO são enviados apenas para a room do clientId específico

## Segurança

- Configure `JWT_SECRET` no ambiente para produção
- Considere usar cookies HttpOnly em produção para evitar vazamento de token via XSS
- O backend valida que o `clientId` do token corresponde ao solicitado nas rotas

## Estrutura de Dados

### Instância WhatsApp (por clientId)

- **Estado de conexão**: `isConnected`, `isConnecting`, `qrCodeData`
- **Ciclo de adições**: `cycleStatus`, `lastConfig`, `numbers`
- **Histórico de chat**: `chatHistories` (por JID)
- **Números processados**: `processados` (adicionados, linkEnviado)

### Persistência

- **Auth State**: `./auth/client_{clientId}/` (multi-file auth state do Baileys)
- **MongoDB** (opcional): Mensagens, contatos, automações, números processados
- **JSON Files** (fallback): `processados_{clientId}.json`, `chat_histories_{clientId}.json`

