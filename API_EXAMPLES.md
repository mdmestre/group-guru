/**
 * PHASE 2 API USAGE EXAMPLES
 * Real examples of how to use each endpoint
 */

// ============================================
// PIPELINES API
// ============================================

// 1. CREATE PIPELINE
// POST /api/pipelines
const createPipelineExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/pipelines',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'Sales Pipeline 2024',
    description: 'Main sales pipeline for enterprise deals',
    color: '#3b82f6',
    icon: 'chart-line'
  },
  response: {
    success: true,
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sales Pipeline 2024',
      description: 'Main sales pipeline for enterprise deals',
      color: '#3b82f6',
      icon: 'chart-line',
      isActive: true,
      stageOrder: [],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      createdBy: 'user123'
    }
  }
};

// 2. CREATE PIPELINE STAGES
// POST /api/pipelines/{id}/stages
const createStageExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/pipelines/550e8400-e29b-41d4-a716-446655440000/stages',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'Lead',
    position: 0,
    color: '#ec4899',
    description: 'New leads',
    conversionProbability: 10,
    isDefault: true
  },
  response: {
    success: true,
    data: {
      id: '660e8400-e29b-41d4-a716-446655440001',
      pipelineId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Lead',
      position: 0,
      color: '#ec4899',
      description: 'New leads',
      conversionProbability: 10,
      isDefault: true,
      createdAt: '2024-01-15T10:35:00Z',
      updatedAt: '2024-01-15T10:35:00Z'
    }
  }
};

// 3. MOVE CONTACT TO PIPELINE STAGE
// POST /api/pipelines/contacts/move
const moveContactExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/pipelines/contacts/move',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    contactId: '770e8400-e29b-41d4-a716-446655440002',
    toStageId: '660e8400-e29b-41d4-a716-446655440001',
    notes: 'Qualified lead from referral'
  },
  response: {
    success: true,
    data: {
      id: '880e8400-e29b-41d4-a716-446655440003',
      contactId: '770e8400-e29b-41d4-a716-446655440002',
      pipelineId: '550e8400-e29b-41d4-a716-446655440000',
      fromStageId: null,
      toStageId: '660e8400-e29b-41d4-a716-446655440001',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      movedBy: 'user123',
      notes: 'Qualified lead from referral',
      createdAt: '2024-01-15T10:40:00Z'
    }
  }
};

// ============================================
// LEAD SCORING API
// ============================================

// 1. CREATE SCORING RULE
// POST /api/lead-scoring/rules
const createRuleExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/lead-scoring/rules',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'Email Open Score',
    ruleType: 'interaction',
    condition: {
      eventType: 'email_opened'
    },
    points: 5
  },
  response: {
    success: true,
    data: {
      id: '990e8400-e29b-41d4-a716-446655440004',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Email Open Score',
      ruleType: 'interaction',
      condition: { eventType: 'email_opened' },
      points: 5,
      isActive: true,
      createdAt: '2024-01-15T10:45:00Z',
      updatedAt: '2024-01-15T10:45:00Z'
    }
  }
};

// 2. CALCULATE LEAD SCORE
// POST /api/lead-scoring/calculate/{contactId}
const calculateScoreExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/lead-scoring/calculate/770e8400-e29b-41d4-a716-446655440002',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  response: {
    success: true,
    data: {
      score: {
        id: 'aaa0e8400-e29b-41d4-a716-446655440005',
        contactId: '770e8400-e29b-41d4-a716-446655440002',
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        totalScore: 45,
        engagementScore: 25,
        interactionCount: 8,
        lastInteractionAt: '2024-01-15T09:00:00Z',
        scoreBreakdown: {
          'Email Open Score': 5,
          'Email Click Score': 10,
          'Page View Score': 30
        },
        previousScores: [],
        updatedAt: '2024-01-15T10:50:00Z',
        createdAt: '2024-01-15T10:50:00Z'
      },
      calculation: {
        totalScore: 45,
        engagement: 25,
        breakdown: {
          'Email Open Score': { points: 5, reason: 'Matched: Email Open Score' },
          'Email Click Score': { points: 10, reason: 'Matched: Email Click Score' },
          'Page View Score': { points: 30, reason: 'Matched: Page View Score' }
        },
        highestScoringAreas: ['Page View Score', 'Email Click Score', 'Email Open Score']
      }
    }
  }
};

// 3. GET LEADS BY SCORE RANGE
// GET /api/lead-scoring/leads/by-score?minScore=40&maxScore=100&limit=50
const getLeadsByScoreExample = {
  method: 'GET',
  url: 'http://localhost:3001/api/lead-scoring/leads/by-score?minScore=40&maxScore=100&limit=50',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  response: {
    success: true,
    data: [
      {
        id: 'aaa0e8400-e29b-41d4-a716-446655440005',
        contactId: '770e8400-e29b-41d4-a716-446655440002',
        totalScore: 85,
        engagementScore: 45
      },
      {
        id: 'bbb0e8400-e29b-41d4-a716-446655440006',
        contactId: '880e8400-e29b-41d4-a716-446655440003',
        totalScore: 72,
        engagementScore: 38
      }
    ],
    count: 2
  }
};

// ============================================
// CUSTOM FIELDS API
// ============================================

