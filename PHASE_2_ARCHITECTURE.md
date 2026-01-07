/**
 * PHASE 2 ARCHITECTURE DIAGRAM
 * Visual representation of Phase 2 structure
 */

// ============================================
// 1. API REQUEST FLOW
// ============================================

/*
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│                                                                   │
│  PipelineBoard.tsx │ ScoreDashboard.tsx │ SegmentBuilder.tsx    │
└────────────────────────────────────────────────────────────────┬┘
                            │
                            │ HTTP/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Middleware Stack                                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 1. CORS & Helmet (Security)                            │   │
│  │ 2. Body Parser                                         │   │
│  │ 3. Request Logging (Winston)                           │   │
│  │ 4. JWT Authentication                                 │   │
│  │ 5. Permission Authorization                           │   │
│  │ 6. Zod Validation                                     │   │
│  │ 7. Error Handler                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│  ┌──────────┬──────────┬───┴────┬──────────┐                  │
│  │          │          │        │          │                  │
│  ▼          ▼          ▼        ▼          ▼                  │
│ /pipelines  /lead-   /custom-  /segments  /other             │
│             scoring   fields                                  │
│                                                                │
└─────────────────────────────────────────────────────────────┬──┘
                            │
           ┌────────────────┼────────────────┬──────────────┐
           │                │                │              │
           ▼                ▼                ▼              ▼
    ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
    │ Pipeline   │  │ Lead Scoring │  │ Custom   │  │Segment   │
    │ Service    │  │ Service      │  │ Field    │  │ Service  │
    │            │  │              │  │ Service  │  │          │
    │ 7 methods  │  │ 8 methods    │  │ 8        │  │ 8        │
    │ 400+ LOC   │  │ 400+ LOC     │  │ methods  │  │ methods  │
    │            │  │              │  │ 350+ LOC │  │ 400+ LOC │
    └────────────┘  └──────────────┘  └──────────┘  └──────────┘
           │                │                │              │
           └────────────────┼────────────────┴──────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CRM_PIPELINES                    RLS POLICY             │   │
│  │ ├─ id, company_id, name, stages, history              │   │
│  │ ├─ created_at, updated_at                             │   │
│  │ └─ Indexes: company_id, created_at                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CRM_LEAD_SCORES                  RLS POLICY             │   │
│  │ ├─ id, contact_id, total_score, engagement_score      │   │
│  │ ├─ score_breakdown, previous_scores                   │   │
│  │ └─ Indexes: company_id, total_score                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CRM_CUSTOM_FIELDS               RLS POLICY             │   │
│  │ ├─ id, company_id, name, field_type, validation       │   │
│  │ ├─ options, default_value                             │   │
│  │ └─ Indexes: company_id, name                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CRM_SEGMENTS                     RLS POLICY             │   │
│  │ ├─ id, company_id, name, criteria, member_count      │   │
│  │ ├─ filter_logic, is_smart                             │   │
│  │ └─ Indexes: company_id, member_count                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  + 4 more related tables (stages, history, field_values, etc)   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ RLS Filter
                            │ (company_id = current_user.company_id)
                            ▼
                     Safe Multi-Tenant Data
*/

// ============================================
// 2. FEATURE ARCHITECTURE
// ============================================

