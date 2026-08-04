"""
ParkSight AI — YOLO + OpenCV detection service (Real Mode backend).

Run locally:
    pip install -r requirements.txt
    python app.py            # serves http://localhost:5000

Then point the web app at it by setting DETECTION_API_URL (and optionally
DETECTION_API_KEY) in the hosted app's backend secrets. The app calls:

    GET  /api/health   -> readiness + loaded model
    POST /api/detect   -> {image, slots} -> occupancy result
    POST /api/predict  -> {area_id, horizon_hours} -> ML forecast
"""

import base64
import os
import time

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from detector import ParkingDetector

app = Flask(__name__)
CORS(app)

API_KEY = os.environ.get("DETECTION_API_KEY")
detector = ParkingDetector(model_path=os.environ.get("YOLO_MODEL", "yolov8n.pt"))


def _authorized() -> bool:
    return not API_KEY or request.headers.get("X-API-Key") == API_KEY


@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "model": detector.model_name,
        "device": detector.device,
        "simulated": False,
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


@app.post("/api/predict")
def predict():
    """Occupancy forecast from the scikit-learn model in ml/predictor.py."""
    if not _authorized():
        return jsonify({"error": "Unauthorized"}), 401

    from ml.predictor import forecast

    payload = request.get_json(silent=True) or {}
    return jsonify(forecast(payload.get("history", []), int(payload.get("horizon_hours", 6))))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
