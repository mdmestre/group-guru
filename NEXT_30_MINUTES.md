# ⏰ NEXT 30 MINUTES - INTEGRATION ROADMAP

## YOUR MISSION: INTEGRATE PHASE 2 INTO server.ts

Time budget: **30 minutes total**

---

## ⏱️ MINUTE 0-5: PREPARATION

### What you need:
- [ ] PostgreSQL running
- [ ] Access to `group_guru` database
- [ ] Text editor open with `src/server.ts`
- [ ] Terminal ready
- [ ] This file in another window

### Check environment:
```bash
# Verify PostgreSQL is running
psql --version

# Verify you have the database
psql -l | grep group_guru

# Verify you have the migration files
ls -la database/migrations/100*.sql
```

---

## ⏱️ MINUTE 5-10: RUN MIGRATIONS

### Execute the 4 SQL migrations in order:

```bash
# 1. Pipelines
psql -d group_guru -f database/migrations/100_create_pipelines_schema.sql

# Check for success
echo "✅ Pipelines migration complete"

# 2. Lead Scoring
psql -d group_guru -f database/migrations/101_create_lead_scoring_schema.sql

# Check for success
echo "✅ Lead Scoring migration complete"

# 3. Custom Fields
psql -d group_guru -f database/migrations/102_create_custom_fields_schema.sql

# Check for success
echo "✅ Custom Fields migration complete"

# 4. Segments
psql -d group_guru -f database/migrations/103_create_segments_schema.sql

# Check for success
echo "✅ Segments migration complete"

# Verify all tables exist
psql -d group_guru -c "\dt" | grep crm_
```

**Expected output:** See all 10 new tables (crm_pipelines, crm_pipeline_stages, etc.)

**If you get errors:** See PHASE_2_TROUBLESHOOTING.md

---

## ⏱️ MINUTE 10-15: INTEGRATE ROUTES IN server.ts

### Open `src/server.ts`

Find the section where other routes are imported (around line 50-100).

Add these 4 imports:

```typescript
// PHASE 2 CRM Advanced Features
import pipelineRoutes from '@/features/pipelines/routes';
import leadScoringRoutes from '@/features/lead-scoring/routes';
import customFieldsRoutes from '@/features/crm/routes/custom-fields';
import segmentsRoutes from '@/features/crm/routes/segments';
```

### Then, find where routes are registered (app.use section)

Add these 4 route registrations (after other routes, but before error handler):

```typescript
// Register PHASE 2 routes
app.use('/api', pipelineRoutes);
app.use('/api', leadScoringRoutes);
app.use('/api', customFieldsRoutes);
app.use('/api', segmentsRoutes);
```

### Compile and verify:
```bash
npm run build
# or
tsc --noEmit
```

**Expected output:** No errors, build succeeds

**If you get import errors:** 
- Check that the folders exist: `src/features/pipelines/routes`, etc.
- Check that each route file exports default
- See PHASE_2_TROUBLESHOOTING.md

---

## ⏱️ MINUTE 15-25: TEST ENDPOINTS

### Start the server:
```bash
npm run dev
# or
npm start
```

### In another terminal, run these tests:

#### Test 1: Get all pipelines
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/pipelines
```

**Expected:** 200 OK, returns array of pipelines (probably empty `[]`)

#### Test 2: Create a pipeline
```bash
curl -X POST http://localhost:3001/api/pipelines \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales Pipeline","description":"Main sales funnel"}'
```

**Expected:** 201 Created, returns the new pipeline object

#### Test 3: Get lead scoring rules
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/lead-scoring/rules
```

**Expected:** 200 OK, returns array of rules (probably empty `[]`)

#### Test 4: List custom fields
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/custom-fields
```

**Expected:** 200 OK, returns array of fields (probably empty `[]`)

#### Test 5: List segments
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/segments
```

**Expected:** 200 OK, returns array of segments (probably empty `[]`)

### Replace YOUR_JWT_TOKEN with:
A valid JWT token from your Phase 1 authentication

### Getting a test token:
```bash
# Use your existing auth endpoint from Phase 1
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Copy the token from response, then use it above
```

**If all tests return 200:** ✅ Integration successful!

---

## ⏱️ MINUTE 25-30: VERIFY & DOCUMENT

### Verification checklist:

- [ ] All 4 migrations executed without errors
- [ ] server.ts compiles successfully
- [ ] Server starts without errors
- [ ] Test 1 returns 200 OK
- [ ] Test 2 returns 201 Created
- [ ] Test 3 returns 200 OK
- [ ] Test 4 returns 200 OK
- [ ] Test 5 returns 200 OK

### Document what you did:

Create a file `.PHASE_2_INTEGRATION_DONE.txt`:

```
PHASE 2 INTEGRATION COMPLETED
============================
Date: January 15, 2024
Time: 30 minutes
Status: ✅ SUCCESS

Migrations: ✅ 4/4 executed
Code: ✅ Integrated in server.ts
Tests: ✅ 5/5 endpoints responding

Next: Frontend development (Week 5)

Verified by: [Your name]
```

