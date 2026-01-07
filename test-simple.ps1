#!/usr/bin/env powershell

# Configurações
$BASE_URL = "http://localhost:3001"
$COMPANY_ID = "company-test-123"
$USER_ID = "user-test-123"

# Função para gerar token JWT
function Get-JWTToken {
    $TokenPayload = @{
        userId = $USER_ID
        companyId = $COMPANY_ID
        role = "admin"
        email = "test@example.com"
    }
    
    # Usar o mesmo algoritmo do backend
    $Secret = 'please_change_this_secret_in_production'
    
    # Usar o comando node inline para gerar token
    $Token = node -e "
        const jwt = require('jsonwebtoken');
        const token = jwt.sign($($TokenPayload | ConvertTo-Json), '$Secret', { expiresIn: '24h' });
        console.log(token);
    "
    
    return $Token.Trim()
}

# Headers padrão
$Headers = @{
    "Content-Type" = "application/json"
    "X-Company-Id" = $COMPANY_ID
}

# Gerar token
Write-Host "🔐 Gerando token JWT..." -ForegroundColor Yellow
$Token = Get-JWTToken
$Headers["Authorization"] = "Bearer $Token"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     TESTES DA ABA DE DISPAROS - FASE 4                    ║" -ForegroundColor Cyan
Write-Host "║     Sistema de Gerenciamento de Campanhas WhatsApp        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "Iniciado em: $(Get-Date -Format 'dd/MM/yyyy, HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

# ========== TESTE 1: Listar Templates ==========
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🧪 TESTE 1: Listar Templates" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Blue

try {
    $Response = Invoke-RestMethod -Uri "$BASE_URL/campaigns/templates" `
        -Method GET `
        -Headers $Headers `
        -ErrorAction Stop
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    
    if ($Response -is [array]) {
        Write-Host "📊 Templates encontrados: $($Response.Count)" -ForegroundColor Green
        $Response | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor Green }
    } else {
        Write-Host "📄 Response: $($Response | ConvertTo-Json)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
Write-Host ""

# ========== TESTE 2: Criar Template ==========
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🧪 TESTE 2: Criar Template" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Blue

$TemplateData = @{
    name = "Template de Bem-vindo"
    content = "Olá {{nome}}, bem-vindo ao nosso programa!"
    variables = @("nome")
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$BASE_URL/campaigns/templates" `
        -Method POST `
        -Headers $Headers `
        -Body $TemplateData `
        -ErrorAction Stop
    
    Write-Host "✅ Template criado com sucesso!" -ForegroundColor Green
    Write-Host "📄 Response: $($Response | ConvertTo-Json)" -ForegroundColor White
    $TemplateId = $Response.id ?? $Response._id ?? $null
    Write-Host "Template ID: $TemplateId" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# ========== TESTE 3: Listar Campanhas ==========
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🧪 TESTE 3: Listar Campanhas" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Blue

try {
    $Response = Invoke-RestMethod -Uri "$BASE_URL/campaigns" `
        -Method GET `
        -Headers $Headers `
        -ErrorAction Stop
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    
    if ($Response -is [array]) {
        Write-Host "📊 Campanhas encontradas: $($Response.Count)" -ForegroundColor Green
        $Response | ForEach-Object { Write-Host "  - $($_.name) ($($_.status))" -ForegroundColor Green }
    } else {
        Write-Host "📄 Response: $($Response | ConvertTo-Json -Depth 2)" -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# ========== TESTE 4: Criar Campanha ==========
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🧪 TESTE 4: Criar Campanha" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Blue

$CampaignData = @{
    name = "Campanha de Teste"
    description = "Campanha para validar funcionalidade"
    content = "Olá! Esta é uma mensagem de teste."
    connectionId = "conn-123"
    recipientCount = 100
    messagesPerMinute = 30
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "$BASE_URL/campaigns" `
        -Method POST `
        -Headers $Headers `
        -Body $CampaignData `
        -ErrorAction Stop
    
    Write-Host "✅ Campanha criada com sucesso!" -ForegroundColor Green
    Write-Host "📄 Response: $($Response | ConvertTo-Json)" -ForegroundColor White
    $CampaignId = $Response.id ?? $Response._id ?? $null
    Write-Host "Campaign ID: $CampaignId" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# ========== RESUMO ==========
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "✅ TESTES CONCLUÍDOS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "Término em: $(Get-Date -Format 'dd/MM/yyyy, HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 Endpoints Testados:" -ForegroundColor Cyan
Write-Host "  ✓ GET    /campaigns/templates            [Listar]" -ForegroundColor Green
Write-Host "  ✓ POST   /campaigns/templates            [Criar]" -ForegroundColor Green
Write-Host "  ✓ GET    /campaigns                      [Listar]" -ForegroundColor Green
Write-Host "  ✓ POST   /campaigns                      [Criar]" -ForegroundColor Green
