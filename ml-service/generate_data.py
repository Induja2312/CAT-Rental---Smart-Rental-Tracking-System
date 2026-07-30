"""
Expands the 7-row equipment baseline sheet into a synthetic time-series
dataset — now including engine temperature and operator session
utilization, needed for the new anomaly types (high temp, slacking).

Run: python generate_data.py
Output: synthetic_telemetry.csv
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

BASELINE = [
    {"equipmentId": "EQX1001", "type": "Excavator", "engineHours": 1.5, "idleHours": 10, "hasOperator": True,  "normalTemp": 75},
    {"equipmentId": "EQX1002", "type": "Crane",     "engineHours": 0.0, "idleHours": 11, "hasOperator": False, "normalTemp": 60},
    {"equipmentId": "EQX1003", "type": "Bulldozer", "engineHours": 7.5, "idleHours": 0.5, "hasOperator": True,  "normalTemp": 85},
    {"equipmentId": "EQX1004", "type": "Excavator", "engineHours": 2.0, "idleHours": 9,  "hasOperator": True,  "normalTemp": 78},
    {"equipmentId": "EQX1005", "type": "Bulldozer", "engineHours": 8.0, "idleHours": 0,  "hasOperator": True,  "normalTemp": 88},
    {"equipmentId": "EQX1006", "type": "Grader",    "engineHours": 3.0, "idleHours": 6,  "hasOperator": False, "normalTemp": 72},
    {"equipmentId": "EQX1007", "type": "Excavator", "engineHours": 0.0, "idleHours": 12, "hasOperator": False, "normalTemp": 58},
]

DAYS = 120

def generate():
    rows = []
    start_date = datetime(2025, 1, 1)

    for machine in BASELINE:
        days_since_operator = 0
        for day in range(DAYS):
            date = start_date + timedelta(days=day)

            engine_hours = max(0, np.random.normal(machine["engineHours"], 1.2))
            idle_hours = max(0, min(24 - engine_hours, np.random.normal(machine["idleHours"], 1.5)))
            engine_temp = max(40, np.random.normal(machine["normalTemp"], 4))

            # Operator session utilization: fraction of clocked-in time actually spent
            # with engine active. Normally high (0.7-1.0) when operator is genuinely working.
            session_utilization = np.clip(np.random.normal(0.85, 0.1), 0, 1) if machine["hasOperator"] else 0.0

            is_injected_anomaly = np.random.rand() < 0.06
            if is_injected_anomaly:
                anomaly_kind = np.random.choice([
                    "overuse_spike", "idle_spike", "operator_gap", "high_temp", "slacking"
                ])
                if anomaly_kind == "overuse_spike":
                    engine_hours = np.random.uniform(14, 20)
                    idle_hours = max(0, 24 - engine_hours - np.random.uniform(0, 2))
                elif anomaly_kind == "idle_spike":
                    idle_hours = np.random.uniform(18, 23)
                    engine_hours = max(0, 24 - idle_hours - np.random.uniform(0, 2))
                elif anomaly_kind == "operator_gap":
                    days_since_operator += np.random.randint(3, 8)
                elif anomaly_kind == "high_temp":
                    engine_temp = np.random.uniform(105, 130)
                elif anomaly_kind == "slacking":
                    # clocked in (session_utilization normally implies operator present)
                    # but barely any real engine activity -> classic "extending stay" pattern
                    session_utilization = np.random.uniform(0.0, 0.15)
                    engine_hours = max(0, np.random.normal(0.5, 0.3))

            has_operator_today = machine["hasOperator"] and np.random.rand() > 0.05
            if has_operator_today:
                days_since_operator = 0
            else:
                days_since_operator += 1

            idle_engine_ratio = idle_hours / engine_hours if engine_hours > 0 else idle_hours / 0.1

            rows.append({
                "equipmentId": machine["equipmentId"],
                "type": machine["type"],
                "date": date.strftime("%Y-%m-%d"),
                "engineHoursToday": round(engine_hours, 2),
                "idleHoursToday": round(idle_hours, 2),
                "idleEngineRatio": round(idle_engine_ratio, 2),
                "daysSinceOperatorAssigned": days_since_operator,
                "engineTemperature": round(engine_temp, 2),
                "sessionUtilizationRatio": round(session_utilization, 2),
                "injected_anomaly": is_injected_anomaly,  # for your own validation only
            })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate()
    df.to_csv("synthetic_telemetry.csv", index=False)
    print(f"Generated {len(df)} rows across {df['equipmentId'].nunique()} machines")
    print(df.head())
