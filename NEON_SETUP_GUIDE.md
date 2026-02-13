# Neon PostgreSQL Setup Guide

This guide will help you set up Neon PostgreSQL for your Expense Tracker app.

## Step 1: Create Neon Account

1. Go to https://neon.tech
2. Click **"Sign Up"** (you can use GitHub, Google, or email)
3. Complete the signup process

## Step 2: Create a New Project

1. After signing in, click **"Create Project"**
2. Fill in the details:
   - **Project Name**: `expense-tracker` (or any name you prefer)
   - **Region**: Choose the closest region to your users (e.g., `US East (Ohio)` for US, `Europe (Frankfurt)` for EU)
   - **PostgreSQL Version**: Use the latest (15 or 16)
3. Click **"Create Project"**

## Step 3: Get Your Connection String

1. Once your project is created, you'll see the **Connection Details** panel
2. You'll see a connection string that looks like:
   ```
   postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. **Copy this connection string** - you'll need it in the next step

   **Note**: The password is shown only once! Save it securely.

## Step 4: Configure Your Backend

1. Navigate to your backend directory:
   ```bash
   cd backend
   ```

2. Create or update your `.env` file:
   ```bash
   # If .env doesn't exist, create it
   # If it exists, open it in your editor
   ```

3. Add or update these lines in your `.env` file:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require
   DB_TYPE=postgres
   
   # Replace the DATABASE_URL above with your actual Neon connection string
   ```

4. **Important**: Replace `postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require` with your actual connection string from Step 3.

## Step 5: Install PostgreSQL Driver (if not already installed)

Your backend should already have the PostgreSQL driver, but verify:

```bash
cd backend
npm list pg
```

If it's not installed:
```bash
npm install pg
```

## Step 6: Test the Connection

1. Start your backend server:
   ```bash
   cd backend
   npm run start:dev
   ```

2. You should see:
   - ✅ Database connection successful
   - ✅ Tables being created automatically (TypeORM synchronize)
   - ✅ Server running on port 3000

3. If you see errors:
   - Check that your `DATABASE_URL` is correct
   - Verify the connection string includes `?sslmode=require`
   - Check that your Neon project is active

## Step 7: Verify Database Tables

1. Go back to your Neon dashboard
2. Click on your project
3. Click **"SQL Editor"** in the left sidebar
4. Run this query to see your tables:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

You should see tables like:
- `users`
- `expenses`
- `categories`
- `subscriptions`
- `payments`
- `budgets`
- `bills`
- `templates`
- `wallets`
- `challenges`
- etc.

## Troubleshooting

### Error: "Connection refused" or "ECONNREFUSED"
- Check that your Neon project is active (not paused)
- Verify the connection string is correct
- Ensure `sslmode=require` is in the connection string

### Error: "password authentication failed"
- The password might have been reset
- Go to Neon dashboard → Project Settings → Reset password
- Update your `.env` file with the new connection string

### Error: "database does not exist"
- Neon creates a default database (usually `neondb`)
- Make sure your connection string uses the correct database name
- The database name is in the connection string path: `/neondb`

### Tables not created
- Check that `synchronize: true` is set in `database.module.ts` (for development)
- Check backend logs for any errors
- Verify your entities are properly imported

## Neon Free Tier Limits

- **Storage**: 0.5 GB (512 MB)
- **Projects**: Unlimited
- **Compute**: 0.5 vCPU
- **Perfect for**: Development and small production apps

## Next Steps

Once connected:
1. ✅ Your app will automatically create all tables
2. ✅ You can start using the app with PostgreSQL
3. ✅ Data will persist in the cloud
4. ✅ You can access your database from anywhere

## Production Considerations

For production:
1. **Upgrade plan** when you exceed free tier (starts at $19/month)
2. **Enable connection pooling** (Neon has built-in pooling)
3. **Set up backups** (Neon has automatic backups)
4. **Use environment-specific databases** (create separate projects for dev/staging/prod)

## Need Help?

- Neon Docs: https://neon.tech/docs
- Neon Discord: https://discord.gg/neondatabase
- Support: support@neon.tech