/*
PIPELINES FEATURE
═══════════════════════════════════════════

┌──────────────────────────────────┐
│  Client: PipelineBoard.tsx       │
│  (Kanban drag-drop UI)           │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  API Routes: /api/pipelines                       │
│  ├─ POST   /pipelines              → createPipe  │
│  ├─ GET    /pipelines              → getPipes    │
│  ├─ PATCH  /pipelines/:id          → updatePipe  │
│  ├─ POST   /pipelines/:id/stages   → createStage │
│  └─ POST   /contacts/move          → moveContact │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  PipelineService                                  │
│  ├─ createPipeline(companyId, input)             │
│  ├─ getPipelines(companyId, filters)             │
│  ├─ moveContactToStage(companyId, input)         │
│  ├─ getContactPipelineHistory(contactId)         │
│  └─ getStageStats(stageId)                       │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  Database Queries (Prepared Statements)           │
│  ├─ crm_pipelines                                │
│  ├─ crm_pipeline_stages                          │
│  └─ crm_pipeline_history                         │
└──────────────────────────────────────────────────┘


LEAD SCORING FEATURE
═══════════════════════════════════════════

┌──────────────────────────────────┐
│  Client: ScoreDashboard.tsx      │
│  (Score cards, metrics, rules)   │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  API Routes: /api/lead-scoring                    │
│  ├─ POST   /calculate/:contactId  → calc score   │
│  ├─ GET    /:contactId            → getScore     │
│  ├─ POST   /rules                 → createRule   │
│  └─ GET    /leads/by-score        → getLeads     │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  LeadScoringService                               │
│  ├─ calculateLeadScore(contactId)                │
│  │  ├─ evaluateRule(rule) for each rule          │
│  │  └─ sum points                                │
│  ├─ createScoringRule(rule)                      │
│  ├─ getLeadsByScoreRange(min, max)               │
│  └─ recalculateAllScores(companyId)              │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  Database Queries                                 │
│  ├─ crm_lead_scores                              │
│  ├─ crm_lead_scoring_rules                       │
│  └─ contact_interactions (for evaluation)        │
└──────────────────────────────────────────────────┘


CUSTOM FIELDS FEATURE
═══════════════════════════════════════════

┌──────────────────────────────────┐
│  Client: FieldsManager.tsx       │
│  (Field definitions, values)     │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  API Routes: /api/custom-fields                   │
│  ├─ POST   /                      → createField   │
│  ├─ GET    /                      → getFields     │
│  ├─ POST   /:id/values/:contactId → setValue      │
│  ├─ GET    /values/:contactId     → getValues     │
│  └─ POST   /bulk-set              → bulkSet       │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  CustomFieldService                               │
│  ├─ createField(companyId, input)                │
│  ├─ setFieldValue(contactId, value)              │
│  ├─ validateValue(value, rules)                  │
│  ├─ bulkSetFieldValues(contacts[], value)        │
│  └─ deleteField(fieldId)                         │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  Database Queries                                 │
│  ├─ crm_custom_fields                            │
│  └─ crm_custom_field_values                      │
└──────────────────────────────────────────────────┘


SEGMENTS FEATURE
═══════════════════════════════════════════

┌──────────────────────────────────┐
│  Client: SegmentBuilder.tsx      │
│  (Rule builder, preview, apply)  │
└────────────────┬─────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  API Routes: /api/segments                        │
│  ├─ POST   /                      → createSeg     │
│  ├─ GET    /                      → getSegments   │
│  ├─ POST   /evaluate              → preview       │
│  ├─ POST   /:id/refresh           → refresh       │
│  └─ GET    /:id/members           → getMembers    │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  SegmentService                                   │
│  ├─ createSegment(criteria)                      │
│  ├─ evaluateSegment(criteria)                    │
│  │  ├─ buildQuery from rules                     │
│  │  └─ return matching contacts                  │
│  ├─ refreshSegmentMembers(contacts[])            │
│  └─ getSegmentMembers(segmentId, limit)          │
└────────────────┬──────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────┐
│  Database Queries                                 │
│  ├─ crm_segments                                 │
│  ├─ crm_segment_members (cache)                  │
│  └─ Complex JOIN queries for evaluation          │
└──────────────────────────────────────────────────┘
*/

// ============================================
// 3. SECURITY LAYERS
// ============================================

/*
REQUEST SECURITY FLOW
═════════════════════════════════════════

Request
  ↓
[1] CORS Check
  ├─ Only allowed origins
  └─ If not allowed → 403
  ↓
[2] Helmet Headers
  ├─ X-Content-Type-Options: nosniff
  ├─ X-Frame-Options: DENY
  ├─ Content-Security-Policy
  └─ HSTS enabled
  ↓
[3] Rate Limiting
  ├─ Global: 100 req/15min per IP
  ├─ Auth: 5 req/15min per IP
  └─ API: 500 req/hour per user
  ↓
[4] Body Parser
  ├─ JSON parsing
  └─ Size limits (1MB)
  ↓
[5] Authentication (JWT)
  ├─ Check Authorization header
  ├─ Verify JWT signature
  ├─ Extract user claims
  └─ If invalid → 401
  ↓
[6] Authorization (Permissions)
  ├─ Check endpoint permission
  ├─ Check user has permission
  └─ If not → 403
  ↓
[7] Request Validation (Zod)
  ├─ Parse body schema
  ├─ Type check
  ├─ Transform values
  └─ If invalid → 400 + details
  ↓
[8] Business Logic (Service)
  ├─ Execute with validated data
  ├─ Database operations
  └─ Error handling
  ↓
[9] Database RLS (PostgreSQL)
  ├─ Row Level Security policy
  ├─ WHERE company_id = current_company_id()
  └─ Enforced at DB level
  ↓
[10] Response Logging
  ├─ Log request details
  ├─ Log response status
  └─ Log errors with context
  ↓
Response (JSON)
*/

