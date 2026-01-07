-- Migration: Create companies table
-- Multi-tenant core: Companies (Workspaces)

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'trial', -- trial, active, canceled, suspended
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT companies_status_check CHECK (status IN ('trial', 'active', 'canceled', 'suspended'))
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);

COMMENT ON TABLE companies IS 'Companies/Workspaces - Multi-tenant core entity';
COMMENT ON COLUMN companies.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN companies.status IS 'Company subscription status';
COMMENT ON COLUMN companies.trial_ends_at IS 'When trial period ends (null for non-trial)';

