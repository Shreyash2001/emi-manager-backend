# Mobile Shop EMI Manager — Backend

A RESTful backend API for managing EMI plans, customers, payments, and store operations for mobile shops.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (Access + Refresh tokens)
- **Logging**: Winston

## Project Structure
```
src/
├── app.js              # Express app setup
├── config/             # DB & env config
├── models/             # Mongoose models
├── middleware/         # Auth, validation, error handling
├── utils/              # Helpers & utilities
├── validators/         # Joi/Zod request validators
├── services/           # Business logic
├── controllers/        # Route handlers
└── routes/             # Express routers
```

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Seed the database
node seed/seed.js

# Start development server
npm run dev
```

## API Modules
- **Auth** — Register, Login, Refresh, Logout
- **Admin** — User & store management
- **Customer** — Customer CRUD
- **EMI Plan** — Create & manage EMI plans
- **Payment** — Record & track payments
- **Dashboard** — Summary statistics
- **Report** — Downloadable reports
