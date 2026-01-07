# 🆘 PHASE 2 - TROUBLESHOOTING & FAQ

## ❓ Perguntas Frequentes

### 1. Como faço para rodar as migrations?

**R:** Você tem 3 opções:

**Opção A: Script automático (Recomendado)**
```bash
bash phase2-setup.sh
```

**Opção B: Manual com psql**
```bash
psql -h localhost -U postgres -d group_guru -f database/migrations/100_create_pipelines_schema.sql
psql -h localhost -U postgres -d group_guru -f database/migrations/101_create_lead_scoring_schema.sql
psql -h localhost -U postgres -d group_guru -f database/migrations/102_create_custom_fields_schema.sql
psql -h localhost -U postgres -d group_guru -f database/migrations/103_create_segments_schema.sql
```

**Opção C: Via Node.js (criar após)**
```typescript
import fs from 'fs';
import { sql } from '@/db/connection';

const migrations = [
  '100_create_pipelines_schema.sql',
  '101_create_lead_scoring_schema.sql',
  '102_create_custom_fields_schema.sql',
  '103_create_segments_schema.sql'
];

for (const migration of migrations) {
  const script = fs.readFileSync(`./database/migrations/${migration}`, 'utf-8');
  await sql.query(script);
}
```

---

### 2. Onde posso verificar se as migrations rodaram corretamente?

**R:** Execute no psql:
```sql
-- Ver todas as tabelas CRM
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'crm_%' 
ORDER BY tablename;

-- Ver índices
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' AND tablename LIKE 'crm_%';

-- Ver RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE 'crm_%';

-- Contar registros por tabela
SELECT tablename, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' AND tablename LIKE 'crm_%';
```

---

### 3. Como integro as routes no meu servidor?

**R:** No seu `server.ts` ou `server.js`:

**Passo 1: Importar as routes**
```typescript
// No topo do arquivo, junto com outras imports
import pipelineRoutes from '@/features/pipelines/routes';
import leadScoringRoutes from '@/features/lead-scoring/routes';
import customFieldRoutes from '@/features/crm/routes/custom-fields';
import segmentRoutes from '@/features/crm/routes/segments';
```

**Passo 2: Registrar as routes**
```typescript
// Após suas outras routes (app.use('/api/contacts', ...))
// ANTES dos error handlers

// CRM Features - Phase 2
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/lead-scoring', leadScoringRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/segments', segmentRoutes);

// Error handlers (deve ser por último)
app.use(errorHandler);
```

---

### 4. Quais permissions preciso adicionar?

**R:** Execute este INSERT no seu banco:
```sql
INSERT INTO permissions (name, description) VALUES
-- Pipelines
('view:pipelines', 'View pipelines and stages'),
('create:pipelines', 'Create new pipelines'),
('edit:pipelines', 'Edit existing pipelines'),
('delete:pipelines', 'Delete pipelines'),

-- Lead Scoring
('view:lead-scoring', 'View lead scores'),
('create:lead-scoring', 'Create scoring rules'),
('edit:lead-scoring', 'Edit scoring rules'),

-- Custom Fields
('view:custom-fields', 'View custom fields'),
('create:custom-fields', 'Create custom fields'),
('edit:custom-fields', 'Edit custom fields'),
('delete:custom-fields', 'Delete custom fields'),

-- Segments
('view:segments', 'View segments'),
('create:segments', 'Create segments'),
('edit:segments', 'Edit segments'),
('delete:segments', 'Delete segments')
ON CONFLICT (name) DO NOTHING;
```

Depois associe ao role do usuário:
```sql
-- Exemplo: Adicionar todas as permissions ao role 'admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.name LIKE '%:pipelines' 
  OR p.name LIKE '%:lead-scoring'
  OR p.name LIKE '%:custom-fields'
  OR p.name LIKE '%:segments'
ON CONFLICT DO NOTHING;
```

---

### 5. Como testo se tudo está funcionando?

**R:** Use este script:

```bash
#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email":"admin@example.com",
    "password":"password123"
  }' | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got auth token${NC}"

# Test each endpoint
echo ""
echo "Testing Pipelines..."
curl -s -X GET http://localhost:3001/api/pipelines \
  -H "Authorization: Bearer $TOKEN" | jq '.success' > /dev/null && \
  echo -e "${GREEN}✅ Pipelines working${NC}" || \
  echo -e "${RED}❌ Pipelines failed${NC}"

echo ""
echo "Testing Lead Scoring..."
curl -s -X GET http://localhost:3001/api/lead-scoring/rules \
  -H "Authorization: Bearer $TOKEN" | jq '.success' > /dev/null && \
  echo -e "${GREEN}✅ Lead Scoring working${NC}" || \
  echo -e "${RED}❌ Lead Scoring failed${NC}"

echo ""
echo "Testing Custom Fields..."
curl -s -X GET http://localhost:3001/api/custom-fields \
  -H "Authorization: Bearer $TOKEN" | jq '.success' > /dev/null && \
  echo -e "${GREEN}✅ Custom Fields working${NC}" || \
  echo -e "${RED}❌ Custom Fields failed${NC}"

echo ""
echo "Testing Segments..."
curl -s -X GET http://localhost:3001/api/segments \
  -H "Authorization: Bearer $TOKEN" | jq '.success' > /dev/null && \
  echo -e "${GREEN}✅ Segments working${NC}" || \
  echo -e "${RED}❌ Segments failed${NC}"
```

---

## 🐛 Problemas Comuns

