# PostgreSQL Migration Guide

## Current Status
- ✅ Code supports PostgreSQL (already implemented)
- ✅ Database module configured for Neon/PostgreSQL
- ⚠️ Currently using SQLite (temporary)

## Migration Steps

### 1. Set Up Neon Database
Follow the `NEON_SETUP_GUIDE.md` to create your Neon account and get the connection string.

### 2. Update Environment Variables
Add to `backend/.env`:
```env
DATABASE_URL=your-neon-connection-string
DB_TYPE=postgres
```

### 3. Data Migration (if you have existing SQLite data)

If you have data in SQLite that you want to migrate:

#### Option A: Start Fresh (Recommended for Development)
- Just switch to PostgreSQL
- Tables will be created automatically
- You'll start with empty database

#### Option B: Migrate Existing Data
1. Export SQLite data:
   ```bash
   sqlite3 backend/data/expense_tracker.db .dump > backup.sql
   ```

2. Convert SQL to PostgreSQL format (manual editing may be needed):
   - Remove SQLite-specific syntax
   - Convert data types if needed
   - Update AUTOINCREMENT to SERIAL

3. Import to PostgreSQL:
   ```bash
   psql $DATABASE_URL < converted_backup.sql
   ```

### 4. Verify Connection
Start your backend:
```bash
cd backend
npm run start:dev
```

You should see:
- ✅ Database connection successful
- ✅ Tables created automatically

### 5. Test Your App
- Register a new user
- Add an expense
- Verify data persists

## What Changes?

### Code Changes
- ✅ **None required** - Code already supports PostgreSQL
- ✅ TypeORM handles differences automatically
- ✅ All entities work with both SQLite and PostgreSQL

### Configuration Changes
- ✅ Just update `.env` file
- ✅ Restart backend server

### Data Structure
- ✅ Same tables, same structure
- ✅ Better performance with PostgreSQL
- ✅ Better concurrency support

## Benefits of PostgreSQL

1. **Production Ready**: SQLite is not recommended for production
2. **Better Performance**: Handles concurrent connections better
3. **Scalability**: Can handle more data and users
4. **Features**: Full SQL features, better indexing
5. **Cloud Hosted**: Neon provides managed PostgreSQL

## Rollback Plan

If you need to rollback to SQLite:
1. Update `.env`:
   ```env
   DB_TYPE=sqlite
   ```
2. Remove `DATABASE_URL` or comment it out
3. Restart backend

Your SQLite database will still be in `backend/data/expense_tracker.db`

