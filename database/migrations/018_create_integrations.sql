/**
 * Phase 4: Integrations Schema
 * Support for multiple channels (Telegram, SMS, Email, Facebook/Instagram)
 * and external integrations (Zapier, Stripe, etc)
 */

-- ============================================
-- CHANNEL CONNECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'disconnected',

  credentials JSONB NOT NULL DEFAULT '{}',
  config JSONB DEFAULT '{}',

  message_count INTEGER DEFAULT 0,
  contact_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- CHANNEL MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL,

  channel_message_id VARCHAR(255),
  thread_id VARCHAR(255),

  contact_id UUID REFERENCES crm_contacts(id),
  from_identifier VARCHAR(255) NOT NULL,
  to_identifier VARCHAR(255) NOT NULL,

  message_type VARCHAR(50) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type VARCHAR(50),

  direction VARCHAR(20) NOT NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_message TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXTERNAL INTEGRATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',

  credentials JSONB NOT NULL DEFAULT '{}',
  config JSONB DEFAULT '{}',

  webhook_url TEXT,
  api_key VARCHAR(255),

  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  error_message TEXT,
  last_error_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================
-- WEBHOOK EXECUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  url TEXT NOT NULL,

  request_headers JSONB DEFAULT '{}',
  request_method VARCHAR(10) DEFAULT 'POST',

  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB DEFAULT '{}',

  status VARCHAR(50) NOT NULL,
  error_message TEXT,

  attempt_number INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================
-- INTEGRATION EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES external_integrations(id) ON DELETE CASCADE,

  event_type VARCHAR(100) NOT NULL,
  event_action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,

  payload JSONB NOT NULL,
  response JSONB,

  status VARCHAR(50) NOT NULL,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_channel_connections_company
  ON channel_connections(company_id);

CREATE INDEX IF NOT EXISTS idx_channel_connections_type
  ON channel_connections(channel_type);

CREATE INDEX IF NOT EXISTS idx_channel_connections_status
  ON channel_connections(status);

CREATE INDEX IF NOT EXISTS idx_channel_connections_active
  ON channel_connections(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_channel_messages_company
  ON channel_messages(company_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_connection
  ON channel_messages(channel_connection_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_contact
  ON channel_messages(contact_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id
  ON channel_messages(channel_message_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_thread
  ON channel_messages(thread_id);

CREATE INDEX IF NOT EXISTS idx_channel_messages_status
  ON channel_messages(status);

CREATE INDEX IF NOT EXISTS idx_channel_messages_created
  ON channel_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_integrations_company
  ON external_integrations(company_id);

CREATE INDEX IF NOT EXISTS idx_external_integrations_type
  ON external_integrations(integration_type);

CREATE INDEX IF NOT EXISTS idx_external_integrations_status
  ON external_integrations(status);

CREATE INDEX IF NOT EXISTS idx_external_integrations_active
  ON external_integrations(is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_executions_webhook
  ON webhook_executions(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhook_executions_company
  ON webhook_executions(company_id);

CREATE INDEX IF NOT EXISTS idx_webhook_executions_status
  ON webhook_executions(status);

CREATE INDEX IF NOT EXISTS idx_webhook_executions_event
  ON webhook_executions(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_executions_retry
  ON webhook_executions(next_retry_at)
  WHERE status = 'retrying';

CREATE INDEX IF NOT EXISTS idx_integration_events_company
  ON integration_events(company_id);

CREATE INDEX IF NOT EXISTS idx_integration_events_integration
  ON integration_events(integration_id);

CREATE INDEX IF NOT EXISTS idx_integration_events_status
  ON integration_events(status);

CREATE INDEX IF NOT EXISTS idx_integration_events_entity
  ON integration_events(entity_type, entity_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================
CREATE POLICY channel_connections_company_isolation
  ON channel_connections
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY channel_messages_company_isolation
  ON channel_messages
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY external_integrations_company_isolation
  ON external_integrations
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY webhook_executions_company_isolation
  ON webhook_executions
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY integration_events_company_isolation
  ON integration_events
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

-- ============================================
-- UPDATED_AT FUNCTION + TRIGGERS
-- ============================================
-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_channel_connections_updated_at
  BEFORE UPDATE ON channel_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channel_messages_updated_at
  BEFORE UPDATE ON channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_integrations_updated_at
  BEFORE UPDATE ON external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
