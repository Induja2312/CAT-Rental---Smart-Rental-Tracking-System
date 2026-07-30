# CAT Rental — Module Prompts (Scaffold-Aware Version)

Prerequisite: the base scaffold repo is already pushed and cloned. Auth login/JWT,
socket.io wiring, Mongoose models, and empty-but-mounted routers already exist and work.
Do NOT rebuild these — extend them. Each prompt below tells the agent exactly what
already exists in the clone so it doesn't duplicate or overwrite working code.

Each person: `git clone <repo>`, `git checkout -b feature/<module>`, `npm install` in
client/ and server/, copy `.env.example` to `.env` in both, then paste the relevant
prompt below into your agent.

---

## Person A — Super Admin Module

```
You are working in an existing repo called "cat-rental" (already cloned, do not
reinitialize it). The following ALREADY EXISTS and works — do not rebuild it:
- server/middleware/auth.js exports requireAuth and requireRole(role), both working
- server/routes/auth.js has working POST /login and POST /signup
- server/models/User.js and Site.js already have the correct schema
- server/seed/seed.js already seeds 1 admin user (admin@catrental.com/admin123) + 3 sites
- client/src/pages/Login.jsx works and redirects by role
- client/src/context/AuthContext.jsx stores JWT + role
- client/src/components/ProtectedRoute.jsx already checks JWT + role
- server/routes/admin.js exists but is an EMPTY express.Router() — you fill this in
- client/src/pages/admin/ exists but is empty (just a .gitkeep) — you fill this in

YOUR SCOPE — build only this, inside the existing files above:
1. In server/routes/admin.js, add (protect all with requireAuth + requireRole("admin")):
   - POST /api/admin/managers        (create a manager: name, email, password, assignedSites)
   - GET  /api/admin/managers        (list all managers + their assigned sites/equipment)
   - PUT  /api/admin/managers/:id    (edit assigned sites)
   - DELETE /api/admin/managers/:id
   - GET  /api/admin/overview        (counts: total equipment, active managers, open alerts)
2. In client/src/pages/admin/, build: AdminDashboard.jsx, ManagerList.jsx,
   CreateManagerForm.jsx. Wire these into App.jsx's existing /admin route group
   (the route group and ProtectedRoute wrapper already exist in App.jsx — just add
   your page components as children, don't restructure App.jsx's routing setup).
3. Import requireAuth/requireRole from the EXISTING server/middleware/auth.js —
   do not write your own auth check.
4. Use the EXISTING User and Site models — do not redefine their schemas.

DO NOT touch: auth.js routes/middleware, seed.js, Login.jsx, manager/customer pages,
telemetry, alerts, rentals, allocation.

Commit and push to feature/admin frequently — Persons B/C/D may need to test against
manager accounts you create via seed or your own API.
```

---

## Person B — Fleet Manager Dashboard (Map + Graphs + Allocation)

```
You are working in an existing repo called "cat-rental" (already cloned, do not
reinitialize it). The following ALREADY EXISTS and works — do not rebuild it:
- Auth (login, JWT, requireAuth/requireRole middleware) — fully working
- client/src/sockets/socket.js — a working socket.io-client instance already connected
  to the server, just import it and call .on(...)
- server/sockets/index.js — exports the io instance and event name constants:
  TELEMETRY_UPDATE = "telemetry:update", ALERT_NEW = "alert:new",
  EQUIPMENT_STATUS = "equipment:status"
- server/models/Equipment.js, Site.js, Alert.js already have correct schema
- server/routes/allocation.js exists but is an EMPTY express.Router() — you fill this in
- client/src/pages/manager/ exists but is empty (just a .gitkeep) — you fill this in
- App.jsx already has a /manager route group wrapped in ProtectedRoute — just add your
  page components as children

NOTE: Person D owns telemetry generation and the alert engine — they may not have
pushed yet. Build your map/charts against STATIC dummy data first so you have a working
visual regardless, then switch to the live socket.io("telemetry:update") /
socket.on("alert:new") listeners once Person D's events start firing. Don't block on them.

YOUR SCOPE:
1. In server/routes/allocation.js, add (protect with requireAuth + requireRole("manager")):
   - GET /api/allocation/rank?siteId=X
     Scoring (NOT ML, plain function): score = w1*(1/distance_to_site) +
     w2*(1 - currentUtilization) + w3*(isAvailable ? 1 : 0), w1=0.4 w2=0.4 w3=0.2.
     Return ranked list of equipment recommended for that site.
2. In client/src/pages/manager/, build:
   - ManagerDashboard.jsx (layout container)
   - MapView.jsx — Leaflet map, custom icon per equipment.type (excavator/crane/
     bulldozer/grader), icon color by status (green=active, yellow=idle, red=overdue).
     Import the existing socket.js, listen for "telemetry:update" to move markers and
     "equipment:status" to change colors. Filter to equipment on the logged-in manager's
     assignedSites (from AuthContext).
   - UtilizationCharts.jsx — Recharts: engine vs idle hours per equipment (stacked bar),
     rental days remaining, alert count over time.
   - AlertFeed.jsx — listen for socket "alert:new", live list, PUT /api/alerts/:id/resolve
     (this route belongs to Person D — if not pushed yet, stub the button, wire it once
     it exists).
   - AllocationPanel.jsx — calls your own GET /api/allocation/rank, shows ranked table.
3. Wire these into App.jsx's existing /manager route group.

DO NOT touch: auth, admin pages/routes, customer pages/routes, telemetry generation,
alert rule engine (routes/alerts.js), ML service.

Get MapView.jsx rendering with 2-3 hardcoded dummy markers in the first hour, before
wiring live sockets — that's your fallback if integration slips.
```

---

## Person C — Customer Module & Rentals

