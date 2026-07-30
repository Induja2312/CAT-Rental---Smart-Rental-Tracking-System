# CAT Rental — Smart Equipment Rental Tracking Platform

## What is this?

CAT Rental is a MERN-stack platform for real-time tracking of heavy equipment rentals across construction sites. It provides live telemetry (location, engine hours, fuel), automated overdue/overuse alerts, smart equipment allocation scoring, and role-based dashboards for admins, site managers, and customers. The project is split across 4 developer modules: **Person A** owns auth + admin user/site management (`/api/auth`, `/api/admin`, `/admin` dashboard); **Person B** owns equipment allocation scoring and the manager dashboard (`/api/allocation`, `/manager` dashboard); **Person C** owns rental lifecycle CRUD and the customer dashboard (`/api/rentals`, `/customer` dashboard); **Person D** owns real-time telemetry ingestion, alert generation, socket broadcasting, and the optional ML anomaly microservice (`/api/telemetry`, `/api/alerts`, `/api/ml`).

---

## Stack

| Layer      | Tech                                      |
|------------|-------------------------------------------|
| Frontend   | React 18 + Vite + Tailwind + React Router |
| Backend    | Node + Express + Socket.io + Mongoose     |
| Database   | MongoDB                                   |
| ML service | FastAPI + scikit-learn (stretch goal)     |

## Ports

| Service    | Port |
|------------|------|
| client     | 5173 |
| server     | 3001 |
| ml-service | 8000 |

> **macOS note:** Port 5000 is occupied by AirPlay Receiver (Control Center). The server defaults to **3001**. To free 5000: System Settings → General → AirDrop & Handoff → disable AirPlay Receiver.

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- MongoDB running locally (`brew services start mongodb/brew/mongodb-community`)

### 2. Server
```bash
cd server
cp .env.example .env        # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed                 # wipes DB, inserts admin + 3 sites + 7 equipment
npm run dev                  # starts on port 3001
```

### 3. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev                  # starts on port 5173
```

### 4. ML Service (Anomaly Detection)
```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

---

## Seed credentials

| Email                  | Password  | Role  |
|------------------------|-----------|-------|
| admin@catrental.com    | admin123  | admin |

---

## Module ownership

| Person | Routes              | Pages         | Description                              |
|--------|---------------------|---------------|------------------------------------------|
| A      | /api/auth /api/admin | /admin/*     | Auth, user & site management             |
| B      | /api/allocation      | /manager/*   | Allocation scoring, manager dashboard    |
| C      | /api/rentals         | /customer/*  | Rental CRUD, customer dashboard          |
| D      | /api/telemetry /api/alerts /api/ml | —  | Telemetry, alerts, sockets, ML proxy |

See `shared/schema.md` for the locked field names, socket event constants, and API base paths every module must follow.
