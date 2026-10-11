from ..config import settings
from .base import Detector
from .heuristic_detector import HeuristicDetector


def build_detector() -> Detector:
    if settings.model_backend == "yolo":
        from .yolo_detector import YoloDetector
        return YoloDetector(settings.model_path)
    return HeuristicDetector()
