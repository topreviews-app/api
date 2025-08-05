# 🚀 TopReviews API

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="80" alt="NestJS Logo" />
</p>

<p align="center">
  <strong>Backend API for TopReviews - Customer Review Widgets Platform</strong>
</p>

<p align="center">
  <a href="https://topreviews.app" target="_blank">🌐 Website</a> •
  <a href="https://api.topreviews.app/health" target="_blank">🔍 API Status</a> •
  <a href="#api-documentation" target="_blank">📚 Docs</a>
</p>

---

## 📋 **What is TopReviews API?**

TopReviews API powers a comprehensive customer review management platform that enables businesses to:

- 🔐 **Secure Authentication** - JWT-based auth system with refresh tokens
- 🏢 **Site Management** - CRUD operations for business websites with plan limitations (FREE/PREMIUM)
- ⭐ **Review Collection** - Public widget API endpoints for collecting customer feedback
- 🛡️ **Review Moderation** - Admin tools for approve/hide/delete review management
- 📊 **Analytics & Metrics** - Review statistics, site performance, conversion tracking
- 🎨 **Widget Customization** - Design settings API for colors, layouts, and branding
- 🛡️ **Anti-Spam Protection** - Rate limiting, word filtering, and duplicate prevention
- 📧 **Email Notifications** - Automated alerts for new reviews (plan-based)
- 🌐 **Public Widget API** - Embeddable widget endpoints for any website

### **Tech Stack**
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM  
- **Authentication**: JWT with refresh mechanism
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI

---

## ✅ **Current Status**

### **🎯 Completed Features**

- [x] **Project Setup**
  - [x] NestJS application structure
  - [x] PostgreSQL database with Docker
  - [x] Prisma ORM integration
  - [x] Environment configuration
  - [x] TypeScript + ESLint setup

- [x] **Database Schema**
  - [x] User management (registration, authentication)
  - [x] Site management (business websites)
  - [x] Review system (collection, moderation)
  - [x] Database migrations and seeding

- [x] **Authentication Module**
  - [x] User registration and login
  - [x] JWT token generation and validation
  - [x] Password hashing with bcrypt
  - [x] Refresh token mechanism
  - [x] Protected route guards

- [x] **Core Infrastructure**
  - [x] Global validation pipeline
  - [x] Error handling and logging
  - [x] CORS configuration
  - [x] Health check endpoints

---

## 📋 **TODO: Next Development Phase**

### **🔧 Sites Management API**
- [ ] Create site endpoint with plan validation (FREE: 1 site, PREMIUM: 5 sites)
- [ ] Update site settings and widget design configuration
- [ ] Delete site with cascade cleanup of reviews
- [ ] List user sites with review counts and analytics
- [ ] Site ownership verification and domain validation

### **⭐ Reviews Management API**
- [ ] Public review submission endpoint with validation
- [ ] Admin review moderation (approve/hide/delete) based on user plan
- [ ] Review filtering, search, and pagination
- [ ] Review status management (PENDING/APPROVED/HIDDEN/DELETED)
- [ ] Review analytics and metrics tracking

### **🎨 Widget API (Public Endpoints)**
- [ ] `GET /widget/:siteId` - HTML widget generation
- [ ] `GET /widget/:siteId/reviews` - JSON reviews for widget
- [ ] `POST /widget/:siteId/reviews` - Submit review through widget
- [ ] `GET /widget/:siteId/settings` - Widget design configuration
- [ ] Widget embed code generation and preview

### **🛡️ Anti-Spam & Security**
- [ ] Rate limiting: Widget API (100 req/min), Admin API (1000 req/hour)
- [ ] Review spam protection (IP blocking, word filtering)
- [ ] Duplicate review prevention (same IP + email in 24h)
- [ ] Input sanitization and XSS protection
- [ ] CORS configuration for widget embedding

### **💼 Business Logic & Plan Management**
- [ ] Plan limitations enforcement (reviewsPerMonth, sitesCount)
- [ ] FREE plan: 50 reviews/month, 1 site, basic moderation
- [ ] PREMIUM plan: unlimited reviews, 5 sites, advanced features
- [ ] Plan upgrade/downgrade functionality
- [ ] Usage tracking and billing preparation

