-- Migration: Initialize database extensions
-- Run this first to enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search (optional)

COMMENT ON EXTENSION "uuid-ossp" IS 'Generate UUIDs';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram text search (for future search features)';

