/**
 * Lead Scoring Database Schema Migration
 */

-- ============================================
-- LEAD SCORES
-- ============================================
CREATE TABLE IF NOT EXISTS crm_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL UNIQUE REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  total_score INT DEFAULT 0,
  engagement_score INT DEFAULT 0,
  interaction_count INT DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  score_breakdown JSONB DEFAULT '{}',
  previous_scores JSONB[] DEFAULT ARRAY[]::jsonb[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add total_score if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'total_score') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN total_score INT DEFAULT 0;
  END IF;

  -- Add engagement_score if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'engagement_score') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN engagement_score INT DEFAULT 0;
  END IF;

  -- Add interaction_count if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'interaction_count') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN interaction_count INT DEFAULT 0;
  END IF;

  -- Add last_interaction_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'last_interaction_at') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN last_interaction_at TIMESTAMPTZ;
  END IF;

  -- Add score_breakdown if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'score_breakdown') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN score_breakdown JSONB DEFAULT '{}';
  END IF;

  -- Add previous_scores if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'previous_scores') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN previous_scores JSONB[] DEFAULT ARRAY[]::jsonb[];
  END IF;

  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_lead_scores' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_lead_scores ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- LEAD SCORING RULES
-- ============================================
CREATE TABLE IF NOT EXISTS crm_lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  condition JSONB NOT NULL,
  points INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- ============================================
-- LEAD SCORE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS crm_lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  previous_score INT,
  new_score INT NOT NULL,
  score_change INT NOT NULL,
  reason TEXT,
  triggered_by_rule_id UUID REFERENCES crm_lead_scoring_rules(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_company_id
  ON crm_lead_scores(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_contact_id
  ON crm_lead_scores(contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_total_score
  ON crm_lead_scores(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_crm_lead_scoring_rules_company_id
  ON crm_lead_scoring_rules(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_lead_scoring_rules_active
  ON crm_lead_scoring_rules(company_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_crm_lead_score_history_contact_id
  ON crm_lead_score_history(contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_lead_score_history_company_id
  ON crm_lead_score_history(company_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE crm_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_lead_score_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================
CREATE POLICY crm_lead_scores_company_isolation
  ON crm_lead_scores
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_lead_scoring_rules_company_isolation
  ON crm_lead_scoring_rules
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_lead_score_history_company_isolation
  ON crm_lead_score_history
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_crm_lead_scores_updated_at
  BEFORE UPDATE ON crm_lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_lead_scoring_rules_updated_at
  BEFORE UPDATE ON crm_lead_scoring_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
