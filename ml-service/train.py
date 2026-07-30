"""
train.py — run once to produce model.pkl
Usage: python train.py
"""
import numpy as np
import pandas as pd
import pickle
from sklearn.ensemble import IsolationForest

RNG = np.random.default_rng(42)

# Baselines per equipment (from seed sheet)
BASELINES = [
    {"id": "EQX1001", "engine": 6.0,  "idle": 1.5, "days_since_op": 0},
    {"id": "EQX1002", "engine": 0.5,  "idle": 4.0, "days_since_op": 1},
    {"id": "EQX1003", "engine": 7.0,  "idle": 1.0, "days_since_op": 0},
    {"id": "EQX1004", "engine": 8.0,  "idle": 0.5, "days_since_op": 3},
    {"id": "EQX1005", "engine": 0.5,  "idle": 6.0, "days_since_op": 2},
    {"id": "EQX1006", "engine": 5.0,  "idle": 2.0, "days_since_op": 0},
    {"id": "EQX1007", "engine": 0.0,  "idle": 0.0, "days_since_op": 99},
]

ROWS_PER_EQUIPMENT = 120  # ~840 total rows

records = []
for b in BASELINES:
    n = ROWS_PER_EQUIPMENT
    engine = RNG.normal(b["engine"], 1.5, n).clip(0, 24)
    idle   = RNG.normal(b["idle"],   1.2, n).clip(0, 24)
    # Inject ~5% anomalies: extreme engine hours or idle:engine ratio
    anomaly_idx = RNG.choice(n, size=max(1, n // 20), replace=False)
    engine[anomaly_idx] = RNG.uniform(18, 24, len(anomaly_idx))
    idle[anomaly_idx]   = RNG.uniform(0,  0.2, len(anomaly_idx))

    days_since_op = RNG.integers(0, 10, n).astype(float)
    days_since_op[anomaly_idx] = RNG.uniform(30, 90, len(anomaly_idx))

    idle_engine_ratio = np.where(engine > 0, idle / engine, 0.0)

    for i in range(n):
        records.append({
            "engineHoursToday":      round(float(engine[i]), 3),
            "idleHoursToday":        round(float(idle[i]), 3),
            "idle_engine_ratio":     round(float(idle_engine_ratio[i]), 4),
            "days_since_op_assigned": round(float(days_since_op[i]), 1),
        })

df = pd.DataFrame(records)
features = ["engineHoursToday", "idleHoursToday", "idle_engine_ratio", "days_since_op_assigned"]
X = df[features].values

model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
model.fit(X)

with open("model.pkl", "wb") as f:
    pickle.dump({"model": model, "features": features}, f)

print(f"Trained on {len(df)} rows. model.pkl saved.")
print(f"Anomaly count in training set: {(model.predict(X) == -1).sum()}")
