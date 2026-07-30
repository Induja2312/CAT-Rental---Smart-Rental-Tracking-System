# ml-service

Standalone Python anomaly-detection service for CAT Rental.

Uses an **IsolationForest** trained on 840 rows of synthetic telemetry
(7 equipment × 120 days) across 6 features: engine hours, idle hours,
idle/engine ratio, days since operator assigned, engine temperature, and
session utilization ratio.

## Files

| File | Purpose |
|---|---|
| `generate_data.py` | Generates `synthetic_telemetry.csv` (840 rows, 6% injected anomalies) |
| `train.py` | Trains IsolationForest, saves `model.pkl` + `feature_stats.pkl` |
| `main.py` | FastAPI app — `GET /health`, `POST /predict` |
| `model.pkl` | Trained model + scaler + feature list |
| `feature_stats.pkl` | Per-feature mean/std of normal points (used to label anomaly type) |

## Regenerating the model

If the training data or feature set changes, re-run in order:

```bash
source venv/bin/activate
python generate_data.py   # rewrites synthetic_telemetry.csv
python train.py           # rewrites model.pkl + feature_stats.pkl
```

## Serving predictions

`main.py` is ready. Once the rest of the app is ready to call it:

```bash
source venv/bin/activate
uvicorn main:app --port 8000
```

`POST /predict` accepts a JSON body with the 6 telemetry features and
returns `{ is_anomaly, anomaly_type, confidence }`.

> Do not start the server until the Node backend's `mlPoller.js` is
> configured to call `http://localhost:8000/predict`.
