/**
 * Deal Domain Logic
 * Regras de negócio centralizadas para Deals
 * 
 * TODO: Quando integrar com backend, mover validações para API
 */

import { Deal, DealStatus, PipelineStage, DealTimelineEvent, DealTimelineEventType } from "@/types/pipedrive";

/**
 * Valida se um Deal pode ser movido para uma nova etapa
 */
export function canMoveDealToStage(
  deal: Deal,
  newStageId: string,
  stages: PipelineStage[]
): { valid: boolean; reason?: string } {
  // Negócios ganhos ou perdidos não podem ser movidos
  if (deal.status === "won" || deal.status === "lost") {
    return {
      valid: false,
      reason: `Negócios ${deal.status === "won" ? "ganhos" : "perdidos"} não podem ser movidos entre etapas`,
    };
  }

  // Validar se a etapa existe
  const targetStage = stages.find(s => s.id === newStageId);
  if (!targetStage) {
    return {
      valid: false,
      reason: "Etapa não encontrada",
    };
  }

  return { valid: true };
}

/**
 * Valida se um Deal pode ter seu status alterado
 */
export function canChangeDealStatus(
  deal: Deal,
  newStatus: DealStatus
): { valid: boolean; reason?: string } {
  // Se já está no mesmo status, não precisa mudar
  if (deal.status === newStatus) {
    return { valid: true };
  }

  // Se está ganho ou perdido, só pode ser reaberto manualmente
  if ((deal.status === "won" || deal.status === "lost") && newStatus === "open") {
    return { valid: true }; // Permitir reabertura
  }

  // Se está aberto, pode ser ganho ou perdido
  if (deal.status === "open" && (newStatus === "won" || newStatus === "lost")) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Não é possível alterar de ${deal.status} para ${newStatus}`,
  };
}

/**
 * Calcula o valor ponderado de um Deal
 */
export function calculateWeightedValue(deal: Deal, stage?: PipelineStage): number {
  const probability = deal.probability ?? stage?.probability ?? 0;
  return (deal.value * probability) / 100;
}

/**
 * Calcula dias na etapa atual
 */
export function calculateDaysInStage(deal: Deal, timeline?: DealTimelineEvent[]): number {
  if (!timeline || timeline.length === 0) {
    // Se não há timeline, usar updatedAt como referência
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate;
  }

  // Encontrar último evento de mudança de etapa
  const lastStageChange = timeline
    .filter(e => e.type === "stage_changed")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (lastStageChange) {
    const daysSinceChange = Math.floor(
      (Date.now() - new Date(lastStageChange.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceChange;
  }

  // Se não há mudança de etapa, usar createdAt
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceCreation;
}

/**
 * Cria evento de timeline para mudança de etapa
 */
export function createStageChangeEvent(
  deal: Deal,
  oldStageId: string,
  newStageId: string,
  userId: string
): DealTimelineEvent {
  return {
    id: `timeline-${Date.now()}`,
    dealId: deal.id,
    type: "stage_changed",
    userId,
    timestamp: new Date(),
    description: `Negócio movido de etapa`,
    metadata: {
      oldStageId,
      newStageId,
    },
  };
}

/**
 * Cria evento de timeline para mudança de valor
 */
export function createValueChangeEvent(
  deal: Deal,
  oldValue: number,
  newValue: number,
  userId: string
): DealTimelineEvent {
  return {
    id: `timeline-${Date.now()}`,
    dealId: deal.id,
    type: "value_changed",
    userId,
    timestamp: new Date(),
    description: `Valor alterado de ${oldValue} para ${newValue}`,
    metadata: {
      oldValue,
      newValue,
    },
  };
}

/**
 * Cria evento de timeline para mudança de responsável
 */
export function createOwnerChangeEvent(
  deal: Deal,
  oldOwnerId: string,
  newOwnerId: string,
  userId: string
): DealTimelineEvent {
  return {
    id: `timeline-${Date.now()}`,
    dealId: deal.id,
    type: "owner_changed",
    userId,
    timestamp: new Date(),
    description: `Responsável alterado`,
    metadata: {
      oldOwnerId,
      newOwnerId,
    },
  };
}

/**
 * Cria evento de timeline para mudança de status
 */
export function createStatusChangeEvent(
  deal: Deal,
  oldStatus: DealStatus,
  newStatus: DealStatus,
  userId: string
): DealTimelineEvent {
  return {
    id: `timeline-${Date.now()}`,
    dealId: deal.id,
    type: "status_changed",
    userId,
    timestamp: new Date(),
    description: `Status alterado de ${oldStatus} para ${newStatus}`,
    metadata: {
      oldStatus,
      newStatus,
    },
  };
}

/**
 * Verifica se um Deal precisa de atenção (sem atividades recentes)
 */
export function dealNeedsAttention(deal: Deal, daysThreshold: number = 7): boolean {
  if (!deal.lastActivityDate) {
    return true; // Sem atividades
  }

  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(deal.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceActivity >= daysThreshold;
}

/**
 * Verifica se um Deal está parado (muitos dias na mesma etapa)
 */
export function dealIsStuck(deal: Deal, daysThreshold: number = 14): boolean {
  const daysInStage = deal.daysInCurrentStage ?? calculateDaysInStage(deal, deal.timeline);
  return daysInStage >= daysThreshold;
}

/**
 * Atualiza Deal com validações e timeline
 */
export function updateDealWithValidation(
  currentDeal: Deal,
  updates: Partial<Deal>,
  userId: string,
  stages: PipelineStage[]
): { deal: Deal; timelineEvents: DealTimelineEvent[] } {
  const timelineEvents: DealTimelineEvent[] = [];
  let updatedDeal = { ...currentDeal, ...updates };

  // Validar mudança de etapa
  if (updates.stageId && updates.stageId !== currentDeal.stageId) {
    const validation = canMoveDealToStage(currentDeal, updates.stageId, stages);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    timelineEvents.push(
      createStageChangeEvent(currentDeal, currentDeal.stageId, updates.stageId, userId)
    );
    // Atualizar probabilidade baseada na nova etapa
    const newStage = stages.find(s => s.id === updates.stageId);
    if (newStage && !updates.probability) {
      updatedDeal.probability = newStage.probability;
    }
  }

  // Validar mudança de valor
  if (updates.value !== undefined && updates.value !== currentDeal.value) {
    timelineEvents.push(
      createValueChangeEvent(currentDeal, currentDeal.value, updates.value, userId)
    );
  }

  // Validar mudança de responsável
  if (updates.ownerId && updates.ownerId !== currentDeal.ownerId) {
    timelineEvents.push(
      createOwnerChangeEvent(currentDeal, currentDeal.ownerId, updates.ownerId, userId)
    );
  }

  // Validar mudança de status
  if (updates.status && updates.status !== currentDeal.status) {
    const validation = canChangeDealStatus(currentDeal, updates.status);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    timelineEvents.push(
      createStatusChangeEvent(currentDeal, currentDeal.status, updates.status, userId)
    );
    
    // Se ganho ou perdido, atualizar data de fechamento
    if (updates.status === "won" || updates.status === "lost") {
      updatedDeal.actualCloseDate = new Date();
    } else if (updates.status === "open") {
      updatedDeal.actualCloseDate = undefined;
    }
  }

  // Atualizar timeline
  updatedDeal.timeline = [...(currentDeal.timeline || []), ...timelineEvents];
  updatedDeal.updatedAt = new Date();
  updatedDeal.daysInCurrentStage = calculateDaysInStage(updatedDeal, updatedDeal.timeline);

  return { deal: updatedDeal, timelineEvents };
}

