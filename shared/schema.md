# CAT Rental — Shared Schema (source of truth)

## MongoDB Schemas

```
User      { _id, name, email, passwordHash, role: "admin"|"manager"|"customer", assignedSites: [ObjectId] }
Site      { _id, name, location: { lat, lng } }
Equipment { _id, equipmentId: String (e.g. "EQX1001"), type, siteId, status: "active"|"idle"|"overdue"|"unassigned", lastOperatorId, currentLocation: { lat, lng } }
Rental    { _id, equipmentId, customerId, checkInDate, checkOutDate, actualReturnDate, status: "ongoing"|"returned"|"overdue" }
Telemetry { _id, equipmentId, timestamp, engineHoursToday, idleHoursToday, fuelLevel, location: { lat, lng }, operatorId }
Alert     { _id, equipmentId, type: "overdue"|"overuse"|"underuse"|"unassigned_operator"|"ml_anomaly", message, severity: "low"|"medium"|"high", createdAt, resolved: Boolean }
```

## Socket Event Names

| Constant           | Event string         | Payload                                                              |
|--------------------|----------------------|----------------------------------------------------------------------|
| TELEMETRY_UPDATE   | `telemetry:update`   | { equipmentId, location, engineHoursToday, idleHoursToday, fuelLevel, operatorId } |
| ALERT_NEW          | `alert:new`          | { equipmentId, type, message, severity }                             |
| EQUIPMENT_STATUS   | `equipment:status`   | { equipmentId, status }                                              |

## API Base Paths

| Path              | Owner    | Description                        |
|-------------------|----------|------------------------------------|
| /api/auth         | Person A | Login, signup                      |
| /api/admin        | Person A | User/site management               |
| /api/rentals      | Person C | Rental CRUD                        |
| /api/telemetry    | Person D | Telemetry ingestion & query        |
| /api/alerts       | Person D | Alert CRUD & resolution            |
| /api/allocation   | Person B | Equipment allocation scoring       |
| /api/ml           | Person D | Proxy to ml-service (stretch)      |

## Ports

| Service    | Port |
|------------|------|
| client     | 5173 |
| server     | 5000 |
| ml-service | 8000 |
