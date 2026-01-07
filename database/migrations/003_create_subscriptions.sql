-- Migration: Create subscriptions table
-- Company plan subscriptions

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, canceled, expired, trial
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'canceled', 'expired', 'trial'))
);

CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_company_active ON subscriptions(company_id, status) WHERE status = 'active';

COMMENT ON TABLE subscriptions IS 'Company plan subscriptions';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When trial period ends (only for trial status)';
COMMENT ON COLUMN subscriptions.current_period_end IS 'When current billing period ends (NULL for trial)';