### Problema: "Cannot find module '@/features/pipelines/routes'"

**Causa:** TypeScript path alias não está configurado

**Solução:** No seu `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

### Problema: "Unknown or ambiguous abbreviation: 'U'"

**Causa:** Erro ao rodar psql

**Solução:** Use comando correto:
```bash
# Certo:
psql -U postgres -d group_guru -f migrations.sql

# Errado:
psql -username postgres -database group_guru -f migrations.sql
```

---

### Problema: "Permission denied for schema public"

**Causa:** PostgreSQL permissions insuficientes

**Solução:**
```sql
-- Como superuser ou postgres:
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

---

### Problema: "Endpoint returns 401 Unauthorized"

**Causa:** Token JWT inválido ou ausente

**Solução:**
1. Verifique se está passando o header:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN"
```

2. Verifique se o token é válido:
```javascript
const decoded = jwt.decode(token);
console.log(decoded);
```

3. Verifique expiração do token:
```bash
# Token expirado? Get novo:
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password"}'
```

---

### Problema: "Endpoint returns 403 Forbidden"

**Causa:** Usuário não tem permissão

**Solução:**
1. Verifique se o usuário tem a permission:
```sql
SELECT p.name FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id = 'USER_ID';
```

2. Adicione a permission:
```sql
INSERT INTO user_permissions (user_id, permission_id)
SELECT 'USER_ID', id FROM permissions 
WHERE name = 'view:pipelines';
```

---

### Problema: "Validation error: Invalid enum value"

**Causa:** Campo com valor inválido

**Solução:** Verifique valores aceitos:
```typescript
// No seu request, fieldType deve ser um desses:
'text' | 'number' | 'select' | 'multiselect' | 'date' | 'checkbox' | 'textarea'

// Correto:
{ "fieldType": "text" }

// Incorreto:
{ "fieldType": "invalid_type" }
```

---

### Problema: "Foreign key constraint violation"

**Causa:** ID referenciado não existe

**Solução:**
1. Verifique se o ID existe:
```sql
SELECT id FROM crm_pipelines WHERE id = 'YOUR_ID';
```

2. Use IDs válidos no seu request

---

### Problema: "Row Level Security policy violation"

**Causa:** Tentando acessar dados de outra empresa

**Solução:** Automático via JWT. RLS força automaticamente company_id do usuário.

---

## 📊 Performance Issues

### Problema: Queries lentas

**Causa:** Falta de índices ou queries ruins

**Solução:**
```sql
-- Verifique índices criados
\d crm_pipelines

-- Se faltando, crie:
CREATE INDEX idx_crm_pipelines_company_id ON crm_pipelines(company_id);

-- Analise query:
EXPLAIN ANALYZE SELECT * FROM crm_pipelines WHERE company_id = '...';
```

---

### Problema: Segmentos demoram muito para avaliar

**Causa:** Muitos contatos ou critérios complexos

**Solução:**
1. Use índices:
```sql
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX idx_crm_custom_field_values_contact ON crm_custom_field_values(contact_id);
```

2. Cache resultados:
```typescript
// No SegmentService:
const cached = await redis.get(`segment:${segmentId}`);
if (cached) return JSON.parse(cached);
// ... compute
await redis.setex(`segment:${segmentId}`, 3600, JSON.stringify(result));
```

---

## 🔐 Security Issues

### Problema: SQL Injection possível

**Não preocupa!** Todas as queries usam prepared statements:
```typescript
// ✅ Seguro
await db.query('SELECT * FROM table WHERE id = $1', [id]);

// ❌ Inseguro (não usado)
await db.query(`SELECT * FROM table WHERE id = '${id}'`);
```

---

### Problema: XSS no response

**Solução:** Zod valida e sanitiza todos os inputs:
```typescript
const schema = z.object({
  name: z.string().min(1).max(255)
});

// Zod vai rejeitar:
// - HTML tags
// - Scripts
// - Valores muito longos
```

---

## 📝 Logging e Debugging

### Ver logs de erro
```bash
# Se usando Winston:
tail -f logs/error.log

# Ver últimos 100 linhas:
tail -100 logs/error.log
```

### Debug mode
```bash
# Com NODE_DEBUG
NODE_DEBUG=* npm start

# Com debugger do Node
node --inspect server.js
```

---

## 🔄 Rollback de Migrations

Se algo deu errado:

```sql
-- Reverter migrations (em ordem reversa)
DROP TABLE IF EXISTS crm_segment_actions CASCADE;
DROP TABLE IF EXISTS crm_segment_members CASCADE;
DROP TABLE IF EXISTS crm_segments CASCADE;
DROP TABLE IF EXISTS crm_custom_field_values CASCADE;
DROP TABLE IF EXISTS crm_custom_fields CASCADE;
DROP TABLE IF EXISTS crm_lead_scoring_rules CASCADE;
DROP TABLE IF EXISTS crm_lead_scores CASCADE;
DROP TABLE IF EXISTS crm_pipeline_history CASCADE;
DROP TABLE IF EXISTS crm_pipeline_stages CASCADE;
DROP TABLE IF EXISTS crm_pipelines CASCADE;
```

---

## 📞 Contato & Suporte

Se tiver dúvidas não listadas aqui:

1. Verifique o arquivo: `API_EXAMPLES.md`
2. Consulte: `PHASE_2_INTEGRATION.md`
3. Veja a arquitetura: `PHASE_2_ARCHITECTURE.md`
4. Leia o código comentado nos services

---

**Última Atualização:** 15 de Janeiro, 2024
