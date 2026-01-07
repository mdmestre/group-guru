-- Pipelines table
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  stage_order JSONB DEFAULT '[]',
  color VARCHAR(7),
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Pipeline stages
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  position INT NOT NULL,
  color VARCHAR(7),
  description TEXT,
  conversion_probability FLOAT DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pipeline_id, position)
);

-- Pipeline history (track contact movements)
CREATE TABLE IF NOT EXISTS crm_pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  pipeline_id UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES crm_pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES crm_pipeline_stages(id),
  company_id UUID NOT NULL,
  moved_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_stage_move CHECK (from_stage_id IS DISTINCT FROM to_stage_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_company_id ON crm_pipelines(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline_id ON crm_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_contact_id ON crm_pipeline_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_pipeline_id ON crm_pipeline_history(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_history_created_at ON crm_pipeline_history(created_at);
