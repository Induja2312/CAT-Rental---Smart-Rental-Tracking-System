"""
Trains an Isolation Forest on the synthetic telemetry (now including
engine temperature and operator session utilization) and saves the
feature statistics needed to label WHY a point is anomalous.

Run: python train.py   (after generate_data.py has produced synthetic_telemetry.csv)
Output: model.pkl, feature_stats.pkl
"""
import pandas as pd
import pickle
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "engineHoursToday",
    "idleHoursToday",
    "idleEngineRatio",
    "daysSinceOperatorAssigned",
    "engineTemperature",
    "sessionUtilizationRatio",
]

def train():
    df = pd.read_csv("synthetic_telemetry.csv")
    X = df[FEATURES].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=150,
        contamination=0.06,  # matches the injection rate in generate_data.py
        random_state=42,
    )
    model.fit(X_scaled)

    normal_mask = model.predict(X_scaled) == 1
    feature_stats = {
        feat: {
            "mean": float(df.loc[normal_mask, feat].mean()),
            "std": float(df.loc[normal_mask, feat].std() + 1e-6),
        }
        for feat in FEATURES
    }

    with open("model.pkl", "wb") as f:
        pickle.dump({"model": model, "scaler": scaler, "features": FEATURES}, f)

    with open("feature_stats.pkl", "wb") as f:
        pickle.dump(feature_stats, f)

    preds = model.predict(X_scaled)
    print(f"Trained on {len(df)} rows. Flagged {sum(preds == -1)} as anomalous ({sum(preds==-1)/len(df):.1%}).")


if __name__ == "__main__":
    train()
