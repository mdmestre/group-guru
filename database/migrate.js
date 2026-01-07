/**
 * Database Migration Runner
 * 
 * Runs SQL migration files in order to set up the PostgreSQL schema.
 * Usage: node database/migrate.js
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL ||
  'postgresql://postgres:paulo1313@localhost:5432/whatsapp_saas';

// Migration tracking table
const MIGRATION_TABLE = 'schema_migrations';

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(`SELECT version FROM ${MIGRATION_TABLE} ORDER BY version`);
  return new Set(result.rows.map(r => r.version));
}

async function applyMigration(client, version, name, sql) {
  console.log(`  → Applying migration ${version}: ${name}`);
  
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (version, name) VALUES ($1, $2)`,
      [version, name]
    );
    await client.query('COMMIT');
    console.log(`  ✅ Migration ${version} applied successfully`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`  ❌ Migration ${version} failed:`, error.message);
    throw error;
  }
}

async function runMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to database');

    // Ensure migrations table exists
    await ensureMigrationsTable(client);

    // Get applied migrations
    const applied = await getAppliedMigrations(client);
    console.log(`📋 Found ${applied.size} applied migrations`);

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`\n🔍 Found ${files.length} migration files\n`);

    let appliedCount = 0;
    for (const file of files) {
      const version = file.replace('.sql', '');
      const name = file;
      
      if (applied.has(version)) {
        console.log(`  ⏭️  Migration ${version} already applied, skipping`);
        continue;
      }

      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await applyMigration(client, version, name, sql);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('\n✨ All migrations are up to date!');
    } else {
      console.log(`\n✨ Applied ${appliedCount} new migration(s)`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

