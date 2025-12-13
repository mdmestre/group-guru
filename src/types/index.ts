export interface CycleConfig {
  groupId: string;
  addPerCycle: number;
  linkPerCycle: number;
  cycleMinutes: number;
  messageTemplate: string;
}

export interface ProcessedNumbers {
  adicionados: string[];
  linkEnviado: string[];
}

export interface PhoneNumber {
  id: string;
  number: string;
  status: 'pending' | 'added' | 'link_sent' | 'failed';
  processedAt?: Date;
  error?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

export interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
}

export interface CycleStatus {
  isRunning: boolean;
  currentCycle: number;
  processedInCycle: number;
  nextCycleAt?: Date;
}
