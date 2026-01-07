-- Migration: Create Campaigns system (Final Version)
-- Includes: Bulk messaging, Scheduling, RLS optimization, and Tracking

-- ==================== CAMPAIGNS ====================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Campaign type & Status
    type VARCHAR(50) NOT NULL, -- broadcast, scheduled, drip, a_b_test
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    
    -- Content
    message_template TEXT NOT NULL,
    media_url TEXT,
    media_type VARCHAR(50), -- image, video, document, audio
    
    -- Targeting
    target_filters JSONB DEFAULT '{}'::jsonb, -- Filter criteria
    target_contacts INTEGER DEFAULT 0, -- Snapshot of count at creation/launch
    
    -- Scheduling & Smart Windows (Upgrade 2 applied)
    scheduled_at TIMESTAMP WITH TIME ZONE,
    send_window_start TIME, -- Ex: '09:00'
    send_window_end TIME,   -- Ex: '18:00'
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Execution Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Rate limiting (Adjustment 4 applied: Coexistence documented)
    messages_per_minute INTEGER DEFAULT 10, -- Calculated cap (High level)
    delay_between_messages INTEGER DEFAULT 6000, -- Milliseconds sleep (Worker level - Priority)
    
    -- Statistics (Materialized counters for performance)
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    -- Configuration
    connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
    
    -- Audit & Soft Delete (Upgrade 3 applied)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT campaigns_type_check CHECK (type IN ('broadcast', 'scheduled', 'drip', 'a_b_test')),
    -- Adjustment 3 applied: Expanded status list
    CONSTRAINT campaigns_status_check CHECK (status IN (
        'draft', 
        'scheduled', 
        'running', 
        'paused', 
        'completed', 
        'partially_completed', 
        'failed', 
        'canceled'
    ))
);

-- Indexes
CREATE INDEX idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX idx_campaigns_status ON campaigns(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at) WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX idx_campaigns_created_at ON campaigns(company_id, created_at DESC);

COMMENT ON TABLE campaigns IS 'Bulk messaging campaigns with smart scheduling';
COMMENT ON COLUMN campaigns.delay_between_messages IS 'Primary control for worker sleep time (ms) between sends';
COMMENT ON COLUMN campaigns.messages_per_minute IS 'Secondary control for calculation/estimation purposes';

-- ==================== CAMPAIGN RECIPIENTS ====================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Adjustment 1 applied: company_id for RLS and Performance
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', 
    
    -- Timing
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Adjustment 2 applied: Event consolidation
    last_event_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Results
    error_message TEXT,
    message_id VARCHAR(255),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Engagement
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT campaign_recipients_status_check CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'bounced')),
    CONSTRAINT campaign_recipients_unique UNIQUE (campaign_id, contact_id)
);

-- Indexes
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
-- Adjustment 1 applied: Compound index for RLS efficiency
CREATE INDEX idx_campaign_recipients_company_status ON campaign_recipients(company_id, status);
CREATE INDEX idx_campaign_recipients_sent_at ON campaign_recipients(campaign_id, sent_at DESC);
-- Adjustment 2 applied: Sorting by last activity
CREATE INDEX idx_campaign_recipients_last_event ON campaign_recipients(campaign_id, last_event_at DESC);

COMMENT ON TABLE campaign_recipients IS 'Individual recipients tracking with denormalized company_id for RLS';

-- ==================== ALTERATIONS & TRIGGERS ====================

-- Add FK from interactions to campaign (as requested)
-- Note: Ideally crm_interactions already has company_id
ALTER TABLE crm_interactions 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Trigger to update updated_at and last_event_at automatically
CREATE OR REPLACE FUNCTION update_campaign_recipient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   NEW.last_event_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_campaign_recipients_update
BEFORE UPDATE ON campaign_recipients
FOR EACH ROW
EXECUTE FUNCTION update_campaign_recipient_timestamp();