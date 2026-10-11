"""
Drop-in replacement using a trained YOLO/ONNX model, same Detector contract.
Not shipped with a trained model (none available in this environment). To use:
  1. Put a .onnx model at MODEL_PATH/model.onnx
  2. Set MODEL_BACKEND=yolo in .env
  3. pip install onnxruntime
"""
import os
from typing import List
import numpy as np
from .base import BoundingBox, Detection

CLASS_NAMES = [
    "PERSON", "HELMET", "NO_HELMET", "SAFETY_VEST", "NO_SAFETY_VEST",
    "GLOVES", "NO_GLOVES", "SAFETY_SHOES", "NO_SAFETY_SHOES", "SMOKE", "FIRE",
]


class YoloDetector:
    name = "ppe-hazard-yolo"
    version = "1.0.0-yolo"

    def __init__(self, model_path: str, input_size: int = 640, conf_threshold: float = 0.4):
        import onnxruntime as ort
        weights = os.path.join(model_path, "model.onnx")
        if not os.path.exists(weights):
            raise FileNotFoundError(f"No model.onnx found at {weights}. See this file's docstring.")
        self.session = ort.InferenceSession(weights, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.input_size = input_size
        self.conf_threshold = conf_threshold

    def _preprocess(self, image: np.ndarray):
        import cv2
        resized = cv2.resize(image, (self.input_size, self.input_size))
        blob = resized[:, :, ::-1].astype(np.float32) / 255.0
        blob = blob.transpose(2, 0, 1)[None, ...]
        return blob, image.shape[1] / self.input_size, image.shape[0] / self.input_size

    def detect(self, image: np.ndarray) -> List[Detection]:
        blob, sx, sy = self._preprocess(image)
        raw = self.session.run(None, {self.input_name: blob})[0]
        detections: List[Detection] = []
        for row in raw.reshape(-1, raw.shape[-1]):
            x, y, w, h, conf, cls = row[:6]
            if conf < self.conf_threshold:
                continue
            cls_i = int(cls)
            label = CLASS_NAMES[cls_i] if 0 <= cls_i < len(CLASS_NAMES) else "OTHER"
            detections.append(Detection(label, float(conf), BoundingBox(int(x * sx), int(y * sy), int(w * sx), int(h * sy))))
        return detections
