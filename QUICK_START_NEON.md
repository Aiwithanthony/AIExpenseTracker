# Quick Start: Neon PostgreSQL Setup (5 Minutes)

## 🚀 Step-by-Step Instructions

### Step 1: Create Neon Account (2 minutes)
1. Go to **https://neon.tech**
2. Click **"Sign Up"** (use GitHub/Google for faster signup)
3. Verify your email if needed

### Step 2: Create Project (1 minute)
1. Click **"Create Project"**
2. Name: `expense-tracker`
3. Region: Choose closest to you
4. Click **"Create Project"**

### Step 3: Get Connection String (30 seconds)
1. After project creation, you'll see **"Connection Details"**
2. Look for the connection string that starts with `postgresql://`
3. **Click "Copy"** - this is your connection string
   - ⚠️ **Save the password!** It's shown only once

### Step 4: Configure Backend (1 minute)
1. Go to your project root: `C:\Users\USER\Documents\ANTHONY\ExpenseTracker-App\backend`
2. Create or edit `.env` file
3. Add these lines:

```env
DATABASE_URL=postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require
DB_TYPE=postgres
```

**Replace** `postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require` with your actual connection string from Step 3.

### Step 5: Test Connection (30 seconds)
1. Open terminal in `backend` folder
2. Run:
   ```bash
   npm run start:dev
   ```
3. You should see:
   - ✅ "Database connection successful"
   - ✅ Server running on port 3000

## ✅ Done!

Your app is now using Neon PostgreSQL. All tables will be created automatically.

## 🔍 Verify It Works

1. Go to Neon dashboard → Your project → **SQL Editor**
2. Run:
   ```sql
   SELECT * FROM users;
   ```
3. Register a user in your app
4. Run the query again - you should see the new user!

## ❌ Troubleshooting

**"Connection refused"**
- Make sure your Neon project is active (not paused)
- Check connection string is correct

**"Password authentication failed"**
- Reset password in Neon dashboard
- Update `.env` with new connection string

**Tables not created**
- Check backend logs for errors
- Verify `synchronize: true` in development mode

## 📚 Need More Details?

See `NEON_SETUP_GUIDE.md` for detailed instructions.

