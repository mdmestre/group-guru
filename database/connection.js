/**
 * PostgreSQL Database Connection
 * 
 * Centralized database connection pool for the application.
 * Includes RLS context management.
 */
import 'dotenv/config'; 
import pg from 'pg';
import contextManager from '../core/context/ContextManager.js';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  process.env.POSTGRES_URL ||
  'postgresql://postgres:paulo1313@localhost:5432/whatsapp_saas';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Detect if a query is a write operation (INSERT, UPDATE, DELETE)
 * @param {string} text - SQL query
 * @returns {boolean}
 */
function isWriteOperation(text) {
  const normalized = text.trim().toUpperCase();
  return normalized.startsWith('INSERT') || 
         normalized.startsWith('UPDATE') || 
         normalized.startsWith('DELETE') ||
         normalized.startsWith('TRUNCATE') ||
         normalized.startsWith('DROP') ||
         normalized.startsWith('CREATE') ||
         normalized.startsWith('ALTER');
}

/**
 * Execute a query and return results
 * Automatically sets company context for RLS if available
 * For write operations, companyId context is REQUIRED (unless explicitly allowed)
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Query options
 * @param {boolean} options.requireContext - Require company context (default: auto-detect for writes)
 * @param {boolean} options.allowNoContext - Allow write operations without context (for system operations like creating companies)
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params = [], options = {}) {
  const start = Date.now();
  const ctx = contextManager.getContext();
  const isWrite = isWriteOperation(text);
  const allowNoContext = Boolean(options.allowNoContext); // Explicitly convert to boolean
  const requireContext = options.requireContext !== undefined ? options.requireContext : isWrite;
  
  // CRITICAL: If allowNoContext is true, skip ALL context validation
  // This is the "system/sudo mode" for operations like registration
  if (!allowNoContext && requireContext) {
    // Only validate context if allowNoContext is FALSE
    try {
      contextManager.requireCompanyId();
    } catch (error) {
      console.error('[Database] Write operation requires company context:', {
        query: text.substring(0, 100),
        error: error.message,
        allowNoContext,
        requireContext,
        isWrite,
        hasContext: !!ctx
      });
      throw new Error(
        `Database write operation requires company context. ${error.message}`
      );
    }
  }
  
  // Debug log for development
  if (process.env.NODE_ENV === 'development' && allowNoContext && isWrite) {
    console.log('[Database] SYSTEM MODE: Bypassing company context check (allowNoContext=true)', {
      query: text.substring(0, 50) + '...',
      isWrite
    });
  }
  
  try {
    // SYSTEM MODE (allowNoContext=true): 
    // For system tables (users, companies, plans, subscriptions, user_companies) that don't have RLS,
    // we can execute directly without setting context. These tables are not tenant-isolated.
    // For tables WITH RLS, the policies allow operations when current_company_id() IS NULL.
    // Since pool.query() uses connections from a pool, we can't reliably set session context,
    // so we rely on the fact that system tables don't have RLS or policies allow NULL context.
    
    let res;
    const durationStart = Date.now();

    // If we're in SYSTEM MODE for a write operation, obtain a dedicated client
    // and explicitly clear the RLS/company context for that session before executing.
    if (allowNoContext && isWrite) {
      const client = await pool.connect();
      try {
        await client.query('SELECT set_company_context(NULL)');
        res = await client.query(text, params);
      } finally {
        client.release();
      }
    } else {
      res = await pool.query(text, params);
    }

    const duration = Date.now() - durationStart;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Database] Query executed', { 
        text: text.substring(0, 100), 
        duration, 
        rows: res.rowCount,
        hasContext: !!ctx?.companyId,
        allowNoContext,
        isWrite
      });
    }

    return res;
  } catch (error) {
    console.error('[Database] Query error:', { 
      text: text.substring(0, 100), 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join(' | '),
      hasContext: !!ctx?.companyId,
      companyId: ctx?.companyId,
      allowNoContext,
      isWrite
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Automatically sets company context for RLS
 * @param {boolean|Object} options - If boolean: requireContext flag. If object: { requireContext, allowNoContext }
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient(options = true) {
  // Support both old API (boolean) and new API (object)
  const allowNoContext = typeof options === 'object' ? Boolean(options.allowNoContext) : false;
  const requireContext = typeof options === 'boolean' ? options : (options.requireContext !== false);
  
  // CRITICAL: If allowNoContext is true, skip ALL context validation
  if (!allowNoContext && requireContext) {
    try {
      contextManager.requireCompanyId();
    } catch (error) {
      throw new Error(
        `Database transaction requires company context. ${error.message}`
      );
    }
  }
  
  const client = await pool.connect();
  const ctx = contextManager.getContext();
  
  // Set company context for RLS
  if (ctx?.companyId) {
    await client.query('SELECT set_company_context($1)', [ctx.companyId]);
  } else if (allowNoContext) {
    // SYSTEM MODE: Explicitly clear RLS context to run without tenant isolation
    await client.query('SELECT set_company_context(NULL)');
  }
  
  return client;
}

/**
 * Execute a transaction
 * Automatically sets company context for RLS if available
 * @param {Function} callback - Async function that receives a client
 * @param {Object} options - Transaction options
 * @param {boolean} options.allowNoContext - Allow transaction without company context (for system operations)
 * @returns {Promise<any>}
 */
export async function transaction(callback, options = {}) {
  const allowNoContext = Boolean(options.allowNoContext);
  
  // CRITICAL: If allowNoContext is true, skip ALL context validation (SYSTEM MODE)
  // This allows system operations like registration to create companies without context
  if (!allowNoContext) {
    try {
      contextManager.requireCompanyId();
    } catch (error) {
      throw new Error(
        `Database transaction requires company context. ${error.message}`
      );
    }
  }
  
  // Pass allowNoContext to getClient so it respects the bypass
  const client = await getClient({ requireContext: !allowNoContext, allowNoContext });
  const ctx = contextManager.getContext();
  
  try {
    await client.query('BEGIN');
    
    // Set company context for RLS
    if (ctx?.companyId) {
      await client.query('SELECT set_company_context($1)', [ctx.companyId]);
    } else if (allowNoContext) {
      // SYSTEM MODE: Explicitly clear RLS context to run without tenant isolation
      await client.query('SELECT set_company_context(NULL)');
    }
    
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all database connections
 */
export async function close() {
  await pool.end();
}

// Export both pool and as db for compatibility
export { pool };
export const db = pool;
export default pool;
