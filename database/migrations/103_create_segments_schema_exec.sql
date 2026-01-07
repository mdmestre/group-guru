-- Segments table
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  member_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Segment members cache table
CREATE TABLE IF NOT EXISTS crm_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  company_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, contact_id)
);

-- Segment actions table
CREATE TABLE IF NOT EXISTS crm_segment_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  triggered_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_segments_company_active ON crm_segments(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment ON crm_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_contact ON crm_segment_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_members_company ON crm_segment_members(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_segment_actions_segment_active ON crm_segment_actions(segment_id, is_active);
