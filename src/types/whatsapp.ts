/**
 * WhatsApp Instance Types
 * 
 * Synchronized with backend repository:
 * - database/repositories/WhatsAppConnectionRepository.js
 * 
 * Status flow: disconnected -> connecting -> waiting_qr -> connected
 */

export type WhatsAppInstanceStatus = 
  | 'disconnected' 
  | 'waiting_qr' 
  | 'connecting' 
  | 'connected' 
  | 'error';

export interface WhatsAppInstance {
  /** Database primary key (UUID) */
  id: string;
  /** User-friendly name for the instance */
  name: string;
  /** Backend connection_id format: companyId_uuid - used for Socket.IO matching */
  connectionId: string;
  /** WhatsApp phone number (populated after connection) */
  phoneNumber?: string;
  /** Current connection status */
  status: WhatsAppInstanceStatus;
  /** QR Code data (only present during waiting_qr status) */
  qrCode?: string;
  /** Last activity timestamp */
  lastActivity?: Date;
  /** When the instance was created */
  createdAt: Date;
  /** When the instance was last updated */
  updatedAt?: Date;
  /** When successfully connected */
  connectedAt?: Date;
  /** Error message (only present during error status) */
  errorMessage?: string;
  /** Device battery level (0-100) */
  batteryLevel?: number;
  /** Whether device is charging */
  isCharging?: boolean;
  /** Company ID this instance belongs to */
  companyId?: string;
}

/** Maximum instances allowed per company (enforced by backend) */
export const MAX_INSTANCES_PER_COMPANY = 10;

/** Maps backend snake_case to frontend camelCase */
export function mapBackendToInstance(raw: Record<string, unknown>): WhatsAppInstance {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    connectionId: String(raw.connection_id ?? raw.connectionId ?? ''),
    phoneNumber: raw.phone_number ? String(raw.phone_number) : undefined,
    status: (raw.status as WhatsAppInstanceStatus) || 'disconnected',
    qrCode: raw.qr_code ? String(raw.qr_code) : undefined,
    lastActivity: raw.last_activity ? new Date(String(raw.last_activity)) : undefined,
    createdAt: new Date(String(raw.created_at ?? raw.createdAt ?? Date.now())),
    updatedAt: raw.updated_at ? new Date(String(raw.updated_at)) : undefined,
    connectedAt: raw.connected_at ? new Date(String(raw.connected_at)) : undefined,
    errorMessage: raw.error_message ? String(raw.error_message) : undefined,
    batteryLevel: typeof raw.battery_level === 'number' ? raw.battery_level : undefined,
    isCharging: Boolean(raw.is_charging),
    companyId: raw.company_id ? String(raw.company_id) : undefined
  };
}
