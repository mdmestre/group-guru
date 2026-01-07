-- Custom fields table
CREATE TABLE IF NOT EXISTS crm_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB,
  options JSONB DEFAULT '[]',
  default_value TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  UNIQUE(company_id, name)
);

-- Custom field values table
CREATE TABLE IF NOT EXISTS crm_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  custom_field_id UUID NOT NULL REFERENCES crm_custom_fields(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contact_id, custom_field_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_company_active ON crm_custom_fields(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_contact ON crm_custom_field_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_field ON crm_custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_company ON crm_custom_field_values(company_id);
