# Expense Tracker App - Complete Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or use Docker)
- Expo CLI (for mobile development)
- Git

## Step 1: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb expense_tracker

# Or using psql
psql -U postgres
CREATE DATABASE expense_tracker;
```

### Option B: Docker

```bash
docker run -d \
  --name expense-tracker-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_tracker \
  -p 5432:5432 \
  postgres:14
```

## Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# LLM (OpenAI)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Self-hosted LLM
# LLM_PROVIDER=self-hosted
# SELF_HOSTED_LLM_URL=http://localhost:8000/v1
# SELF_HOSTED_LLM_MODEL=llama3

# Optional: WhatsApp
# WHATSAPP_API_KEY=your-key
# WHATSAPP_PHONE_NUMBER_ID=your-id
# WHATSAPP_VERIFY_TOKEN=your-token

# Optional: Telegram
# TELEGRAM_BOT_TOKEN=your-token

# Optional: Stripe
# STRIPE_SECRET_KEY=your-key
# STRIPE_WEBHOOK_SECRET=your-secret
# STRIPE_PREMIUM_PRICE_ID=your-price-id

# Optional: Currency API
# EXCHANGE_RATE_API_KEY=optional

# Optional: Google Vision (for OCR)
# GOOGLE_VISION_API_KEY=optional

# Frontend URLs
FRONTEND_URL=http://localhost:8081
ADMIN_DASHBOARD_URL=http://localhost:5173
BASE_URL=http://localhost:3000
EOF

# Start backend
npm run start:dev
```

Backend will run on `http://localhost:3000`

## Step 3: Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
EXPO_PUBLIC_API_URL=http://localhost:3000
EOF

# Start Expo
npm start
```

Then:
1. Install Expo Go app on your phone
2. Scan the QR code shown in terminal
3. App will load on your device

**Note**: For iOS simulator, press `i` in the terminal. For Android emulator, press `a`.

## Step 4: Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:3000
EOF

# Start dev server
npm run dev
```

Admin dashboard will run on `http://localhost:5173`

## Step 5: Initial Setup

### Seed Default Categories

The backend will automatically create default categories on first run. If you need to seed manually:

```bash
# You can add a seed script in backend/package.json:
# "seed:categories": "ts-node src/scripts/seed-categories.ts"
```

### Create Admin User

You can create an admin user through the registration endpoint:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "name": "Admin User"
  }'
```

## Step 6: API Keys Setup

### OpenAI API Key (Required for AI features)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `backend/.env` as `OPENAI_API_KEY`

### Optional: Google Cloud Vision (for OCR)

1. Go to https://console.cloud.google.com/
2. Enable Vision API
3. Create credentials
4. Add to `backend/.env` as `GOOGLE_VISION_API_KEY`

### Optional: Stripe (for payments)

1. Go to https://dashboard.stripe.com/apikeys
2. Get your secret key
3. Create a product and get price ID
4. Add to `backend/.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PREMIUM_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET` (from webhook settings)

### Optional: WhatsApp Business API

1. Set up Meta Business account
2. Get API credentials
3. Add to `backend/.env`:
   - `WHATSAPP_API_KEY`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`

### Optional: Telegram Bot

1. Message @BotFather on Telegram
2. Create a new bot
3. Get the token
4. Add to `backend/.env` as `TELEGRAM_BOT_TOKEN`

## Step 7: Testing the Setup

### Test Backend

```bash
# Health check
curl http://localhost:3000

# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Test Mobile App

1. Open Expo Go on your phone
2. Scan QR code
3. Try registering/logging in
4. Add an expense

### Test Admin Dashboard

1. Open http://localhost:5173
2. Check if stats load (you'll need to be authenticated as admin)

## Common Issues

### Database Connection Error

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Check DATABASE_URL in .env matches your setup
```

### Port Already in Use

```bash
# Change PORT in backend/.env
# Or kill the process using the port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

### CORS Errors

Make sure `FRONTEND_URL` and `ADMIN_DASHBOARD_URL` in backend `.env` match your actual URLs.

### Mobile App Can't Connect

1. Make sure backend is running
2. Use your computer's IP address instead of localhost:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
   ```
3. Make sure phone and computer are on same network

## Production Deployment

### Backend Deployment

Recommended platforms:
- **Railway**: Easy PostgreSQL + Node.js hosting
- **Render**: Free tier available
- **Fly.io**: Good for global distribution
- **AWS/GCP**: Enterprise scale

Steps:
1. Push code to GitHub
2. Connect to hosting platform
3. Set environment variables
4. Deploy

### Mobile App Deployment

1. **Build for production**:
   ```bash
   cd mobile
   eas build --platform all
   ```

2. **Submit to stores**:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

3. **Requirements**:
   - Apple Developer account ($99/year)
   - Google Play Console ($25 one-time)

### Admin Dashboard Deployment

Recommended platforms:
- **Vercel**: Free, easy deployment
- **Netlify**: Free tier
- **Cloudflare Pages**: Free

Steps:
1. Build: `npm run build`
2. Deploy `dist` folder
3. Set `VITE_API_BASE_URL` to production API URL

## Next Steps

1. ✅ Set up database
2. ✅ Configure environment variables
3. ✅ Get API keys (OpenAI minimum)
4. ✅ Test all features
5. ✅ Deploy to production
6. ✅ Submit mobile app to stores

## Support

For issues:
1. Check logs in backend terminal
2. Check browser console for frontend errors
3. Check Expo logs for mobile app errors
4. Verify all environment variables are set correctly

Happy coding! 🚀

