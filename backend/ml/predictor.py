"""Scikit-learn occupancy forecaster (RandomForest) mirroring the in-app demo model."""

from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor


def _features(ts: datetime, recent: float) -> list[float]:
    hour = ts.hour + ts.minute / 60
    return [
        np.sin(2 * np.pi * hour / 24), np.cos(2 * np.pi * hour / 24),
        np.sin(4 * np.pi * hour / 24), np.cos(4 * np.pi * hour / 24),
        1.0 if ts.weekday() >= 5 else 0.0,
        ts.weekday() / 6,
        recent,
    ]


def forecast(history: list[dict[str, Any]], horizon_hours: int = 6) -> dict[str, Any]:
    if len(history) < 24:
        return {"error": "at least 24 historical records are required", "predictions": []}

    frame = pd.DataFrame(history)
    frame["recorded_at"] = pd.to_datetime(frame["recorded_at"])
    frame = frame.sort_values("recorded_at").reset_index(drop=True)
    frame["recent"] = frame["occupancy_percentage"].rolling(3).mean().shift(1) / 100
    frame = frame.dropna()

    X = [_features(row.recorded_at.to_pydatetime(), row.recent) for row in frame.itertuples()]
    y = frame["occupancy_percentage"].to_numpy() / 100

    model = RandomForestRegressor(n_estimators=200, random_state=42)
    model.fit(X, y)

    now = datetime.now(timezone.utc)
    recent = float(y[-3:].mean())
    predictions = []
    for step in range(1, horizon_hours + 1):
        ts = now + timedelta(hours=step)
        value = float(np.clip(model.predict([_features(ts, recent)])[0], 0, 1))
        recent = value
        predictions.append({
            "prediction_time": ts.isoformat(),
            "predicted_occupancy": round(value * 100, 1),
            "model_version": "sklearn-rf-v1",
            "is_simulated": False,
        })

    return {
        "predictions": predictions,
        "r2": round(float(model.score(X, y)) * 100, 1),
        "samples": len(X),
        "feature_importance": dict(zip(
            ["sin_h", "cos_h", "sin_2h", "cos_2h", "is_weekend", "dow", "recent"],
            [round(float(v) * 100, 1) for v in model.feature_importances_],
        )),
    }
