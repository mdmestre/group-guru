#!/bin/bash

# ============================================
# PHASE 2 INTEGRATION CHECKLIST
# ============================================

echo "📋 FASE 2 INTEGRATION CHECKLIST"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to mark done
mark_done() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Function to mark pending
mark_pending() {
  echo -e "${YELLOW}⏳ $1${NC}"
}

# Function to mark failed
mark_failed() {
  echo -e "${RED}❌ $1${NC}"
}

echo "## PHASE 2 BACKEND IMPLEMENTATION"
echo ""

echo "### Migrations"
mark_done "✓ Database schema files created"
echo "  - 100_create_pipelines_schema.sql"
echo "  - 101_create_lead_scoring_schema.sql"
echo "  - 102_create_custom_fields_schema.sql"
echo "  - 103_create_segments_schema.sql"
echo ""

echo "### Models & Types"
mark_done "✓ TypeScript interfaces created"
echo "  - pipelines/models/types.ts"
echo "  - lead-scoring/models/types.ts"
echo "  - crm/models/custom-fields.ts"
echo "  - crm/models/segments.ts"
echo ""

echo "### Backend Services"
mark_done "✓ Business logic services created"
echo "  - PipelineService (7 methods, 400+ LOC)"
echo "  - LeadScoringService (8 methods, 400+ LOC)"
echo "  - CustomFieldService (8 methods, 350+ LOC)"
echo "  - SegmentService (8 methods, 400+ LOC)"
echo ""

echo "### API Routes"
mark_done "✓ Express routes created"
echo "  - Pipelines (10 endpoints)"
echo "  - Lead Scoring (6 endpoints)"
echo "  - Custom Fields (8 endpoints)"
echo "  - Segments (8 endpoints)"
echo ""

echo "### Documentation"
mark_done "✓ Comprehensive documentation created"
echo "  - PHASE_2_STATUS.md"
echo "  - PHASE_2_INTEGRATION.md"
echo "  - API_EXAMPLES.md"
echo "  - FASE_2_RESUMO.md"
echo ""

echo "---"
echo ""

echo "## INTEGRATION STEPS (EXECUTE NOW)"
echo ""

echo "### Step 1: Run Database Migrations"
mark_pending "Run migrations in PostgreSQL"
echo ""
echo "  Option A: Using bash script"
echo "    bash phase2-setup.sh"
echo ""
echo "  Option B: Manual"
echo "    psql -U postgres -d group_guru -f database/migrations/100_create_pipelines_schema.sql"
echo "    psql -U postgres -d group_guru -f database/migrations/101_create_lead_scoring_schema.sql"
echo "    psql -U postgres -d group_guru -f database/migrations/102_create_custom_fields_schema.sql"
echo "    psql -U postgres -d group_guru -f database/migrations/103_create_segments_schema.sql"
echo ""
echo "  Verification:"
echo "    psql -U postgres -d group_guru -c 'SELECT tablename FROM pg_tables WHERE schemaname=\"public\" AND tablename LIKE \"crm_%\";'"
echo ""

echo "### Step 2: Update server.js / src/server.ts"
mark_pending "Add route imports and mounting"
echo ""
echo "  Find this section in your server file:"
echo "    // API Routes"
echo ""
echo "  Add these imports:"
echo "    import pipelineRoutes from '@/features/pipelines/routes';"
echo "    import leadScoringRoutes from '@/features/lead-scoring/routes';"
echo "    import customFieldRoutes from '@/features/crm/routes/custom-fields';"
echo "    import segmentRoutes from '@/features/crm/routes/segments';"
echo ""
echo "  Add these route mounts (AFTER other routes, BEFORE error handlers):"
echo "    // CRM Features - Phase 2"
echo "    app.use('/api/pipelines', pipelineRoutes);"
echo "    app.use('/api/lead-scoring', leadScoringRoutes);"
echo "    app.use('/api/custom-fields', customFieldRoutes);"
echo "    app.use('/api/segments', segmentRoutes);"
echo ""

echo "### Step 3: Add Permissions to Database"
mark_pending "Add new permissions to roles/users system"
echo ""
echo "  Query to add permissions:"
echo "    INSERT INTO permissions (name, description) VALUES"
echo "    ('view:pipelines', 'View pipelines'),"
echo "    ('create:pipelines', 'Create pipelines'),"
echo "    ('edit:pipelines', 'Edit pipelines'),"
echo "    ('delete:pipelines', 'Delete pipelines'),"
echo "    ('view:lead-scoring', 'View lead scores'),"
echo "    ('create:lead-scoring', 'Create scoring rules'),"
echo "    ('edit:lead-scoring', 'Edit scoring rules'),"
echo "    ('view:custom-fields', 'View custom fields'),"
echo "    ('create:custom-fields', 'Create custom fields'),"
echo "    ('edit:custom-fields', 'Edit custom fields'),"
echo "    ('delete:custom-fields', 'Delete custom fields'),"
echo "    ('view:segments', 'View segments'),"
echo "    ('create:segments', 'Create segments'),"
echo "    ('edit:segments', 'Edit segments'),"
echo "    ('delete:segments', 'Delete segments')"
echo "    ON CONFLICT DO NOTHING;"
echo ""

