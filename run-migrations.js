/**
 * Run migrations
 * Execute this script to set up database tables
 */

import 'dotenv/config';
import { createTemplatesTable } from './database/migrations/001_create_templates_table.js';
import pool from './database/connection.js';

async function runMigrations() {
  console.log('🔄 Running migrations...');
  
  try {
    console.log('📊 Creating templates table...');
    await createTemplatesTable(pool);
    console.log('✅ Templates table ready');
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
