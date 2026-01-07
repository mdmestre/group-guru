/**
 * Script para criar um usuário admin com empresa e assinatura ativa
 * 
 * Uso: node scripts/create-admin-user.js
 * 
 * Este script cria:
 * 1. Um usuário admin
 * 2. Uma empresa para esse usuário
 * 3. Uma assinatura ativa com plano Enterprise
 */

import 'dotenv/config';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { CompanyRepository } from '../database/repositories/CompanyRepository.js';
import { SubscriptionRepository } from '../database/repositories/SubscriptionRepository.js';
import { UserCompanyRepository } from '../database/repositories/UserCompanyRepository.js';
import { PlanRepository } from '../database/repositories/PlanRepository.js';
import { close } from '../database/connection.js';

// Configurações do usuário admin
const ADMIN_CONFIG = {
  email: 'admin@admin.com',
  password: 'admin123',
  name: 'Administrador',
  companyName: 'Admin Company'
};

async function createAdminUser() {
  try {
    console.log('🚀 Iniciando criação de usuário admin...\n');

    // 1. Verificar se o usuário já existe
    console.log('📧 Verificando se o usuário já existe...');
    let user = await UserRepository.findByEmail(ADMIN_CONFIG.email);
    
    if (user) {
      console.log(`⚠️  Usuário ${ADMIN_CONFIG.email} já existe.`);
      console.log('   Verificando se tem empresa e assinatura...\n');
      
      // Verificar se tem empresa
      const companies = await UserCompanyRepository.findByUserId(user.id);
      if (companies.length > 0) {
        const companyId = companies[0].company_id;
        const subscription = await SubscriptionRepository.findActive(companyId);
        
        if (subscription) {
          console.log('✅ Usuário já tem empresa e assinatura ativa!');
          console.log(`   Empresa: ${companies[0].company_name}`);
          console.log(`   Plano: ${subscription.plan_name}`);
          console.log(`   Status: ${subscription.status}`);
          console.log('\n📋 Credenciais:');
          console.log(`   Email: ${ADMIN_CONFIG.email}`);
          console.log(`   Senha: ${ADMIN_CONFIG.password}`);
          await close();
          return;
        } else {
          console.log('⚠️  Usuário tem empresa mas não tem assinatura ativa.');
          console.log('   Criando assinatura...\n');
          
          // Criar assinatura para a empresa existente
          const enterprisePlan = await PlanRepository.findByName('enterprise');
          if (!enterprisePlan) {
            throw new Error('Plano Enterprise não encontrado. Execute as migrations primeiro.');
          }
          
          await SubscriptionRepository.create({
            companyId: companyId,
            planId: enterprisePlan.id,
            status: 'active'
          }, { allowNoContext: true });
          
          console.log('✅ Assinatura criada com sucesso!');
          console.log('\n📋 Credenciais:');
          console.log(`   Email: ${ADMIN_CONFIG.email}`);
          console.log(`   Senha: ${ADMIN_CONFIG.password}`);
          await close();
          return;
        }
      } else {
        console.log('⚠️  Usuário existe mas não tem empresa.');
        console.log('   Criando empresa e assinatura...\n');
        
        // Criar empresa e assinatura
        await createCompanyAndSubscription(user.id);
        await close();
        return;
      }
    }

    // 2. Criar usuário
    console.log('👤 Criando usuário...');
    user = await UserRepository.create({
      email: ADMIN_CONFIG.email,
      password: ADMIN_CONFIG.password,
      name: ADMIN_CONFIG.name
    });
    console.log(`✅ Usuário criado: ${user.email} (ID: ${user.id})\n`);

    // 3. Criar empresa e assinatura
    await createCompanyAndSubscription(user.id);

    console.log('\n✅ Usuário admin criado com sucesso!');
    console.log('\n📋 Credenciais:');
    console.log(`   Email: ${ADMIN_CONFIG.email}`);
    console.log(`   Senha: ${ADMIN_CONFIG.password}`);
    console.log(`   Empresa: ${ADMIN_CONFIG.companyName}`);
    console.log(`   Plano: Enterprise`);

  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    throw error;
  } finally {
    await close();
  }
}

async function createCompanyAndSubscription(userId) {
  // 1. Garantir que os planos existem
  console.log('📦 Verificando planos...');
  await PlanRepository.ensureDefaultPlans();
  console.log('✅ Planos verificados\n');

  // 2. Buscar plano Enterprise
  const enterprisePlan = await PlanRepository.findByName('enterprise');
  if (!enterprisePlan) {
    throw new Error('Plano Enterprise não encontrado. Execute as migrations primeiro.');
  }
  console.log(`✅ Plano encontrado: ${enterprisePlan.display_name}\n`);

  // 3. Criar empresa
  console.log('🏢 Criando empresa...');
  const slug = await CompanyRepository.generateUniqueSlug(ADMIN_CONFIG.companyName);
  const company = await CompanyRepository.create({
    name: ADMIN_CONFIG.companyName,
    slug,
    status: 'active',
    trialDays: 0
  });
  console.log(`✅ Empresa criada: ${company.name} (ID: ${company.id})\n`);

  // 4. Criar assinatura ativa
  console.log('💳 Criando assinatura...');
  const subscription = await SubscriptionRepository.create({
    companyId: company.id,
    planId: enterprisePlan.id,
    status: 'active'
  }, { allowNoContext: true });
  console.log(`✅ Assinatura criada: ${subscription.status} (ID: ${subscription.id})\n`);

  // 5. Adicionar usuário como owner da empresa
  console.log('👥 Adicionando usuário como owner...');
  await UserCompanyRepository.create({
    userId,
    companyId: company.id,
    role: 'owner',
    allowNoContext: true
  });
  console.log('✅ Usuário adicionado como owner\n');
}

// Executar script
createAdminUser()
  .then(() => {
    console.log('\n✨ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });

