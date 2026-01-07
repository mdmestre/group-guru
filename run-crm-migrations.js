/**
 * Run CRM Migrations
 * Executa as migrações SQL para criar as tabelas do CRM
 */

import 'dotenv/config';
import { query } from './database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrations = [
  '101_create_lead_scoring_schema_exec.sql',
  '102_create_custom_fields_schema_exec.sql',
  '103_create_segments_schema_exec.sql',
];

async function runMigrations() {
  console.log('🚀 Iniciando migrações do CRM...\n');

  for (const migrationFile of migrations) {
    try {
      const filePath = path.join(__dirname, 'database', 'migrations', migrationFile);
      console.log(`📄 Executando: ${migrationFile}`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration
      await query(sql);
      
      console.log(`✅ ${migrationFile} executado com sucesso\n`);
    } catch (error) {
      // Ignore "already exists" errors
      if (error.message.includes('already exists') || error.code === '42P07') {
        console.log(`⏭️  ${migrationFile} já existe, pulando...\n`);
        continue;
      }
      
      console.error(`❌ Erro ao executar ${migrationFile}:`, error.message);
      throw error;
    }
  }

  console.log('✨ Todas as migrações foram executadas!');
  
  // Verify tables exist
  try {
    const result = await query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'crm_%' 
      ORDER BY tablename
    `);
    
    console.log('\n📊 Tabelas CRM criadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error.message);
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

