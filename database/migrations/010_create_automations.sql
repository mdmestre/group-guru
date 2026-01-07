-- Migration: Create Automations System (Flows, Runs, Logs)
-- Optimization: Includes RLS denormalization, Versioning, and Retry Logic
-- Architecture: Event-Driven with strict state management

-- ==================== 1. AUTOMATIONS (Flow Definitions) ====================
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Versioning [FIX 1]
    version INTEGER NOT NULL DEFAULT 1, -- Incremented on every save/publish
    
    -- Flow definition (JSON)
    -- Structure: { nodes: [], edges: [], viewport: {} }
    flow_definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
    
    -- Trigger configuration
    trigger_type VARCHAR(50) NOT NULL, 
    trigger_config JSONB DEFAULT '{}'::jsonb, 
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_paused BOOLEAN DEFAULT false, -- Temporary pause vs permanent deactivation
    
    -- Aggregate Statistics (Cached for dashboard performance)
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    last_run_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT automations_trigger_type_check 
        CHECK (trigger_type IN ('message_received', 'contact_created', 'stage_changed', 'tag_added', 'webhook', 'schedule', 'manual_trigger'))
);

-- Indices
CREATE INDEX idx_automations_company_id ON automations(company_id);
CREATE INDEX idx_automations_active ON automations(company_id, is_active) WHERE is_active = true AND is_paused = false;
CREATE INDEX idx_automations_trigger ON automations(company_id, trigger_type);

COMMENT ON TABLE automations IS 'Visual flow automations definition';
COMMENT ON COLUMN automations.version IS 'Current published version of the flow';

-- ==================== 2. AUTOMATION RUNS (Execution Instances) ====================
CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Version Tracking [FIX 1]
    -- Ensures we know which version of the flow this run is using
    automation_version INTEGER NOT NULL DEFAULT 1,
    
    -- Context
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    trigger_data JSONB DEFAULT '{}'::jsonb, -- The payload that started this run
    execution_context JSONB DEFAULT '{}'::jsonb, -- [UPGRADE] Variables/State accumulated during the run
    
    -- Concurrency Control [UPGRADE 2]
    lock_key VARCHAR(255), -- E.g., 'contact:{id}' to prevent parallel runs for same entity
    
    -- Status [FIX 3]
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Retry Logic [FIX 2]
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Scheduling [UPGRADE 1]
    delay_until TIMESTAMP WITH TIME ZONE, -- If the run is in a 'delay' node
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT automation_runs_status_check 
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'canceled', 'retrying', 'delayed'))
);

-- Indices
CREATE INDEX idx_automation_runs_automation_id ON automation_runs(automation_id);
CREATE INDEX idx_automation_runs_company_id ON automation_runs(company_id);
CREATE INDEX idx_automation_runs_contact_id ON automation_runs(contact_id);
-- Critical for worker polling:
CREATE INDEX idx_automation_runs_worker_poll ON automation_runs(status, next_retry_at, delay_until); 

COMMENT ON TABLE automation_runs IS 'Execution instances of an automation flow';
COMMENT ON COLUMN automation_runs.lock_key IS 'Used to prevent race conditions (e.g., prevent 2 flows updating same contact simultaneously)';

-- ==================== 3. AUTOMATION LOGS (Step-by-Step) ====================
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- [FIX 4] Denormalization
    
    -- Node Info
    node_id VARCHAR(255) NOT NULL, -- ID from the React Flow JSON
    node_type VARCHAR(50) NOT NULL, -- trigger, action, condition, delay, split
    action_type VARCHAR(50), -- send_whatsapp, update_stage, http_request
    
    -- Execution Result
    status VARCHAR(50) NOT NULL,
    input_snapshot JSONB DEFAULT '{}'::jsonb, -- Data entering the node
    output_snapshot JSONB DEFAULT '{}'::jsonb, -- Data leaving the node
    error_message TEXT,
    
    -- Timing
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- [FIX 3] Status Check
    CONSTRAINT automation_logs_status_check 
        CHECK (status IN ('success', 'failed', 'skipped', 'pending'))
);

-- Indices
CREATE INDEX idx_automation_logs_run_id ON automation_logs(run_id);
-- [FIX 4] Index for Company-level debugging
CREATE INDEX idx_automation_logs_company_date ON automation_logs(company_id, executed_at DESC);

COMMENT ON TABLE automation_logs IS 'Granular logs for every step/node executed in a run';
COMMENT ON COLUMN automation_logs.company_id IS 'Denormalized for efficient RLS and debugging queries';

-- ==================== 4. INTEGRATION LINKS ====================

-- Ensure column exists first (idempotency)
ALTER TABLE crm_interactions 
ADD COLUMN IF NOT EXISTS automation_id UUID;

-- Add FK from interactions to automation
ALTER TABLE crm_interactions 
DROP CONSTRAINT IF EXISTS crm_interactions_automation_id_fk;

ALTER TABLE crm_interactions 
ADD CONSTRAINT crm_interactions_automation_id_fk 
FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_interactions_automation ON crm_interactions(automation_id);