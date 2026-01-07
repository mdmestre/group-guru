-- Migration 008: Create CRM core tables
-- Contacts, Tags, Custom Fields, Interactions
-- Multi-tenant ready (company_id em todas as tabelas com RLS)

-- ==================== TAGS ====================
CREATE TABLE IF NOT EXISTS crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_tags_unique UNIQUE (company_id, name)
);

CREATE INDEX idx_crm_tags_company_id ON crm_tags(company_id);
CREATE INDEX idx_crm_tags_name ON crm_tags(company_id, name);

COMMENT ON TABLE crm_tags IS 'Tags for organizing contacts';

-- ==================== CONTACTS ====================
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),

    status VARCHAR(50) DEFAULT 'lead',
    pipeline_stage_id UUID,

    avatar_url TEXT,
    notes TEXT,
    source VARCHAR(100),

    last_interaction_at TIMESTAMP WITH TIME ZONE,
    total_interactions INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_contacts_status_check
        CHECK (status IN ('lead', 'customer', 'inactive', 'blocked')),

    CONSTRAINT crm_contacts_unique UNIQUE (company_id, phone)
);

CREATE INDEX idx_crm_contacts_company_id ON crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_phone ON crm_contacts(company_id, phone);
CREATE INDEX idx_crm_contacts_status ON crm_contacts(company_id, status);
CREATE INDEX idx_crm_contacts_pipeline_stage ON crm_contacts(company_id, pipeline_stage_id);
CREATE INDEX idx_crm_contacts_last_interaction
    ON crm_contacts(company_id, last_interaction_at DESC);

-- ==================== CONTACT TAGS ====================
CREATE TABLE IF NOT EXISTS crm_contact_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_contact_tags_unique UNIQUE (contact_id, tag_id)
);

CREATE INDEX idx_crm_contact_tags_company_id ON crm_contact_tags(company_id);
CREATE INDEX idx_crm_contact_tags_contact_id ON crm_contact_tags(contact_id);
CREATE INDEX idx_crm_contact_tags_tag_id ON crm_contact_tags(tag_id);

-- ==================== CUSTOM FIELDS ====================
CREATE TABLE IF NOT EXISTS crm_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,

    is_required BOOLEAN DEFAULT false,
    is_unique BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB,

    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_custom_fields_type_check
        CHECK (type IN (
            'text',
            'number',
            'date',
            'select',
            'checkbox',
            'textarea',
            'url',
            'email',
            'phone'
        )),

    CONSTRAINT crm_custom_fields_unique UNIQUE (company_id, slug)
);

CREATE INDEX idx_crm_custom_fields_company_id ON crm_custom_fields(company_id);
CREATE INDEX idx_crm_custom_fields_active
    ON crm_custom_fields(company_id, is_active)
    WHERE is_active = true;

-- ==================== CUSTOM FIELD VALUES ====================
CREATE TABLE IF NOT EXISTS crm_custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES crm_custom_fields(id) ON DELETE CASCADE,

    value TEXT,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_custom_field_values_unique
        UNIQUE (contact_id, custom_field_id)
);

CREATE INDEX idx_crm_custom_field_values_company_id
    ON crm_custom_field_values(company_id);

CREATE INDEX idx_crm_custom_field_values_contact_id
    ON crm_custom_field_values(contact_id);

CREATE INDEX idx_crm_custom_field_values_field_id
    ON crm_custom_field_values(custom_field_id);

-- ==================== INTERACTIONS ====================
CREATE TABLE IF NOT EXISTS crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    direction VARCHAR(10),

    subject VARCHAR(255),
    content TEXT NOT NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    automation_id UUID,
    campaign_id UUID,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT crm_interactions_type_check
        CHECK (type IN (
            'message',
            'call',
            'email',
            'note',
            'task',
            'meeting',
            'automation',
            'campaign'
        )),

    CONSTRAINT crm_interactions_direction_check
        CHECK (direction IN ('in', 'out') OR direction IS NULL)
);

CREATE INDEX idx_crm_interactions_company_id
    ON crm_interactions(company_id);

CREATE INDEX idx_crm_interactions_contact_id
    ON crm_interactions(contact_id, created_at DESC);

CREATE INDEX idx_crm_interactions_type
    ON crm_interactions(company_id, type);
