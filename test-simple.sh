#!/bin/bash

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BASE_URL="http://localhost:3001"
COMPANY_ID="company-test-123"
USER_ID="user-test-123"

# Gerar token JWT (usando node)
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = 'please_change_this_secret_in_production';
const token = jwt.sign(
  {
    userId: '$USER_ID',
    companyId: '$COMPANY_ID',
    role: 'admin',
    email: 'test@example.com',
  },
  secret,
  { expiresIn: '24h' }
);
console.log(token);
")

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     TESTES DA ABA DE DISPAROS - FASE 4                    ║${NC}"
echo -e "${BLUE}║     Sistema de Gerenciamento de Campanhas WhatsApp        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Iniciado em: $(date '+%d/%m/%Y, %H:%M:%S')${NC}"
echo ""

# TESTE 1: Listar Templates
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}🧪 TESTE 1: Listar Templates${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "GET /campaigns/templates"
curl -s -X GET "$BASE_URL/campaigns/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: $COMPANY_ID" | jq '.' || echo "Erro ao conectar"
echo ""

# TESTE 2: Criar Template
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}🧪 TESTE 2: Criar Template${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "POST /campaigns/templates"
TEMPLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/campaigns/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: $COMPANY_ID" \
  -d '{
    "name": "Template de Bem-vindo",
    "content": "Olá {{nome}}, bem-vindo ao nosso programa!",
    "variables": ["nome"]
  }')
echo "$TEMPLATE_RESPONSE" | jq '.' || echo "$TEMPLATE_RESPONSE"

# Extrair ID do template
TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.id // .._id // empty' 2>/dev/null || echo "")
echo ""

# TESTE 3: Listar Campanhas
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}🧪 TESTE 3: Listar Campanhas${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "GET /campaigns"
curl -s -X GET "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: $COMPANY_ID" | jq '.' || echo "Erro ao conectar"
echo ""

# TESTE 4: Criar Campanha
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}🧪 TESTE 4: Criar Campanha${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "POST /campaigns"
CAMPAIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: $COMPANY_ID" \
  -d '{
    "name": "Campanha de Teste",
    "description": "Campanha para validar funcionalidade",
    "content": "Olá! Esta é uma mensagem de teste.",
    "connectionId": "conn-123",
    "recipientCount": 100,
    "messagesPerMinute": 30
  }')
echo "$CAMPAIGN_RESPONSE" | jq '.' || echo "$CAMPAIGN_RESPONSE"

# Extrair ID da campanha
CAMPAIGN_ID=$(echo "$CAMPAIGN_RESPONSE" | jq -r '.id // .._id // empty' 2>/dev/null || echo "")
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ TESTES CONCLUÍDOS${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "${YELLOW}Término em: $(date '+%d/%m/%Y, %H:%M:%S')${NC}"