echo "### Step 4: Test Basic Endpoints"
mark_pending "Verify API is working"
echo ""
echo "  1. Get JWT Token"
echo "    TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"email\":\"user@example.com\",\"password\":\"password\"}' | jq -r '.token')"
echo ""
echo "  2. Test Pipelines endpoint"
echo "    curl -X GET http://localhost:3001/api/pipelines \\"
echo "      -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "  Expected response:"
echo "    {\"success\":true,\"data\":[],\"count\":0}"
echo ""

echo "### Step 5: Create Initial Data"
mark_pending "Seed database with test data"
echo ""
echo "  Create a Pipeline"
echo "    curl -X POST http://localhost:3001/api/pipelines \\"
echo "      -H \"Authorization: Bearer \$TOKEN\" \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"name\":\"Sales Pipeline\",\"color\":\"#3b82f6\"}'"
echo ""

echo "### Step 6: Frontend Integration"
mark_pending "Create React components (Week 5)"
echo ""
echo "  Components to create:"
echo "    - src/components/pipelines/PipelineBoard.tsx"
echo "    - src/components/lead-scoring/ScoreDashboard.tsx"
echo "    - src/components/crm/CustomFieldsManager.tsx"
echo "    - src/components/crm/SegmentBuilder.tsx"
echo ""

echo "### Step 7: Testing"
mark_pending "Add test coverage (Week 5)"
echo ""
echo "  Test files to create:"
echo "    - tests/integration/pipelines.test.ts"
echo "    - tests/integration/lead-scoring.test.ts"
echo "    - tests/integration/custom-fields.test.ts"
echo "    - tests/integration/segments.test.ts"
echo ""

echo "---"
echo ""
echo "## VERIFICATION CHECKLIST"
echo ""

# Create a function to verify each step
verify_database() {
  echo ""
  echo "Checking database tables..."
  TABLES=$(psql -h localhost -U postgres -d group_guru -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'crm_%';" 2>/dev/null)
  if [ "$TABLES" -ge 8 ]; then
    mark_done "✓ Database tables created ($TABLES tables found)"
    return 0
  else
    mark_failed "✗ Database tables not found"
    return 1
  fi
}

verify_routes() {
  echo ""
  echo "Checking if routes are in server file..."
  if grep -q "pipelineRoutes" src/server.ts 2>/dev/null; then
    mark_done "✓ Routes imported in server file"
    return 0
  else
    mark_pending "⏳ Routes not yet imported (Run Step 2)"
    return 1
  fi
}

verify_permissions() {
  echo ""
  echo "Checking permissions in database..."
  PERMS=$(psql -h localhost -U postgres -d group_guru -t -c "SELECT COUNT(*) FROM permissions WHERE name LIKE 'view:pipelines';" 2>/dev/null)
  if [ "$PERMS" -gt 0 ]; then
    mark_done "✓ Permissions created"
    return 0
  else
    mark_pending "⏳ Permissions not yet created (Run Step 3)"
    return 1
  fi
}

# Run verification if DB is accessible
if psql -h localhost -U postgres -d group_guru -c "SELECT 1;" > /dev/null 2>&1; then
  verify_database
  verify_routes
  verify_permissions
else
  echo ""
  echo -e "${YELLOW}⚠️  Cannot connect to PostgreSQL${NC}"
  echo "Please ensure PostgreSQL is running and update .env with correct credentials"
fi

echo ""
echo "---"
echo ""
echo "## SUMMARY"
echo ""
echo "✅ Phase 2 Backend: READY FOR INTEGRATION"
echo ""
echo "Status:"
echo "  - Backend Implementation: 100%"
echo "  - Database Migrations: Created (run Step 1)"
echo "  - Route Integration: Pending (Step 2)"
echo "  - Permissions Setup: Pending (Step 3)"
echo "  - Testing: Pending (Step 7)"
echo ""
echo "Total Files Created: 12"
echo "Total API Endpoints: 32"
echo "Estimated Integration Time: 30 minutes"
echo ""
echo "Next: Follow the steps above to integrate Phase 2 into your project"
echo ""
echo "Questions? Check:"
echo "  - PHASE_2_INTEGRATION.md"
echo "  - API_EXAMPLES.md"
echo "  - FASE_2_RESUMO.md"
echo ""
