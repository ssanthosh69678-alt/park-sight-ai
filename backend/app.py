"""
ParkSight AI — Flask REST API (detection, status, analytics, prediction, camera).

Run locally:
    pip install -r requirements.txt
    python app.py            # serves http://localhost:5000

Then point the web app at it by setting DETECTION_API_URL (and optionally
DETECTION_API_KEY) in the hosted app's backend secrets.

Endpoints
    GET  /api/health          -> readiness + loaded model
    POST /api/detect          -> {image, slots} -> occupancy result
    POST /api/status          -> {capacity, slots} -> live occupancy summary
    POST /api/analytics       -> {records} -> pandas descriptive statistics
    POST /api/predict         -> {history, horizon_hours} -> ML forecast
    POST /api/camera/start    -> {area_id, source} -> camera session
    POST /api/camera/stop     -> {session_id} -> closed camera session
    GET  /api/camera/sessions -> active camera sessions
"""

import base64
import os
import time
import uuid
from datetime import datetime, timezone

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from detector import ParkingDetector

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("DETECTION_API_KEY")
detector = ParkingDetector(model_path=os.environ.get("YOLO_MODEL", "yolov8n.pt"))

# In-memory camera session registry (area_id -> session payload).
CAMERA_SESSIONS: dict[str, dict] = {}


def _authorized() -> bool:
    return not API_KEY or request.headers.get("X-API-Key") == API_KEY


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _level(pct: float) -> str:
    if pct >= 90:
        return "full"
    if pct >= 70:
        return "limited"
    return "available"


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "model": detector.model_name,
        "device": detector.device,
        "simulated": False,
        "active_camera_sessions": len(CAMERA_SESSIONS),
    })


@app.post("/api/detect")
def detect():
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    image_b64 = payload.get("image")
    slots = payload.get("slots") or []

    if not image_b64:
        return jsonify({"error": "image is required"}), 400

    raw = base64.b64decode(image_b64.split(",")[-1])
    started = time.time()
    result = detector.detect(np.frombuffer(raw, dtype=np.uint8), slots)
    result["inference_ms"] = int((time.time() - started) * 1000)
    result["mode"] = "real"
    result["simulated"] = False
    return jsonify(result)


@app.post("/api/status")
def status():
    """Live occupancy summary computed from the caller's slot map."""
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    slots = payload.get("slots") or []
    capacity = int(payload.get("capacity") or len(slots))

    occupied = sum(1 for s in slots if s.get("status") == "occupied")
    unknown = sum(1 for s in slots if s.get("status") == "unknown")
    available = max(0, capacity - occupied - unknown)
    pct = round((occupied / capacity) * 100, 1) if capacity else 0.0

    return jsonify({
        "area_id": payload.get("area_id"),
        "capacity": capacity,
        "configured": len(slots),
        "occupied": occupied,
        "available": available,
        "unknown": unknown,
        "occupancy_percentage": pct,
        "availability_level": _level(pct),
        "camera_active": bool(CAMERA_SESSIONS.get(str(payload.get("area_id")))),
        "updated_at": _now(),
        "simulated": False,
    })


@app.post("/api/analytics")
def analytics():
    """Pandas/NumPy descriptive statistics over the supplied occupancy records."""
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    import pandas as pd

    payload = request.get_json(silent=True) or {}
    records = payload.get("records") or []
    if not records:
        return jsonify({"error": "records are required", "samples": 0}), 400

    frame = pd.DataFrame(records)
    frame["recorded_at"] = pd.to_datetime(frame["recorded_at"], utc=True)
    series = frame["occupancy_percentage"].astype(float)

    modes = series.round().mode()
    hourly = series.groupby(frame["recorded_at"].dt.hour).mean().round(1)
    daily = series.groupby(frame["recorded_at"].dt.dayofweek).mean().round(1)

    return jsonify({
        "area_id": payload.get("area_id"),
        "samples": int(series.size),
        "mean": round(float(series.mean()), 2),
        "median": round(float(series.median()), 2),
        "mode": round(float(modes.iloc[0]), 2) if not modes.empty else 0.0,
        "variance": round(float(series.var(ddof=0)), 2),
        "std_dev": round(float(series.std(ddof=0)), 2),
        "min": round(float(series.min()), 2),
        "max": round(float(series.max()), 2),
        "p95": round(float(series.quantile(0.95)), 2),
        "hourly": [{"hour": int(h), "occupancy": float(v)} for h, v in hourly.items()],
        "daily": [{"day": int(d), "occupancy": float(v)} for d, v in daily.items()],
        "peak_hour": int(hourly.idxmax()) if not hourly.empty else 0,
        "quietest_hour": int(hourly.idxmin()) if not hourly.empty else 0,
        "computed_at": _now(),
        "engine": "pandas",
        "simulated": False,
    })


@app.post("/api/predict")
def predict():
    """Occupancy forecast from the scikit-learn model in ml/predictor.py."""
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    from ml.predictor import forecast

    payload = request.get_json(silent=True) or {}
    result = forecast(payload.get("history", []), int(payload.get("horizon_hours", 6)))
    result["area_id"] = payload.get("area_id")
    result["generated_at"] = _now()
    status_code = 400 if result.get("error") else 200
    return jsonify(result), status_code


@app.post("/api/camera/start")
def camera_start():
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    area_id = str(payload.get("area_id") or "default")
    session = CAMERA_SESSIONS.get(area_id)
    if not session:
        session = {
            "session_id": str(uuid.uuid4()),
            "area_id": area_id,
            "source": payload.get("source") or "browser",
            "status": "streaming",
            "started_at": _now(),
            "frames_processed": 0,
            "model": detector.model_name,
        }
        CAMERA_SESSIONS[area_id] = session
    return jsonify(session)


@app.post("/api/camera/stop")
def camera_stop():
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    area_id = str(payload.get("area_id") or "default")
    session = CAMERA_SESSIONS.pop(area_id, None)
    if not session:
        return jsonify({"error": "No active session for this area"}), 404

    started = datetime.fromisoformat(session["started_at"])
    session["status"] = "stopped"
    session["stopped_at"] = _now()
    session["duration_seconds"] = int((datetime.now(timezone.utc) - started).total_seconds())
    return jsonify(session)


@app.get("/api/camera/sessions")
def camera_sessions():
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"sessions": list(CAMERA_SESSIONS.values()), "count": len(CAMERA_SESSIONS)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
