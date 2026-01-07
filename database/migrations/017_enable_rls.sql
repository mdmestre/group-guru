-- Migration: Enable Row Level Security (RLS)
-- Adds RLS policies for multi-tenant isolation

-- ==================== CONTEXT FUNCTION ====================

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID AS $$
BEGIN
  -- O segundo parâmetro 'true' evita erro se a variável não estiver setada
  RETURN current_setting('app.current_company_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_company_context(company_uuid UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_company_id', company_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- ==================== ENABLE RLS ====================

-- Ativando RLS em todas as tabelas necessárias
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==================== POLICY HELPER ====================



CREATE OR REPLACE FUNCTION create_company_policy(
  p_table_name TEXT,
  p_table_schema TEXT DEFAULT 'public'
)
RETURNS VOID AS $$
DECLARE
  v_policy_name TEXT;
  v_has_company_id BOOLEAN;
BEGIN
  -- Usamos o alias "cols" para evitar ambiguidade e prefixo "p_" nos parâmetros
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns AS cols
    WHERE cols.table_schema = p_table_schema
      AND cols.table_name = p_table_name
      AND cols.column_name = 'company_id'
  ) INTO v_has_company_id;

  IF NOT v_has_company_id THEN
    RAISE NOTICE 'Skipping RLS for %.% (no company_id)', p_table_schema, p_table_name;
    RETURN;
  END IF;

  v_policy_name := 'company_isolation_' || p_table_name;

  EXECUTE format(
    'DROP POLICY IF EXISTS %I ON %I.%I',
    v_policy_name, p_table_schema, p_table_name
  );

  EXECUTE format(
    'CREATE POLICY %I ON %I.%I
     FOR ALL
     USING (company_id = current_company_id() OR current_company_id() IS NULL)
     WITH CHECK (company_id = current_company_id() OR current_company_id() IS NULL)',
    v_policy_name, p_table_schema, p_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== APPLY POLICIES ====================

-- Executa a criação das políticas
DO $$ 
BEGIN
    PERFORM create_company_policy('crm_contacts');
    PERFORM create_company_policy('crm_tags');
    PERFORM create_company_policy('crm_contact_tags');
    PERFORM create_company_policy('crm_custom_fields');
    PERFORM create_company_policy('crm_custom_field_values');
    PERFORM create_company_policy('crm_interactions');
    PERFORM create_company_policy('crm_pipelines');
    PERFORM create_company_policy('crm_pipeline_stages');
    PERFORM create_company_policy('crm_pipeline_history');
    PERFORM create_company_policy('automations');
    PERFORM create_company_policy('automation_runs');
    PERFORM create_company_policy('automation_logs');
    PERFORM create_company_policy('campaigns');
    PERFORM create_company_policy('campaign_recipients');
    PERFORM create_company_policy('jobs');
    PERFORM create_company_policy('job_logs');
    PERFORM create_company_policy('webhooks');
    PERFORM create_company_policy('webhook_calls');
    PERFORM create_company_policy('whatsapp_connections');
    PERFORM create_company_policy('whatsapp_groups');
    PERFORM create_company_policy('whatsapp_group_members');
    PERFORM create_company_policy('whatsapp_group_events');
    PERFORM create_company_policy('invoices');
    PERFORM create_company_policy('invoice_items');
    PERFORM create_company_policy('payments');
    PERFORM create_company_policy('audit_logs');
END $$;

-- ==================== COMMENTS ====================

COMMENT ON FUNCTION current_company_id() IS 'Returns the current company_id from session context';
COMMENT ON FUNCTION set_company_context(UUID) IS 'Sets the company context for the current connection';
COMMENT ON FUNCTION create_company_policy(TEXT, TEXT) IS 'Creates a company isolation RLS policy if company_id exists';