-- Migration: Create Billing system (Final Version)
-- Includes: Invoices (Cents-based), Invoice Items, Payments, and History

-- ==================== INVOICES ====================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Invoice info
    invoice_number VARCHAR(100) NOT NULL, -- Format: INV-YYYY-001 (Scoped by company)
    
    -- Status (Expanded per requirement 4)
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    
    -- Amounts in CENTS (Requirement 1: Integer math)
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER DEFAULT 0,
    discount_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Period
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    
    -- Due date & Payment info
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50), -- credit_card, pix, boleto
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps & Soft Delete
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Requirement 2: Unique invoice number per company
    CONSTRAINT invoices_unique_number UNIQUE (company_id, invoice_number),
    
    CONSTRAINT invoices_status_check CHECK (status IN (
        'draft', 
        'sent', 
        'partially_paid', 
        'paid', 
        'overdue', 
        'canceled', 
        'refunded', 
        'failed'
    ))
);

-- Indexes
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('sent', 'overdue');

COMMENT ON TABLE invoices IS 'Invoices using integer-based currency (cents) for precision';
COMMENT ON COLUMN invoices.total_cents IS 'Final amount to be paid in cents (e.g., 1000 = R$ 10,00)';

-- ==================== INVOICE ITEMS (NEW) ====================
-- Requirement 5: Granular line items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE, -- Denormalized for RLS
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Amounts in CENTS
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    amount_cents INTEGER NOT NULL DEFAULT 0, -- quantity * unit_price
    
    -- Metadata (for taxes codes, product IDs)
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

COMMENT ON TABLE invoice_items IS 'Line items for invoices (products, services, taxes)';

-- ==================== PAYMENTS ====================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Amount in CENTS (Requirement 1)
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Method & Gateway
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50) NOT NULL,
    
    -- Gateway Data
    gateway_payment_id VARCHAR(255),
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB DEFAULT '{}'::jsonb,
    
    -- Timing
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT payments_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'canceled'))
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_gateway_id ON payments(gateway_payment_id);
CREATE INDEX idx_payments_status ON payments(company_id, status);

COMMENT ON TABLE payments IS 'Payment transactions logged in cents';

-- ==================== BILLING EVENTS (AUDIT) ====================
-- Upgrade 2: Audit log for financial events
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    entity_type VARCHAR(50) NOT NULL, -- invoice, payment
    entity_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- created, status_changed, failed, voided
    
    metadata JSONB DEFAULT '{}'::jsonb, -- Store "from status" and "to status"
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_events_entity ON billing_events(entity_id);
CREATE INDEX idx_billing_events_company_date ON billing_events(company_id, occurred_at DESC);

-- ==================== TRIGGERS ====================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_invoices_update
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();

CREATE TRIGGER trg_payments_update
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_billing_timestamp();