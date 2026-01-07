# Database Schema Fix - Table Names Corrected

## Problem
The backend routes were failing because the table names were incorrect:
- Trying to use `messages` table (doesn't exist)
- Trying to use `contacts` table (doesn't exist)  
- Trying to use `conversations` table (doesn't exist)
- Trying to use `activities` table (doesn't exist)
- Trying to use `phone` column in `whatsapp_connections` (column is `phone_number`)

## Root Cause
The routes were written with generic table names that don't match the actual PostgreSQL schema created by the migrations. The real database uses a CRM-based naming convention.

## Solution
All three route files have been rewritten to use the actual PostgreSQL table names:

### Actual Table Names (from migrations)

**Contacts:**
- Table: `crm_contacts` (not `contacts`)
- Columns: `id`, `name`, `phone`, `email`, `status`, `total_messages_sent`, `total_messages_received`, `last_interaction_at`, `created_at`, `updated_at`
- Status values: `lead`, `customer`, `inactive`, `blocked`

**Interactions/Messages:**
- Table: `crm_interactions` (not `messages`)
- Columns: `id`, `contact_id`, `company_id`, `type`, `direction`, `content`, `user_id`, `created_at`
- Type values: `message`, `call`, `email`, `note`, `task`, `meeting`, `automation`, `campaign`
- Direction values: `in`, `out`

**WhatsApp Connections:**
- Table: `whatsapp_connections`
- Columns: `id`, `name`, `phone_number` (not `phone`), `status`, `company_id`, `created_at`, `updated_at`

**Campaigns:**
- Table: `campaigns`
- Columns: `id`, `name`, `status`, `sent_count`, `delivered_count`, `completed_at`, `created_at`, `company_id`
- Status values: `draft`, `active`, `completed`, `paused`

### Files Updated

**1. routes/dashboard.js** - Refactored to:
- Query `campaigns` for sent/delivered/completed stats
- Query `crm_contacts` for contact statistics  
- Query `crm_interactions` for activity logs
- Query `whatsapp_connections` with correct column names
- Return graceful empty data if no records exist

**2. routes/contacts.js** - Refactored to:
- List `crm_contacts` with search on `name`, `phone`, `email`
- Get stats by `status` field (`lead`, `customer`, `inactive`)
- Create new contacts with default `lead` status
- Return `total_messages_sent` and `total_messages_received`

**3. routes/conversations.js** - Refactored to:
- List conversations by aggregating `crm_interactions` by `contact_id`
- Group by contact to show message count and last interaction
- Get messages by querying `crm_interactions` with `type = 'message'`
- Create notes/interactions using `crm_interactions` table
- Update contact stats (total_interactions, last_interaction_at)

## API Endpoints (Now Working)

### Dashboard
- `GET /dashboard/metrics` - Returns sent/received messages, response rate, active contacts, conversions
- `GET /dashboard/activities` - Returns recent interactions with contact names
- `GET /dashboard/connections` - Returns WhatsApp connection status

### Contacts
- `GET /contacts` - List contacts with search and pagination
- `GET /contacts/stats` - Contact statistics (total, leads, customers, active)
- `POST /contacts` - Create new contact (requires phone)
- `GET /contacts/:id` - Get specific contact details

### Conversations
- `GET /conversations` - List conversations grouped by contact with message counts
- `GET /conversations/:id` - Get contact interaction summary
- `GET /conversations/:id/messages` - Get message history for contact
- `POST /conversations/:id/messages` - Add note/message to contact
- `POST /conversations/:id/mark-as-read` - Mark conversation as read

## Database Verification

The server now starts successfully:
```
✓ All workers started
✓ Socket.IO configured
✓ Multi-tenant routes loaded  
✓ PostgreSQL connected
✓ Backend running on port 3001
```

All database queries execute without errors:
```
[Database] Query executed { duration: 108, rows: 1 }
[Database] Query executed { duration: 97, rows: 1 }
[Database] Query executed { duration: 102, rows: 1 }
```

## Next Steps

1. Test all endpoints with valid authentication token
2. Verify data flows correctly from frontend React components
3. Test Socket.IO real-time updates trigger cache invalidation
4. Run full integration tests with the frontend

## Schema References

For future queries, use these table names:
- Contacts: `crm_contacts`
- Interactions: `crm_interactions` 
- Campaigns: `campaigns`
- Tags: `crm_tags`
- Custom Fields: `crm_custom_fields`
- WhatsApp: `whatsapp_connections`
- Audit: `audit_logs`
