-- Migration: Create user_companies table (many-to-many)
-- Users can belong to multiple companies with different roles

CREATE TABLE IF NOT EXISTS user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT user_companies_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    CONSTRAINT user_companies_unique UNIQUE (user_id, company_id)
);

CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_user_companies_active ON user_companies(user_id, company_id, is_active) WHERE is_active = true;

COMMENT ON TABLE user_companies IS 'Many-to-many relationship: Users belong to companies with roles';
COMMENT ON COLUMN user_companies.role IS 'User role in this company: owner, admin, member, viewer';
COMMENT ON COLUMN user_companies.invited_at IS 'When user was invited (NULL if user created company)';
COMMENT ON COLUMN user_companies.joined_at IS 'When user accepted invitation and joined';

