from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle, os, numpy as np

app = FastAPI()

_bundle = None

def get_model():
    global _bundle
    if _bundle is None:
        path = os.path.join(os.path.dirname(__file__), "model.pkl")
        if not os.path.exists(path):
            raise HTTPException(status_code=503, detail="model.pkl not found — run train.py first")
        with open(path, "rb") as f:
            _bundle = pickle.load(f)
    return _bundle


@app.get("/health")
def health():
    return {"status": "ok"}


class PredictRequest(BaseModel):
    equipmentId: str
    engineHoursToday: float
    idleHoursToday: float
    days_since_op_assigned: float = 0.0

# Training distribution means (from seed baselines) used to identify the
# most-deviated feature and label the anomaly type — no separate model needed.
FEATURE_MEANS = {
    "engineHoursToday":       5.0,
    "idleHoursToday":         2.1,
    "idle_engine_ratio":      0.35,
    "days_since_op_assigned": 1.0,
}

def classify_anomaly_type(engine, idle, idle_ratio, days_op):
    deviations = {
        "irregular_usage_pattern":  abs(engine      - FEATURE_MEANS["engineHoursToday"])       / max(FEATURE_MEANS["engineHoursToday"], 0.1),
        "abnormal_idle_ratio":      abs(idle_ratio   - FEATURE_MEANS["idle_engine_ratio"])      / max(FEATURE_MEANS["idle_engine_ratio"], 0.01),
        "unusual_operator_gap":     abs(days_op      - FEATURE_MEANS["days_since_op_assigned"]) / max(FEATURE_MEANS["days_since_op_assigned"], 0.1),
    }
    return max(deviations, key=deviations.get)


@app.post("/predict")
def predict(req: PredictRequest):
    bundle = get_model()
    model    = bundle["model"]
    features = bundle["features"]

    idle_engine_ratio = (req.idleHoursToday / req.engineHoursToday
                         if req.engineHoursToday > 0 else 0.0)

    row = np.array([[
        req.engineHoursToday,
        req.idleHoursToday,
        idle_engine_ratio,
        req.days_since_op_assigned,
    ]])

    prediction    = model.predict(row)[0]
    anomaly_score = float(-model.score_samples(row)[0])
    is_anomaly    = bool(prediction == -1)

    anomaly_type = None
    confidence   = round(min(anomaly_score / 0.3, 1.0), 4)  # normalise to [0,1]

    if is_anomaly:
        anomaly_type = classify_anomaly_type(
            req.engineHoursToday,
            req.idleHoursToday,
            idle_engine_ratio,
            req.days_since_op_assigned,
        )

    return {
        "equipmentId":   req.equipmentId,
        "is_anomaly":    is_anomaly,
        "anomaly_score": round(anomaly_score, 4),
        "anomaly_type":  anomaly_type,
        "confidence":    confidence,
    }
