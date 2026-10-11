"""
Dependency-light detector: HOG person detector + colour/texture heuristics for PPE and visible
hazards. No downloaded weights needed. Replaceable — see yolo_detector.py for the trained-model
alternative with the same contract.
"""
from typing import List
import cv2
import numpy as np
from .base import BoundingBox, Detection

_HOG = cv2.HOGDescriptor()
_HOG.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

_HELMET_HSV_RANGES = [
    ((15, 80, 120), (35, 255, 255)),
    ((0, 90, 120), (12, 255, 255)),
    ((0, 0, 200), (180, 40, 255)),
]
_VEST_HSV_RANGES = [
    ((15, 100, 100), (35, 255, 255)),
    ((0, 120, 100), (10, 255, 255)),
]


def _mask_fraction(hsv_region: np.ndarray, ranges) -> float:
    if hsv_region.size == 0:
        return 0.0
    total = np.zeros(hsv_region.shape[:2], dtype=np.uint8)
    for lo, hi in ranges:
        total |= cv2.inRange(hsv_region, np.array(lo), np.array(hi))
    return float(np.count_nonzero(total)) / float(total.size)


def _detect_persons(bgr: np.ndarray):
    scale = 640.0 / max(bgr.shape[1], 1)
    scale = min(scale, 1.0) or 1.0
    small = cv2.resize(bgr, None, fx=scale, fy=scale) if scale < 1.0 else bgr
    rects, weights = _HOG.detectMultiScale(small, winStride=(8, 8), padding=(8, 8), scale=1.05)
    out = []
    for (x, y, w, h), weight in zip(rects, weights):
        conf = float(1 / (1 + np.exp(-weight)))
        out.append((int(x / scale), int(y / scale), int(w / scale), int(h / scale), conf))
    return out


def _detect_smoke_fire(bgr: np.ndarray) -> List[Detection]:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, w = bgr.shape[:2]
    area = h * w
    detections: List[Detection] = []

    fire_mask = cv2.inRange(hsv, (0, 120, 150), (25, 255, 255)) | cv2.inRange(hsv, (160, 120, 150), (180, 255, 255))
    fire_frac = float(np.count_nonzero(fire_mask)) / area
    if fire_frac > 0.015:
        ys, xs = np.nonzero(fire_mask)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        conf = min(0.55 + fire_frac * 6, 0.97)
        detections.append(Detection("FIRE", conf, BoundingBox(x0, y0, x1 - x0, y1 - y0)))

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    low_sat = (hsv[:, :, 1] < 60)
    mid_val = (hsv[:, :, 2] > 100) & (hsv[:, :, 2] < 230)
    haze_mask = (low_sat & mid_val).astype(np.uint8)
    haze_frac = float(np.count_nonzero(haze_mask)) / area
    if haze_frac > 0.35 and lap_var < 150:
        ys, xs = np.nonzero(haze_mask)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        conf = min(0.5 + haze_frac * 0.4, 0.9)
        detections.append(Detection("SMOKE", conf, BoundingBox(x0, y0, x1 - x0, y1 - y0)))
    return detections


class HeuristicDetector:
    name = "ppe-hazard-heuristic"
    version = "1.0.0-cv"

    def detect(self, image: np.ndarray) -> List[Detection]:
        detections: List[Detection] = []
        persons = _detect_persons(image)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        for (x, y, w, h, conf) in persons:
            x, y, w, h = max(x, 0), max(y, 0), max(w, 1), max(h, 1)
            detections.append(Detection("PERSON", conf, BoundingBox(x, y, w, h)))

            head_h = max(int(h * 0.22), 1)
            head = hsv[y:y + head_h, x:x + w]
            helmet_frac = _mask_fraction(head, _HELMET_HSV_RANGES)
            if helmet_frac > 0.18:
                detections.append(Detection("HELMET", min(0.6 + helmet_frac, 0.95), BoundingBox(x, y, w, head_h)))
            else:
                detections.append(Detection("NO_HELMET", min(0.6 + (0.18 - helmet_frac), 0.95), BoundingBox(x, y, w, head_h)))

            torso_y0 = y + int(h * 0.25)
            torso_y1 = y + int(h * 0.65)
            torso = hsv[torso_y0:torso_y1, x:x + w]
            vest_frac = _mask_fraction(torso, _VEST_HSV_RANGES)
            if vest_frac > 0.15:
                detections.append(Detection("SAFETY_VEST", min(0.6 + vest_frac, 0.95), BoundingBox(x, torso_y0, w, torso_y1 - torso_y0)))
            else:
                detections.append(Detection("NO_SAFETY_VEST", min(0.55 + (0.15 - vest_frac), 0.9), BoundingBox(x, torso_y0, w, torso_y1 - torso_y0)))

        detections.extend(_detect_smoke_fire(image))
        return detections
