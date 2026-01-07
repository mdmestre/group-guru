-- Migration: Create Jobs and Queue System (BullMQ Persistence)
-- Optimization: High-performance indices for worker polling
-- Structure: Polymorphic linking to Campaigns/Automations

-- ==================== 1. JOBS ====================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Job Identification
    job_id VARCHAR(255) NOT NULL, -- BullMQ Job ID
    queue_name VARCHAR(100) NOT NULL, -- e.g., 'dispatches', 'automations'
    job_type VARCHAR(100) NOT NULL, -- e.g., 'send_whatsapp', 'process_csv'
    
    -- [FIX 4] Context / Polymorphic Relation
    -- Links this job back to the business logic that spawned it
    entity_type VARCHAR(50), -- e.g., 'campaign', 'automation_run', 'import_batch'
    entity_id UUID,          -- ID of the related entity
    
    -- Job Data
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- The payload (args)
    opts JSONB DEFAULT '{}'::jsonb, -- Options: delay, attempts, backoff strategy
    
    -- Status
    -- [FIX 3] Extended Status Enum for full BullMQ compatibility
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    priority INTEGER DEFAULT 0, -- Higher number = Higher priority
    
    -- Progress Tracking
    progress INTEGER DEFAULT 0, -- 0-100
    progress_data JSONB DEFAULT '{}'::jsonb, -- Granular progress steps
    
    -- Results
    returnvalue JSONB, -- The result if successful
    failed_reason TEXT, -- The error stacktrace if failed
    stacktrace JSONB, -- [UPGRADE] Full stacktrace array if available
    
    -- Retry Logic
    attempts_made INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE, -- When the worker picked it up
    finished_at TIMESTAMP WITH TIME ZONE, -- When it completed/failed
    
    -- [UPGRADE 1] Soft Delete (optional cleanup)
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT jobs_unique_bullmq_id UNIQUE (queue_name, job_id), -- IDs are unique per queue
    CONSTRAINT jobs_status_check CHECK (status IN (
        'waiting', 
        'active', 
        'completed', 
        'failed', 
        'delayed', 
        'paused', 
        'stalled', 
        'removed'
    ))
);

-- Standard Indices
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_type ON jobs(company_id, job_type);
CREATE INDEX idx_jobs_entity ON jobs(entity_type, entity_id); -- Fast lookups for "Show me jobs for this Campaign"

-- [UPGRADE 2] High-Performance Partial Index for Workers/Dashboards
-- Drastically speeds up "Count active jobs" or "Find next job" queries
CREATE INDEX idx_jobs_active_only 
    ON jobs(queue_name, priority DESC, created_at) 
    WHERE status IN ('waiting', 'active', 'delayed', 'stalled');

CREATE INDEX idx_jobs_history 
    ON jobs(company_id, created_at DESC);

COMMENT ON TABLE jobs IS 'Persistence layer for BullMQ jobs. Includes business context links.';
COMMENT ON COLUMN jobs.entity_type IS 'Polymorphic link to the source (campaign, automation, etc.)';

-- ==================== 2. JOB LOGS ====================
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- [FIX 1] Denormalization
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Log Details
    level VARCHAR(20) NOT NULL, -- info, warn, error, debug
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Contextual data for the log
    
    -- Timing
    -- [FIX 2] Distinction between record creation and event time
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT job_logs_level_check CHECK (level IN ('info', 'warn', 'error', 'debug'))
);

-- Indices
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id, executed_at DESC);
-- [FIX 1] Optimized for Company-level debugging
CREATE INDEX idx_job_logs_company_date ON job_logs(company_id, executed_at DESC);

COMMENT ON TABLE job_logs IS 'Granular logs generated during job execution';
COMMENT ON COLUMN job_logs.executed_at IS 'The actual time the log event occurred (vs database insertion time)';