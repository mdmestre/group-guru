# Database Setup Guide

## PostgreSQL Setup

This project uses PostgreSQL for multi-tenant core data (companies, users, plans, subscriptions) and MongoDB for operational data (messages, contacts, automations).

### 1. Install PostgreSQL

If you haven't installed PostgreSQL, download it from [postgresql.org](https://www.postgresql.org/download/).

### 2. Create Database

```sql
CREATE DATABASE whatsapp_saas;
```

### 3. Set Environment Variable

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_saas
# Or use POSTGRES_URL
POSTGRES_URL=postgresql://username:password@localhost:5432/whatsapp_saas
```

### 4. Run Migrations

```bash
npm run migrate
```

This will create all necessary tables:
- `companies` - Workspaces/tenants
- `users` - System users
- `user_companies` - User-company relationships (many-to-many)
- `plans` - Subscription plans
- `subscriptions` - Company plan subscriptions
- `daily_usage` - Usage tracking for plan limits
- `schema_migrations` - Migration tracking

### 5. Verify Setup

Connect to your database and check tables:

```sql
\dt
```

You should see all the tables listed above.

## Default Plans

After running migrations, three default plans are created:

1. **Free** - 1 instance, 1 user, 100 dispatches/day, 500 contacts, 3 automations
2. **Pro** - 3 instances, 5 users, 1,000 dispatches/day, 5,000 contacts, 20 automations
3. **Enterprise** - 10 instances, unlimited users, 10,000 dispatches/day, unlimited contacts, unlimited automations

## Data Isolation

⚠️ **IMPORTANT**: All queries to MongoDB collections (messages, contacts, automations, processed_numbers) MUST include `companyId` to ensure proper tenant isolation.

The middleware ensures `companyId` is always available from the JWT token in authenticated routes.

