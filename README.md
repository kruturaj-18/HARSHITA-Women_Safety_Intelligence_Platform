# Women Safety Intelligence Platform – Mumbai

A production-grade SaaS web platform for real-time women safety visualization, incident reporting, and intelligence analytics across Mumbai.

![Platform](https://img.shields.io/badge/Platform-SaaS-purple)
![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-green)
![Status](https://img.shields.io/badge/Status-Production%20Ready-blue)

## 🎯 Features

### Core
- **🗺️ Real-Time Safety Map** – Interactive Mapbox map with GeoJSON zone coloring (Red/Yellow/Green)
- **⏰ Time Intelligence** – Toggle between Live, 24h, Week, and Month views
- **🚔 Police Stations** – 31 Mumbai police stations with phone, address, and nearest station detection
- **🧠 Safety Score Engine** – Algorithm using incident frequency, recency, time-of-day, and severity
- **📊 Heatmap + Analytics** – Incident density heatmap and area-wise trend analytics
- **👤 User System** – JWT authentication with User and Admin roles
- **📝 Incident Reporting** – Report with location picker, categories, anonymous mode, and moderation
- **📊 Admin Dashboard** – Full moderation panel with stats, charts, user management

### Security
- JWT + RBAC authentication
- AES-256-GCM encryption
- bcrypt password hashing (12 rounds)
- Rate limiting (global + per-endpoint)
- Input validation & sanitization
- Helmet.js security headers
- No hardcoded secrets
- Activity logging & monitoring

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS 3, Mapbox GL JS, Recharts |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB with 2dsphere geospatial indexes |
| Auth | JWT, bcrypt, RBAC |
| DevOps | Docker, Docker Compose |

## 📁 Project Structure

```
Women Safety/
├── Backend/
│   ├── src/
│   │   ├── config/          # DB & env configuration
│   │   ├── middleware/       # Auth, rate-limit, validation, errors
│   │   ├── models/           # Mongoose schemas (User, Incident, Area, PoliceStation)
│   │   ├── routes/           # REST API endpoints
│   │   ├── services/         # Safety score computation
│   │   ├── socket/           # WebSocket handlers
│   │   └── utils/            # Logger, encryption
│   ├── seed/                 # Database seed data
│   ├── server.js             # Entry point
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # Auth & Socket contexts
│   │   ├── pages/            # Route pages
│   │   └── services/         # API client
│   ├── index.html
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally or MongoDB Atlas account

### 1. Set Up Backend

```bash
cd Backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and secrets

# Seed the database with sample data
npm run seed

# Start backend server
npm run dev
```

### 2. Set Up Frontend

```bash
cd Frontend
npm install

# Start frontend dev server
npm run dev
```

### 3. Open the Application

Visit **http://localhost:5173**

### Demo Credentials

| Role  | Email            | Password   |
|-------|-----------------|------------|
| Admin | admin@wsip.com  | Admin@123  |
| User  | user@wsip.com   | User@1234  |

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# This starts:
# - MongoDB on port 27017
# - Backend API on port 5000
# - Frontend on port 5173
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Incidents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/incidents` | Report incident |
| GET | `/api/incidents` | Get incidents (with filters) |
| GET | `/api/incidents/heatmap` | Get heatmap data |

### Map
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/map/areas` | Get safety zones (GeoJSON) |
| GET | `/api/map/police-stations` | Get police stations |
| GET | `/api/map/nearest-station` | Find nearest station |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/incidents` | All incidents |
| PATCH | `/api/admin/incidents/:id/moderate` | Approve/reject |
| GET | `/api/admin/users` | User management |
| POST | `/api/admin/recalculate-scores` | Recalculate safety scores |

## 🔐 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/women-safety-platform
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=your-32-char-key
FRONTEND_URL=http://localhost:5173
```

## 🧠 Safety Score Algorithm

```
score = 100 - normalized_weight

weight = Σ(recency × time_of_day × severity)

Recency:    <24h → 1.0 | <1wk → 0.7 | <1mo → 0.4 | older → 0.1
Time:       Night/Evening → 1.5 | Day → 1.0
Severity:   High → 3.5 | Medium → 2.0 | Low → 1.0

Risk: score ≥ 70 = Safe 🟢 | ≥ 40 = Moderate 🟡 | < 40 = High Risk 🔴
```

## 📄 License

MIT License – Built for educational and research purposes.
