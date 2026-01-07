# FASE 2 - VISUAL SUMMARY & ARCHITECTURE

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                │
│                   [Next Week - Week 5]                                  │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY (Express.js)                             │
│  Middleware: Auth → Validation → Authorization → Rate Limit             │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
   ┌─────────┐         ┌─────────┐         ┌──────────┐
   │ 32 API  │         │ JWT &   │         │ Rate     │
   │ENDPOINTS│         │ RBAC    │         │ Limit    │
   └────┬────┘         └────┬────┘         └────┬─────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
  ┌───────────┐      ┌───────────┐      ┌────────────┐
  │ PIPELINES │      │ LEAD      │      │ CUSTOM     │
  │ Services  │      │ SCORING   │      │ FIELDS     │
  │(400+ LOC) │      │ Services  │      │ Services   │
  │           │      │(400+ LOC) │      │(350+ LOC)  │
  └────┬──────┘      └────┬──────┘      └────┬───────┘
       │                   │                   │
       │                   ↓                   │
       │            ┌───────────────┐         │
       │            │  SEGMENTS     │         │
       │            │  Services     │         │
       │            │ (400+ LOC)    │         │
       │            └────┬──────────┘         │
       │                 │                    │
       └────────────────────────────────────┬─┘
                            │
                            ↓
        ┌───────────────────────────────────────────┐
        │    PostgreSQL Database (8 Tables)         │
        │                                           │
        │  ┌─────────────────────────────────────┐  │
        │  │ RLS Policies (Row Level Security)   │  │
        │  │ Multi-tenant Data Isolation         │  │
        │  └─────────────────────────────────────┘  │
        │                                           │
        │  Tables:                                  │
        │  • crm_pipelines                          │
        │  • crm_pipeline_stages                    │
        │  • crm_pipeline_history                   │
        │  • crm_lead_scores                        │
        │  • crm_lead_scoring_rules                 │
        │  • crm_custom_fields                      │
        │  • crm_custom_field_values                │
        │  • crm_segments                           │
        │  • crm_segment_members                    │
        │  • crm_segment_actions                    │
        │                                           │
        └───────────────────────────────────────────┘
```

## 📊 REQUEST FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                                │
│    GET /api/pipelines                                            │
│    Headers: { Authorization: "Bearer TOKEN" }                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 2. MIDDLEWARE STACK                                              │
│    • Parse JSON                                                  │
│    • CORS check                                                  │
│    • Rate limit check                                            │
│    • Helmet security headers                                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 3. AUTHENTICATION                                                │
│    • Extract JWT from header                                     │
│    • Verify signature & expiry                                   │
│    • Extract user ID & company ID                                │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 4. ROUTE HANDLER                                                 │
│    • Validate input with Zod                                     │
│    • Check RBAC permissions                                      │
│    • Call appropriate service method                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 5. SERVICE LAYER                                                 │
│    • Business logic                                              │
│    • Data transformation                                         │
│    • Call database methods                                       │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 6. DATABASE LAYER                                                │
│    • Execute SQL query                                           │
│    • RLS policies automatically applied                          │
│    • Return results                                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 7. RESPONSE FORMATTING                                           │
│    • Log operation (Winston)                                     │
│    • Format response JSON                                        │
│    • Add status code                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│ 8. CLIENT RESPONSE                                               │
│    200 OK                                                        │
│    {                                                             │
│      "success": true,                                            │
│      "data": [...pipelines...],                                  │
│      "timestamp": "2024-01-15T..."                               │
│    }                                                             │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 DATA FLOW - PIPELINE EXAMPLE

```
User creates Pipeline
        ↓
POST /api/pipelines
        ↓
Route validates with Zod schema
        ↓
Check JWT token
        ↓
Check RBAC (can_create:pipeline)
        ↓
Call PipelineService.createPipeline()
        ↓
Insert into crm_pipelines table
        ↓
RLS policy automatically sets company_id
        ↓
Insert default stages
        ↓
Create audit log entry
        ↓
Return created pipeline (200 OK)
        ↓
Log operation to file
```

## 🔄 LEAD SCORING CALCULATION FLOW

```
System triggers scoring update
        ↓
