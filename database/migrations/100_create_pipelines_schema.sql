/**
 * CRM Pipelines Database Schema Migration
 * Creates tables for pipelines, stages, and pipeline history
 */

-- ============================================
-- PIPELINES
-- ============================================
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage_order JSONB DEFAULT '[]',
  color VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(company_id, name)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'stage_order') THEN
    ALTER TABLE crm_pipelines ADD COLUMN stage_order JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'color') THEN
    ALTER TABLE crm_pipelines ADD COLUMN color VARCHAR(7);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'icon') THEN
    ALTER TABLE crm_pipelines ADD COLUMN icon VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'is_active') THEN
    ALTER TABLE crm_pipelines ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_pipelines ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipelines' AND column_name = 'created_by') THEN
    ALTER TABLE crm_pipelines ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;

-- ============================================
-- PIPELINE STAGES
-- ============================================
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  color VARCHAR(7),
  description TEXT,
  conversion_probability FLOAT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pipeline_id, position)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipeline_stages' AND column_name = 'color') THEN
    ALTER TABLE crm_pipeline_stages ADD COLUMN color VARCHAR(7);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipeline_stages' AND column_name = 'description') THEN
    ALTER TABLE crm_pipeline_stages ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipeline_stages' AND column_name = 'conversion_probability') THEN
    ALTER TABLE crm_pipeline_stages ADD COLUMN conversion_probability FLOAT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipeline_stages' AND column_name = 'is_default') THEN
    ALTER TABLE crm_pipeline_stages ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_pipeline_stages' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_pipeline_stages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- PIPELINE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS crm_pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES crm_pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES crm_pipeline_stages(id),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  moved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_stage_move CHECK (from_stage_id IS DISTINCT FROM to_stage_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_company_id
  ON crm_pipelines(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline_id
  ON crm_pipeline_stages(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_contact_id
  ON crm_pipeline_history(contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_pipeline_id
  ON crm_pipeline_history(pipeline_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_company_id
  ON crm_pipeline_history(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_created_at
  ON crm_pipeline_history(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================
CREATE POLICY crm_pipelines_company_isolation
  ON crm_pipelines
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_pipeline_stages_company_isolation
  ON crm_pipeline_stages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM crm_pipelines
      WHERE id = pipeline_id
      AND company_id = current_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM crm_pipelines
      WHERE id = pipeline_id
      AND company_id = current_company_id()
    )
  );

CREATE POLICY crm_pipeline_history_company_isolation
  ON crm_pipeline_history
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_crm_pipelines_updated_at
  BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_pipeline_stages_updated_at
  BEFORE UPDATE ON crm_pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
