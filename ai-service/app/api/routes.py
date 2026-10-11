import time
import uuid
from fastapi import APIRouter, UploadFile, Form, File
from ..config import settings
from ..preprocessing.image_io import decode_image
from ..postprocessing.format import to_json
from ..inference.factory import build_detector

router = APIRouter()
_detector = build_detector()

@router.get("/health")
def health():
    return {"success": True, "status": "healthy", "model": _detector.name, "modelVersion": _detector.version, "timestamp": time.time()}

@router.post("/analyze")
async def analyze(image: UploadFile = File(...), imageId: str | None = Form(default=None)):
    raw = await image.read()
    t0 = time.time()
    frame = decode_image(raw)
    detections = _detector.detect(frame)
    processing_ms = int((time.time() - t0) * 1000)
    return {
        "imageId": imageId or f"IMG-{uuid.uuid4().hex[:10].upper()}",
        "modelName": _detector.name,
        "modelVersion": _detector.version,
        "processingTimeMs": processing_ms,
        "detections": to_json(detections),
    }
