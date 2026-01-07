-- Migration: Create whatsapp_connections table
-- Stores WhatsApp connection instances per company

CREATE TABLE IF NOT EXISTS whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Connection info
    name VARCHAR(255) NOT NULL,
    connection_id VARCHAR(255) UNIQUE NOT NULL, -- Unique identifier for Baileys (companyId_connectionId)
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected', -- disconnected, waiting_qr, connecting, connected, error
    phone_number VARCHAR(50),
    error_message TEXT,
    
    -- Metadata
    qr_code TEXT, -- Base64 QR code (temporary, cleared after connection)
    last_activity TIMESTAMP WITH TIME ZONE,
    battery_level INTEGER, -- 0-100
    is_charging BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    connected_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT whatsapp_connections_status_check CHECK (status IN ('disconnected', 'waiting_qr', 'connecting', 'connected', 'error'))
);

CREATE INDEX idx_whatsapp_connections_company_id ON whatsapp_connections(company_id);
CREATE INDEX idx_whatsapp_connections_connection_id ON whatsapp_connections(connection_id);
CREATE INDEX idx_whatsapp_connections_status ON whatsapp_connections(status);
CREATE INDEX idx_whatsapp_connections_company_status ON whatsapp_connections(company_id, status);

COMMENT ON TABLE whatsapp_connections IS 'WhatsApp connection instances per company';
COMMENT ON COLUMN whatsapp_connections.connection_id IS 'Unique identifier: companyId_uuid format for Baileys instance';
COMMENT ON COLUMN whatsapp_connections.status IS 'Connection status: disconnected, waiting_qr, connecting, connected, error';

