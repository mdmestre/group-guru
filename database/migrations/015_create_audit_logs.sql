-- Migration: Create Audit Logs (Final Version)
-- Includes: Severity, Request Correlation, Source Tracking, and Resource Snapshots

-- ==================== AUDIT LOGS ====================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant Context
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- NULL for system-wide/global events
    
    -- Actor (Requirement 3: Correlation & Denormalization)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255), -- Historical snapshot (in case user is deleted)
    ip_address VARCHAR(45), 
    user_agent TEXT,
    request_id UUID, -- Requirement 3: Crucial for log correlation (Trace ID)
    
    -- Action & Logic (Requirement 1 & 4)
    source VARCHAR(50) NOT NULL DEFAULT 'api', -- ui, api, job, webhook, system
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- info, warning, critical
    action VARCHAR(100) NOT NULL, -- create, update, delete, etc.
    
    -- Target Resource
    resource_type VARCHAR(100) NOT NULL, -- contact, automation, campaign, invoice, etc.
    resource_id UUID,
    
    -- Changes & Data (Requirement 1: Snapshots)
    old_values JSONB, -- Previous state
    new_values JSONB, -- New state
    changes JSONB,    -- Calculated Diff
    resource_snapshot JSONB, -- Full state for critical resources (Optional)
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Extra context (e.g., API endpoint, job name)
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Requirement 1: Strong Action Constraints
    CONSTRAINT audit_logs_action_check CHECK (
        action IN (
            'create', 'update', 'delete', 'restore',
            'login', 'logout', 'failed_login', 'password_reset',
            'status_change', 'permission_change',
            'payment_attempt', 'payment_success', 'payment_failed', 'refund',
            'export', 'import',
            'system'
        )
    ),
    
    -- Requirement 4: Source Constraints
    CONSTRAINT audit_logs_source_check CHECK (
        source IN ('ui', 'api', 'job', 'webhook', 'system', 'mobile')
    ),
    
    -- Requirement 2: Severity Constraints
    CONSTRAINT audit_logs_severity_check CHECK (
        severity IN ('info', 'warning', 'critical')
    )
);

-- Optimization: Strategic Indexes
CREATE INDEX idx_audit_logs_company_date ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_severity ON audit_logs(company_id, severity) WHERE severity != 'info';
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance (SOC2/LGPD) and production debugging';
COMMENT ON COLUMN audit_logs.request_id IS 'UUID used to correlate multiple log entries from the same request/process';
COMMENT ON COLUMN audit_logs.severity IS 'Categorization for alerting: critical events should trigger notifications';

-- Note: In a high-volume production environment (e.g., 1M+ logs/day), 
-- you should consider PostgreSQL Table Partitioning by 'created_at' monthly.