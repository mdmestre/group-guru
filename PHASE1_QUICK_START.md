# 🚀 FASE 1 - SETUP RÁPIDO (COMEÇAR AGORA)

## ⚡ Instale as dependências necessárias

Execute estes comandos na raiz do projeto:

```bash
# Instalar dependências FASE 1
npm install winston helmet express-rate-limit zod cors

# Instalar dev dependencies para testes
npm install -D jest ts-jest @types/jest @types/node

# Opcional: Instalar tipo para express
npm install -D @types/express
```

**Tempo estimado: 2-3 minutos**

---

## ✅ Verifique a instalação

```bash
# Verificar que tudo foi instalado
npm list winston helmet express-rate-limit zod jest

# Deve mostrar versões para cada pacote
```

---

## 🔄 Próximos Passos Imediatos

### 1. INTEGRAR LOGGER EM server.js (30 min)

Abra `server.js` e adicione no início:

```typescript
import { requestLoggingMiddleware, errorLoggingMiddleware } from './src/middleware/logging.js';
import { securityHeaders, corsOptions, globalLimiter } from './src/middleware/security.js';
import cors from 'cors';
```

Então, após criar o `app`, adicione:

```typescript
const app = express();

// Security
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(globalLimiter);

// Logging
app.use(requestLoggingMiddleware);

// ... resto do código ...

// Error logging (no final, antes de app.listen)
app.use(errorLoggingMiddleware);
```

---

### 2. TESTAR LOGGING (10 min)

```bash
# Criar diretório de logs
mkdir -p logs

# Iniciar o servidor
npm run server

# Em outro terminal, fazer uma requisição
curl http://localhost:3001/health

# Você deve ver logs em:
# - Console (colorizado)
# - logs/combined.log
# - logs/error.log (se houver erro)
```

---

### 3. EXECUTAR TESTES (10 min)

```bash
# Rodar testes
npm test

# Ver coverage
npm test -- --coverage

# Watch mode (testes reexecutam ao salvar)
npm test -- --watch
```

---

### 4. TESTAR RATE LIMITING (10 min)

```bash
# Rate limit não afeta health checks
curl http://localhost:3001/health

# Depois teste uma rota normal (>100 requisições em 15 min)
# Deve começar a recusar depois

for i in {1..101}; do
  curl http://localhost:3001/health
done
```

---

### 5. TESTAR VALIDAÇÃO (10 min)

Abra uma rota de auth em `routes/auth.js` e adicione:

```typescript
import { validate } from '../src/middleware/validation.js';
import { registerSchema } from '../src/utils/validation/schemas.js';

// Antes do handler da rota
router.post('/register', validate(registerSchema), async (req, res) => {
  // ... resto do código
});

router.post('/login', validate(loginSchema), async (req, res) => {
  // ... resto do código
});
```

Teste:

```bash
# Válido
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Inválido (email errado)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"password123"}'

# Deve retornar erro de validação
```

---

## 📊 Checklist de Instalação

- [ ] Dependências instaladas (npm install)
- [ ] Logger integrado em server.js
- [ ] Segurança configurada (helmet, cors, rate limit)
- [ ] Testes rodando (npm test)
- [ ] Coverage >40%
- [ ] Logs funcionando (console + arquivo)
- [ ] Rate limiting funciona
- [ ] Validação funciona
- [ ] GitHub Actions verde (quando commitar)

---

## 🆘 Se algo não funcionar

### "Cannot find module 'winston'"
```bash
npm install winston
```

### "Jest not found"
```bash
npm install -D jest ts-jest @types/jest
```

### "Testes falham"
Verifique se está no node 18+:
```bash
node --version  # Deve ser v18+ ou v19+
```

### "Log files not created"
```bash
mkdir -p logs
chmod 755 logs
```

### "Rate limiting não funciona"
Verifique se globalLimiter está aplicado ANTES das rotas:
```typescript
app.use(globalLimiter); // Deve ser aqui
app.use('/api', routes); // Depois das rotas
```

---

## 🎯 Meta desta sessão

Após completar esses 5 passos:

✅ Logger funcional (console + arquivo)  
✅ Segurança ativa (headers, CORS, rate limit)  
✅ Validação em rotas  
✅ Testes rodando  
✅ CI/CD pronto (GitHub Actions)  

**Progresso: 50% SEMANA 1** 🔥

---

## ⏱️ Tempo Total

- Instalação: 2-3 min
- Integração: 30 min
- Testes: 10 min
- Validação: 10 min
- Verificações: 10 min

**TOTAL: ~1 hora**

---

## 🚀 Após completar:

1. Abra um terminal
2. Execute os comandos acima
3. Tire screenshots dos logs funcionando
4. Faça seu primeiro commit:

```bash
git add .
git commit -m "feat: Phase 1 - Logger, Security, Validation setup"
git push
```

5. Responda aqui que completou! 🎉

---

**VAMO!** ⚡
