from typing import List
from ..inference.base import Detection


def to_json(detections: List[Detection]) -> list:
    return [
        {"type": d.type, "confidence": round(d.confidence, 4), "boundingBox": {"x": d.boundingBox.x, "y": d.boundingBox.y, "width": d.boundingBox.width, "height": d.boundingBox.height}}
        for d in detections
    ]
