# Neon PostgreSQL Setup - Complete Instructions

## 📋 What You Need to Do

### 1. Sign Up for Neon (2 minutes)
- Go to: **https://neon.tech**
- Sign up (GitHub/Google recommended)
- Verify email if needed

### 2. Create Project (1 minute)
- Click **"Create Project"**
- Name: `expense-tracker`
- Choose region closest to you
- Click **"Create Project"**

### 3. Copy Connection String (30 seconds)
- After project creation, find **"Connection Details"**
- Copy the connection string (starts with `postgresql://`)
- ⚠️ **SAVE THE PASSWORD** - shown only once!

### 4. Update Your .env File (1 minute)

Navigate to: `backend/.env`

**If `.env` doesn't exist**, create it with this content:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@ep-xxxx-xxxx.region.aws.neon.tech/neondb?sslmode=require
DB_TYPE=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=1h

# Other existing variables...
```

**If `.env` already exists**, add or update these lines:

```env
DATABASE_URL=your-actual-neon-connection-string-here
DB_TYPE=postgres
```

**Replace** `your-actual-neon-connection-string-here` with the connection string you copied from Neon.

### 5. Test the Connection

```bash
cd backend
npm run start:dev
```

You should see:
- ✅ Database connection successful
- ✅ Tables being created
- ✅ Server running on http://localhost:3000

## ✅ Success Indicators

1. Backend starts without database errors
2. You can register/login in your app
3. Data persists (try adding an expense)
4. Check Neon dashboard → SQL Editor → see your tables

## 🔧 Your Connection String Format

Your Neon connection string will look like:
```
postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Make sure it includes:
- ✅ `postgresql://` at the start
- ✅ Username and password
- ✅ `@ep-xxxx-xxxx.region.aws.neon.tech`
- ✅ Database name (usually `/neondb`)
- ✅ `?sslmode=require` at the end

## 📝 Example .env File

Here's what your `backend/.env` should look like:

```env
# Database - Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:your-password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DB_TYPE=postgres

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# OpenAI
OPENAI_API_KEY=your-openai-key

# Other API keys...
```

## 🆘 Common Issues

### Issue: "Connection refused"
**Solution**: 
- Check Neon dashboard - is project active?
- Verify connection string is correct
- Make sure `sslmode=require` is included

### Issue: "Password authentication failed"
**Solution**:
- Go to Neon dashboard → Project Settings
- Click "Reset Password"
- Copy new connection string
- Update `.env` file

### Issue: "Database does not exist"
**Solution**:
- Neon creates a default database (usually `neondb`)
- Make sure your connection string uses the correct database name
- Check the path in connection string: `/neondb`

## 🎯 Next Steps After Setup

1. ✅ Test your app - register, login, add expenses
2. ✅ Check Neon dashboard - see your data
3. ✅ Verify tables created - use SQL Editor in Neon
4. ✅ Start building features!

## 📚 Additional Resources

- **Detailed Guide**: See `NEON_SETUP_GUIDE.md`
- **Migration Info**: See `POSTGRESQL_MIGRATION.md`
- **Quick Start**: See `QUICK_START_NEON.md`
- **Neon Docs**: https://neon.tech/docs

---

**Ready?** Follow steps 1-5 above and you'll be running on PostgreSQL in 5 minutes! 🚀

