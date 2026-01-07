-- Migration: Create plans table
-- Subscription plans with limits

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL, -- 'free', 'pro', 'enterprise'
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Limits
    max_instances INTEGER NOT NULL DEFAULT 1, -- WhatsApp instances
    max_users INTEGER NOT NULL DEFAULT 1, -- ALTERADO: Se quiser permitir NULL aqui no futuro, remova o NOT NULL
    max_dispatches_per_day INTEGER NOT NULL DEFAULT 100, -- Messages/dispatches per day
    max_contacts INTEGER, -- NULL = unlimited
    max_automations INTEGER, -- NULL = unlimited
    
    -- Features flags (JSONB for flexibility)
    features JSONB DEFAULT '{}'::jsonb,
    
    -- Pricing
    price_monthly DECIMAL(10, 2) DEFAULT 0,
    price_yearly DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_name ON plans(name);
CREATE INDEX idx_plans_active ON plans(is_active);

-- Insert default plans
-- CORREÇÃO: No plano 'enterprise', mudei o NULL de max_users para 999 
-- para respeitar a restrição NOT NULL da tabela.
INSERT INTO plans (name, display_name, description, max_instances, max_users, max_dispatches_per_day, max_contacts, max_automations, price_monthly, price_yearly) VALUES
('free', 'Free', 'Plano gratuito com recursos básicos', 1, 1, 100, 500, 3, 0, 0),
('pro', 'Pro', 'Plano profissional para pequenas empresas', 3, 5, 1000, 5000, 20, 99.00, 990.00),
('enterprise', 'Enterprise', 'Solução completa para grandes empresas', 10, 999, 10000, NULL, NULL, 499.00, 4990.00)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE plans IS 'Subscription plans with feature limits';
COMMENT ON COLUMN plans.max_instances IS 'Maximum WhatsApp instances allowed';
COMMENT ON COLUMN plans.max_dispatches_per_day IS 'Maximum messages/dispatches per day';
COMMENT ON COLUMN plans.features IS 'JSON object with feature flags and additional settings';