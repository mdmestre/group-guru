/**
 * Socket.IO Helper para Backend
 * Centraliza a emissão de eventos Socket.IO
 * 
 * Uso (ES Modules):
 *   import { emitPipelineUpdated } from './utils/socketHelper.js';
 *   emitPipelineUpdated(io, { pipelineId: '123', companyId: '456' });
 */

/**
 * Emitir evento de pipeline atualizado
 */
function emitPipelineUpdated(io, data) {
  if (!io || !data) return;
  
  const { pipelineId, companyId } = data;
  
  // Emitir para a sala da empresa
  if (companyId) {
    io.to(`company_${companyId}`).emit('pipeline:updated', {
      pipelineId,
      companyId,
    });
  }
  
  // Emitir globalmente (para desenvolvimento)
  io.emit('pipeline:updated', { pipelineId, companyId });
}

/**
 * Emitir evento de stage atualizado
 */
function emitStageUpdated(io, data) {
  if (!io || !data) return;
  
  const { pipelineId, stageId, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('pipeline:stage_updated', {
      pipelineId,
      stageId,
      companyId,
    });
  }
  
  io.emit('pipeline:stage_updated', { pipelineId, stageId, companyId });
}

/**
 * Emitir evento de contato movido
 */
function emitContactMoved(io, data) {
  if (!io || !data) return;
  
  const { pipelineId, contactId, stageId, fromStageId, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('pipeline:contact_moved', {
      pipelineId,
      contactId,
      stageId,
      fromStageId,
      companyId,
    });
  }
  
  io.emit('pipeline:contact_moved', {
    pipelineId,
    contactId,
    stageId,
    fromStageId,
    companyId,
  });
}

/**
 * Emitir evento de lead score atualizado
 */
function emitScoreUpdated(io, data) {
  if (!io || !data) return;
  
  const { contactId, score, previousScore, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('lead-scoring:score_updated', {
      contactId,
      score,
      previousScore,
      companyId,
    });
  }
  
  io.emit('lead-scoring:score_updated', {
    contactId,
    score,
    previousScore,
    companyId,
  });
}

/**
 * Emitir evento de regra de scoring atualizada
 */
function emitRuleUpdated(io, data) {
  if (!io || !data) return;
  
  const { ruleId, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('lead-scoring:rule_updated', {
      ruleId,
      companyId,
    });
  }
  
  io.emit('lead-scoring:rule_updated', { ruleId, companyId });
}

/**
 * Emitir evento de scores recalculados
 */
function emitScoresRecalculated(io, data) {
  if (!io || !data) return;
  
  const { companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('lead-scoring:scores_recalculated', {
      companyId,
    });
  }
  
  io.emit('lead-scoring:scores_recalculated', { companyId });
}

/**
 * Emitir evento de segment atualizado
 */
function emitSegmentUpdated(io, data) {
  if (!io || !data) return;
  
  const { segmentId, memberCount, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('segment:updated', {
      segmentId,
      memberCount,
      companyId,
    });
  }
  
  io.emit('segment:updated', { segmentId, memberCount, companyId });
}

/**
 * Emitir evento de membros de segment atualizados
 */
function emitSegmentMembersRefreshed(io, data) {
  if (!io || !data) return;
  
  const { segmentId, memberCount, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('segment:members_refreshed', {
      segmentId,
      memberCount,
      companyId,
    });
  }
  
  io.emit('segment:members_refreshed', { segmentId, memberCount, companyId });
}

/**
 * Emitir evento de custom field atualizado
 */
function emitCustomFieldUpdated(io, data) {
  if (!io || !data) return;
  
  const { fieldId, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('custom-field:updated', {
      fieldId,
      companyId,
    });
  }
  
  io.emit('custom-field:updated', { fieldId, companyId });
}

/**
 * Emitir evento de valor de custom field atualizado
 */
function emitCustomFieldValueUpdated(io, data) {
  if (!io || !data) return;
  
  const { contactId, fieldId, companyId } = data;
  
  if (companyId) {
    io.to(`company_${companyId}`).emit('custom-field:value_updated', {
      contactId,
      fieldId,
      companyId,
    });
  }
  
  io.emit('custom-field:value_updated', { contactId, fieldId, companyId });
}

// Export as ES modules
export {
  emitPipelineUpdated,
  emitStageUpdated,
  emitContactMoved,
  emitScoreUpdated,
  emitRuleUpdated,
  emitScoresRecalculated,
  emitSegmentUpdated,
  emitSegmentMembersRefreshed,
  emitCustomFieldUpdated,
  emitCustomFieldValueUpdated,
};

