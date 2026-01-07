-- Migration: Create WhatsApp Groups management (Final Version)
-- Includes: Groups, Members (with RLS optimization), and Event History

-- ==================== GROUPS ====================
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
    
    -- Group info from WhatsApp
    group_jid VARCHAR(255) NOT NULL, -- Format: 120363123456789012@g.us
    name VARCHAR(255),
    description TEXT,
    subject VARCHAR(255),
    
    -- Metadata
    creation_timestamp BIGINT, -- Raw timestamp from WhatsApp
    owner_jid VARCHAR(255),
    is_announcement BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 0, -- Snapshot for quick UI display
    admin_count INTEGER DEFAULT 0,
    
    -- Bot status in group
    bot_is_admin BOOLEAN DEFAULT false,
    bot_role VARCHAR(50), -- admin, member, left
    
    -- Automation settings
    auto_add_enabled BOOLEAN DEFAULT false,
    auto_add_config JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps & Soft Delete (Upgrade 1 applied)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete support
    
    CONSTRAINT whatsapp_groups_unique UNIQUE (company_id, connection_id, group_jid)
);

-- Indexes
CREATE INDEX idx_whatsapp_groups_company_id ON whatsapp_groups(company_id);
CREATE INDEX idx_whatsapp_groups_connection_id ON whatsapp_groups(connection_id);
CREATE INDEX idx_whatsapp_groups_group_jid ON whatsapp_groups(group_jid);
-- Filtered index for active groups (Performance)
CREATE INDEX idx_whatsapp_groups_active ON whatsapp_groups(company_id, is_active) WHERE is_active = true AND deleted_at IS NULL;

COMMENT ON TABLE whatsapp_groups IS 'WhatsApp groups tracked per company/connection';
COMMENT ON COLUMN whatsapp_groups.member_count IS 'Cached count of members, updated via events/sync';

-- ==================== GROUP MEMBERS ====================
CREATE TABLE IF NOT EXISTS whatsapp_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Adjustment 1 applied: company_id for RLS and Join Performance
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
    
    -- Member info
    member_jid VARCHAR(255) NOT NULL,
    phone VARCHAR(50), -- Normalized phone number if available
    name VARCHAR(255),
    
    -- Role (Adjustment 4 applied: Removed is_admin redundancy)
    role VARCHAR(50) DEFAULT 'member', -- admin, member, superadmin
    
    -- Status
    is_active BOOLEAN DEFAULT true, -- False if left/removed but record kept for history
    
    -- Timestamps
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT whatsapp_group_members_role_check CHECK (role IN ('admin', 'member', 'superadmin')),
    CONSTRAINT whatsapp_group_members_unique UNIQUE (group_id, member_jid)
);

-- Indexes
CREATE INDEX idx_whatsapp_group_members_group_id ON whatsapp_group_members(group_id);
CREATE INDEX idx_whatsapp_group_members_member_jid ON whatsapp_group_members(member_jid);
-- Adjustment 1: Index for RLS
CREATE INDEX idx_whatsapp_group_members_company_active ON whatsapp_group_members(company_id, is_active);

COMMENT ON TABLE whatsapp_group_members IS 'Members of WhatsApp groups. Role is the single source of truth for admin status.';

-- ==================== GROUP EVENTS (NEW) ====================
-- Adjustment 2 applied: Event history for Automation Triggers
CREATE TABLE IF NOT EXISTS whatsapp_group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES whatsapp_groups(id) ON DELETE CASCADE,
    
    -- Event Details
    member_jid VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- join, leave, remove, promote, demote
    
    -- Context
    performed_by_jid VARCHAR(255), -- Who performed the action (if applicable, e.g., admin removed user)
    metadata JSONB DEFAULT '{}'::jsonb, -- Store raw event data or diffs
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT whatsapp_group_events_type_check CHECK (event_type IN ('join', 'leave', 'remove', 'promote', 'demote'))
);

-- Indexes for Timeline & Automations
CREATE INDEX idx_whatsapp_group_events_company_date ON whatsapp_group_events(company_id, occurred_at DESC);
CREATE INDEX idx_whatsapp_group_events_group_date ON whatsapp_group_events(group_id, occurred_at DESC);
CREATE INDEX idx_whatsapp_group_events_member ON whatsapp_group_events(member_jid);

COMMENT ON TABLE whatsapp_group_events IS 'Immutable log of group membership changes. Used for triggering automations.';

-- ==================== TRIGGERS ====================

-- Function to update updated_at on groups
CREATE OR REPLACE FUNCTION update_whatsapp_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_whatsapp_groups_update
BEFORE UPDATE ON whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_group_timestamp();