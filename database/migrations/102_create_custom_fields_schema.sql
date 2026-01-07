/**
 * Custom Fields Database Schema Migration
 */

-- ============================================
-- CUSTOM FIELDS
-- ============================================
CREATE TABLE IF NOT EXISTS crm_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  default_value VARCHAR(255),
  options JSONB,
  validation_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  position INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(company_id, name, entity_type)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add label if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'label') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN label VARCHAR(255);
    UPDATE crm_custom_fields SET label = name WHERE label IS NULL;
    ALTER TABLE crm_custom_fields ALTER COLUMN label SET NOT NULL;
  END IF;

  -- Add entity_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'entity_type') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN entity_type VARCHAR(50) DEFAULT 'contact';
    UPDATE crm_custom_fields SET entity_type = 'contact' WHERE entity_type IS NULL;
    ALTER TABLE crm_custom_fields ALTER COLUMN entity_type SET NOT NULL;
  END IF;

  -- Add field_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'field_type') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN field_type VARCHAR(50) DEFAULT 'text';
    UPDATE crm_custom_fields SET field_type = 'text' WHERE field_type IS NULL;
    ALTER TABLE crm_custom_fields ALTER COLUMN field_type SET NOT NULL;
  END IF;

  -- Add other optional columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'is_required') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN is_required BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'is_unique') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN is_unique BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'default_value') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN default_value VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'options') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN options JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'validation_rules') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN validation_rules JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'is_active') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'position') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN position INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_fields' AND column_name = 'created_by') THEN
    ALTER TABLE crm_custom_fields ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;

  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'crm_custom_fields_company_name_entity_key'
  ) THEN
    ALTER TABLE crm_custom_fields 
    ADD CONSTRAINT crm_custom_fields_company_name_entity_key 
    UNIQUE (company_id, name, entity_type);
  END IF;
END $$;

-- ============================================
-- CUSTOM FIELD VALUES
-- ============================================
CREATE TABLE IF NOT EXISTS crm_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES crm_custom_fields(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, custom_field_id)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'crm_custom_field_values' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_custom_field_values ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_company_id
  ON crm_custom_fields(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_entity_type
  ON crm_custom_fields(company_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_crm_custom_fields_active
  ON crm_custom_fields(company_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_contact_id
  ON crm_custom_field_values(contact_id);

CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_company_id
  ON crm_custom_field_values(company_id);

CREATE INDEX IF NOT EXISTS idx_crm_custom_field_values_field_id
  ON crm_custom_field_values(custom_field_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_values ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES
-- ============================================
CREATE POLICY crm_custom_fields_company_isolation
  ON crm_custom_fields
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

CREATE POLICY crm_custom_field_values_company_isolation
  ON crm_custom_field_values
  FOR ALL
  USING (company_id = current_company_id() OR current_company_id() IS NULL)
  WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_crm_custom_fields_updated_at
  BEFORE UPDATE ON crm_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_custom_field_values_updated_at
  BEFORE UPDATE ON crm_custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