```
You are working in an existing repo called "cat-rental" (already cloned, do not
reinitialize it). The following ALREADY EXISTS and works — do not rebuild it:
- Auth (login, JWT, requireAuth/requireRole middleware) — fully working
- server/models/Rental.js already has the correct schema (checkInDate, checkOutDate,
  actualReturnDate, status)
- server/routes/rentals.js exists but is an EMPTY express.Router() — you fill this in
- client/src/pages/customer/ exists but is empty (just a .gitkeep) — you fill this in
- App.jsx already has a /customer route group wrapped in ProtectedRoute — just add your
  page components as children

YOUR SCOPE:
1. In server/routes/rentals.js, add (protect with requireAuth + requireRole("customer")
   except where noted):
   - GET  /api/rentals/mine          (equipment currently rented by req.user.id)
   - POST /api/rentals/checkin       (body: equipmentId; simulate QR/RFID as a plain
     text code input; sets status="ongoing", checkInDate=now)
   - POST /api/rentals/checkout      (body: equipmentId; sets status="returned",
     actualReturnDate=now)
   - GET  /api/rentals/:id/status
2. When you detect a rental has passed checkOutDate and is still "ongoing", set
   status="overdue" and POST to /api/alerts (Person D's route — coordinate the payload
   shape: { equipmentId, type:"overdue", message, severity:"high" }; if that route isn't
   pushed yet, write the POST call anyway and it'll start working once Person D merges).
3. In client/src/pages/customer/, build:
   - CustomerDashboard.jsx
   - RentalList.jsx — active rentals with equipment type, check-in date, expected
     check-out, status badge (on-time / due-soon within 24h / overdue)
   - CheckInOutForm.jsx — text input simulating scanned equipmentId, calls your
     checkin/checkout endpoints
4. Wire these into App.jsx's existing /customer route group.

DO NOT touch: auth, admin pages/routes, manager pages/routes, telemetry generation,
alert rule engine internals, ML service.

Seed 2-3 dummy rentals for a test customer (add to server/seed/seed.js, additive only —
do not remove the admin/site seeding already there) so your UI has data immediately.
```

---

## Person D — Telemetry, Alerts & ML (critical path — start immediately)

```
You are working in an existing repo called "cat-rental" (already cloned, do not
reinitialize it). The following ALREADY EXISTS and works — do not rebuild it:
- server/sockets/index.js — socket.io server already initialized in server.js, exports
  `io` and the event constants TELEMETRY_UPDATE, ALERT_NEW, EQUIPMENT_STATUS — import
  and use these, don't create a second socket.io instance
- server/models/Equipment.js, Telemetry.js, Alert.js already have correct schema
- server/routes/telemetry.js and server/routes/alerts.js exist but are EMPTY
  express.Router()s — you fill both in
- ml-service/main.py exists with only a working GET /health — you build the rest

YOU ARE THE CRITICAL PATH — Person B's map/alerts and Person C's overdue-alert POST
depend on your endpoints and socket events. Build in this exact priority order and
push after each checkpoint so teammates aren't blocked.

PRIORITY 1 (finish first, within 90 min) — Telemetry:
- server/services/telemetrySimulator.js: expand the 7-row equipment sheet into a
  generator that every 4s produces per equipment: engineHoursToday, idleHoursToday,
  fuelLevel, location {lat,lng} nudged from last position, operatorId.
- POST this to your own new route server/routes/telemetry.js -> POST /api/telemetry/ingest
  which saves to the Telemetry model AND calls io.emit(TELEMETRY_UPDATE, payload) using
  the EXISTING socket instance from server/sockets/index.js.
- Also emit EQUIPMENT_STATUS whenever computed status changes.
- PUSH to feature/telemetry immediately once this works — Person B needs it.

PRIORITY 2 (finish by hour 3.5) — Alert engine, must work even if ML doesn't:
- On every telemetry ingest, check: overdue (handled partly by Person C, you handle the
  equipment-side thresholds), overuse (engineHoursToday > 10 for 2+ consecutive days),
  underuse (idleHoursToday > 8 for 3+ consecutive days), unassigned operator
  (operatorId null while engineHoursToday > 0).
- Save to Alert model, io.emit(ALERT_NEW, payload).
- In server/routes/alerts.js: GET /api/alerts (filterable by siteId), PUT /api/alerts/:id/resolve.
- Accept POSTs to this same alerts creation logic from Person C's overdue detection
  (agree on payload shape: { equipmentId, type, message, severity }).

PRIORITY 3 (stretch, only if hours 3.5-4.5 allow) — ML anomaly detection:
- In ml-service/, add train.py: generate ~500-1000 synthetic daily records per
  equipment (pandas/Faker, varied around the sheet's baselines), train sklearn
  IsolationForest on engineHoursToday, idleHoursToday, idle:engine ratio,
  days_since_operator_assigned. Save model.pkl.
- Add POST /predict to main.py (alongside the existing /health) -> returns
  anomaly_score, is_anomaly.
- Node calls this async, batched every ~30s, creates Alert type="ml_anomaly" if flagged.
- If not done by hour 4.5, abandon it — priorities 1-2 alone are a complete, demoable
  feature. Do not let this block final integration.

DO NOT touch: auth, admin/manager/customer pages, allocation.js (Person B owns that,
even though it's adjacent to your alert logic).
```

---

## Merge order (unchanged)

`feature/telemetry` → `feature/admin` → `feature/customer` → `feature/manager`, since
telemetry owns the socket wiring others read from, and admin's middleware is imported
everywhere. Run `npm run seed` once after merge, then smoke-test the full role chain:
admin creates manager → manager sees live map/alerts → customer checks in/out → manager
dashboard reflects it in real time.
