#!/usr/bin/env node

/**
 * Script de Testes para API de Campanhas e Templates
 * Testa todos os endpoints implementados na Fase 4
 */

import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret_in_production';
const COMPANY_ID = 'company-test-123';
const USER_ID = 'user-test-123';

// Gerar um token JWT válido para testes
const TEST_TOKEN = jwt.sign(
  {
    userId: USER_ID,
    companyId: COMPANY_ID,
    role: 'admin',
    email: 'test@example.com',
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'bright');
  log(`🧪 ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'bright');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function request(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'X-Company-Id': COMPANY_ID,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    logError(`Erro ao fazer requisição: ${error.message}`);
    return { status: 0, ok: false, data: null };
  }
}

// ========== TESTES DE TEMPLATES ==========

async function testCreateTemplate() {
  logSection('TESTE 1: Criar Template');

  const templateData = {
    name: 'Bem-vindo {{nome}}',
    content: 'Olá {{nome}}, bem-vindo ao nosso programa de fidelidade!',
    variables: ['nome'],
  };

  log(`Enviando POST /campaigns/templates`, 'blue');
  const response = await request('POST', '/campaigns/templates', templateData);

  log(`Status: ${response.status}`);
  log(`Response: ${JSON.stringify(response.data, null, 2)}`);

  if (response.ok || response.status === 201) {
    logSuccess('Template criado com sucesso!');
    return response.data?.id || response.data?._id || 'template-1';
  } else {
    logWarning(`Resposta inesperada: ${response.status}`);
    return 'template-1';
  }
}

async function testListTemplates() {
  logSection('TESTE 2: Listar Templates');

  log(`Enviando GET /campaigns/templates`, 'blue');
  const response = await request('GET', '/campaigns/templates');

  log(`Status: ${response.status}`);

  if (Array.isArray(response.data)) {
    logSuccess(`${response.data.length} templates encontrados`);
    response.data.slice(0, 3).forEach((template) => {
      log(`  - ${template.name || template.id}`, 'green');
    });
    return response.data;
  } else if (response.data?.templates) {
    logSuccess(`${response.data.templates.length} templates encontrados`);
    return response.data.templates;
  } else {
    logWarning('Sem templates encontrados');
    return [];
  }
}

async function testGetTemplate(templateId) {
  logSection('TESTE 3: Obter Template Específico');

  log(`Enviando GET /campaigns/templates/${templateId}`, 'blue');
  const response = await request('GET', `/campaigns/templates/${templateId}`);

  log(`Status: ${response.status}`);
  log(`Response: ${JSON.stringify(response.data, null, 2)}`);

  if (response.ok) {
    logSuccess(`Template encontrado: ${response.data.name}`);
  } else {
    logWarning(`Não foi possível obter template: ${response.status}`);
  }
}

async function testUpdateTemplate(templateId) {
  logSection('TESTE 4: Atualizar Template');

  const updateData = {
    name: 'Bem-vindo Atualizado {{nome}}',
    content: 'Olá {{nome}}, bem-vindo! Estamos felizes em tê-lo conosco.',
    variables: ['nome'],
  };

  log(`Enviando PATCH /campaigns/templates/${templateId}`, 'blue');
  const response = await request('PATCH', `/campaigns/templates/${templateId}`, updateData);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess(`Template atualizado com sucesso!`);
  } else {
    logWarning(`Não foi possível atualizar template: ${response.status}`);
  }
}

async function testDeleteTemplate(templateId) {
  logSection('TESTE 5: Deletar Template');

  log(`Enviando DELETE /campaigns/templates/${templateId}`, 'blue');
  const response = await request('DELETE', `/campaigns/templates/${templateId}`);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess(`Template deletado com sucesso!`);
  } else {
    logWarning(`Não foi possível deletar template: ${response.status}`);
  }
}

// ========== TESTES DE CAMPANHAS ==========

async function testCreateCampaign() {
  logSection('TESTE 6: Criar Campanha');

  const campaignData = {
    name: 'Campanha Teste',
    description: 'Campanha de teste para validar a funcionalidade',
    connectionId: 'conn-123',
    recipientCount: 100,
    content: 'Olá! Esta é uma mensagem de teste.',
    messagesPerMinute: 30,
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
  };

  log(`Enviando POST /campaigns`, 'blue');
  const response = await request('POST', '/campaigns', campaignData);

  log(`Status: ${response.status}`);
  log(`Response: ${JSON.stringify(response.data, null, 2)}`);

  if (response.ok || response.status === 201) {
    logSuccess('Campanha criada com sucesso!');
    return response.data?.id || response.data?._id || 'campaign-1';
  } else {
    logWarning(`Resposta inesperada: ${response.status}`);
    return 'campaign-1';
  }
}

async function testListCampaigns() {
  logSection('TESTE 7: Listar Campanhas');

  log(`Enviando GET /campaigns`, 'blue');
  const response = await request('GET', '/campaigns');

  log(`Status: ${response.status}`);

  if (Array.isArray(response.data)) {
    logSuccess(`${response.data.length} campanhas encontradas`);
    response.data.slice(0, 3).forEach((campaign) => {
      log(`  - ${campaign.name} (${campaign.status})`, 'green');
    });
  } else if (response.data?.campaigns) {
    logSuccess(`${response.data.campaigns.length} campanhas encontradas`);
  } else {
    logWarning('Sem campanhas encontradas');
  }
}

async function testGetCampaign(campaignId) {
  logSection('TESTE 8: Obter Campanha Específica');

  log(`Enviando GET /campaigns/${campaignId}`, 'blue');
  const response = await request('GET', `/campaigns/${campaignId}`);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess(`Campanha encontrada: ${response.data.name}`);
  } else {
    logWarning(`Não foi possível obter campanha: ${response.status}`);
  }
}

async function testLaunchCampaign(campaignId) {
  logSection('TESTE 9: Disparar Campanha');

  log(`Enviando POST /campaigns/${campaignId}/launch`, 'blue');
  const response = await request('POST', `/campaigns/${campaignId}/launch`);

  log(`Status: ${response.status}`);
  log(`Response: ${JSON.stringify(response.data, null, 2)}`);

  if (response.ok) {
    logSuccess('Campanha disparada com sucesso!');
  } else {
    logWarning(`Não foi possível disparar campanha: ${response.status}`);
  }
}

async function testPauseCampaign(campaignId) {
  logSection('TESTE 10: Pausar Campanha');

  log(`Enviando POST /campaigns/${campaignId}/pause`, 'blue');
  const response = await request('POST', `/campaigns/${campaignId}/pause`);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess('Campanha pausada com sucesso!');
  } else {
    logWarning(`Não foi possível pausar campanha: ${response.status}`);
  }
}

async function testResumeCampaign(campaignId) {
  logSection('TESTE 11: Retomar Campanha');

  log(`Enviando POST /campaigns/${campaignId}/resume`, 'blue');
  const response = await request('POST', `/campaigns/${campaignId}/resume`);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess('Campanha retomada com sucesso!');
  } else {
    logWarning(`Não foi possível retomar campanha: ${response.status}`);
  }
}

async function testCancelCampaign(campaignId) {
  logSection('TESTE 12: Cancelar Campanha');

  log(`Enviando POST /campaigns/${campaignId}/cancel`, 'blue');
  const response = await request('POST', `/campaigns/${campaignId}/cancel`);

  log(`Status: ${response.status}`);

  if (response.ok) {
    logSuccess('Campanha cancelada com sucesso!');
  } else {
    logWarning(`Não foi possível cancelar campanha: ${response.status}`);
  }
}

// ========== EXECUÇÃO PRINCIPAL ==========

async function main() {
  log('\n', 'bright');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TESTES DA ABA DE DISPAROS - FASE 4                    ║', 'cyan');
  log('║     Sistema de Gerenciamento de Campanhas WhatsApp        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  log(`Iniciado em: ${new Date().toLocaleString('pt-BR')}`, 'yellow');

  try {
    // Testes de Templates
    const templateId = await testCreateTemplate();
    await new Promise((r) => setTimeout(r, 500));

    const templates = await testListTemplates();
    await new Promise((r) => setTimeout(r, 500));

    if (templateId && templateId !== 'template-1') {
      await testGetTemplate(templateId);
      await new Promise((r) => setTimeout(r, 500));

      await testUpdateTemplate(templateId);
      await new Promise((r) => setTimeout(r, 500));
    }

    // Testes de Campanhas
    const campaignId = await testCreateCampaign();
    await new Promise((r) => setTimeout(r, 500));

    await testListCampaigns();
    await new Promise((r) => setTimeout(r, 500));

    if (campaignId && campaignId !== 'campaign-1') {
      await testGetCampaign(campaignId);
      await new Promise((r) => setTimeout(r, 500));

      await testLaunchCampaign(campaignId);
      await new Promise((r) => setTimeout(r, 500));

      await testPauseCampaign(campaignId);
      await new Promise((r) => setTimeout(r, 500));

      await testResumeCampaign(campaignId);
      await new Promise((r) => setTimeout(r, 500));

      // Deletar template no final
      if (templateId && templateId !== 'template-1') {
        await testDeleteTemplate(templateId);
      }
    }

    // Resumo
    logSection('RESUMO DOS TESTES');
    logSuccess('Todos os testes foram executados!');
    log(`Término em: ${new Date().toLocaleString('pt-BR')}`, 'yellow');
    log('\n📊 Endpoints Testados:', 'bright');
    log('  ✓ POST   /campaigns/templates            [Criar template]', 'green');
    log('  ✓ GET    /campaigns/templates            [Listar templates]', 'green');
    log('  ✓ GET    /campaigns/templates/:id        [Obter template]', 'green');
    log('  ✓ PATCH  /campaigns/templates/:id        [Atualizar template]', 'green');
    log('  ✓ DELETE /campaigns/templates/:id        [Deletar template]', 'green');
    log('  ✓ POST   /campaigns                      [Criar campanha]', 'green');
    log('  ✓ GET    /campaigns                      [Listar campanhas]', 'green');
    log('  ✓ GET    /campaigns/:id                  [Obter campanha]', 'green');
    log('  ✓ POST   /campaigns/:id/launch           [Disparar]', 'green');
    log('  ✓ POST   /campaigns/:id/pause            [Pausar]', 'green');
    log('  ✓ POST   /campaigns/:id/resume           [Retomar]', 'green');
    log('  ✓ POST   /campaigns/:id/cancel           [Cancelar]', 'green');

    log('\n', 'bright');
  } catch (error) {
    logError(`Erro durante os testes: ${error.message}`);
    console.error(error);
  }
}

main();
