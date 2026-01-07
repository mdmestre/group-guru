-- Migration: Create Webhooks system
-- External webhook integrations

-- ==================== WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Webhook config
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'POST', -- GET, POST, PUT
    
    -- Events
    events TEXT[] NOT NULL, -- Array of event types to listen to
    -- e.g., ['contact.created', 'message.received', 'automation.completed']
    
    -- Security
    secret VARCHAR(255), -- Secret for signature validation
    headers JSONB DEFAULT '{}'::jsonb, -- Custom headers to send
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- Verified via challenge
    
    -- Statistics
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    last_called_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT webhooks_method_check CHECK (method IN ('GET', 'POST', 'PUT'))
);

CREATE INDEX idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX idx_webhooks_active ON webhooks(company_id, is_active) WHERE is_active = true;

COMMENT ON TABLE webhooks IS 'External webhook endpoints for event notifications';
COMMENT ON COLUMN webhooks.events IS 'Array of event types: contact.created, message.received, etc';

-- ==================== WEBHOOK CALLS ====================
CREATE TABLE IF NOT EXISTS webhook_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Request
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Response
    status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER, -- Response time in milliseconds
    
    -- Status
    status VARCHAR(50) NOT NULL, -- success, failed, timeout
    error_message TEXT,
    
    -- Retry
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_calls_webhook_id ON webhook_calls(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_calls_status ON webhook_calls(webhook_id, status);
CREATE INDEX idx_webhook_calls_event_type ON webhook_calls(event_type);

COMMENT ON TABLE webhook_calls IS 'History of webhook calls with responses';