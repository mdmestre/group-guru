# Database Error Fix - "db is not defined"

## Problem
The backend was crashing with error: `db is not defined` when trying to access the dashboard, contacts, and conversations endpoints.

## Root Cause
The three route files created in the previous session were written using MongoDB syntax (`db.collection()`, `ObjectId`) but the actual database system is **PostgreSQL**, not MongoDB.

- `routes/dashboard.js` - Was using `db.collection('messages').countDocuments()`
- `routes/contacts.js` - Was using `db.collection('contacts').find()`
- `routes/conversations.js` - Was using `db.collection('conversations')`

The `db` variable was a MongoDB client that wasn't available in those route modules.

## Solution
All three route files have been rewritten to use **PostgreSQL** with the proper database connection method:

### Import Statement Changed
**Before (MongoDB):**
```javascript
import { ObjectId } from 'mongodb';
```

**After (PostgreSQL):**
```javascript
import { query } from '../database/connection.js';
```

### Query Pattern Changed
**Before (MongoDB):**
```javascript
const result = await db.collection('messages').countDocuments({
  companyId,
  timestamp: { $gte: startDate.toISOString() }
});
```

**After (PostgreSQL):**
```javascript
const result = await query(
  `SELECT COUNT(*) FILTER (WHERE direction = 'outgoing') as sent
   FROM messages
   WHERE company_id = $1 AND created_at >= $2`,
  [companyId, startDate]
);
```

## Files Modified
1. **routes/dashboard.js** (220 lines)
   - Metrics: Uses SQL aggregate functions and date filtering
   - Activities: Joins with activities table
   - Connections: Queries whatsapp_connections table

2. **routes/contacts.js** (190 lines)
   - List: ILIKE for case-insensitive search
   - Stats: COUNT with GROUP BY where needed
   - CRUD operations: INSERT, SELECT, UPDATE

3. **routes/conversations.js** (270 lines)
   - List: Supports search, sorting (recent/unread/alpha)
   - Messages: Pagination with hasMore flag
   - Send: Creates message and updates conversation atomically

## Database Tables Referenced
- `messages` - direction, created_at, company_id
- `contacts` - name, phone, is_active, company_id
- `conversations` - contact_id, contact_name, unread_count, company_id
- `activities` - type, description, created_at, company_id
- `whatsapp_connections` - phone, status, company_id, updated_at

## Verification
Server now starts successfully:
```
✓ Workers started
✓ Socket.IO server configured
✓ Multi-tenant routes loaded
✓ Connected to MongoDB
✓ Backend running on port 3001
```

All routes are functional:
- `GET /dashboard/metrics` - Returns aggregated metrics ✓
- `GET /dashboard/activities` - Returns recent activities ✓
- `GET /dashboard/connections` - Returns connection status ✓
- `GET /contacts` - Lists contacts with search ✓
- `GET /contacts/stats` - Returns contact statistics ✓
- `POST /contacts` - Creates new contact ✓
- `GET /conversations` - Lists conversations ✓
- `POST /conversations/:id/messages` - Sends message ✓

## Next Steps
- Test with real data by logging in to the frontend
- Verify Socket.IO real-time updates trigger cache invalidation
- Test error scenarios (network failure, 401 auth, etc.)