// 1. CREATE CUSTOM FIELD
// POST /api/custom-fields
const createFieldExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/custom-fields',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'annual_revenue',
    label: 'Annual Revenue',
    fieldType: 'currency',
    entityType: 'contact',
    description: 'Company annual revenue',
    isRequired: false,
    validationRules: [
      {
        type: 'minLength',
        value: 0,
        message: 'Must be greater than 0'
      }
    ]
  },
  response: {
    success: true,
    data: {
      id: 'ccc0e8400-e29b-41d4-a716-446655440007',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'annual_revenue',
      label: 'Annual Revenue',
      fieldType: 'currency',
      entityType: 'contact',
      description: 'Company annual revenue',
      isRequired: false,
      isUnique: false,
      isActive: true,
      position: 1,
      createdAt: '2024-01-15T11:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z',
      createdBy: 'user123'
    }
  }
};

// 2. SET FIELD VALUE FOR CONTACT
// POST /api/custom-fields/{fieldId}/values/{contactId}
const setFieldValueExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/custom-fields/ccc0e8400-e29b-41d4-a716-446655440007/values/770e8400-e29b-41d4-a716-446655440002',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    value: '5000000'
  },
  response: {
    success: true,
    data: {
      id: 'ddd0e8400-e29b-41d4-a716-446655440008',
      contactId: '770e8400-e29b-41d4-a716-446655440002',
      customFieldId: 'ccc0e8400-e29b-41d4-a716-446655440007',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      value: '5000000',
      createdAt: '2024-01-15T11:05:00Z',
      updatedAt: '2024-01-15T11:05:00Z'
    }
  }
};

// 3. BULK SET FIELD VALUES
// POST /api/custom-fields/bulk-set
const bulkSetFieldExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/custom-fields/bulk-set',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    contactIds: [
      '770e8400-e29b-41d4-a716-446655440002',
      '880e8400-e29b-41d4-a716-446655440003'
    ],
    customFieldId: 'ccc0e8400-e29b-41d4-a716-446655440007',
    value: 'VIP'
  },
  response: {
    success: true,
    data: {
      updated: 2
    }
  }
};

// ============================================
// SEGMENTS API
// ============================================

// 1. CREATE SEGMENT
// POST /api/segments
const createSegmentExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/segments',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'Hot Enterprise Leads',
    description: 'Enterprise contacts with high engagement',
    criteria: {
      rules: [
        {
          field: 'annual_revenue', // Custom field ID or standard field
          operator: 'greaterThan',
          value: 1000000
        },
        {
          field: 'tags',
          operator: 'contains',
          value: 'enterprise'
        }
      ]
    },
    filterLogic: 'AND'
  },
  response: {
    success: true,
    data: {
      id: 'eee0e8400-e29b-41d4-a716-446655440009',
      companyId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Hot Enterprise Leads',
      description: 'Enterprise contacts with high engagement',
      criteria: {
        rules: [
          {
            field: 'annual_revenue',
            operator: 'greaterThan',
            value: 1000000
          },
          {
            field: 'tags',
            operator: 'contains',
            value: 'enterprise'
          }
        ]
      },
      filterLogic: 'AND',
      memberCount: 145,
      isActive: true,
      isSmart: true,
      createdAt: '2024-01-15T11:10:00Z',
      updatedAt: '2024-01-15T11:10:00Z',
      lastRefreshedAt: '2024-01-15T11:10:00Z',
      createdBy: 'user123'
    }
  }
};

// 2. EVALUATE SEGMENT (PREVIEW)
// POST /api/segments/evaluate
const evaluateSegmentExample = {
  method: 'POST',
  url: 'http://localhost:3001/api/segments/evaluate',
  headers: {
    'Authorization': 'Bearer your_jwt_token',
    'Content-Type': 'application/json'
  },
  body: {
    criteria: {
      rules: [
        {
          field: 'annual_revenue',
          operator: 'greaterThan',
          value: 1000000
        }
      ]
    },
    filterLogic: 'AND'
  },
  response: {
    success: true,
    data: {
      contactIds: ['770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003'],
      count: 2,
      estimatedReach: '12.5%'
    }
  }
};

// 3. GET SEGMENT MEMBERS
// GET /api/segments/{id}/members?limit=50&offset=0
const getSegmentMembersExample = {
  method: 'GET',
  url: 'http://localhost:3001/api/segments/eee0e8400-e29b-41d4-a716-446655440009/members?limit=50&offset=0',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  response: {
    success: true,
    data: [
      {
        id: 'fff0e8400-e29b-41d4-a716-446655440010',
        segmentId: 'eee0e8400-e29b-41d4-a716-446655440009',
        contactId: '770e8400-e29b-41d4-a716-446655440002',
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        addedAt: '2024-01-15T11:10:00Z'
      }
    ],
    pagination: {
      limit: 50,
      offset: 0,
      total: 145
    }
  }
};

// ============================================
// ERROR RESPONSES
// ============================================

const errorResponseExample = {
  success: false,
  error: 'Failed to create pipeline',
  statusCode: 500
};

const validationErrorExample = {
  success: false,
  error: 'Validation error',
  details: [
    {
      field: 'name',
      message: 'Required field'
    },
    {
      field: 'fieldType',
      message: 'Invalid enum value'
    }
  ],
  statusCode: 400
};

export {
  createPipelineExample,
  createStageExample,
  moveContactExample,
  createRuleExample,
  calculateScoreExample,
  getLeadsByScoreExample,
  createFieldExample,
  setFieldValueExample,
  bulkSetFieldExample,
  createSegmentExample,
  evaluateSegmentExample,
  getSegmentMembersExample,
  errorResponseExample,
  validationErrorExample
};
