-- Migration: Create usage tracking tables
-- Track usage against plan limits

CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    usage_date DATE NOT NULL,
    
    -- Usage counters
    dispatches_count INTEGER NOT NULL DEFAULT 0,
    instances_active INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT daily_usage_unique UNIQUE (company_id, usage_date)
);

CREATE INDEX idx_daily_usage_company_date ON daily_usage(company_id, usage_date DESC);
CREATE INDEX idx_daily_usage_date ON daily_usage(usage_date DESC);

COMMENT ON TABLE daily_usage IS 'Daily usage tracking for plan limits enforcement';
COMMENT ON COLUMN daily_usage.dispatches_count IS 'Number of messages/dispatches sent today';
COMMENT ON COLUMN daily_usage.instances_active IS 'Number of active WhatsApp instances today';

