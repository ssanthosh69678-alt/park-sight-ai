# ParkSight AI — Real Mode backend (Flask + YOLO + OpenCV)

The hosted web app ships with **DEMO / SIMULATED DATA** by default. Switching the
Live Monitoring page to **Real Mode** routes frames through this service.

## Run

```bash
cd backend
pip install -r requirements.txt
python app.py           # http://localhost:5000
```

Expose it publicly (e.g. `ngrok http 5000`) and set these backend secrets in the app:

| Secret | Purpose |
| --- | --- |
| `DETECTION_API_URL` | Base URL of this service, e.g. `https://xxxx.ngrok.app` |
| `DETECTION_API_KEY` | Optional shared key; sent as `X-API-Key` |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Readiness + loaded YOLO model |
| POST | `/api/detect` | `{image, slots}` → occupancy + per-slot boxes |
| POST | `/api/predict` | `{history, horizon_hours}` → RandomForest forecast |

## App-side pipeline routes

The web app mirrors the same contract so external systems can drive it too:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/public/detection/health` | Which mode is active and whether YOLO is reachable |
| POST | `/api/public/detection/detect` | `{mode, slot_count, slot_numbers, image}` → `DetectionResult` |

`mode: "demo"` returns simulated results without touching the Python service;
`mode: "real"` proxies to `DETECTION_API_URL`.
