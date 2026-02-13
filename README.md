# Expense Tracker App

A comprehensive financial budgeting application with voice input, receipt scanning, geolocation-based notifications, and AI-powered expense categorization.

## Project Structure

```
ExpenseTracker-App/
├── mobile/              # React Native + Expo mobile app
├── backend/             # NestJS backend API
├── admin-dashboard/     # React admin dashboard
└── shared/              # Shared types and utilities
```

## Features

- 🎤 Voice input for expense logging (via app, WhatsApp, or Telegram)
- 📸 Receipt scanning with OCR
- 📍 Geolocation-based expense reminders
- 🤖 AI-powered expense categorization
- 💱 Multi-currency support
- 👥 Group expense tracking (premium)
- 📊 Comprehensive analytics and history

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (for mobile development)
- PostgreSQL or MongoDB (for database)

### Development

#### Mobile App
```bash
cd mobile
npm install
npm start
```

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

#### Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```

## Tech Stack

- **Mobile**: React Native + Expo
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL (or MongoDB)
- **Admin**: React + TypeScript + Vite
- **AI/LLM**: OpenAI API (with self-hosted option)

## Environment Variables

See `.env.example` files in each project directory for required environment variables.

## License

MIT

