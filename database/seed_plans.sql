-- Seed Plans - Insert default plans if they don't exist
-- This script can be run independently to ensure plans are available
-- Usage: psql -d your_database -f database/seed_plans.sql

-- Insert default plans (using ON CONFLICT to avoid duplicates)
INSERT INTO plans (name, display_name, description, max_instances, max_users, max_dispatches_per_day, max_contacts, max_automations, price_monthly, price_yearly, currency, is_active) 
VALUES
  (
    'free', 
    'Free', 
    'Plano gratuito com recursos básicos', 
    1, 
    1, 
    100, 
    500, 
    3, 
    0, 
    0, 
    'BRL',
    true
  ),
  (
    'pro', 
    'Pro', 
    'Plano profissional para pequenas empresas', 
    3, 
    5, 
    1000, 
    5000, 
    20, 
    99.00, 
    990.00, 
    'BRL',
    true
  ),
  (
    'enterprise', 
    'Enterprise', 
    'Solução completa para grandes empresas', 
    10, 
    999, 
    10000, 
    NULL, 
    NULL, 
    499.00, 
    4990.00, 
    'BRL',
    true
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  max_instances = EXCLUDED.max_instances,
  max_users = EXCLUDED.max_users,
  max_dispatches_per_day = EXCLUDED.max_dispatches_per_day,
  max_contacts = EXCLUDED.max_contacts,
  max_automations = EXCLUDED.max_automations,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify plans were inserted/updated
SELECT name, display_name, price_monthly, is_active 
FROM plans 
ORDER BY price_monthly ASC;


