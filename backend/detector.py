"""YOLO + OpenCV occupancy detector used by the Flask service."""

from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np

VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}


class ParkingDetector:
    def __init__(self, model_path: str = "yolov8n.pt") -> None:
        from ultralytics import YOLO  # imported lazily so health checks stay fast

        self.model = YOLO(model_path)
        self.model_name = model_path
        self.device = "cuda" if self._cuda_available() else "cpu"

    @staticmethod
    def _cuda_available() -> bool:
        try:
            import torch

            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def detect(self, buffer: np.ndarray, slots: list[dict[str, Any]]) -> dict[str, Any]:
        frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode frame")

        height, width = frame.shape[:2]
        results = self.model(frame, verbose=False)[0]

        vehicles = []
        for box in results.boxes:
            label = results.names[int(box.cls[0])]
            if label not in VEHICLE_CLASSES:
                continue
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
            vehicles.append({
                "cx": (x1 + x2) / 2 / width,
                "cy": (y1 + y2) / 2 / height,
                "confidence": float(box.conf[0]),
            })

        boxes = []
        if slots:
            for slot in slots:
                coords = slot.get("coordinates") or {}
                sx, sy = float(coords.get("x", 0)), float(coords.get("y", 0))
                sw, sh = float(coords.get("w", 0.1)), float(coords.get("h", 0.1))
                hit = next(
                    (v for v in vehicles if sx <= v["cx"] <= sx + sw and sy <= v["cy"] <= sy + sh),
                    None,
                )
                boxes.append({
                    "slot_number": slot.get("slot_number", "?"),
                    "status": "occupied" if hit else "available",
                    "confidence": round(hit["confidence"], 2) if hit else 0.9,
                    "x": sx, "y": sy, "w": sw, "h": sh,
                })
        else:
            # No slot map configured: report raw vehicle detections.
            for index, vehicle in enumerate(vehicles):
                boxes.append({
                    "slot_number": f"V{index + 1:02d}",
                    "status": "occupied",
                    "confidence": round(vehicle["confidence"], 2),
                    "x": vehicle["cx"], "y": vehicle["cy"], "w": 0.05, "h": 0.05,
                })

        occupied = sum(1 for b in boxes if b["status"] == "occupied")
        total = len(boxes)
        return {
            "occupied": occupied,
            "available": total - occupied,
            "total": total,
            "occupancy_percentage": round(occupied / total * 100, 1) if total else 0.0,
            "boxes": boxes,
            "model": self.model_name,
            "captured_at": datetime.now(timezone.utc).isoformat(),
        }
