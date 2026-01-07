-- Lead scores table
CREATE TABLE IF NOT EXISTS crm_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  company_id UUID NOT NULL,
  score INT DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  last_calculated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contact_id, company_id)
);

-- Lead scoring rules table
CREATE TABLE IF NOT EXISTS crm_lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL,
  score_value INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Lead score history table
CREATE TABLE IF NOT EXISTS crm_lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  company_id UUID NOT NULL,
  old_score INT,
  new_score INT,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_contact_company ON crm_lead_scores(contact_id, company_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scores_score ON crm_lead_scores(score);
CREATE INDEX IF NOT EXISTS idx_crm_lead_scoring_rules_company_active ON crm_lead_scoring_rules(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_lead_score_history_contact ON crm_lead_score_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_score_history_created_at ON crm_lead_score_history(created_at);
