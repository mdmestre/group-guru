/**
 * Phase 2 Integration Guide
 * Shows how to integrate all CRM features into server.js
 */

// ============================================
// SERVER.JS INTEGRATION POINTS
// ============================================

/*
  1. IMPORT ROUTES AT TOP OF server.js:
  
  import pipelineRoutes from '@/features/pipelines/routes';
  import leadScoringRoutes from '@/features/lead-scoring/routes';
  import customFieldRoutes from '@/features/crm/routes/custom-fields';
  import segmentRoutes from '@/features/crm/routes/segments';
*/

/*
  2. REGISTER ROUTES AFTER OTHER ROUTES:
  
  // CRM Features - Phase 2
  app.use('/api/pipelines', pipelineRoutes);
  app.use('/api/lead-scoring', leadScoringRoutes);
  app.use('/api/custom-fields', customFieldRoutes);
  app.use('/api/segments', segmentRoutes);
*/

/*
  3. DATABASE SETUP:
  
  Run migrations in order:
  - database/migrations/100_create_pipelines_schema.sql
  - database/migrations/101_create_lead_scoring_schema.sql
  - database/migrations/102_create_custom_fields_schema.sql
  - database/migrations/103_create_segments_schema.sql
*/

// ============================================
// API ENDPOINTS SUMMARY
// ============================================

const phase2Endpoints = {
  pipelines: {
    'GET /api/pipelines': 'Get all pipelines',
    'GET /api/pipelines/:id': 'Get pipeline with stages',
    'POST /api/pipelines': 'Create pipeline',
    'PATCH /api/pipelines/:id': 'Update pipeline',
    'DELETE /api/pipelines/:id': 'Delete pipeline',
    'POST /api/pipelines/:id/stages': 'Create pipeline stage',
    'GET /api/pipelines/:id/stages': 'Get pipeline stages',
    'POST /api/pipelines/contacts/move': 'Move contact to stage',
    'GET /api/pipelines/contacts/:contactId/history': 'Get contact pipeline history',
    'GET /api/pipelines/stages/:stageId/stats': 'Get stage statistics'
  },
  
  leadScoring: {
    'POST /api/lead-scoring/calculate/:contactId': 'Calculate lead score',
    'GET /api/lead-scoring/:contactId': 'Get lead score',
    'POST /api/lead-scoring/rules': 'Create scoring rule',
    'GET /api/lead-scoring/rules': 'Get all scoring rules',
    'GET /api/lead-scoring/leads/by-score': 'Get leads by score range',
    'POST /api/lead-scoring/recalculate-all': 'Recalculate all scores'
  },
  
  customFields: {
    'GET /api/custom-fields': 'Get all custom fields',
    'GET /api/custom-fields/:id': 'Get custom field',
    'POST /api/custom-fields': 'Create custom field',
    'PATCH /api/custom-fields/:id': 'Update custom field',
    'DELETE /api/custom-fields/:id': 'Delete custom field',
    'POST /api/custom-fields/:fieldId/values/:contactId': 'Set field value',
    'GET /api/custom-fields/values/:contactId': 'Get field values',
    'POST /api/custom-fields/bulk-set': 'Bulk set field values'
  },
  
  segments: {
    'GET /api/segments': 'Get all segments',
    'GET /api/segments/:id': 'Get segment',
    'POST /api/segments': 'Create segment',
    'PATCH /api/segments/:id': 'Update segment',
    'DELETE /api/segments/:id': 'Delete segment',
    'POST /api/segments/evaluate': 'Evaluate segment criteria',
    'POST /api/segments/:id/refresh': 'Refresh segment members',
    'GET /api/segments/:id/members': 'Get segment members'
  }
};

// ============================================
// REQUIRED PERMISSIONS
// ============================================

const requiredPermissions = [
  // Pipelines
  'view:pipelines',
  'create:pipelines',
  'edit:pipelines',
  'delete:pipelines',
  
  // Lead Scoring
  'view:lead-scoring',
  'create:lead-scoring',
  'edit:lead-scoring',
  
  // Custom Fields
  'view:custom-fields',
  'create:custom-fields',
  'edit:custom-fields',
  'delete:custom-fields',
  
  // Segments
  'view:segments',
  'create:segments',
  'edit:segments',
  'delete:segments'
];

// ============================================
// NEXT PHASE 2 STEPS
// ============================================

/*
  1. Frontend Components (React):
     - src/features/crm/components/PipelineBoard.tsx - Kanban board
     - src/features/crm/components/LeadScoringDashboard.tsx
     - src/features/crm/components/CustomFieldsManager.tsx
     - src/features/crm/components/SegmentBuilder.tsx
     
  2. Tests:
     - tests/integration/pipelines.test.ts
     - tests/integration/lead-scoring.test.ts
     - tests/integration/custom-fields.test.ts
     - tests/integration/segments.test.ts
     
  3. WebSocket Events (Socket.IO):
     - Pipeline updates in real-time
     - Lead score changes
     - Segment member updates
     
  4. Workers/Queue Jobs:
     - Async lead scoring recalculation
     - Segment member refresh
     - Bulk operations
*/

export { phase2Endpoints, requiredPermissions };
