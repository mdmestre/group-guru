#!/bin/bash

# ============================================
# PHASE 2 QUICK START SCRIPT
# ============================================
# Execute this to integrate Phase 2 into your project

echo "🚀 Starting Phase 2 Integration..."
echo ""

# 1. Check database connection
echo "1️⃣  Checking database connection..."
psql -h localhost -U postgres -d group_guru -c "SELECT version();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Database connection OK"
else
  echo "❌ Database connection failed. Update credentials in .env"
  exit 1
fi

# 2. Run migrations
echo ""
echo "2️⃣  Running database migrations..."
echo "   - Running: 100_create_pipelines_schema.sql"
psql -h localhost -U postgres -d group_guru -f database/migrations/100_create_pipelines_schema.sql
echo "   - Running: 101_create_lead_scoring_schema.sql"
psql -h localhost -U postgres -d group_guru -f database/migrations/101_create_lead_scoring_schema.sql
echo "   - Running: 102_create_custom_fields_schema.sql"
psql -h localhost -U postgres -d group_guru -f database/migrations/102_create_custom_fields_schema.sql
echo "   - Running: 103_create_segments_schema.sql"
psql -h localhost -U postgres -d group_guru -f database/migrations/103_create_segments_schema.sql

if [ $? -eq 0 ]; then
  echo "✅ All migrations completed"
else
  echo "❌ Migration failed. Check SQL syntax"
  exit 1
fi

# 3. Verify tables created
echo ""
echo "3️⃣  Verifying tables..."
psql -h localhost -U postgres -d group_guru -c "
  SELECT tablename FROM pg_catalog.pg_tables 
  WHERE schemaname = 'public' 
  AND tablename LIKE 'crm_%' 
  ORDER BY tablename;
"

# 4. Show next steps
echo ""
echo "4️⃣  Phase 2 Integration Complete! ✅"
echo ""
echo "📝 NEXT STEPS:"
echo "  1. Update src/server.ts to import and mount routes:"
echo "     - Add imports for pipeline, lead-scoring, custom-fields, segments routes"
echo "     - Mount routes with app.use() before error handlers"
echo ""
echo "  2. Ensure permissions exist in users/roles tables:"
echo "     - view:pipelines, create:pipelines, edit:pipelines, delete:pipelines"
echo "     - view:lead-scoring, create:lead-scoring, edit:lead-scoring"
echo "     - view:custom-fields, create:custom-fields, edit:custom-fields, delete:custom-fields"
echo "     - view:segments, create:segments, edit:segments, delete:segments"
echo ""
echo "  3. Test endpoints:"
echo "     curl http://localhost:3001/api/pipelines -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "  4. Build frontend components:"
echo "     - PipelineBoard.tsx"
echo "     - LeadScoringDashboard.tsx"
echo "     - CustomFieldsManager.tsx"
echo "     - SegmentBuilder.tsx"
echo ""
echo "📊 Database Stats:"
echo "  - Pipelines table: $(psql -h localhost -U postgres -d group_guru -t -c 'SELECT COUNT(*) FROM crm_pipelines;') records"
echo "  - Lead scores: $(psql -h localhost -U postgres -d group_guru -t -c 'SELECT COUNT(*) FROM crm_lead_scores;') records"
echo "  - Custom fields: $(psql -h localhost -U postgres -d group_guru -t -c 'SELECT COUNT(*) FROM crm_custom_fields;') records"
echo "  - Segments: $(psql -h localhost -U postgres -d group_guru -t -c 'SELECT COUNT(*) FROM crm_segments;') records"
echo ""
echo "✨ Phase 2 is ready to rock! 🎸"