Call LeadScoringService.calculateLeadScore(contactId)
        ↓
Get all active scoring rules
        ↓
For each rule:
  ├─ Type: interaction? → Check recent actions
  ├─ Type: field_value? → Check field values
  ├─ Type: engagement? → Calculate engagement score
  └─ Type: custom? → Execute custom logic
        ↓
Sum all rule points
        ↓
Calculate breakdowns (by rule type)
        ↓
Store in crm_lead_scores
        ↓
Keep history (last 10 scores)
        ↓
Return final score
```

## 🎯 SEGMENTATION EVALUATION FLOW

```
User creates Segment with criteria
        ↓
POST /api/segments
        ↓
SegmentService.createSegment()
        ↓
Parse criteria (AND/OR logic)
        ↓
For each criteria:
  └─ Build SQL WHERE clause
        ↓
Execute combined query
        ↓
Get matching contact IDs
        ↓
Cache in crm_segment_members
        ↓
Store segment definition
        ↓
Return estimated reach
```

## 📦 FILE STRUCTURE

```
group-guru/
├── database/
│   └── migrations/
│       ├── 100_create_pipelines_schema.sql
│       ├── 101_create_lead_scoring_schema.sql
│       ├── 102_create_custom_fields_schema.sql
│       └── 103_create_segments_schema.sql
│
├── src/
│   └── features/
│       ├── pipelines/
│       │   ├── models/
│       │   │   └── types.ts
│       │   ├── services/
│       │   │   └── PipelineService.ts
│       │   └── routes/
│       │       └── index.ts (10 endpoints)
│       │
│       ├── lead-scoring/
│       │   ├── models/
│       │   │   └── types.ts
│       │   ├── services/
│       │   │   └── LeadScoringService.ts
│       │   └── routes/
│       │       └── index.ts (6 endpoints)
│       │
│       └── crm/
│           ├── models/
│           │   ├── custom-fields.ts
│           │   └── segments.ts
│           ├── services/
│           │   ├── CustomFieldService.ts
│           │   └── SegmentService.ts
│           └── routes/
│               ├── custom-fields.ts (8 endpoints)
│               └── segments.ts (8 endpoints)
│
└── [Documentation & Scripts]
    ├── COMECE_AQUI_FASE_2.md
    ├── API_EXAMPLES.md
    ├── PHASE_2_INTEGRATION.md
    ├── PHASE_2_ARCHITECTURE.md
    ├── PHASE_2_TROUBLESHOOTING.md
    ├── phase2-setup.sh
    └── ... more docs
```

## 🔐 SECURITY LAYERS

```
┌────────────────────────────────┐
│  LAYER 1: INPUT VALIDATION     │
│  Zod schemas validate all data │
└────────────────────────────────┘
          ↓
┌────────────────────────────────┐
│  LAYER 2: AUTHENTICATION       │
│  JWT token verified            │
└────────────────────────────────┘
          ↓
┌────────────────────────────────┐
│  LAYER 3: AUTHORIZATION        │
│  RBAC checks permissions       │
└────────────────────────────────┘
          ↓
┌────────────────────────────────┐
│  LAYER 4: DATABASE SECURITY    │
│  RLS policies filter data      │
└────────────────────────────────┘
          ↓
┌────────────────────────────────┐
│  LAYER 5: QUERY SAFETY         │
│  Parameterized queries only    │
└────────────────────────────────┘
```

## 📈 PERFORMANCE CONSIDERATIONS

```
Database:
  ├─ Indexes on frequently queried columns
  ├─ Proper normalization
  ├─ Connection pooling ready
  └─ Query optimization built-in

Caching Ready:
  ├─ Segment members cached
  ├─ Lead scores cached
  └─ Redis integration ready

Batch Operations:
  ├─ Bulk field updates
  ├─ Bulk scoring calculations
  └─ Bulk segment operations
```

## 🚀 DEPLOYMENT READY

```
Code Quality:    ✅ 100% TypeScript
Error Handling:  ✅ Structured
Logging:         ✅ Winston configured
Security:        ✅ Multiple layers
Testing:         ✅ Ready for Week 6
Documentation:   ✅ Complete
```

---

**Architecture: Clean, Scalable, Secure** ✅
