"""
FastAPI ML service for CAT Rental — anomaly detection with readable types.

Run: uvicorn main:app --reload --port 8000
"""
import pickle
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

with open("model.pkl", "rb") as f:
    saved = pickle.load(f)
    MODEL = saved["model"]
    SCALER = saved["scaler"]
    FEATURES = saved["features"]

with open("feature_stats.pkl", "rb") as f:
    FEATURE_STATS = pickle.load(f)

# Which direction of deviation maps to which readable category.
# Some features are only "anomalous" in one direction (e.g. temperature —
# too LOW isn't a problem, too HIGH is), so we check direction, not just magnitude.
FEATURE_ANOMALY_RULES = {
    "engineHoursToday": {"high": "abnormal_engine_usage", "low": None},
    "idleHoursToday": {"high": "abnormal_idle_time", "low": None},
    "idleEngineRatio": {"high": "abnormal_idle_ratio", "low": None},
    "daysSinceOperatorAssigned": {"high": "unusual_operator_gap", "low": None},
    "engineTemperature": {"high": "high_temperature", "low": None},
    "sessionUtilizationRatio": {"high": None, "low": "operator_slacking"},
}


class TelemetryInput(BaseModel):
    engineHoursToday: float
    idleHoursToday: float
    idleEngineRatio: float
    daysSinceOperatorAssigned: float
    engineTemperature: float
    sessionUtilizationRatio: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: TelemetryInput):
    x = np.array([[getattr(data, f) for f in FEATURES]])
    x_scaled = SCALER.transform(x)

    raw_pred = MODEL.predict(x_scaled)[0]
    score = MODEL.decision_function(x_scaled)[0]
    is_anomaly = bool(raw_pred == -1)

    anomaly_type = None
    confidence = round(float(abs(score)), 2)

    if is_anomaly:
        best_type = None
        best_z = 0
        for f in FEATURES:
            stats = FEATURE_STATS[f]
            val = getattr(data, f)
            z = (val - stats["mean"]) / stats["std"]  # signed, so we know direction
            direction = "high" if z > 0 else "low"
            candidate_type = FEATURE_ANOMALY_RULES[f][direction]
            if candidate_type and abs(z) > best_z:
                best_z = abs(z)
                best_type = candidate_type
        anomaly_type = best_type or "irregular_usage_pattern"  # fallback if no single feature dominates

    return {
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type,
        "confidence": confidence,
    }
