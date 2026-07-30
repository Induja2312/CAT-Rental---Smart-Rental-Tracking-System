from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle, os, numpy as np

app = FastAPI()

# Lazy-load model so /health works even before train.py has been run
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

    prediction    = model.predict(row)[0]        # 1 = normal, -1 = anomaly
    anomaly_score = float(-model.score_samples(row)[0])  # higher = more anomalous

    return {
        "equipmentId":   req.equipmentId,
        "is_anomaly":    bool(prediction == -1),
        "anomaly_score": round(anomaly_score, 4),
    }
