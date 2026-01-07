/**
 * Migration: Create templates table
 * Adds table for campaign message templates
 * Uses PostgreSQL syntax
 */

export async function createTemplatesTable(db) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(255) PRIMARY KEY,
        companyId VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        variables JSONB,
        createdBy VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL
      );
    `);

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(companyId);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_templates_createdAt ON templates(createdAt);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_templates_deletedAt ON templates(deletedAt);`);

    console.log('[Migration] Templates table created successfully');
    return true;
  } catch (error) {
    if (error.code === '42P07') { // PostgreSQL: table already exists
      console.log('[Migration] Templates table already exists');
      return true;
    }
    console.error('[Migration] Error creating templates table:', error);
    throw error;
  }
}