// ============================================
// 4. DATA FLOW EXAMPLE
// ============================================

/*
CREATE SEGMENT FLOW
═══════════════════════════════════════

1. CLIENT
   POST /api/segments
   {
     "name": "Hot Leads",
     "criteria": {
       "rules": [
         { "field": "score", "operator": "greaterThan", "value": 50 },
         { "field": "tags", "operator": "contains", "value": "hot" }
       ]
     }
   }
   ↓
2. AUTHENTICATION
   Extract JWT token
   Verify signature
   Get userId, companyId
   ↓
3. AUTHORIZATION
   Check: user has "create:segments" permission
   Check: companyId matches user's company
   ↓
4. VALIDATION
   Zod validates:
   - name is string, min 1, max 255
   - criteria.rules is array
   - Each rule has field, operator, value
   ↓
5. SERVICE LOGIC
   SegmentService.createSegment()
   ├─ Insert into crm_segments
   ├─ Call evaluateSegment()
   │  ├─ Build SQL query
   │  ├─ Find matching contacts
   │  └─ Count results
   └─ Cache in crm_segment_members
   ↓
6. DATABASE OPERATIONS
   INSERT INTO crm_segments (
     company_id, name, criteria, filter_logic, created_by
   ) VALUES (...)
   
   SELECT DISTINCT c.id
   FROM crm_contacts c
   LEFT JOIN crm_custom_field_values cfv ON c.id = cfv.contact_id
   WHERE c.company_id = $1
   AND (conditions...)
   
   INSERT INTO crm_segment_members (segment_id, contact_id, company_id)
   SELECT $1, unnest($2::uuid[]), $3
   ↓
7. RLS ENFORCEMENT
   PostgreSQL enforces:
   WHERE company_id = current_setting('app.company_id')
   Prevents cross-company data leakage
   ↓
8. RESPONSE
   {
     "success": true,
     "data": {
       "id": "uuid",
       "name": "Hot Leads",
       "memberCount": 145,
       "isActive": true,
       "createdAt": "2024-01-15T..."
     }
   }
   ↓
9. LOGGING
   Winston logs:
   - Request: POST /api/segments
   - Duration: 245ms
   - Status: 201 Created
   - User: user123
   - Company: company456
*/

// ============================================
// 5. TECHNOLOGY STACK
// ============================================

/*
FRONTEND STACK
──────────────
React 18              - UI Framework
TypeScript 5.x        - Type Safety
React Query 3.x       - Data Fetching
Zustand               - State Management
Tailwind CSS 3.x      - Styling
Shadcn/ui             - Components

BACKEND STACK
─────────────
Node.js 18+           - Runtime
Express 4.x           - Web Framework
TypeScript 5.x        - Type Safety
Zod 3.x               - Validation
PostgreSQL 14+        - Database
Redis 7.x             - Caching (Phase 3)

SECURITY
────────
JWT                   - Authentication
Helmet 7.x            - Headers
express-rate-limit    - Rate Limiting
bcryptjs              - Password Hashing
CORS                  - Cross-Origin

OBSERVABILITY
─────────────
Winston 3.x           - Logging
Sentry 7.x            - Error Tracking
Prometheus 14.x       - Metrics

DevOps
──────
Docker 24.x           - Containerization
GitHub Actions        - CI/CD
*/

// ============================================
// 6. FILE ORGANIZATION
// ============================================

/*
src/
├── features/
│   ├── pipelines/
│   │   ├── models/types.ts
│   │   ├── services/PipelineService.ts
│   │   ├── routes/index.ts
│   │   └── components/              (Phase 2 - Week 5)
│   │
│   ├── lead-scoring/
│   │   ├── models/types.ts
│   │   ├── services/LeadScoringService.ts
│   │   ├── routes/index.ts
│   │   └── components/              (Phase 2 - Week 5)
│   │
│   └── crm/
│       ├── models/
│       │   ├── custom-fields.ts
│       │   └── segments.ts
│       ├── services/
│       │   ├── CustomFieldService.ts
│       │   └── SegmentService.ts
│       ├── routes/
│       │   ├── custom-fields.ts
│       │   └── segments.ts
│       └── components/              (Phase 2 - Week 5)
│
├── middleware/
│   ├── auth.ts
│   ├── security.ts
│   ├── validation.ts
│   └── logging.ts
│
├── utils/
│   ├── logger/
│   │   ├── config.ts
│   │   └── index.ts
│   └── validation/schemas.ts
│
└── server.ts                        (Main entry point)
*/

export {}; // TypeScript
