export type WhatsAppInstanceStatus = 
  | 'disconnected' 
  | 'waiting_qr' 
  | 'connecting' 
  | 'connected' 
  | 'error';

export interface WhatsAppInstance {
  id: string;
  name: string;
  connectionId?: string; // Backend connection_id for Socket.IO matching
  phoneNumber?: string;
  status: WhatsAppInstanceStatus;
  qrCode?: string;
  lastActivity?: Date;
  createdAt: Date;
  errorMessage?: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

export const MAX_INSTANCES_PER_COMPANY = 10;