### **📧 Email Notifications System**
- [ ] FREE plan: weekly digest emails
- [ ] PREMIUM plan: instant new review notifications
- [ ] Email templates for review notifications
- [ ] SMTP configuration and email queue system
- [ ] Unsubscribe functionality

### **📊 Analytics & Reporting API**
- [ ] Review conversion rates and widget performance
- [ ] Geographic analytics based on IP addresses
- [ ] Rating distribution and sentiment analysis
- [ ] Site traffic and widget view tracking
- [ ] Export functionality for review data

### **🌐 Widget Customization Features**
- [ ] Color scheme customization (background, text, accent colors)
- [ ] Layout options (cards, list, slider templates)
- [ ] Custom branding and logo upload
- [ ] Responsive design settings
- [ ] Widget preview and testing tools

### **📚 Documentation & Testing**
- [ ] Swagger/OpenAPI documentation
- [ ] Unit tests for services
- [ ] Integration tests for endpoints
- [ ] E2E testing setup
- [ ] API versioning strategy

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js (v16 or higher)
- PostgreSQL (v14 or higher)
- Docker & Docker Compose

### **Installation**

```bash
# Clone the repository
git clone https://github.com/topreviews-app/api.git
cd api

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Seed the database (optional)
npx prisma db seed
```

### **Development**

```bash
# Start development server
npm run start:dev

# The API will be available at:
# http://localhost:3001
```

### **Testing**

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🌐 **API Endpoints**

### **Authentication**
```http
POST /auth/register     # User registration
POST /auth/login        # User login
POST /auth/refresh      # Refresh access token
GET  /auth/profile      # Get user profile
```

### **Health Check**
```http
GET  /health           # API health status
GET  /test-data        # Database connectivity test
```

### **Coming Soon - Full API Specification**
```http
# Sites Management
GET    /sites              # List user sites with plan limitations
POST   /sites              # Create site (plan validation)
GET    /sites/:id          # Get site details and analytics  
PUT    /sites/:id          # Update site settings
DELETE /sites/:id          # Delete site and reviews
PUT    /sites/:id/settings # Update widget design

# Reviews Management  
GET    /reviews/my         # Admin review dashboard with filters
PUT    /reviews/:id/status # Moderate review (approve/hide/delete)
DELETE /reviews/:id        # Permanently delete review
GET    /reviews/analytics  # Review statistics and metrics

# Public Widget API
GET    /widget/:siteId              # Generate HTML widget
GET    /widget/:siteId/reviews      # Get approved reviews JSON
POST   /widget/:siteId/reviews      # Submit new review (public)
GET    /widget/:siteId/settings     # Widget design configuration

# Plan Management
GET    /user/plan          # Current plan details and usage
POST   /user/upgrade       # Upgrade to premium plan
GET    /user/usage         # Plan usage statistics
```

---

## 🏗️ **Project Structure**

```
src/
├── auth/              # Authentication module
│   ├── dto/          # Data transfer objects
│   ├── guards/       # JWT guards
│   └── strategies/   # Passport strategies
├── sites/            # Sites management with plan validation
├── reviews/          # Reviews CRUD and moderation system
├── widget/           # Public widget API endpoints
├── plans/            # Business logic for FREE/PREMIUM plans
├── notifications/    # Email notification system  
├── analytics/        # Review statistics and reporting
├── prisma/           # Database service and utilities
├── common/           # Shared guards, decorators, filters
├── app.controller.ts # Health check endpoints
├── app.module.ts     # Main application module
└── main.ts           # Application entry point

prisma/
├── schema.prisma     # Database schema
├── migrations/       # Database migrations
└── seed.ts           # Database seeding
```

---

## 🌍 **Environment Variables**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5433/topreviews"

# JWT Authentication  
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Security
BCRYPT_ROUNDS=12

# Server
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="https://topreviews.app,http://localhost:3000"
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 **Links**

- **Production API**: https://api.topreviews.app
- **Main Website**: https://topreviews.app
- **Organization**: https://github.com/topreviews-app

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/forze-dev">forze-dev</a></strong>
</p>