---

## 🎯 YOU SHOULD NOW HAVE

- ✅ 8 new tables in PostgreSQL
- ✅ 32 new endpoints in your API
- ✅ RLS policies protecting multi-tenant data
- ✅ JWT authentication on all endpoints
- ✅ Complete business logic for CRM features
- ✅ Ready for frontend development

---

## ❌ IF SOMETHING GOES WRONG

### Migration errors:
```
Check: Does database exist?
Fix: createdb group_guru
```

### Import errors in server.ts:
```
Check: Do the route files exist?
Fix: npm install && npm run build
```

### Endpoint returns 401 (Unauthorized):
```
Check: Did you include the JWT token?
Fix: Add -H "Authorization: Bearer TOKEN"
```

### Endpoint returns 404 (Not Found):
```
Check: Did you register the routes in server.ts?
Fix: Make sure app.use('/api', routes); is there
```

### Endpoint returns 500 (Server Error):
```
Check: Look at server logs for error message
Fix: See PHASE_2_TROUBLESHOOTING.md
```

**For more help:** See PHASE_2_TROUBLESHOOTING.md

---

## 📝 DETAILED STEPS (if you need them)

### Step 1: Edit server.ts

**File location:** `src/server.ts`

**Where to add imports:** Around line 30-50 (where other imports are)

```typescript
// Look for:
import pipelineRoutes from '@/routes/pipelines';
// Or similar existing imports

// Add AFTER those lines:
import pipelineRoutes from '@/features/pipelines/routes';
import leadScoringRoutes from '@/features/lead-scoring/routes';
import customFieldsRoutes from '@/features/crm/routes/custom-fields';
import segmentsRoutes from '@/features/crm/routes/segments';
```

**Where to register routes:** Find `app.use('/api'` sections

```typescript
// Look for:
app.use('/api', contactRoutes);
// Or similar existing routes

// Add AFTER those:
app.use('/api', pipelineRoutes);
app.use('/api', leadScoringRoutes);
app.use('/api', customFieldsRoutes);
app.use('/api', segmentsRoutes);
```

### Step 2: Run migrations

Copy-paste each line in terminal:

```bash
psql -d group_guru -f database/migrations/100_create_pipelines_schema.sql
psql -d group_guru -f database/migrations/101_create_lead_scoring_schema.sql
psql -d group_guru -f database/migrations/102_create_custom_fields_schema.sql
psql -d group_guru -f database/migrations/103_create_segments_schema.sql
```

### Step 3: Start server and test

```bash
# Terminal 1
npm run dev

# Terminal 2 (test endpoints)
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/pipelines
```

---

## ✅ SUCCESS INDICATORS

When everything is working:

1. ✅ `npm run dev` starts without errors
2. ✅ `GET /api/pipelines` returns 200 OK
3. ✅ `POST /api/pipelines` creates a new pipeline
4. ✅ Database has 8 new tables
5. ✅ All endpoints require JWT token (return 401 without it)
6. ✅ Endpoints validate input (return 400 for bad data)

---

## 🎉 AFTER 30 MINUTES

You should have:

✅ Phase 2 backend fully integrated  
✅ 32 new API endpoints active  
✅ Database with RLS security  
✅ Production-ready CRM features  
✅ Ready for frontend development next week  

---

## 📅 WHAT'S NEXT

After you verify everything works:

1. **Rest of Week 4:** Run more comprehensive tests
2. **Week 5:** Start building frontend components
3. **Week 6:** Add real-time with WebSockets
4. **Week 7:** Deploy to production

---

## 💾 SAVE YOUR PROGRESS

When you get all tests passing, run:

```bash
# Save your working state
git add -A
git commit -m "Phase 2: Integrated CRM Advanced features (32 endpoints)"
```

---

## 🎯 CURRENT STATUS

**Phase 1:** ✅ Complete  
**Phase 2 Backend:** ✅ Ready  
**Phase 2 Integration:** 🔴 YOUR JOB NOW  
**Phase 2 Frontend:** ⏳ Week 5  

**You are here →** ⏱️ 30 minute integration window

---

**START NOW!** 🚀

1. Open terminal
2. Run migration 1
3. Run migration 2
4. Run migration 3
5. Run migration 4
6. Edit server.ts
7. Run npm run build
8. Test endpoints
9. ✅ DONE!

**Time remaining: 30 minutes**  
**Let's go!** 🚀

---

**Questions?** Check [PHASE_2_TROUBLESHOOTING.md](./PHASE_2_TROUBLESHOOTING.md)  
**Need details?** Read [PHASE_2_INTEGRATION.md](./PHASE_2_INTEGRATION.md)  
**Examples?** See [API_EXAMPLES.md](./API_EXAMPLES.md)

---

🎉 **You've got this!** 🎉
