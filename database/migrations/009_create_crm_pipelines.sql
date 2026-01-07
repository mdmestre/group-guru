-- Migration: Create CRM Pipelines, Stages, and History
-- Optimization: Includes denormalized company_id for RLS and High Performance
-- Logic: Enforces strict data integrity for SaaS environments

-- ==================== 1. PIPELINES ====================
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex format
    
    -- Configuration
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indices
CREATE INDEX idx_crm_pipelines_company_id ON crm_pipelines(company_id);
CREATE INDEX idx_crm_pipelines_active ON crm_pipelines(company_id, is_active) WHERE is_active = true;

-- [FIX 2] Constraint: Only ONE default pipeline per company
CREATE UNIQUE INDEX ux_crm_pipelines_one_default 
    ON crm_pipelines(company_id) 
    WHERE is_default = true;

COMMENT ON TABLE crm_pipelines IS 'Sales/process pipelines (e.g., Sales Pipeline, Support Pipeline)';
COMMENT ON INDEX ux_crm_pipelines_one_default IS 'Ensures a company can have only one default pipeline';

-- ==================== 2. PIPELINE STAGES ====================
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- [FIX 1] Denormalization
    pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    
    -- Configuration
    is_win BOOLEAN DEFAULT false, -- Won stage
    is_lost BOOLEAN DEFAULT false, -- Lost stage
    
    -- Display
    display_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- [FIX 3] Logical Constraint: A stage cannot be both Win AND Lost
    CONSTRAINT crm_pipeline_stages_win_lost_check 
        CHECK (NOT (is_win = true AND is_lost = true))
);

-- Performance Indices
CREATE INDEX idx_crm_pipeline_stages_company_id ON crm_pipeline_stages(company_id);
CREATE INDEX idx_crm_pipeline_stages_pipeline_id ON crm_pipeline_stages(pipeline_id);
CREATE INDEX idx_crm_pipeline_stages_display_order ON crm_pipeline_stages(pipeline_id, display_order);

COMMENT ON TABLE crm_pipeline_stages IS 'Stages within a pipeline. Includes company_id for RLS efficiency.';

-- ==================== 3. UPDATE CONTACTS ====================
-- Ensure column exists first (idempotency)
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID;

-- Add FK
ALTER TABLE crm_contacts 
DROP CONSTRAINT IF EXISTS crm_contacts_pipeline_stage_fk;

ALTER TABLE crm_contacts 
ADD CONSTRAINT crm_contacts_pipeline_stage_fk 
FOREIGN KEY (pipeline_stage_id) REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL;

-- Index for the foreign key on contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_pipeline_stage 
ON crm_contacts(pipeline_stage_id);

-- ==================== 4. PIPELINE HISTORY ====================
CREATE TABLE IF NOT EXISTS crm_pipeline_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- [FIX 1] Denormalization
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    
    -- [UPGRADE 1] Snapshotting: Track which pipeline this movement belonged to
    pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
    pipeline_stage_id UUID NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE CASCADE,
    
    -- Who moved
    moved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- [UPGRADE 2] Lost Reason (Optional context)
    lost_reason VARCHAR(255),
    
    -- [FIX 5] Timestamp Logic
    entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- When logic started
    exited_at TIMESTAMP WITH TIME ZONE, -- NULL = Current active stage
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- Real-world event time (for imports/audits)
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indices
CREATE INDEX idx_crm_pipeline_history_company_id ON crm_pipeline_history(company_id, entered_at DESC);
CREATE INDEX idx_crm_pipeline_history_contact_id ON crm_pipeline_history(contact_id, entered_at DESC);
CREATE INDEX idx_crm_pipeline_history_stage_id ON crm_pipeline_history(pipeline_stage_id);

-- [FIX 4] Constraint: Ensure only ONE active stage history record per contact
-- A contact cannot be in two places at once in history (open intervals)
CREATE UNIQUE INDEX ux_pipeline_history_one_active_stage 
    ON crm_pipeline_history(contact_id) 
    WHERE exited_at IS NULL;

COMMENT ON TABLE crm_pipeline_history IS 'Audit log of stage movements. Enforces single active stage per contact.';
COMMENT ON COLUMN crm_pipeline_history.occurred_at IS 'When the event actually happened (useful for data imports or delayed syncs)';