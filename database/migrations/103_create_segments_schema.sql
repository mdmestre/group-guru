/**
 * Contact Segments Database Schema Migration
 */

-- ============================================
-- SEGMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  filter_logic VARCHAR(10) DEFAULT 'AND',
  member_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_smart BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  UNIQUE(company_id, name)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'criteria') THEN
    ALTER TABLE crm_segments ADD COLUMN criteria JSONB DEFAULT '{}';
    UPDATE crm_segments SET criteria = '{}' WHERE criteria IS NULL;
    ALTER TABLE crm_segments ALTER COLUMN criteria SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'filter_logic') THEN
    ALTER TABLE crm_segments ADD COLUMN filter_logic VARCHAR(10) DEFAULT 'AND';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'member_count') THEN
    ALTER TABLE crm_segments ADD COLUMN member_count INT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'is_smart') THEN
    ALTER TABLE crm_segments ADD COLUMN is_smart BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_segments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'last_refreshed_at') THEN
    ALTER TABLE crm_segments ADD COLUMN last_refreshed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segments' AND column_name = 'created_by') THEN
    ALTER TABLE crm_segments ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'crm_segments_company_id_name_key'
  ) THEN
    ALTER TABLE crm_segments 
    ADD CONSTRAINT crm_segments_company_id_name_key 
    UNIQUE (company_id, name);
  END IF;
END $$;

-- ============================================
-- SEGMENT MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS crm_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, contact_id)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_members' AND column_name = 'company_id') THEN
    ALTER TABLE crm_segment_members ADD COLUMN company_id UUID;
    -- Populate company_id from segment if possible
    UPDATE crm_segment_members sm
    SET company_id = s.company_id
    FROM crm_segments s
    WHERE sm.segment_id = s.id AND sm.company_id IS NULL;
    -- Set as NOT NULL after populating
    ALTER TABLE crm_segment_members ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE crm_segment_members ADD CONSTRAINT crm_segment_members_company_fk 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_members' AND column_name = 'added_at') THEN
    ALTER TABLE crm_segment_members ADD COLUMN added_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- SEGMENT ACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS crm_segment_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES crm_segments(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB NOT NULL,
  executed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_actions' AND column_name = 'company_id') THEN
    ALTER TABLE crm_segment_actions ADD COLUMN company_id UUID;
    -- Populate company_id from segment if possible
    UPDATE crm_segment_actions sa
    SET company_id = s.company_id
    FROM crm_segments s
    WHERE sa.segment_id = s.id AND sa.company_id IS NULL;
    -- Set as NOT NULL after populating
    ALTER TABLE crm_segment_actions ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE crm_segment_actions ADD CONSTRAINT crm_segment_actions_company_fk 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_actions' AND column_name = 'action_type') THEN
    ALTER TABLE crm_segment_actions ADD COLUMN action_type VARCHAR(50) NOT NULL DEFAULT 'tag';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_actions' AND column_name = 'action_data') THEN
    ALTER TABLE crm_segment_actions ADD COLUMN action_data JSONB NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_actions' AND column_name = 'executed_at') THEN
    ALTER TABLE crm_segment_actions ADD COLUMN executed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_segment_actions' AND column_name = 'executed_by') THEN
    ALTER TABLE crm_segment_actions ADD COLUMN executed_by UUID REFERENCES users(id);
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_crm_segments_company_id
  ON crm_segments(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_segments_active
  ON crm_segments(company_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_crm_segment_members_segment_id
  ON crm_segment_members(segment_id);

CREATE INDEX IF NOT EXISTS idx_crm_segment_members_contact_id
  ON crm_segment_members(contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_segment_members_company_id
  ON crm_segment_members(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_segment_actions_segment_id
  ON crm_segment_actions(segment_id);

CREATE INDEX IF NOT EXISTS idx_crm_segment_actions_company_id
  ON crm_segment_actions(company_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segment_actions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================
CREATE POLICY crm_segments_company_isolation
  ON crm_segments
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_segment_members_company_isolation
  ON crm_segment_members
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_segment_actions_company_isolation
  ON crm_segment_actions
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_crm_segments_updated_at
  BEFORE UPDATE ON crm_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
